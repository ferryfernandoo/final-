/**
 * DeeperNova High-Fidelity Text-to-Speech (TTS) Service
 * Powered directly by DeeperNova Neural Speech Engine (/api/tts)
 * Resilient Fallback: Browser Local Web Speech API (window.speechSynthesis)
 * Strictly zero caching: guarantees every message always synthesizes and speaks its own fresh content.
 */

import { API_BASE_URL } from '../apiConfig.js';

class DeepernovaTtsService {
  constructor() {
    this.isPlaying = false;
    this.currentAudio = null;
    this.currentAudioUrl = null;
    this.currentUtterance = null;
    this.currentAbortController = null;
    this.audioContext = null;
    this.isUnlocked = false;
    this.lastSpokenText = '';
  }

  /**
   * Unlock browser audio playback policy upon user gesture
   */
  unlockAudio() {
    try {
      if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      if (!this.isUnlocked) {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentAudio.volume = 0.001;
        silentAudio.play().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      }
    } catch (_) {}
  }

  /**
   * Detect if text is primarily Indonesian
   */
  detectLanguage(text) {
    if (!text) return true;
    const indonesianKeywords = [
      'yang', 'untuk', 'dengan', 'ini', 'adalah', 'dari', 'ke', 'di',
      'apa', 'siapa', 'bagaimana', 'mengapa', 'berapa', 'kapan',
      'atau', 'dan', 'tidak', 'ada', 'bisa', 'akan', 'sudah',
      'terima', 'mohon', 'tolong', 'terima kasih', 'sama-sama',
      'halo', 'hai', 'selamat', 'pagi', 'siang', 'sore', 'malam',
      'saya', 'kamu', 'anda', 'kita', 'mereka'
    ];

    const lowerText = text.toLowerCase();
    let indonesianCount = 0;
    for (const keyword of indonesianKeywords) {
      if (lowerText.includes(keyword)) {
        indonesianCount++;
      }
    }
    return indonesianCount >= 2;
  }

  /**
   * Select optimal neural voice for language
   */
  selectVoiceForLanguage(text) {
    const isIndonesian = this.detectLanguage(text);
    return isIndonesian ? 'nova' : 'alloy';
  }

