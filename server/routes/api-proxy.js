/**
 * DeeperNova API Routes
 * OpenAI-compatible proxy endpoints powered by TokenMix Meta AI backend
 * Includes 1,000,000 Free Token Quota tracking
 */

import express from 'express';
import { apiProxyService } from '../apiProxyService.js';
import { userDb, apiKeyDb } from '../database.js';

const router = express.Router();

/**
 * Handle CORS preflight requests
 */
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

/**
 * Middleware: Extract API key from headers, body, or query
 */
const apiKeyMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const xApiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.apiKey = authHeader.substring(7).trim();
  } else if (xApiKey) {
    req.apiKey = String(xApiKey).trim();
  } else if (req.body && req.body.api_key) {
    req.apiKey = String(req.body.api_key).trim();
  } else if (req.query && req.query.api_key) {
    req.apiKey = String(req.query.api_key).trim();
  } else {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid Authorization header. Pass Bearer <API_KEY> in the Authorization header.',
        type: 'invalid_request_error',
        code: 'unauthorized'
      }
    });
  }
  next();
};

/**
 * POST /chat/completions (and /v1/chat/completions)
 * OpenAI compatible chat completion endpoint
 */
router.post('/chat/completions', apiKeyMiddleware, async (req, res) => {
  try {
    const { stream } = req.body;

    if (stream) {
      try {
        const streamResult = await apiProxyService.chatCompletionsStream(req.apiKey, req.body);
        const { stream: responseStream, auth, requestedModel } = streamResult;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let totalTokensFromStream = 0;
        let generatedTextLen = 0;

        responseStream.on('data', (chunk) => {
          const text = chunk.toString('utf8');
          const lines = text.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.substring(6).trim();
              if (dataStr === '[DONE]') {
                res.write('data: [DONE]\n\n');
              } else {
                try {
                  const parsed = JSON.parse(dataStr);
                  parsed.model = requestedModel || 'deepernova-gold-1.5';
                  parsed.owned_by = 'deepernova';
                  if (parsed.usage?.total_tokens) {
                    totalTokensFromStream = parsed.usage.total_tokens;
                  }
                  if (parsed.choices?.[0]?.delta?.content) {
                    generatedTextLen += parsed.choices[0].delta.content.length;
                  }
                  res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                } catch {
                  res.write(`${line}\n\n`);
                }
              }
            } else {
              res.write(`${line}\n`);
            }
          }
        });

        responseStream.on('end', () => {
          // If usage chunk was not sent by upstream, estimate tokens (4 chars/token)
          const consumedTokens = totalTokensFromStream > 0 
            ? totalTokensFromStream 
            : Math.max(10, Math.ceil((JSON.stringify(req.body.messages || []).length + generatedTextLen) / 4));

          if (auth.isDbKey) {
            try {
              userDb.consumeTokens(auth.user.id, consumedTokens);
              apiKeyDb.consumeTokens(auth.keyRecord.id, consumedTokens);
              console.log(`[Stream] Deducted ${consumedTokens} tokens for user ${auth.user.id}`);
            } catch (err) {
              console.warn('[Stream Token Deduction]', err.message);
            }
          }
          res.end();
        });

        responseStream.on('error', (error) => {
          console.error('[Stream Error]', error.message);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        });

      } catch (streamError) {
        const statusCode = streamError.status || 500;
        return res.status(statusCode).json({
          error: {
            message: streamError.message || 'Stream initialization error',
            type: 'api_error',
            code: streamError.error_code || 'STREAM_ERROR'
          }
        });
      }
    } else {
      // Non-streaming response
      const result = await apiProxyService.chatCompletions(req.apiKey, req.body);
      res.json(result);
    }
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'api_error',
        code: error.error_code || 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * GET /models
 * OpenAI compatible models endpoint
 */
router.get('/models', apiKeyMiddleware, async (req, res) => {
  try {
    const models = await apiProxyService.listModels(req.apiKey);
    res.json(models);
  } catch (error) {
    res.status(error.status || 500).json({
      error: {
        message: error.message,
        type: 'api_error',
        code: error.error_code || 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * GET /balance
 * Live remaining token balance for the user
 */
router.get('/balance', apiKeyMiddleware, async (req, res) => {
  try {
    const stats = await apiProxyService.getUsageStats(req.apiKey);
    res.json({
      success: true,
      token_quota: stats.token_quota,
      tokens_used: stats.tokens_used,
      remaining_tokens: stats.remaining_tokens,
      user_id: stats.user_id
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: {
        message: error.message,
        type: 'api_error',
        code: error.error_code || 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * GET /usage
 * Usage statistics endpoint
 */
router.get('/usage', apiKeyMiddleware, async (req, res) => {
  try {
    const stats = await apiProxyService.getUsageStats(req.apiKey);
    res.json(stats);
  } catch (error) {
    res.status(error.status || 500).json({
      error: {
        message: error.message,
        type: 'api_error',
        code: error.error_code || 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * POST /test
 * Live interactive API Hit tester endpoint
 */
router.post('/test', apiKeyMiddleware, async (req, res) => {
  try {
    const prompt = req.body.prompt || 'Halo DeeperNova Gold 1.5, perkenalkan dirimu secara singkat.';
    const model = req.body.model || 'deepernova-gold-1.5';

    const startTime = Date.now();
    const result = await apiProxyService.chatCompletions(req.apiKey, {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    });
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      status: 200,
      latency_ms: latency,
      model: result.model,
      reply: result.choices?.[0]?.message?.content || '',
      tokens_consumed: result.deepernova?.tokens_consumed || result.usage?.total_tokens || 0,
      remaining_tokens: result.deepernova?.remaining_tokens ?? 1000000,
      token_quota: result.deepernova?.token_quota ?? 1000000,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      error_code: error.error_code || 'TEST_HIT_FAILED'
    });
  }
});

/**
 * GET /health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DeeperNova Gold 1.5 API Gateway',
    version: '1.5.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /docs
 */
router.get('/docs', (req, res) => {
  res.json({
    name: 'DeeperNova Gold 1.5 API',
    version: '1.5.0',
    description: 'High-speed cloud AI inference API powered by DeeperNova Gold 1.5 with 1 Million Free Tokens',
    base_url: 'https://api.deepernova.id/v1',
    endpoints: {
      'POST /v1/chat/completions': 'OpenAI-compatible chat completion endpoint',
      'GET /v1/models': 'List available models',
      'GET /v1/balance': 'Check remaining token balance out of 1,000,000 quota',
      'GET /v1/usage': 'Get usage statistics',
      'POST /v1/test': 'Interactive API test endpoint'
    },
    models: [
      { id: 'deepernova-gold-1.5', description: 'Flagship multimodal vision & ultra-fast cloud AI (128K context)' },
      { id: 'deepernova-gold-1.5-pro', description: 'Deep reasoning & structured coding engine (70B)' }
    ],
    free_quota: '1,000,000 input & output tokens per account'
  });
});

export default router;
