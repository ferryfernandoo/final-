// ============================================================================
// 📱 REAL-TIME MULTI-DEVICE SYNC SERVICE (DEEPERNOVA AI)
// ============================================================================
// Ringan, modular, tanpa membebani server:
// - Hanya sync saat 1 jawaban selesai (stream_done) & user_ask
// - Menghilangkan self-echo dengan deviceId
// - Animasi mengetik (typewriter) halus untuk perangkat penerima
// ============================================================================

const DEVICE_ID_KEY = 'nova_device_id';

/**
 * Mendapatkan ID unik perangkat yang stabil untuk sesi/browser ini
 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (_e) {
    return 'dev_fallback_' + Math.random().toString(36).slice(2, 8);
  }
}

/**
 * Controller animasi mengetik (typewriter effect) adaptif dan performan.
 * Otomatis menyesuaikan kecepatan agar teks panjang tetap selesai dalam 1.5 - 2.5 detik.
 */
export function createTypewriter({
  fullText = '',
  onTick,
  onComplete,
  speedMs = 18
}) {
  let timer = null;
  let cursor = 0;
  let isDone = false;
  const total = fullText.length;

  if (!total) {
    if (typeof onTick === 'function') onTick('', true);
    if (typeof onComplete === 'function') onComplete();
    return { cancel: () => {}, finishNow: () => {} };
  }

  // Hitung jumlah karakter per tick agar animasi terasa mengetik alami namun tidak lambat
  // Target: selesai sekitar 40 - 90 ticks (0.8s - 1.8s)
  const targetTicks = Math.min(80, Math.max(25, Math.floor(total / 18)));
  const stepChars = Math.max(1, Math.ceil(total / targetTicks));

  const tick = () => {
    if (isDone) return;
    cursor += stepChars;
    if (cursor >= total) {
      cursor = total;
      isDone = true;
      if (timer) clearInterval(timer);
      if (typeof onTick === 'function') onTick(fullText, true);
      if (typeof onComplete === 'function') onComplete();
    } else {
      const slice = fullText.slice(0, cursor);
      if (typeof onTick === 'function') onTick(slice, false);
    }
  };

  timer = setInterval(tick, speedMs);

  return {
    cancel: () => {
      isDone = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    finishNow: () => {
      if (isDone) return;
      isDone = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (typeof onTick === 'function') onTick(fullText, true);
      if (typeof onComplete === 'function') onComplete();
    }
  };
}

/**
 * Inisialisasi koneksi Server-Sent Events (SSE) dengan reconnection & device filtering
 */
export function initRealtimeSync({
  isAuthenticated,
  isGuest,
  onUserAsk,
  onStreamDone,
  onConversationsUpdated,
  onDatabaseFormatted,
  onConversationDeleted
}) {
  if (!isAuthenticated || isGuest) {
    return () => {};
  }

  let eventSource = null;
  let reconnectTimer = null;
  let isDisposed = false;
  const deviceId = getDeviceId();

  const connect = () => {
    if (isDisposed) return;

    try {
      const url = `/api/realtime/sync-stream?deviceId=${encodeURIComponent(deviceId)}`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        console.log(`[RealtimeSync] 🟢 Connected (Device: ${deviceId})`);
      };

      // 1. User bertanya di perangkat lain
      eventSource.addEventListener('user_ask', (e) => {
        try {
          const raw = JSON.parse(e.data);
          const payload = raw?.data;
          if (payload && onUserAsk) onUserAsk(payload);
        } catch (_err) {}
      });

      // 2. Jawaban selesai di perangkat lain (server hanya kirim saat 100% selesai)
      eventSource.addEventListener('stream_done', (e) => {
        try {
          const raw = JSON.parse(e.data);
          const payload = raw?.data;
          if (payload && onStreamDone) onStreamDone(payload);
        } catch (_err) {}
      });

      // 3. Daftar percakapan diupdate di perangkat lain
      eventSource.addEventListener('conversations_updated', (e) => {
        try {
          const raw = JSON.parse(e.data);
          if (onConversationsUpdated) onConversationsUpdated(raw?.data);
        } catch (_err) {}
      });

      // 4. Format database akun dari perangkat lain
      eventSource.addEventListener('database_formatted', (e) => {
        try {
          const raw = JSON.parse(e.data);
          if (onDatabaseFormatted) onDatabaseFormatted(raw?.data);
        } catch (_err) {}
      });

      // 5. Percakapan dihapus di perangkat lain
      eventSource.addEventListener('conversation_deleted', (e) => {
        try {
          const raw = JSON.parse(e.data);
          const payload = raw?.data;
          if (payload && onConversationDeleted) onConversationDeleted(payload);
        } catch (_err) {}
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isDisposed) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };
    } catch (_err) {
      if (!isDisposed) {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }
  };

  connect();

  return () => {
    isDisposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
