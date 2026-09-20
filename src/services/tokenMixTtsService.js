/**
 * TokenMix Text-to-Speech Service (Secure Server-Routed)
 * Converts text to speech using backend /api/tts endpoint
 * API keys and TokenMix provider calls are 100% securely isolated on the server.
 */

import { API_BASE_URL } from '../apiConfig.js';

class TokenMixTtsService {
  constructor() {
    this.cache = new Map();  // Cache audio Blobs by text hash
    this.isPlaying = false;
    this.currentAudio = null;
  }

  /**
   * Detect if text is primarily Indonesian
   */
  detectLanguage(text) {
    const indonesianKeywords = [
      'yang', 'untuk', 'dengan', 'ini', 'adalah', 'dari', 'ke', 'di',
      'apa', 'siapa', 'bagaimana', 'mengapa', 'berapa', 'kapan',
      'atau', 'dan', 'tidak', 'ada', 'bisa', 'akan', 'sudah',
      'terima', 'mohon', 'tolong', 'terima kasih', 'sama-sama'
    ];
    
    const lowerText = text.toLowerCase();
    let indonesianCount = 0;
    
    for (const keyword of indonesianKeywords) {
      if (lowerText.includes(keyword)) {
        indonesianCount++;
      }
    }
    
    return indonesianCount >= 3;
  }

  /**
   * Select optimal voice for language
   * Indonesian sounds best with 'nova' voice
   */
  selectVoiceForLanguage(text) {
    const isIndonesian = this.detectLanguage(text);
    if (isIndonesian) {
      return 'nova';
    }
    return 'alloy';
  }

  /**
   * Generate hash for text to use as cache key
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
   * Text to Speech - fetch audio securely via server proxy
   * @param {string} text - Text to convert to speech
   * @param {string} voice - Voice option: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
   * @returns {Promise<Blob>} Audio blob
   */
  async textToSpeech(text, voice = null) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for TTS');
      }

      const selectedVoice = voice || this.selectVoiceForLanguage(text);
      console.log('[TTS] 🌍 Language detected, using voice:', selectedVoice);

      const cacheKey = `${this.generateHash(text)}_${selectedVoice}`;
      if (this.cache.has(cacheKey)) {
        console.log('[TTS] 📦 Using cached audio for:', text.substring(0, 50));
        return this.cache.get(cacheKey);
      }

      console.log('[TTS] 🎤 Requesting secure speech from server for:', text.substring(0, 80));

      const MAX_CHARS = 3000;
      const truncatedText = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) + '...' : text;
      
      const response = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          model: 'tts-1',
          input: truncatedText,
          voice: selectedVoice
        })
      });

      if (!response.ok) {
        console.error(`[TTS] Server error: ${response.status}`);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();

      this.cache.set(cacheKey, audioBlob);
      console.log('[TTS] ✅ Speech generated successfully via server');

      return audioBlob;
    } catch (error) {
      console.error('[TTS] Error:', error.message);
      throw error;
    }
  }

  /**
   * Play audio blob
   * @param {Blob} audioBlob - Audio blob to play
   * @param {Function} onEnded - Callback when audio finishes
   */
  play(audioBlob, onEnded) {
    try {
      if (this.currentAudio) {
        this.stop();
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      this.isPlaying = true;

      this.currentAudio.onended = () => {
        this.isPlaying = false;
        if (onEnded) onEnded();
        URL.revokeObjectURL(audioUrl);
      };

      this.currentAudio.onerror = (error) => {
        console.error('[TTS] Playback error:', error);
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
      };

      this.currentAudio.play();
      console.log('[TTS] ▶️ Playing audio');
    } catch (error) {
      console.error('[TTS] Playback error:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  /**
   * Stop playing audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      console.log('[TTS] ⏹️ Audio stopped');
    }
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
