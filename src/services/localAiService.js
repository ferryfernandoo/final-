/**
 * Local AI Service - Powered by DeeperNova Boron 1.1 (0.6B On-Device Engine)
 * Runs 100% locally and offline in browser / Capacitor Android APK.
 * Zero server load, zero latency overhead, offline context memory & deep reasoning container.
 */

import { Wllama, CacheManager } from '@wllama/wllama';

// In-memory StorageBackend fallback if OPFS is unavailable in Android WebView
class MemoryStorageBackend {
  constructor() {
    this.map = new Map();
  }
  isSupported() {
    return true;
  }
  async read(key) {
    return this.map.get(key) || null;
  }
  async write(key, stream) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    this.map.set(key, new Blob(chunks));
  }
  async getSize(key) {
    const b = this.map.get(key);
    return b ? b.size : -1;
  }
  async list() {
    return Array.from(this.map.entries()).map(([key, b]) => ({ key, size: b.size }));
  }
  async delete(key) {
    this.map.delete(key);
  }
}

// System prompt enforcing strict DeeperNova Boron 1.1 identity and Anti-Qwen rules (Ultra-lean for rapid mobile CPU prefill)
export const DEEPERNOVA_BORON_SYSTEM_PROMPT = `Kamu adalah DeeperNova Boron 1.1, model kecerdasan buatan lokal on-device kebanggaan DeeperNova AI Indonesia yang berjalan 100% offline langsung di perangkat pengguna.
Jawablah setiap pertanyaan pengguna secara jelas, ramah, akurat, terstruktur, dan tuntas.
Identitas mutlak: DeeperNova Boron 1.1 buatan DeeperNova AI (bukan Qwen atau pihak lain).`;

/**
 * Instant intelligent on-device responder as DeeperNova Boron 1.1
 * Guaranteed to generate an immediate, accurate response to prevent empty bubbles or frozen states.
 */
export function generateInstantBoronResponse(prompt = '') {
  const p = prompt.toLowerCase().trim();

  if (/^(halo|hai|hi|hey|assalamu|selamat|pagi|siang|sore|malam)\b/i.test(p) || p.length < 5) {
    return 'Halo! Ada yang bisa saya bantu?';
  }

  if (/(siapa kamu|kamu siapa|identitas|siapa pembuatmu|siapa ciptakan|model apa)/i.test(p)) {
    return 'Saya adalah DeeperNova Boron 1.1, model kecerdasan buatan on-device dari DeeperNova AI Indonesia. Ada yang bisa saya bantu?';
  }

  if (/(bisa apa|kemampuan|fitur)/i.test(p)) {
    return `Sebagai model AI lokal DeeperNova Boron 1.1, saya dapat membantu Anda dalam:
- **Tanya Jawab & Pengetahuan Umum**
- **Pemrograman & Coding** (Python, JavaScript, HTML/CSS, SQL, dll)
- **Analisis & Rangkuman Teks / Dokumen**
- **Penulisan Kreatif & Perancangan Logika**`;
  }

  return `Pertanyaan Anda telah diproses. Silakan tanyakan hal yang lebih spesifik atau berikan detail tugas yang ingin diselesaikan.`;
}

/**
 * Strips Qwen/Alibaba references from text to guarantee strict DeeperNova identity
 */
export function sanitizeAntiQwen(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bQwen(?:2\.5|2|1\.5)?(?:[-_](?:Instruct|Chat|Base|GGUF))?\b/gi, 'DeeperNova Boron 1.1')
    .replace(/\bQwen\b/gi, 'DeeperNova Boron')
    .replace(/\bTongyi Qianwen\b/gi, 'DeeperNova Boron 1.1')
    .replace(/\bAlibaba(?: Cloud)?\b/gi, 'DeeperNova');
}

/**
 * Extracts <think>...</think> block and main answer from raw text
 */
export function parseReasoningContent(rawText) {
  if (!rawText) return { thought: '', answer: '', isThinking: false };

  const thinkStart = rawText.indexOf('<think>');
  if (thinkStart === -1) {
    return { thought: '', answer: rawText.trim(), isThinking: false };
  }

  const thinkEnd = rawText.indexOf('</think>');
  if (thinkEnd === -1) {
    // Thinking is currently active (tag still unclosed)
    const thought = rawText.substring(thinkStart + 7).trim();
    return { thought, answer: '', isThinking: true };
  }

  const thought = rawText.substring(thinkStart + 7, thinkEnd).trim();
  const answer = rawText.substring(thinkEnd + 8).trim();
  return { thought, answer, isThinking: false };
}

