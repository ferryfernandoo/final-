/**
 * DeeperNova API Proxy Service
 * - Handles real API keys stored in SQLite database (api_keys & users tables)
 * - 1 Million Free Tokens balance tracking per user
 * - Proxies requests to TokenMix Meta AI backend (llama-4-maverick & llama-3.3-70b)
 * - Rebrands all responses to DeeperNova Gold 1.5 & DeeperNova Gold 1.5 Pro
 * - OpenAI-compatible API format (v1/chat/completions, v1/models, v1/balance)
 */

import fetch from 'node-fetch';
import { apiKeyDb, userDb } from './database.js';
import { apiKeyManager } from './apiKeyManager.js';

const TOKENMIX_API_KEY = process.env.TOKENMIX_CHAT_API_KEY || process.env.TOKENMIX_API_KEY || 'sk-tm-0oMaTRPBJiEibFQ6SpC7MUNdYrTnLf2QIMhNXEzvvKZZ8cSi';
const TOKENMIX_CHAT_API_URL = process.env.TOKENMIX_CHAT_API_URL || 'https://api.tokenmix.ai/v1/chat/completions';

class ApiProxyService {
  constructor() {
    this.rateLimit = 999999;
  }

  /**
   * Authenticate API key against SQLite database or fallback to apiKeyManager
   */
  async authenticateApiKey(userApiKey) {
    if (!userApiKey || typeof userApiKey !== 'string') return null;
    const cleanKey = userApiKey.trim();

    // 1. Check primary SQLite database
    try {
      const keyRecord = apiKeyDb.findByKey(cleanKey);
      if (keyRecord) {
        if (!keyRecord.isActive) {
          return { error: 'API key is deactivated. Please enable it in the API Marketplace.', error_code: 'KEY_DISABLED' };
        }
        const user = userDb.findById(keyRecord.userId);
        if (!user) {
          return { error: 'Associated user account not found.', error_code: 'USER_NOT_FOUND' };
        }
        const balance = userDb.getTokenBalance(user.id) || { tokenQuota: 1000000, tokensUsed: 0, remainingTokens: 1000000 };
        return {
          isDbKey: true,
          keyRecord,
          user,
          balance,
          userId: user.id
        };
      }
    } catch (dbErr) {
      console.warn('[ApiProxyService] SQLite lookup warning:', dbErr.message);
    }

    // 2. Fallback to in-memory apiKeyManager customer keys if created via admin
    try {
      const customer = apiKeyManager.getCustomerByKey(cleanKey);
      if (customer) {
        return {
          isDbKey: false,
          customer,
          balance: {
            tokenQuota: customer.monthlyTokenQuota || 1000000,
            tokensUsed: customer.tokensUsedThisMonth || 0,
            remainingTokens: Math.max(0, (customer.monthlyTokenQuota || 1000000) - (customer.tokensUsedThisMonth || 0))
          },
          userId: customer.id
        };
      }
    } catch (_) {}

    return null;
  }

  /**
   * Resolve target TokenMix model from requested model name
   */
  resolveTargetModel(modelName = '') {
    const lower = (modelName || '').toLowerCase();
    if (lower.includes('70b') || lower.includes('pro') || lower.includes('reason') || lower.includes('code')) {
      return 'llama-3.3-70b';
    }
    return 'llama-4-maverick';
  }

