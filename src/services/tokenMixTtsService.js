/**
 * DeeperNova High-Fidelity Text-to-Speech (TTS) Service
 * Primary: Edge Neural TTS via backend /api/tts endpoint (Natural, Ultra-Fast, Human-Like Indonesian & English)
 * Resilient Fallback: Browser Local Web Speech API (window.speechSynthesis)
 * Includes AudioContext unlocking, in-flight request abort, and cache support.
 */

import { API_BASE_URL } from '../apiConfig.js';

class TokenMixTtsService {
  constructor() {
    this.cache = new Map(); // Cache audio Blobs by text hash
    this.isPlaying = false;
    this.currentAudio = null;
    this.currentUtterance = null;
    this.currentAbortController = null;
    this.audioContext = null;
    this.isUnlocked = false;
    this.lastSpokenText = '';
  }

  /**
   * Unlock browser audio playback policy upon any user gesture (click, enter, mic, toggle)
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
        // Microscopic 1-sample silent WAV to unlock HTML5 <audio> elements
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
   * Select optimal voice for language
   */
  selectVoiceForLanguage(text) {
    const isIndonesian = this.detectLanguage(text);
    return isIndonesian ? 'nova' : 'alloy';
  }

  /**
   * Generate simple hash for text to use as cache key
   */
  generateHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean text for clean speech synthesis
   */
  cleanText(raw) {
    if (!raw) return '';
    return raw
      .replace(/<think[\s\S]*?<\/think>/gi, '')
      .replace(/<reasoning[\s\S]*?<\/reasoning>/gi, '')
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
   * Primary: Fetch natural neural audio from server /api/tts
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
      const cacheKey = `${this.generateHash(cleaned)}_${selectedVoice}`;

      if (this.cache.has(cacheKey)) {
        console.log('[TTS] 📦 Using cached audio for speech');
        return this.cache.get(cacheKey);
      }

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

      console.log('[TTS] 🎤 Requesting Neural Speech from local server:', truncatedText.substring(0, 60));

      const response = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: this.currentAbortController.signal,
        body: JSON.stringify({
          model: 'tts-1',
          input: truncatedText,
          voice: selectedVoice
        })
      });

      if (!response.ok) {
        console.warn(`[TTS] Server endpoint returned ${response.status}, switching to Web Speech fallback`);
        return null; // Fallback to client-side speech
      }

      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) {
        return null;
      }

      this.cache.set(cacheKey, audioBlob);
      console.log(`[TTS] ✅ Neural audio received (${audioBlob.size} bytes)`);
      return audioBlob;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[TTS] Request cancelled by newer speech');
        throw error;
      }
      console.warn('[TTS] Network/Server speech synthesis failed, using local PC fallback:', error.message);
      return null;
    } finally {
      this.currentAbortController = null;
    }
  }

  /**
   * Clear cached audio blobs and reset speech memory
   */
  clearCache() {
    this.cache.clear();
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
        // Fallback to Web Speech API
        if (fallbackText) {
          this.speakWebSpeech(fallbackText, null, onEnded);
        } else if (onEnded) {
          onEnded();
        }
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      this.isPlaying = true;

      this.currentAudio.onended = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        if (onEnded) onEnded();
        URL.revokeObjectURL(audioUrl);
      };

      this.currentAudio.onerror = (err) => {
        console.warn('[TTS] Audio playback error, falling back to Web Speech:', err);
        this.isPlaying = false;
        this.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
        // Fallback to Web Speech API
        if (fallbackText) {
          this.speakWebSpeech(fallbackText, null, onEnded);
        } else if (onEnded) {
          onEnded();
        }
      };

      const playPromise = this.currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[TTS] Audio autoplay blocked or interrupted:', err.message);
          this.isPlaying = false;
          // Fallback to Web Speech API
          if (fallbackText) {
            this.speakWebSpeech(fallbackText, null, onEnded);
          } else if (onEnded) {
            onEnded();
          }
        });
      }
    } catch (error) {
      console.error('[TTS] Playback error:', error);
      this.isPlaying = false;
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
        console.warn('[TTS] Web Speech API not available in this browser');
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

      // Try selecting the highest quality available voice on PC
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
      console.log('[TTS] 📢 Speaking via PC Web Speech API');
    } catch (err) {
      console.error('[TTS] Web Speech API failure:', err);
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

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[TTS] 🗑️ Cache cleared');
  }
}

export const tokenMixTtsService = new TokenMixTtsService();
export default tokenMixTtsService;
