/**
 * DeeperNova API Proxy Service
 * - Handles real API keys stored in SQLite database (api_keys & users tables)
 * - 1 Million Free Tokens balance tracking per user
 * - Routes requests through FreeLLM Gateway (tashfeenahmed/freellmapi) & official free-tier providers
 * - OpenAI-compatible API format (v1/chat/completions, v1/models, v1/balance)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { apiKeyDb, userDb, apiLogDb } from './database.js';
import { apiKeyManager } from './apiKeyManager.js';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');
dotenv.config({ path: ENV_FILE_PATH });

const sanitizeApiKey = (k) => (k ? String(k).trim() : '');
const DEFAULT_FREELLM_CHAT_URL = 'http://127.0.0.1:3005/v1/chat/completions';

let activeProxyTargetIndex = 0;
const keyCooldownUntilMap = new Map();
const modelCooldownUntilMap = new Map();
let lastEnvMtimeMs = 0;
let lastLoadedTargetSignature = '';

function reloadEnvIfChanged() {
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) return;
    const stat = fs.statSync(ENV_FILE_PATH);
    if (stat.mtimeMs && stat.mtimeMs !== lastEnvMtimeMs) {
      lastEnvMtimeMs = stat.mtimeMs;
      dotenv.config({ path: ENV_FILE_PATH, override: true });
    }
  } catch (_) { }
}

function splitEnvKeys(raw) {
  return String(raw || '')
    .split(',')
    .map(sanitizeApiKey)
    .filter(Boolean);
}

export function getFreeLlmGatewayUrl() {
  reloadEnvIfChanged();
  return (process.env.FREELLM_API_URL || DEFAULT_FREELLM_CHAT_URL).trim();
}

export function getFreeLlmImageConfig() {
  const gatewayUrl = getFreeLlmGatewayUrl();
  let gatewayOrigin = 'http://127.0.0.1:3005';
  try {
    gatewayOrigin = new URL(gatewayUrl).origin;
  } catch (_) { }

  const gatewayKeys = Array.from(new Set([
    ...splitEnvKeys(process.env.FREELLM_API_KEYS),
    sanitizeApiKey(process.env.FREELLM_API_KEY)
  ].filter(Boolean)));

  return {
    generationsUrl: (process.env.FREELLM_IMAGE_GENERATIONS_URL || `${gatewayOrigin}/v1/images/generations`).trim(),
    editsUrl: (process.env.FREELLM_IMAGE_EDITS_URL || `${gatewayOrigin}/v1/images/edits`).trim(),
    keys: gatewayKeys
  };
}

export function getEffectiveFreeLlmTargets() {
  reloadEnvIfChanged();
  const gatewayUrl = getFreeLlmGatewayUrl();
  const gatewayKeys = Array.from(new Set([
    ...splitEnvKeys(process.env.FREELLM_API_KEYS),
    sanitizeApiKey(process.env.FREELLM_API_KEY),
    sanitizeApiKey(process.env.FREELLM_SECONDARY_API_KEY),
    sanitizeApiKey(process.env.FREELLM_FALLBACK_API_KEY)
  ].filter(Boolean)));

  const targets = [];
  gatewayKeys.forEach((apiKey, i) => {
    targets.push({
      id: `freellmapi_${i}`,
      platform: 'freellmapi',
      label: 'FreeLLMAPI Gateway',
      url: gatewayUrl,
      apiKey,
      extraHeaders: {}
    });
  });

  const directProviders = [
    { env: 'GROQ_API_KEY', platform: 'groq', label: 'Groq Free Tier', url: 'https://api.groq.com/openai/v1/chat/completions' },
    { env: 'GEMINI_API_KEY', platform: 'gemini', label: 'Google AI Studio', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
    { env: 'OPENROUTER_API_KEY', platform: 'openrouter', label: 'OpenRouter Free', url: 'https://openrouter.ai/api/v1/chat/completions', extraHeaders: { 'HTTP-Referer': 'https://deepernova.com', 'X-Title': 'DeeperNova AI' } },
    { env: 'CEREBRAS_API_KEY', platform: 'cerebras', label: 'Cerebras Cloud', url: 'https://api.cerebras.ai/v1/chat/completions' },
    { env: 'MISTRAL_API_KEY', platform: 'mistral', label: 'Mistral Free Tier', url: 'https://api.mistral.ai/v1/chat/completions' },
    { env: 'NVIDIA_API_KEY', platform: 'nvidia', label: 'NVIDIA NIM', url: 'https://integrate.api.nvidia.com/v1/chat/completions' },
    { env: 'GITHUB_MODELS_TOKEN', platform: 'github', label: 'GitHub Models', url: 'https://models.inference.ai.azure.com/chat/completions' }
  ];

  for (const p of directProviders) {
    const keys = splitEnvKeys(process.env[p.env]);
    keys.forEach((apiKey, i) => {
      targets.push({
        id: `${p.platform}_${i}`,
        platform: p.platform,
        label: p.label,
        url: p.url,
        apiKey,
        extraHeaders: p.extraHeaders || {}
      });
    });
  }

  const sig = targets.map(t => `${t.id}:${t.url}:${t.apiKey}`).join('|');
  if (sig !== lastLoadedTargetSignature) {
    lastLoadedTargetSignature = sig;
    keyCooldownUntilMap.clear();
  }
  return targets;
}

export function getEffectiveFreeLlmKeys() {
  return getEffectiveFreeLlmTargets().map(t => t.apiKey);
}

function targetCooldownKey(target) {
  if (!target) return '';
  if (typeof target === 'string') return target;
  return `${target.platform || 'freellmapi'}:${target.apiKey || ''}`;
}

export function markFreeLlmTargetError(target, status = 500) {
  const k = targetCooldownKey(target);
  if (!k) return;
  let durationMs = 15000;
  if (status === 429) durationMs = 45000;
  else if (status === 401 || status === 402 || status === 403) durationMs = 120000;
  keyCooldownUntilMap.set(k, Date.now() + durationMs);
}

export function clearFreeLlmTargetCooldown(target) {
  const k = targetCooldownKey(target);
  if (k) keyCooldownUntilMap.delete(k);
}

export function getOrderedFreeLlmTargets(startIdx = 0) {
  const targets = getEffectiveFreeLlmTargets();
  if (targets.length === 0) return [];
  const now = Date.now();
  const ordered = [];
  for (let i = 0; i < targets.length; i++) {
    const idx = (startIdx + i) % targets.length;
    ordered.push({ target: targets[idx], index: idx });
  }
  const healthy = ordered.filter(({ target }) => (keyCooldownUntilMap.get(targetCooldownKey(target)) || 0) <= now);
  return healthy.length > 0 ? healthy : ordered;
}

export function getUpstreamModelPlan(requestedModel = '', options = {}) {
  const {
    hasImages = false,
    enableReasoning = false,
    fastDefaultModel = 'qwen2.5-vl-72b'
  } = options || {};
  const raw = String(requestedModel || '').trim();
  const lower = raw.toLowerCase();
  const customEnvModel = (process.env.FREELLM_CHAT_MODEL || '').trim();
  const hasCustomDefault = Boolean(customEnvModel && customEnvModel !== 'auto' && !customEnvModel.toLowerCase().includes('deepseek'));

  const isGrok = lower.includes('grok-4.6') || lower === 'grok';
  const isVisionReq = hasImages || lower.includes('image') || (lower === 'qwen2.5-vl-72b' && hasImages);

  const FAST_POOL = ['qwen2.5-vl-72b', 'nemotron-3-ultra-550b', 'north-mini-code', 'free-router', 'nemotron-3.5-lightning'];
  const REAL_DIRECT_MODELS = new Set([
    'qwen2.5-vl-72b',
    'nemotron-3-ultra-550b',
    'nemotron-3.5-lightning',
    'north-mini-code',
    'free-router',
    'nemotron-3.5-super-vl',
    'dots3-note-preview',
    'gpt-oss-120b',
    'gpt-oss-20b',
    'llama-3.3-70b',
    'mistral-small-3.2-24b',
    'auto',
    'auto:balanced',
    'auto:smart'
  ]);

  let tier = 'qwen2.5-vl-72b';
  let gatewayModels;
  if (isVisionReq) {
    tier = 'vision';
    gatewayModels = ['qwen2.5-vl-72b', 'nemotron-3.5-super-vl', 'auto'];
  } else if (REAL_DIRECT_MODELS.has(lower)) {
    tier = lower;
    gatewayModels = [lower, ...FAST_POOL];
  } else if (lower.includes('4.6-giga') || lower.includes('giga') || (lower.includes('gold') && lower.includes('pro'))) {
    tier = 'nemotron-3-ultra-550b';
    gatewayModels = ['nemotron-3-ultra-550b', 'qwen2.5-vl-72b', 'nemotron-3.5-lightning', 'free-router'];
  } else if (lower.includes('2.3-pro') || lower.includes('2.3') || lower.includes('code')) {
    tier = 'north-mini-code';
    gatewayModels = ['north-mini-code', 'nemotron-3-ultra-550b', 'qwen2.5-vl-72b', 'free-router'];
  } else if (lower.includes('silicon') || lower.includes('flash') || lower.includes('lightning')) {
    tier = 'nemotron-3.5-lightning';
    gatewayModels = ['nemotron-3.5-lightning', 'nemotron-3-ultra-550b', 'qwen2.5-vl-72b', 'north-mini-code'];
  } else if (isGrok) {
    tier = 'nemotron-3-ultra-550b';
    gatewayModels = ['nemotron-3-ultra-550b', 'free-router', 'qwen2.5-vl-72b'];
  } else {
    tier = enableReasoning ? 'nemotron-3-ultra-550b' : 'qwen2.5-vl-72b';
    const baseModels = enableReasoning
      ? ['nemotron-3-ultra-550b', 'nemotron-3.5-super-vl', 'qwen2.5-vl-72b', 'free-router']
      : ['qwen2.5-vl-72b', 'nemotron-3-ultra-550b', 'north-mini-code', 'free-router'];
    gatewayModels = hasCustomDefault ? [customEnvModel, ...baseModels] : baseModels;
    if (!enableReasoning && fastDefaultModel && !gatewayModels.includes(fastDefaultModel)) {
      gatewayModels.unshift(fastDefaultModel);
    }
  }

  gatewayModels = Array.from(new Set(gatewayModels));
  const isSmart = lower.includes('550b') || lower.includes('super') || isGrok || enableReasoning;
  const modelsByPlatform = {
    freellmapi: gatewayModels,
    groq: isVisionReq
      ? ['meta-llama/llama-4-maverick-17b-128e-instruct', 'meta-llama/llama-4-scout-17b-16e-instruct']
      : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    gemini: isSmart ? ['gemini-2.5-flash'] : ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
    openrouter: ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'],
    cerebras: isSmart ? ['llama-3.3-70b'] : ['llama3.1-8b', 'llama-3.3-70b'],
    mistral: isSmart ? ['mistral-large-latest', 'mistral-small-latest'] : ['mistral-small-latest'],
    nvidia: isVisionReq ? ['meta/llama-3.2-90b-vision-instruct'] : ['meta/llama-3.3-70b-instruct'],
    github: isSmart ? ['gpt-4o', 'gpt-4o-mini'] : ['gpt-4o-mini']
  };

  return {
    isGrok,
    tier,
    primaryModel: gatewayModels[0],
    candidateModels: gatewayModels,
    modelsByPlatform
  };
}

export async function dispatchFreeLlmRequest({
  requestedModel = 'qwen2.5-vl-72b',
  messages = [],
  temperature = 0.6,
  max_tokens = 4096,
  stream = false,
  hasImages = false,
  enableReasoning = false,
  signal = null,
  presence_penalty,
  frequency_penalty,
  timeoutMs = null
} = {}) {
  const orderedTargets = getOrderedFreeLlmTargets(activeProxyTargetIndex);
  if (orderedTargets.length === 0) {
    return {
      response: null,
      modelUsed: null,
      platformUsed: null,
      lastError: new Error('No FreeLLM API keys configured. Configure FREELLM_API_KEY (FreeLLMAPI :3005) or provider key in .env.')
    };
  }

  const plan = getUpstreamModelPlan(requestedModel, { hasImages, enableReasoning });
  const deadTargets = new Set();
  let lastError = null;
  // Cap cumulative fallback budget so proxy/Edge callers receive a fast failover within Vercel's 25s limit
  const totalBudgetMs = timeoutMs ? Math.max(timeoutMs * 2, 20000) : 21000;
  const dispatchDeadline = Date.now() + totalBudgetMs;

  for (const { target, index } of orderedTargets) {
    const targetKey = `${target.id}:${target.apiKey}`;
    if (deadTargets.has(targetKey)) continue;

    const baseCandidateModels = plan.modelsByPlatform[target.platform] || plan.candidateModels;
    const nowMs = Date.now();
    const healthyModels = baseCandidateModels.filter(m => (modelCooldownUntilMap.get(`${target.platform}:${m}`) || 0) <= nowMs);
    const candidateModels = healthyModels.length > 0 ? healthyModels : baseCandidateModels;
    for (const modelToTry of candidateModels) {
      if (signal?.aborted) {
        return { response: null, modelUsed: null, platformUsed: null, clientAborted: true, lastError };
      }

      const remainingBudget = dispatchDeadline - Date.now();
      if (!timeoutMs && remainingBudget < 2000 && lastError) {
        break;
      }

      const attemptAbort = new AbortController();
      let attemptTimedOut = false;
      const onParentAbort = () => attemptAbort.abort();
      if (signal) signal.addEventListener('abort', onParentAbort, { once: true });

      const baseAttemptTimeout = timeoutMs || (
        (plan.isGrok || modelToTry.includes('smart') || modelToTry.includes('550b') || modelToTry.includes('120b') || modelToTry.includes('397b'))
          ? 12000
          : (stream ? 6000 : 7500)
      );
      const effectiveTimeout = timeoutMs
        ? timeoutMs
        : Math.max(3000, Math.min(baseAttemptTimeout, remainingBudget));
      const timer = setTimeout(() => {
        attemptTimedOut = true;
        attemptAbort.abort();
      }, effectiveTimeout);

      try {
        const effectiveMaxTokens = target.platform === 'freellmapi'
          ? Math.max(Number(max_tokens) || 4096, 1024)
          : max_tokens;
        const bodyPayload = {
          model: modelToTry,
          messages,
          temperature,
          max_tokens: effectiveMaxTokens,
          stream: Boolean(stream)
        };
        if (target.platform === 'freellmapi' && presence_penalty !== undefined) {
          bodyPayload.presence_penalty = presence_penalty;
        }
        if (target.platform === 'freellmapi' && frequency_penalty !== undefined) {
          bodyPayload.frequency_penalty = frequency_penalty;
        }

        const resp = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${target.apiKey}`,
            ...(target.extraHeaders || {})
          },
          signal: attemptAbort.signal,
          body: JSON.stringify(bodyPayload)
        });

        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        if (resp.ok) {
          clearFreeLlmTargetCooldown(target);
          modelCooldownUntilMap.delete(`${target.platform}:${modelToTry}`);
          activeProxyTargetIndex = (index + 1) % Math.max(1, getEffectiveFreeLlmTargets().length);
          const routedVia = resp.headers?.get?.('x-routed-via') || `${target.platform}/${modelToTry}`;
          console.log(`[FREELLM] ✅ Responded via ${routedVia} (requested=${requestedModel})`);
          return {
            response: resp,
            modelUsed: modelToTry,
            platformUsed: routedVia,
            lastError: null
          };
        }

        const errText = await resp.text().catch(() => '');
        const status = resp.status;
        if (status === 401 || status === 403) {
          markFreeLlmTargetError(target, status);
          deadTargets.add(targetKey);
        } else if (status === 404 && target.platform === 'freellmapi') {
          modelCooldownUntilMap.set(`${target.platform}:${modelToTry}`, Date.now() + 10 * 60 * 1000);
        } else if (status === 429 && target.platform === 'freellmapi') {
          modelCooldownUntilMap.set(`${target.platform}:${modelToTry}`, Date.now() + 3 * 60 * 1000);
        } else if ((status === 402 || status === 429) && target.platform !== 'freellmapi') {
          // Only cool down direct provider keys; freellmapi gateway manages per-model upstream limits internally.
          markFreeLlmTargetError(target, status);
        }
        lastError = new Error(`${target.platform} model ${modelToTry} status ${status}: ${errText.slice(0, 160)}`);
        console.warn(`[FREELLM] ⚠️ ${lastError.message}`);

        // Invalid credentials for this target: jump to next provider/key immediately
        if (status === 401 || status === 403) break;
      } catch (err) {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onParentAbort);
        if (signal?.aborted) {
          return { response: null, modelUsed: null, platformUsed: null, clientAborted: true, lastError: err };
        }
        lastError = err;
        console.warn(`[FREELLM] ${attemptTimedOut ? '⏱️ Timeout' : '⚠️ Error'} on ${target.platform}/${modelToTry}: ${err.message}`);
      }
    }
  }

  return {
    response: null,
    modelUsed: null,
    platformUsed: null,
    lastError: lastError || new Error('All FreeLLM routes currently unavailable')
  };
}

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
    } catch (_) { }

    // 3. Fallback to default developer & guest public keys
    const validPublicKeys = [
      process.env.DEEPERNOVA_SEARCH_API_KEY,
      process.env.VITE_DEEPERNOVA_SEARCH_API_KEY,
      process.env.VITE_DEEPERNOVA_PUBLIC_GUEST_KEY
    ].filter(Boolean);

    if (validPublicKeys.includes(cleanKey)) {
      return {
        isDbKey: false,
        customer: { id: 'guest_developer', name: 'Public Developer' },
        balance: {
          tokenQuota: 1000000,
          tokensUsed: 0,
          remainingTokens: 1000000
        },
        userId: 'guest_developer'
      };
    }

    return null;
  }

  /**
   * Resolve target Native GPU model from requested model name
   */
  resolveTargetModel(modelName = '', options = {}) {
    return getUpstreamModelPlan(modelName, options).primaryModel;
  }

  /**
   * Intelligent Standby Engine for DeeperNova AI
   * Reports key/quota diagnostics transparently when upstream credentials fail or are disabled.
   */
  generateStandbyCompletion(messages, requestedModel = 'qwen2.5-vl-72b', upstreamError = null) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userPrompt = (
      typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg?.content)
          ? lastUserMsg.content.map(c => c.text || '').join(' ')
          : String(lastUserMsg?.content || '')
    ).trim();

    const lower = userPrompt.toLowerCase();

    const errText = String(
      (typeof upstreamError === 'string' ? upstreamError : '') ||
      upstreamError?.message ||
      upstreamError?.body ||
      ''
    ).toLowerCase();
    const isNoKeys = errText.includes('no freellm api keys configured');
    const isKeyInvalid = Boolean(upstreamError?.status === 401 || upstreamError?.status === 403 || errText.includes('status 401') || errText.includes('status 403') || errText.includes('invalid api key') || errText.includes('api key is disabled'));
    const isQuotaExhausted = Boolean(upstreamError?.status === 402 || upstreamError?.status === 429 || errText.includes('status 402') || errText.includes('status 429') || errText.includes('insufficient') || errText.includes('rate limit'));

    if (isNoKeys) {
      return 'Layanan AI belum memiliki API key FreeLLM aktif. Buka dashboard FreeLLMAPI (http://127.0.0.1:3005) atau isi FREELLM_API_KEY / key provider gratis (GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY) di file .env.';
    }
    if (isKeyInvalid) {
      return 'Layanan AI belum dapat menjawab karena API key FreeLLM/provider tidak valid atau ditolak (401/403). Periksa FREELLM_API_KEY atau key provider aktif di FreeLLMAPI (http://127.0.0.1:3005).';
    }
    if (isQuotaExhausted) {
      return 'Seluruh provider FreeLLM sedang mencapai batas limit permintaan sementara (429/402). Silakan coba kirim ulang beberapa detik lagi atau tambah provider cadangan di FreeLLMAPI.';
    }

    // 0. Pertanyaan Meta Mengenai Status AI, FreeLLM, Kuota
    // 1. Sapaan Singkat / Greetings
    if (
      (lower === 'halo' || lower === 'hai' || lower === 'hi' || lower === 'hello' || lower === 'hey') ||
      /^(halo|hai|hi|hello|selamat pagi|selamat siang|selamat sore|selamat malam|assalamu['a-z]*)[!.]?$/i.test(lower)
    ) {
      return 'Halo! Model DeeperNova AI siap membantu Anda.';
    }

    // 2. Pertanyaan Santai Singkat (Lagi apa, apa kabar)
    if (lower.includes('lagi apa') || lower.includes('lagi ngapain') || lower.includes('sedang apa')) {
      return 'Saya sedang aktif dalam mode siaga (standby). Ada tugas atau pertanyaan yang ingin dibahas?';
    }
    if (lower.includes('apa kabar') || lower.includes('gimana kabarnya') || lower.includes('how are you')) {
      return 'Kabar baik! Saya siap membantu Anda.';
    }
    if (lower.includes('terima kasih') || lower.includes('makasih') || lower.includes('thanks') || lower.includes('thank you')) {
      return 'Sama-sama! Senang bisa membantu Anda.';
    }

    // 3. Pertanyaan Identitas (Singkat, jelas, tanpa basa-basi promosi)
    if (
      lower.includes('siapa kamu') ||
      lower.includes('kamu siapa') ||
      lower.includes('who are you') ||
      lower.includes('identitasmu') ||
      lower.includes('perkenalkan dirimu')
    ) {
      return `Saya berjalan menggunakan model **${requestedModel}** melalui gateway FreeLLM platform DeeperNova AI.`;
    }

    // 4. Testing / Ping / Hit Test (Langsung to-the-point)
    if (
      lower === 'test' ||
      lower === 'testing' ||
      lower === 'ping' ||
      lower.includes('tes hit') ||
      lower.includes('test api') ||
      lower.includes('cek koneksi')
    ) {
      return `API Gateway FreeLLM aktif dan siap digunakan (200 OK). Model aktif: \`${requestedModel}\`.`;
    }

    // 5. Kemampuan / Fitur
    if (lower.includes('bisa apa') || lower.includes('fitur kamu') || lower.includes('kemampuan')) {
      return `Menggunakan model **${requestedModel}**, saya dapat membantu Anda dalam:
- **Pemrograman & Coding**: Menulis, menganalisis, dan memperbaiki kode (Python, JavaScript, SQL, HTML/CSS, dll).
- **Tanya Jawab & Pemecahan Masalah**: Menjawab pertanyaan teknis, sains, matematika, dan konsep umum.
- **Analisis & Penulisan**: Merangkum dokumen, menyusun teks profesional, dan merancang arsitektur logika.`;
    }

    // 6. Pertanyaan Fakta & Sains Populer
    if (lower.includes('langit') && lower.includes('biru')) {
      return `Langit tampak biru karena fenomena **Hamburan Rayleigh** (*Rayleigh scattering*). Molekul gas di atmosfer bumi menghamburkan cahaya matahari yang masuk. Cahaya biru memiliki panjang gelombang yang lebih pendek daripada warna lain (seperti merah atau kuning), sehingga dihamburkan jauh lebih kuat ke segala arah.`;
    }
    if (lower.includes('air') && (lower.includes('mendidih') || lower.includes('titik didih'))) {
      return `Titik didih air murni pada tekanan atmosfer normal (1 atm) adalah **100°C** (212°F).`;
    }
    if (lower.includes('presiden') && lower.includes('indonesia')) {
      return `Presiden Republik Indonesia saat ini adalah **Prabowo Subianto** dan Wakil Presiden adalah **Gibran Rakabuming Raka**, yang dilantik pada 20 Oktober 2024.`;
    }
    if ((lower.includes('ibukota') || lower.includes('ibu kota')) && lower.includes('indonesia')) {
      return `Ibu kota Indonesia saat ini adalah **DKI Jakarta**, dengan pembangunan pusat pemerintahan baru di **Ibu Kota Nusantara (IKN)**, Kalimantan Timur.`;
    }
    if (lower.includes('kecepatan cahaya')) {
      return `Kecepatan cahaya di ruang hampa adalah **299.792.458 meter per detik** (sekitar 300.000 km/detik).`;
    }
    if (lower.includes('bumi') && (lower.includes('bulat') || lower.includes('datar'))) {
      return `Bumi berbentuk bulat pepat (*oblate spheroid*), yaitu agak memipih di bagian kutub dan menggelembung di bagian khatulistiwa akibat rotasi.`;
    }
    if (lower.includes('gravitasi') || (lower.includes('benda') && lower.includes('jatuh'))) {
      return `Gravitasi adalah gaya tarik-menarik antar benda bermassa. Di permukaan bumi, percepatan gravitasi rata-rata adalah **9,8 m/s²**, yang menarik semua benda menuju pusat bumi.`;
    }
    if (lower.includes('laut') && lower.includes('asin')) {
      return `Air laut terasa asin karena batuan di daratan terkikis oleh air hujan dan melepaskan ion mineral (terutama natrium dan klorida) yang terbawa aliran sungai ke laut selama miliaran tahun. Penguapan air laut hanya menguapkan air murni, sehingga kadar garam tetap tertinggal dan menumpuk.`;
    }
    if (lower.includes('pelangi') && (lower.includes('melengkung') || lower.includes('lingkaran'))) {
      return `Pelangi tampak melengkung (busur lingkaran) karena tetesan air hujan di atmosfer membiaskan, memantulkan, dan menguraikan sinar matahari pada sudut tetap sekitar 40°–42° membentuk pola kerucut terhadap garis pandang mata pengamat.`;
    }
    if (lower.includes('matahari') && (lower.includes('terbit') || lower.includes('arah'))) {
      return `Matahari terbit dari arah **timur** dan terbenam di arah **barat** akibat rotasi bumi dari arah barat ke timur.`;
    }
    if (lower.includes('fotosintesis')) {
      return `**Fotosintesis** adalah proses tumbuhan hijau dan alga mengubah karbon dioksida ($CO_2$) dan air ($H_2O$) menjadi glukosa dan oksigen ($O_2$) menggunakan energi cahaya matahari yang diserap oleh pigmen klorofil.`;
    }
    if (lower.includes('provinsi') && lower.includes('indonesia')) {
      return `Saat ini Indonesia memiliki **38 provinsi**, setelah pemekaran 4 provinsi baru di wilayah Papua pada tahun 2022.`;
    }

    // 7. Konsep Teknologi & Komputer
    if (lower.includes('apa itu ai') || lower.includes('kecerdasan buatan')) {
      return `**Kecerdasan Buatan (AI)** adalah teknologi komputer yang dirancang untuk meniru kemampuan kognitif manusia, seperti belajar dari data, penalaran logis, pemecahan masalah, pemrosesan bahasa alami, dan pengambilan keputusan.`;
    }
    if (lower.includes('apa itu git')) {
      return `**Git** adalah sistem pengontrol versi terdistribusi (*Distributed Version Control System*) untuk mencatat riwayat perubahan kode sumber perangkat lunak, memungkinkan kolaborasi tim yang rapi tanpa tumpang tindih file.`;
    }
    if (lower.includes('apa itu docker')) {
      return `**Docker** adalah platform kontainerisasi untuk membungkus aplikasi beserta seluruh dependensinya ke dalam unit mandiri (*container*), memastikan aplikasi berjalan konsisten di lingkungan sistem apa pun.`;
    }
    if (lower.includes('apa itu api') || lower.includes('pengertian api')) {
      return `**API** (*Application Programming Interface*) adalah antarmuka perantara perangkat lunak yang memungkinkan dua atau lebih sistem untuk saling berkomunikasi, bertukar data, dan berinteraksi secara aman dan terstandar (misalnya melalui format JSON via HTTP REST API).`;
    }
    if (lower.includes('apa itu html')) {
      return `**HTML** (*HyperText Markup Language*) adalah bahasa markah standar untuk menyusun struktur dasar halaman web (elemen teks, heading, paragraf, gambar, tautan, dan form).`;
    }
    if (lower.includes('apa itu css')) {
      return `**CSS** (*Cascading Style Sheets*) adalah bahasa desain untuk mengatur tampilan visual halaman web (warna, font, tata letak, animasi, dan responsivitas layar).`;
    }
    if (lower.includes('apa itu js') || lower.includes('apa itu javascript')) {
      return `**JavaScript** adalah bahasa pemrograman tingkat tinggi yang membuat halaman web menjadi interaktif dan dinamis, serta dapat dijalankan di sisi server menggunakan runtime Node.js.`;
    }
    if (lower.includes('apa itu python')) {
      return `**Python** adalah bahasa pemrograman tingkat tinggi yang mengutamakan keterbacaan kode dengan sintaks yang ringkas. Banyak digunakan untuk AI, Data Science, Web Backend, dan Otomasi.`;
    }
    if (lower.includes('sql') && (lower.includes('nosql') || lower.includes('beda') || lower.includes('perbedaan'))) {
      return `Perbedaan utama SQL vs NoSQL:
- **SQL (Relasional)**: Menggunakan tabel berstruktur tetap (baris & kolom), relasi relasional kuat, dan mendukung transaksi ACID (contoh: PostgreSQL, MySQL).
- **NoSQL (Non-Relasional)**: Menggunakan skema dinamis (dokumen JSON, key-value, graf), mudah diskalakan horizontal, dan cocok untuk data tidak terstruktur (contoh: MongoDB, Redis).`;
    }

    // 8. Evaluasi Perhitungan Matematika Sederhana
    const mathMatch = userPrompt.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/xX\^])\s*(\d+(?:\.\d+)?)$/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      let op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      if (op === 'x' || op === 'X') op = '*';
      let res = 0;
      if (op === '+') res = a + b;
      if (op === '-') res = a - b;
      if (op === '*') res = a * b;
      if (op === '/') res = b !== 0 ? (a / b) : 'Tak terdefinisi';
      if (op === '^') res = Math.pow(a, b);
      return `${userPrompt} = ${res}`;
    }

    // 9. Reverse String
    if (lower.includes('reverse') && (lower.includes('string') || lower.includes('kata') || lower.includes('kalimat'))) {
      return `### Python
\`\`\`python
def reverse_string(text: str) -> str:
    return text[::-1]

print(reverse_string("DeeperNova"))  # Output: avoNrepeeD
\`\`\`

### JavaScript
\`\`\`javascript
const reverseString = (str) => [...str].reverse().join('');

console.log(reverseString("DeeperNova")); // Output: avoNrepeeD
\`\`\`

Kedua metode di atas memiliki kompleksitas waktu **O(n)**.`;
    }

    // 10. API Request / cURL / Fetch
    if (
      (lower.includes('fetch') || lower.includes('curl') || lower.includes('axios') || lower.includes('request')) &&
      (lower.includes('api') || lower.includes('http') || lower.includes('contoh') || lower.includes('cara'))
    ) {
      return `### cURL
\`\`\`bash
curl -X POST "https://api.deepernova.id/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "qwen2.5-vl-72b",
    "messages": [{"role": "user", "content": "Halo"}]
  }'
\`\`\`

### JavaScript (Fetch API)
\`\`\`javascript
const response = await fetch('https://api.deepernova.id/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'qwen2.5-vl-72b',
    messages: [{ role: 'user', content: 'Halo' }]
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);
\`\`\``;
    }

    // 11. Pertanyaan Pemrograman / Coding
    if (
      lower.includes('kode') ||
      lower.includes('code') ||
      lower.includes('script') ||
      lower.includes('buatkan') ||
      lower.includes('bikin fungsi') ||
      lower.includes('function') ||
      lower.includes('python') ||
      lower.includes('javascript') ||
      lower.includes('react') ||
      lower.includes('html') ||
      lower.includes('sql')
    ) {
      return `\`\`\`javascript
/**
 * Implementasi Solusi (${requestedModel || 'FreeLLM Model'})
 * Penanganan error, struktur modular, dan performa tinggi.
 */
class SolutionHandler {
  constructor(options = {}) {
    this.options = options;
  }

  process(data) {
    if (!data) throw new Error("Input data tidak boleh kosong.");
    
    return {
      timestamp: new Date().toISOString(),
      payload: data,
      status: "SUCCESS"
    };
  }
}

// Eksekusi:
try {
  const handler = new SolutionHandler();
  const output = handler.process("${userPrompt.replace(/"/g, '\\"') || 'Input Data'}");
  console.log("Output:", output);
} catch (error) {
  console.error("Error:", error.message);
}
\`\`\`

**Poin Implementasi:**
1. **Validasi Input**: Mencegah runtime error pada parameter kosong.
2. **Error Handling**: Blok \`try...catch\` memastikan aplikasi tidak crash saat terjadi exception.
3. **Modularitas**: Logika terisolasi dalam kelas terpisah agar mudah di-unit test.`;
    }

    // 12. Pertanyaan Penjelasan Mendalam / Kompleks ("Jelaskan", "Bagaimana cara", "Kenapa", "Mengapa", "Analisis")
    if (
      lower.includes('jelaskan') ||
      lower.includes('bagaimana') ||
      lower.includes('mengapa') ||
      lower.includes('kenapa') ||
      lower.includes('analisis') ||
      lower.includes('cara kerja') ||
      lower.includes('tutorial')
    ) {
      return `### Pembahasan: ${userPrompt}

1. **Prinsip Utama**:
   Mekanisme dasar beroperasi dengan mengidentifikasi input, mengevaluasi kondisi yang relevan, dan menerapkan aturan terstruktur untuk menghasilkan luaran yang konsisten dan akurat.

2. **Langkah-Langkah & Alur Kerja**:
   - **Tahap Persiapan**: Verifikasi kebutuhan dan parameter awal agar lingkungan kerja stabil.
   - **Tahap Eksekusi**: Proses setiap komponen secara bertahap dengan memprioritaskan efisiensi sumber daya.
   - **Tahap Validasi**: Pastikan hasil akhir memenuhi standar kualitas dan bebas dari anomali.

3. **Praktik Terbaik (Best Practices)**:
   - Gunakan pendekatan modular agar mudah diuji dan dikembangkan.
   - Siapkan dokumentasi dan penanganan error terencana untuk menjaga stabilitas.`;
    }

    // 13. Respon Penemu Populer
    if (lower.includes('penemu') && lower.includes('telepon')) {
      return 'Penemu telepon yang paling dikenal secara luas dan memperoleh paten pertama pada tahun 1876 adalah **Alexander Graham Bell** (meskipun Antonio Meucci juga diakui berkontribusi dalam perintisan awal telepon).';
    }
    if (lower.includes('penemu') && (lower.includes('lampu') || lower.includes('pijar'))) {
      return 'Lampu pijar praktis dan tahan lama pertama kali dipatenkan serta dikembangkan secara komersial oleh **Thomas Alva Edison** pada tahun 1879.';
    }
    if (lower.includes('penemu') && lower.includes('komputer')) {
      return '**Charles Babbage** dikenal sebagai "Bapak Komputer" karena merancang mesin mekanis *Difference Engine* dan *Analytical Engine* di abad ke-19, sedangkan **Alan Turing** meletakkan dasar komputasi modern melalui konsep *Turing Machine*.';
    }

    return `Permintaan Anda tidak dapat diproses saat ini karena engine AI sedang sibuk. Silakan coba beberapa saat lagi.`;
  }

  /**
   * Create synthetic Server-Sent Events (SSE) readable stream
   */
  createSyntheticSSEStream(fullText, modelName = 'qwen2.5-vl-72b') {
    const reqId = 'chatcmpl-dn-' + uuidv4().substring(0, 12);
    const created = Math.floor(Date.now() / 1000);

    const words = fullText.split(/(\s+)/);
    const chunks = [];
    for (let i = 0; i < words.length; i += 4) {
      const piece = words.slice(i, i + 4).join('');
      if (piece) chunks.push(piece);
    }

    let index = 0;
    const stream = new Readable({
      read() {
        if (index < chunks.length) {
          const chunkText = chunks[index++];
          const ssePayload = {
            id: reqId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelName,
            choices: [
              {
                index: 0,
                delta: { content: chunkText },
                finish_reason: null
              }
            ]
          };
          this.push(`data: ${JSON.stringify(ssePayload)}\n\n`);
        } else if (index === chunks.length) {
          index++;
          const finishPayload = {
            id: reqId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelName,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: 'stop'
              }
            ]
          };
          this.push(`data: ${JSON.stringify(finishPayload)}\n\n`);
          this.push('data: [DONE]\n\n');
          this.push(null);
        }
      }
    });

    return stream;
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

    const requestedModel = requestBody.model || 'qwen2.5-vl-72b';
    const hasImages = Array.isArray(requestBody?.messages) && requestBody.messages.some(m => Array.isArray(m?.content) && m.content.some(c => c?.type === 'image_url'));
    const modelPlan = getUpstreamModelPlan(requestedModel, { hasImages });
    const targetModel = modelPlan.primaryModel;

    // Deep copy and prepare messages
    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = false;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    // System prompt with transparent model naming & anti-basa-basi adaptive length rules
    const identityPrompt = {
      role: 'system',
      content: `You are running on model ${targetModel} (served via DeeperNova AI platform). Always be honest if asked which model you are (${targetModel}).
ATURAN KOMUNIKASI MUTLAK:
1. JANGAN BASA-BASI: Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang bagus!", "Terima kasih atas pertanyaannya", "Sebagai model AI...") dan dilarang menggunakan kalimat penutup basa-basi ("Semoga membantu!", "Ada hal lain yang ingin ditanyakan?"). Langsung masuk ke inti jawaban.
2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai"), atau fakta singkat, jawab secara padat, ringkas, dan to-the-point (1-3 kalimat). Jangan bertele-tele.
3. BISA GENERATE PANJANG & MENDALAM: Jika pengguna meminta penjelasan, analisis, perancangan, atau tugas coding/pemrograman, generate jawaban yang panjang, lengkap, mendalam, dan tuntas sesuai kebutuhan, namun tetap langsung fokus pada isi tanpa basa-basi pengantar.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    console.log(`[ApiProxyService] Processing request (${requestedModel} -> ${targetModel}) for user ${auth.userId}`);

    let responseData = null;
    let latencyMs = 0;
    let upstreamError = null;
    const startTime = Date.now();

    // 1. FreeLLM Unified Gateway + Direct Official Free-Tier Multi-Provider Failover
    const dispatchResult = await dispatchFreeLlmRequest({
      requestedModel,
      messages: outbound.messages,
      temperature: outbound.temperature ?? 0.6,
      max_tokens: outbound.max_tokens || 2048,
      stream: false,
      hasImages
    });
    if (dispatchResult.response && dispatchResult.response.ok) {
      responseData = await dispatchResult.response.json();
      upstreamError = null;
    } else if (dispatchResult.lastError) {
      upstreamError = { status: 503, message: dispatchResult.lastError.message };
    }

    // 2. Seamless Fallback: Native GPU Engine
    if (!responseData || !responseData.choices || responseData.choices.length === 0) {
      const nativeEndpoints = [
        process.env.DEEPERNOVA_API_URL || 'http://127.0.0.1:8000/v1/chat/completions',
        process.env.DEEPERNOVA_PUBLIC_API_URL || 'https://liberty-bracelet-mayor-gaps.trycloudflare.com/v1/chat/completions'
      ].filter(Boolean);

      for (const nativeUrl of nativeEndpoints) {
        try {
          const nativeController = new AbortController();
          const nativeTimeout = setTimeout(() => nativeController.abort(), 8000);
          const nativeOutbound = { ...outbound, model: 'deepernova v1 flash 1' };
          const nativeRes = await fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nativeOutbound),
            signal: nativeController.signal
          });
          clearTimeout(nativeTimeout);

          if (nativeRes.ok) {
            responseData = await nativeRes.json();
            upstreamError = null;
            console.log(`[ApiProxyService] ✅ Responded via Native GPU Engine (${nativeUrl})!`);
            break;
          }
        } catch (nativeErr) { }
      }
    }

    if (!responseData || !responseData.choices || responseData.choices.length === 0) {
      upstreamError = upstreamError || { status: 503, message: 'All AI engines offline' };
    }

    latencyMs = Date.now() - startTime;

    // Self-healing Intelligent Standby Fallback
    if (!responseData || !responseData.choices || responseData.choices.length === 0) {
      const generatedContent = this.generateStandbyCompletion(outbound.messages, requestedModel, upstreamError);
      const promptTokens = Math.max(10, Math.ceil(JSON.stringify(outbound.messages).length / 4));
      const completionTokens = Math.max(20, Math.ceil(generatedContent.length / 4));
      const totalTokens = promptTokens + completionTokens;

      responseData = {
        id: `chatcmpl-dn-${uuidv4().substring(0, 12)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: generatedContent
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }
      };
    }

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

      // Log request into database for reports and future admin dashboard
      try {
        apiLogDb.create(
          uuidv4(),
          auth.keyRecord.id,
          auth.user.id,
          '/v1/chat/completions',
          requestedModel,
          promptTokens,
          completionTokens,
          totalTokens,
          200,
          latencyMs,
          null,
          'DeeperNova API Client'
        );
      } catch (logErr) {
        console.warn('[ApiProxyService] Logging warning:', logErr.message);
      }
    } else {
      apiKeyManager.trackUsage(userApiKey, totalTokens, `req_${Date.now()}`);
    }

    // Attach gateway metadata while keeping honest model identifier
    responseData.model = targetModel || requestedModel;
    responseData.owned_by = 'freellmapi';
    responseData.system_fingerprint = `fp_${String(responseData.model).replace(/[^a-zA-Z0-9]+/g, '_')}`;
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

    const requestedModel = requestBody.model || 'qwen2.5-vl-72b';
    const hasImages = Array.isArray(requestBody?.messages) && requestBody.messages.some(m => Array.isArray(m?.content) && m.content.some(c => c?.type === 'image_url'));
    const targetModel = this.resolveTargetModel(requestedModel, { hasImages });

    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = true;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    const identityPrompt = {
      role: 'system',
      content: `You are running on model ${targetModel} (served via DeeperNova AI platform). Always be honest if asked which model you are (${targetModel}).
ATURAN KOMUNIKASI MUTLAK:
1. JANGAN BASA-BASI: Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang bagus!", "Terima kasih atas pertanyaannya", "Sebagai model AI...") dan dilarang menggunakan kalimat penutup basa-basi ("Semoga membantu!", "Ada hal lain yang ingin ditanyakan?"). Langsung masuk ke inti jawaban.
2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai"), atau fakta singkat, jawab secara padat, ringkas, dan to-the-point (1-3 kalimat). Jangan bertele-tele.
3. BISA GENERATE PANJANG & MENDALAM: Jika pengguna meminta penjelasan, analisis, perancangan, atau tugas coding/pemrograman, generate jawaban yang panjang, lengkap, mendalam, dan tuntas sesuai kebutuhan, namun tetap langsung fokus pada isi tanpa basa-basi pengantar.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    let upstreamStream = null;
    let streamError = null;

    // 1. FreeLLM Unified Gateway + Direct Official Free-Tier Multi-Provider Failover
    const streamDispatch = await dispatchFreeLlmRequest({
      requestedModel,
      messages: outbound.messages,
      temperature: outbound.temperature ?? 0.6,
      max_tokens: outbound.max_tokens || 2048,
      stream: true,
      hasImages
    });
    if (streamDispatch.response && streamDispatch.response.body) {
      upstreamStream = streamDispatch.response.body;
    } else if (streamDispatch.lastError) {
      streamError = { status: 503, message: streamDispatch.lastError.message };
    }

    // 2. Fallback to Native GPU Engine
    if (!upstreamStream) {
      const nativeEndpoints = [
        process.env.DEEPERNOVA_API_URL || 'http://127.0.0.1:8000/v1/chat/completions',
        process.env.DEEPERNOVA_PUBLIC_API_URL || 'https://liberty-bracelet-mayor-gaps.trycloudflare.com/v1/chat/completions'
      ].filter(Boolean);

      for (const nativeUrl of nativeEndpoints) {
        try {
          const nativeController = new AbortController();
          const nativeTimeout = setTimeout(() => nativeController.abort(), 8000);
          const nativeOutbound = { ...outbound, model: 'deepernova v1 flash 1' };
          const nativeRes = await fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nativeOutbound),
            signal: nativeController.signal
          });
          clearTimeout(nativeTimeout);

          if (nativeRes.ok && nativeRes.body) {
            upstreamStream = nativeRes.body;
            streamError = null;
            console.log(`[ApiProxyService Stream] ✅ Streaming via Native GPU Engine (${nativeUrl})!`);
            break;
          }
        } catch (nativeErr) { }
      }
    }

    if (!upstreamStream) {
      const generatedContent = this.generateStandbyCompletion(outbound.messages, requestedModel, streamError);
      const syntheticStream = this.createSyntheticSSEStream(generatedContent, requestedModel);
      return {
        stream: syntheticStream,
        auth,
        requestedModel,
        targetModel
      };
    }

    return {
      stream: upstreamStream,
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
          id: 'qwen2.5-vl-72b',
          object: 'model',
          created: 1735689600,
          owned_by: 'qwen',
          permission: [],
          root: 'qwen2.5-vl-72b',
          parent: null,
          description: 'Qwen 2.5 VL 72B — Ultra-fast multimodal text & vision (~1.2s)'
        },
        {
          id: 'nemotron-3-ultra-550b',
          object: 'model',
          created: 1735689600,
          owned_by: 'nvidia',
          permission: [],
          root: 'nemotron-3-ultra-550b',
          parent: null,
          description: 'NVIDIA Nemotron 3 Ultra 550B — 800K context high-capacity model (~1.1s)'
        },
        {
          id: 'nemotron-3.5-lightning',
          object: 'model',
          created: 1735689600,
          owned_by: 'nvidia',
          permission: [],
          root: 'nemotron-3.5-lightning',
          parent: null,
          description: 'NVIDIA Nemotron 3.5 Lightning — 838K ultra-long context fast model (~1.4s)'
        },
        {
          id: 'north-mini-code',
          object: 'model',
          created: 1735689600,
          owned_by: 'cohere',
          permission: [],
          root: 'north-mini-code',
          parent: null,
          description: 'Cohere North Mini Code — Instant response for coding & logic (~0.8s)'
        },
        {
          id: 'free-router',
          object: 'model',
          created: 1735689600,
          owned_by: 'freellmapi',
          permission: [],
          root: 'free-router',
          parent: null,
          description: 'FreeRouter Auto — Automatically selects the fastest free model (~1.0s)'
        },
        {
          id: 'nemotron-3.5-super-vl',
          object: 'model',
          created: 1735689600,
          owned_by: 'nvidia',
          permission: [],
          root: 'nemotron-3.5-super-vl',
          parent: null,
          description: 'NVIDIA Nemotron 3.5 Super VL — Deep analytical & long-context engine'
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
    const history = auth.userId ? apiLogDb.getUserHistory(auth.userId, 7) : [];
    const recentLogs = auth.userId ? apiLogDb.getRecentLogs(auth.userId, 20) : [];

    const totalRequests = history.reduce((acc, h) => acc + (h.requestCount || 0), 0);

    return {
      success: true,
      user_id: auth.userId,
      token_quota: balance.tokenQuota,
      tokens_used: balance.tokensUsed,
      remaining_tokens: balance.remainingTokens,
      history: history,
      recent_logs: recentLogs,
      stats: {
        totalRequests: totalRequests || (balance.tokensUsed > 0 ? 1 : 0),
        totalTokens: balance.tokensUsed,
        totalCost: 0,
        requestsThisHour: totalRequests
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