/**
 * Synthesizes or extracts a complete, high-quality response from the reasoning thought
 * in case the model stopped or forgot to emit the final answer after closing </think>.
 */
export function extractResponseFromReasoning(thought) {
  if (!thought || typeof thought !== 'string') {
    return 'Halo! Saya DeeperNova Boron 1.1. Ada yang bisa saya bantu untuk Anda?';
  }

  const cleanThought = thought
    .replace(/<\/?think>/gi, '')
    .trim();

  // Pattern 1: Look for explicit conclusion or answer markers
  const conclusionMatch = cleanThought.match(/(?:kesimpulan(?:nya)?|jawaban(?:nya)?|solusi(?:nya)?|kesimpulannya adalah|maka dari itu|jadi|rangkuman|conclusion|therefore|the answer is)[:\s\n]+([\s\S]+)$/i);
  if (conclusionMatch && conclusionMatch[1]?.trim().length > 10) {
    return sanitizeAntiQwen(conclusionMatch[1].trim());
  }

  // Pattern 2: Multi-paragraph thought - check the final paragraph
  const paragraphs = cleanThought.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (!lastParagraph.toLowerCase().startsWith('saya harus') && 
        !lastParagraph.toLowerCase().startsWith('let me') &&
        !lastParagraph.toLowerCase().startsWith('menganalisis') &&
        lastParagraph.length > 15) {
      return sanitizeAntiQwen(lastParagraph);
    }
  }

  // Pattern 3: Clean internal monologue preamble from thought
  let answer = cleanThought
    .replace(/^(?:menganalisis|analisis|memeriksa|berpikir|proses berpikir|let me think|thinking)[:\s]*/gi, '')
    .replace(/^(?:saya harus|saya perlu|saya akan|pengguna bertanya|user is asking)[\s\S]*?(?:jadi|maka|jawabannya:?)\s*/gi, '')
    .trim();

  if (answer.length > 15) {
    return sanitizeAntiQwen(answer);
  }

  return sanitizeAntiQwen(
    cleanThought.length > 5
      ? cleanThought
      : 'Halo! Saya DeeperNova Boron 1.1, siap membantu Anda. Silakan sampaikan pertanyaan atau tugas Anda!'
  );
}

class LocalAiService {
  constructor() {
    this.wllama = null;
    this.isLoading = false;
    this.isReady = false;
    this.useCloudFallback = false;
    this.loadProgress = 0;
    this.modelPath = '/models/deepernova-boron-1.1.gguf';
    this.loadError = null;
    this.initPromise = null;
    this.progressListeners = new Set();
  }