  /**
   * Clean text for natural speech synthesis
   */
  cleanText(raw) {
    if (!raw) return '';
    return raw
      .replace(/<think[\s\S]*?<\/think>/gi, '')
      .replace(/<reasoning[\s\S]*?<\/reasoning>/gi, '')
      .replace(/<thought[\s\S]*?<\/thought>/gi, '')
      .replace(/<\/?(?:reasoning|thought|think|action_pill)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[\s\S]*?\]/gi, '')
      .replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]/gi, '')
      .replace(/\[(?:MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|REMINDER_REQUEST|NAVIGATE_UNIVERSE|SEARCH_REQUEST)[\s\S]*?\]/gi, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, 'tautan')
      .replace(/[#*_~>]/g, ' ')
      .replace(/&/g, ' dan ')
      .replace(/[<>{}\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Convert text to speech.
   * Primary: Fetch natural neural audio from server /api/tts (Zero caching, always real-time fresh)
   * Fallback: Returns null so caller can invoke speakWebSpeech
   * @param {string} text - Text to convert to speech
   * @param {string} voice - Voice option
   * @returns {Promise<Blob|null>} Audio blob or null if fallback to WebSpeech
   */
  async textToSpeech(text, voice = null) {
    try {
      const cleaned = this.cleanText(text);
      if (!cleaned || cleaned.length === 0) {
        throw new Error('Text is required for TTS');
      }

      this.lastSpokenText = cleaned;
      const selectedVoice = voice || this.selectVoiceForLanguage(cleaned);

      // Abort any previous pending fetch
      if (this.currentAbortController) {
        this.currentAbortController.abort();
      }
      this.currentAbortController = new AbortController();

      const maxChars = 3200;
      let truncatedText = cleaned;
      if (truncatedText.length > maxChars) {
        const boundary = truncatedText.lastIndexOf('.', maxChars);
        truncatedText = (boundary > 1000 ? truncatedText.substring(0, boundary + 1) : truncatedText.substring(0, maxChars)).trim();
      }

      console.log('[DEEPERNOVA_TTS] 🎙️ Requesting speech synthesis:', truncatedText.substring(0, 60));

      // Append timestamp query parameter to strictly bypass any browser/proxy HTTP caches
      const response = await fetch(`${API_BASE_URL}/api/tts?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        credentials: 'include',
        signal: this.currentAbortController.signal,
        body: JSON.stringify({
          model: 'tts-1',
          input: truncatedText,
          voice: selectedVoice
        })
      });

      if (!response.ok) {
        console.warn(`[DEEPERNOVA_TTS] Server endpoint returned ${response.status}, switching to Web Speech fallback`);
        return null;
      }

      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) {
        return null;
      }

      console.log(`[DEEPERNOVA_TTS] ✅ Audio received (${audioBlob.size} bytes) for: "${truncatedText.substring(0, 40)}"`);
      return audioBlob;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[DEEPERNOVA_TTS] Request cancelled by newer speech');
        throw error;
      }
      console.warn('[DEEPERNOVA_TTS] Server speech synthesis failed, using local PC fallback:', error.message);
      return null;
    } finally {
      this.currentAbortController = null;
    }
  }

  /**
   * Reset cache / in-flight memories
   */
  clearCache() {
    this.stop();
    this.lastSpokenText = '';
  }

  /**
   * Play audio blob with automatic error recovery
   * @param {Blob} audioBlob - Audio blob to play
   * @param {Function} onEnded - Callback when audio finishes
   * @param {Function} onError - Callback on error
   * @param {string} text - Exact clean text for fallback
   */
  play(audioBlob, onEnded, onError, text = null) {
    const fallbackText = (text && typeof text === 'string') ? text.trim() : '';
    try {
      this.stop();

      if (!audioBlob) {
        if (fallbackText) {
          this.speakWebSpeech(fallbackText, null, onEnded);
        } else if (onEnded) {
          onEnded();
        }
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudioUrl = audioUrl;
      this.currentAudio = new Audio(audioUrl);
      this.isPlaying = true;

      const cleanup = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        if (this.currentAudioUrl) {
          try { URL.revokeObjectURL(this.currentAudioUrl); } catch (_) {}
          this.currentAudioUrl = null;
        }
      };

      this.currentAudio.onended = () => {
        cleanup();
        if (onEnded) onEnded();
      };

      this.currentAudio.onerror = (err) => {
        console.warn('[DEEPERNOVA_TTS] Audio playback error, falling back to Web Speech:', err);
        cleanup();
        if (fallbackText) {
          this.speakWebSpeech(fallbackText, null, onEnded);
        } else if (onEnded) {
          onEnded();
        }
      };

      const playPromise = this.currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[DEEPERNOVA_TTS] Audio autoplay blocked or interrupted:', err.message);
          cleanup();
          if (fallbackText) {
            this.speakWebSpeech(fallbackText, null, onEnded);
          } else if (onEnded) {
            onEnded();
          }
        });
      }
    } catch (error) {
      console.error('[DEEPERNOVA_TTS] Playback error:', error);
      this.stop();
      if (fallbackText) {
        this.speakWebSpeech(fallbackText, null, onEnded);
      } else if (onEnded) {
        onEnded();
      }
    }
  }

  /**
   * Client-side fallback using Browser Web Speech API (runs 100% locally on PC)
   */
  speakWebSpeech(text, voice = null, onEnded = null) {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('[DEEPERNOVA_TTS] Web Speech API not available in this browser');
        if (onEnded) onEnded();
        return;
      }

      const cleaned = this.cleanText(text);
      if (!cleaned) {
        if (onEnded) onEnded();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const isIndonesian = this.detectLanguage(cleaned);
      utterance.lang = isIndonesian ? 'id-ID' : 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langPrefix = isIndonesian ? 'id' : 'en';
        const bestVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith(langPrefix) && 
          (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Microsoft'))
        ) || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));

        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onEnded) onEnded();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onEnded) onEnded();
      };

      this.currentUtterance = utterance;
      this.isPlaying = true;
      window.speechSynthesis.speak(utterance);
      console.log('[DEEPERNOVA_TTS] 📢 Speaking via PC Web Speech API:', cleaned.substring(0, 40));
    } catch (err) {
      console.error('[DEEPERNOVA_TTS] Web Speech API failure:', err);
      this.isPlaying = false;
      if (onEnded) onEnded();
    }
  }

  /**
   * Stop all currently playing audio immediately
   */
  stop() {
    try {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }

      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }

      if (this.currentAudioUrl) {
        try { URL.revokeObjectURL(this.currentAudioUrl); } catch (_) {}
        this.currentAudioUrl = null;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      this.currentUtterance = null;
      this.isPlaying = false;
    } catch (_) {}
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }
}

export const deepernovaTtsService = new DeepernovaTtsService();
export default deepernovaTtsService;