  /**
   * Main proxy handler for chat completions (non-streaming)
   */
  async chatCompletions(userApiKey, requestBody) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key. Please check your API key in DeeperNova API Marketplace.',
        error_code: 'UNAUTHORIZED'
      };
    }
    if (auth.error) {
      throw {
        status: 403,
        message: auth.error,
        error_code: auth.error_code || 'FORBIDDEN'
      };
    }

    // Check 1 Million token quota
    if (auth.balance && auth.balance.remainingTokens <= 0) {
      throw {
        status: 429,
        message: `Token quota exceeded. You have used all ${auth.balance.tokenQuota.toLocaleString()} free tokens. Please contact support to upgrade.`,
        error_code: 'QUOTA_EXCEEDED'
      };
    }

    const requestedModel = requestBody.model || 'deepernova-gold-1.5';
    const targetModel = this.resolveTargetModel(requestedModel);

    // Deep copy and prepare messages
    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = false;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    // System prompt asserting DeeperNova Gold 1.5 identity
    const identityPrompt = {
      role: 'system',
      content: `You are DeeperNova Gold 1.5, the flagship artificial intelligence assistant created by DeeperNova AI Indonesia. Always identify yourself as DeeperNova Gold 1.5. You are running on high-speed cloud infrastructure. You are knowledgeable, helpful, precise, respectful, and professional.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    console.log(`[ApiProxyService] Hitting TokenMix Meta AI with model ${targetModel} for user ${auth.userId}`);

    const startTime = Date.now();
    const response = await fetch(TOKENMIX_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKENMIX_API_KEY}`
      },
      body: JSON.stringify(outbound)
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[ApiProxyService] TokenMix API error status:', response.status, errBody);
      throw {
        status: response.status,
        message: `Upstream AI provider error: ${errBody || response.statusText}`,
        error_code: 'UPSTREAM_ERROR'
      };
    }

    const responseData = await response.json();
    const latencyMs = Date.now() - startTime;

    // Calculate real tokens used
    const promptTokens = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(outbound.messages).length / 4);
    const completionTokens = responseData.usage?.completion_tokens || Math.ceil((responseData.choices?.[0]?.message?.content || '').length / 4);
    const totalTokens = responseData.usage?.total_tokens || (promptTokens + completionTokens);

    // Consume tokens in SQLite database
    let updatedBalance = auth.balance;
    if (auth.isDbKey) {
      updatedBalance = userDb.consumeTokens(auth.user.id, totalTokens);
      apiKeyDb.consumeTokens(auth.keyRecord.id, totalTokens);
      console.log(`[ApiProxyService] Deducted ${totalTokens} tokens for user ${auth.user.id}. Sisa token: ${updatedBalance.remainingTokens}`);
    } else {
      apiKeyManager.trackUsage(userApiKey, totalTokens, `req_${Date.now()}`);
    }

    // Rebrand response to DeeperNova Gold 1.5
    responseData.model = requestedModel;
    responseData.owned_by = 'deepernova';
    responseData.system_fingerprint = 'fp_deepernova_gold_1_5';
    if (!responseData.usage) {
      responseData.usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens
      };
    }

    responseData.deepernova = {
      latency_ms: latencyMs,
      tokens_consumed: totalTokens,
      token_quota: updatedBalance?.tokenQuota || 1000000,
      remaining_tokens: updatedBalance?.remainingTokens ?? 1000000
    };

    return responseData;
  }

  /**
   * Streaming chat completions handler
   */
  async chatCompletionsStream(userApiKey, requestBody) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key. Please check your API key in DeeperNova API Marketplace.',
        error_code: 'UNAUTHORIZED'
      };
    }
    if (auth.error) {
      throw {
        status: 403,
        message: auth.error,
        error_code: auth.error_code || 'FORBIDDEN'
      };
    }

    if (auth.balance && auth.balance.remainingTokens <= 0) {
      throw {
        status: 429,
        message: `Token quota exceeded. You have used all ${auth.balance.tokenQuota.toLocaleString()} free tokens.`,
        error_code: 'QUOTA_EXCEEDED'
      };
    }

    const requestedModel = requestBody.model || 'deepernova-gold-1.5';
    const targetModel = this.resolveTargetModel(requestedModel);

    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = true;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    const identityPrompt = {
      role: 'system',
      content: `You are DeeperNova Gold 1.5, the flagship artificial intelligence assistant created by DeeperNova AI Indonesia. Always identify yourself as DeeperNova Gold 1.5. You are running on high-speed cloud infrastructure. You are knowledgeable, helpful, precise, respectful, and professional.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    const response = await fetch(TOKENMIX_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKENMIX_API_KEY}`
      },
      body: JSON.stringify(outbound)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw {
        status: response.status,
        message: `Upstream streaming error: ${errBody || response.statusText}`,
        error_code: 'STREAM_ERROR'
      };
    }

    return {
      stream: response.body,
      auth,
      requestedModel,
      targetModel
    };
  }

  /**
   * List available models (OpenAI compatible)
   */
  async listModels(userApiKey) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key',
        error_code: 'UNAUTHORIZED'
      };
    }

    return {
      object: 'list',
      data: [
        {
          id: 'deepernova-gold-1.5',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-gold-1.5',
          parent: null,
          description: 'Flagship multimodal vision & ultra-fast cloud AI (128K context)'
        },
        {
          id: 'deepernova-gold-1.5-pro',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-gold-1.5-pro',
          parent: null,
          description: 'Deep reasoning & structured coding engine (70B parameters)'
        },
        {
          id: 'deepernova-boron-1.1',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-boron-1.1',
          parent: null,
          description: 'Cloud turbo fast response model'
        }
      ]
    };
  }

  /**
   * Get live user token balance and stats
   */
  async getUsageStats(userApiKey) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key',
        error_code: 'UNAUTHORIZED'
      };
    }

    const balance = auth.balance || { tokenQuota: 1000000, tokensUsed: 0, remainingTokens: 1000000 };
    return {
      success: true,
      user_id: auth.userId,
      token_quota: balance.tokenQuota,
      tokens_used: balance.tokensUsed,
      remaining_tokens: balance.remainingTokens,
      stats: {
        totalRequests: 1,
        totalTokens: balance.tokensUsed,
        totalCost: 0,
        requestsThisHour: 1
      },
      rate_limit: {
        limit: this.rateLimit,
        remaining: this.rateLimit - 1,
        reset_at: new Date(Date.now() + 3600000).toISOString()
      }
    };
  }
}

export const apiProxyService = new ApiProxyService();
export default apiProxyService;