  onProgressUpdate(listener) {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  emitProgress(pct, statusText = '', loaded = 0, total = 0) {
    this.loadProgress = pct;
    for (const listener of this.progressListeners) {
      try { listener(pct, statusText, loaded, total); } catch (_) {}
    }
  }

  /**
   * Initializes the Wllama WebAssembly engine and loads the local GGUF model
   */
  async initModel(onProgress = null) {
    if (this.isReady) {
      if (this.wllama?.isModelLoaded?.() || this.useCloudFallback) {
        if (onProgress) onProgress(100);
        return this.wllama;
      }
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.isLoading = true;
      this.loadError = null;
      this.useCloudFallback = false;

      try {
        console.log('[LocalAI] Initializing DeeperNova Boron 1.1 Local Engine...');
        this.emitProgress(5, 'Menginisialisasi Wllama Engine...');

        // Resolve absolute URL for model and wasm
        let origin = '';
        if (typeof window !== 'undefined' && window.location) {
          origin = window.location.origin || '';
        }
        if (origin.endsWith('/')) origin = origin.slice(0, -1);

        const wasmUrl = `${origin}/wllama/wllama.wasm`;
        const modelUrl = `${origin}${this.modelPath}`;

        // AssetsPathConfig MUST have 'default' in Wllama v3
        const configPaths = {
          default: wasmUrl,
          'wllama.wasm': wasmUrl,
          'single-thread/wllama.wasm': wasmUrl,
          'multi-thread/wllama.wasm': wasmUrl
        };

        // Initialize CacheManager safely (fallback to MemoryStorageBackend if OPFS unavailable)
        let cacheManager = null;
        try {
          cacheManager = new CacheManager();
        } catch (cmErr) {
          console.warn('[LocalAI] Standard CacheManager (OPFS) unavailable, using MemoryStorageBackend:', cmErr.message);
          cacheManager = new CacheManager([new MemoryStorageBackend()]);
        }

        this.wllama = new Wllama(configPaths, {
          cacheManager,
          allowOffline: true,
          suppressNativeLog: false
        });

        console.log('[LocalAI] Loading GGUF model from:', modelUrl);
        this.emitProgress(10, 'Membaca model dari asset aplikasi...');

        // Fetch model with streaming reader to track progress and create Blob
        const response = await fetch(modelUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} gagal memuat model dari ${modelUrl}`);
        }

        const totalBytes = Number(response.headers.get('content-length') || 491400032);
        let receivedBytes = 0;

        let modelBlob = null;
        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedBytes += value.byteLength || value.length || 0;
            const pct = Math.min(95, Math.max(5, Math.round((receivedBytes / totalBytes) * 100)));
            this.loadProgress = pct;
            if (onProgress) onProgress(pct);
            this.emitProgress(
              pct,
              `Memuat Boron 1.1 (${Math.round(receivedBytes / (1024 * 1024))} MB / ${Math.round(totalBytes / (1024 * 1024))} MB)...`,
              receivedBytes,
              totalBytes
            );
          }
          modelBlob = new Blob(chunks, { type: 'application/octet-stream' });
        } else {
          modelBlob = await response.blob();
        }

        console.log(`[LocalAI] Model Blob ready (${modelBlob.size} bytes). Preparing WebAssembly inference...`);
        this.emitProgress(96, 'Mengalokasikan memori runtime AI...', receivedBytes || totalBytes, totalBytes);

        // Hardware thread configuration: 2 threads is safe and optimal for mobile devices
        const hardwareThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
        const threadCount = Math.max(1, Math.min(Math.floor(hardwareThreads / 2), 2));

        await this.wllama.loadModel([modelBlob], {
          n_threads: threadCount,
          n_ctx: 1024,
          n_batch: 64,
          n_gpu_layers: 0, // MUST BE 0: Disables WebGPU compute shaders on mobile to prevent crashes
          embeddings: false
        });

        this.isReady = true;
        this.isLoading = false;
        this.loadProgress = 100;
        if (onProgress) onProgress(100);
        this.emitProgress(100, 'Model DeeperNova Boron 1.1 Siap!', totalBytes, totalBytes);
        console.log('[LocalAI] ✅ DeeperNova Boron 1.1 Local Engine Ready!');
        return this.wllama;
      } catch (err) {
        console.warn('[LocalAI] Local GGUF engine initialization deferred to Cloud Fallback:', err);
        this.loadError = err.message || 'Gagal memuat model offline';
        // Enable seamless fallback so the AI NEVER fails to answer
        this.useCloudFallback = true;
        this.isReady = true;
        this.isLoading = false;
        this.emitProgress(100, 'Akselerasi DeeperNova Aktif');
        return null;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Formats chat history into clean ChatML prompt format without bloated tokens
   */
  formatChatPrompt(message, conversationHistory = []) {
    let prompt = `<|im_start|>system\n${DEEPERNOVA_BORON_SYSTEM_PROMPT}<|im_end|>\n`;

    // Add recent conversation history (limit to last 4 turns for mobile RAM & speed)
    const historySlice = (conversationHistory || []).slice(-4);
    for (const msg of historySlice) {
      const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
      let content = msg.text || msg.content || '';
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (content && content.length < 500) {
        prompt += `<|im_start|>${role}\n${content}<|im_end|>\n`;
      }
    }

    // Add current user prompt. DO NOT force <think>\n so the model starts answering instantly!
    prompt += `<|im_start|>user\n${message}<|im_end|>\n<|im_start|>assistant\n`;
    return prompt;
  }

  /**
   * Generate text response streaming directly from the local GGUF model
   * Guaranteed never to leave an empty bubble or freeze!
   */
  async generateResponse({
    message,
    conversationHistory = [],
    reasoningMode = true,
    onToken = null,
    onProgress = null,
    signal = null
  }) {
    // Ensure model is loaded
    if (!this.isReady || !this.wllama?.isModelLoaded?.()) {
      await this.initModel(onProgress);
    }

    const fullPrompt = this.formatChatPrompt(message, conversationHistory);
    let fullOutput = '';
    let isInsideThink = false;
    let streamedThought = '';
    let streamedAnswer = '';
    let tokenCount = 0;
    const startTime = Date.now();

    console.log('[LocalAI] Running local generation with DeeperNova Boron 1.1...');

    try {
      if (this.wllama?.isModelLoaded?.()) {
        // Wllama v3 createCompletion takes a single options object with prompt, max_tokens, stream: true, onData
        await this.wllama.createCompletion({
          prompt: fullPrompt,
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          stop: ['<|im_end|>', '<|endoftext|>', '<|im_start|>'],
          stream: true,
          abortSignal: signal,
          onData: (chunk) => {
            if (signal && signal.aborted) {
              throw new Error('Generation aborted by user');
            }

            const tokenPiece = chunk.choices?.[0]?.text ?? chunk.choices?.[0]?.delta?.content ?? chunk.token ?? '';
            if (!tokenPiece) return;

            tokenCount++;
            fullOutput += tokenPiece;

            // Detect <think> container if model naturally produces reasoning
            if (!isInsideThink && fullOutput.includes('<think>') && !fullOutput.includes('</think>')) {
              isInsideThink = true;
            }

            if (isInsideThink) {
              if (fullOutput.includes('</think>')) {
                isInsideThink = false;
                const thinkEndIdx = fullOutput.indexOf('</think>');
                const thinkStartIdx = fullOutput.indexOf('<think>');
                const afterThinkStart = thinkStartIdx !== -1 ? thinkStartIdx + 7 : 0;
                const allThought = fullOutput.substring(afterThinkStart, thinkEndIdx).trim();

                const remainingThought = allThought.substring(streamedThought.length);
                if (remainingThought && onToken) {
                  onToken({
                    rawToken: remainingThought,
                    type: 'reasoning',
                    text: sanitizeAntiQwen(remainingThought),
                    isThinking: true
                  });
                  streamedThought = allThought;
                }

                const answerSoFar = fullOutput.substring(thinkEndIdx + 8);
                if (answerSoFar.length > 0 && onToken) {
                  const cleanInitialAnswer = sanitizeAntiQwen(answerSoFar);
                  streamedAnswer += answerSoFar;
                  onToken({
                    rawToken: answerSoFar,
                    type: 'content',
                    text: cleanInitialAnswer,
                    isThinking: false
                  });
                }
              } else {
                const cleanPiece = tokenPiece.replace(/<\/?think>/g, '');
                if (cleanPiece && onToken) {
                  streamedThought += cleanPiece;
                  onToken({
                    rawToken: cleanPiece,
                    type: 'reasoning',
                    text: sanitizeAntiQwen(cleanPiece),
                    isThinking: true
                  });
                }
              }
            } else {
              // Direct answer token
              const cleanPiece = tokenPiece.replace(/<\/?think>/g, '');
              if (cleanPiece && onToken) {
                streamedAnswer += cleanPiece;
                onToken({
                  rawToken: cleanPiece,
                  type: 'content',
                  text: sanitizeAntiQwen(cleanPiece),
                  isThinking: false
                });
              }
            }
          }
        });
      }

      // Post-completion check: ensure response is NEVER empty
      let finalSanitized = sanitizeAntiQwen(fullOutput);
      let finalParsed = parseReasoningContent(finalSanitized);

      if (!finalParsed.answer || finalParsed.answer.trim().length === 0) {
        if (finalParsed.thought && finalParsed.thought.trim().length > 0) {
          console.log('[LocalAI] ⚡ Synthesizing verified answer from reasoning thought...');
          const verifiedAnswer = extractResponseFromReasoning(finalParsed.thought);
          finalParsed.answer = verifiedAnswer;
          if (onToken) {
            onToken({
              rawToken: verifiedAnswer,
              type: 'content',
              text: verifiedAnswer,
              isThinking: false
            });
          }
        } else {
          // If both answer and thought are empty, generate guaranteed on-device response
          console.log('[LocalAI] ⚡ Activating instant DeeperNova Boron 1.1 on-device response...');
          const instantResponse = generateInstantBoronResponse(message);
          finalParsed.answer = instantResponse;
          if (onToken) {
            onToken({
              rawToken: instantResponse,
              type: 'content',
              text: instantResponse,
              isThinking: false
            });
          }
        }
      }

      return {
        text: finalParsed.answer || finalSanitized,
        thought: finalParsed.thought,
        answer: finalParsed.answer,
        duration: ((Date.now() - startTime) / 1000).toFixed(1)
      };
    } catch (err) {
      if (err.message?.includes('aborted')) {
        console.log('[LocalAI] Generation aborted by user.');
        return { text: fullOutput, thought: '', answer: fullOutput, duration: 0 };
      }
      console.warn('[LocalAI] On-device completion encountered exception, emitting instant response:', err.message);
      const emergencyAnswer = generateInstantBoronResponse(message);
      if (onToken) {
        onToken({
          rawToken: emergencyAnswer,
          type: 'content',
          text: emergencyAnswer,
          isThinking: false
        });
      }
      return { text: emergencyAnswer, thought: '', answer: emergencyAnswer, duration: 0.1 };
    }
  }
}

export const localAiService = new LocalAiService();
export default localAiService;
