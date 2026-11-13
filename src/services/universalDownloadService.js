import { API_BASE_URL } from '../apiConfig';
import { nativeBridge } from './nativeBridge';

const listeners = new Set();
const activeToasts = new Map();
const MAX_TOASTS = 4;

const notifyListeners = () => {
  const snapshot = Array.from(activeToasts.values());
  for (const cb of listeners) {
    try {
      cb(snapshot);
    } catch (_) {
      // Ignore UI subscriber errors
    }
  }
};

export function subscribeDownloadToasts(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  try {
    listener(Array.from(activeToasts.values()));
  } catch (_) {}
  return () => listeners.delete(listener);
}

export function dismissDownloadToast(id) {
  if (!id) return;
  activeToasts.delete(id);
  notifyListeners();
}

export function showDownloadToast({
  id,
  fileName,
  status = 'success',
  subtitle = '',
  savedLocation = '',
  autoHideMs
}) {
  const toastId = id || `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const existing = activeToasts.get(toastId);
  if (existing?._timer) {
    clearTimeout(existing._timer);
  }

  const effectiveAutoHide =
    typeof autoHideMs === 'number'
      ? autoHideMs
      : status === 'downloading'
      ? 15000
      : status === 'error'
      ? 6000
      : 4500;

  const entry = {
    id: toastId,
    fileName: sanitizeFileName(fileName || 'file'),
    status,
    subtitle,
    savedLocation,
    updatedAt: Date.now(),
    _timer: null
  };

  if (effectiveAutoHide > 0) {
    entry._timer = setTimeout(() => {
      activeToasts.delete(toastId);
      notifyListeners();
    }, effectiveAutoHide);
  }

  activeToasts.set(toastId, entry);
  while (activeToasts.size > MAX_TOASTS) {
    const oldestKey = activeToasts.keys().next().value;
    if (!oldestKey) break;
    const oldEntry = activeToasts.get(oldestKey);
    if (oldEntry?._timer) clearTimeout(oldEntry._timer);
    activeToasts.delete(oldestKey);
  }

  notifyListeners();
  return toastId;
}

// Listen for native Android WebView DownloadListener completions
if (typeof window !== 'undefined' && !window.__deepernovaDownloadListenerAttached) {
  window.__deepernovaDownloadListenerAttached = true;
  window.addEventListener('deepernova:native-download-result', (event) => {
    const detail = event?.detail || {};
    if (!detail.fileName) return;
    showDownloadToast({
      fileName: detail.fileName,
      status: detail.ok === false ? 'error' : 'success',
      subtitle:
        detail.ok === false
          ? detail.error || 'Gagal mengunduh file di perangkat.'
          : detail.savedPath
          ? `Tersimpan di ${detail.savedPath}`
          : 'File berhasil diunduh ke perangkat.',
      savedLocation: detail.savedPath || ''
    });
  });
}

export function sanitizeFileName(rawName, fallback = 'deepernova-file.txt') {
  const raw = String(rawName || '').split('?')[0].split('#')[0].trim();
  const base = raw.split(/[/\\]/).pop() || '';
  const cleaned = base
    .replace(/[\0\r\n"<>:|?*]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 160);
  return cleaned || fallback;
}

export function formatDownloadSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function resolveBackendUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }
  const base = API_BASE_URL || (typeof window !== 'undefined' && window.location?.origin) || 'https://deepernova.com';
  return `${base.replace(/\/+$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca data file.'));
    reader.readAsDataURL(blob);
  });
}

const isCapacitorNative = async () => {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      return true;
    }
    return await nativeBridge.isNativeApp();
  } catch (_) {
    return false;
  }
};

const showWebNotificationIfAllowed = (fileName, subtitle) => {
  try {
    if (
      typeof document !== 'undefined' &&
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification(`Unduhan selesai: ${fileName}`, {
        body: subtitle || 'File berhasil disimpan.'
      });
    }
  } catch (_) {}
};

const triggerStandardBrowserBlobDownload = (blob, safeName) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = safeName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
};

const uploadToTempDownloadRelay = async (base64, fileName, mimeType) => {
  const endpoint = resolveBackendUrl('/api/files/temp-download');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ base64, fileName, mimeType })
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  if (!data?.downloadUrl) {
    throw new Error('Server tidak mengembalikan URL unduhan.');
  }
  return resolveBackendUrl(data.downloadUrl);
};

/**
 * Download any Blob on Web, Desktop, or Android Capacitor APK,
 * and show both in-app notification toast and Android system notification.
 */
export async function downloadBlob(blob, fileName, options = {}) {
  if (!blob) return { ok: false, error: 'File kosong.' };

  const safeName = sanitizeFileName(fileName, 'deepernova-file.txt');
  const mimeType = options.mimeType || blob.type || 'application/octet-stream';
  const sizeLabel = formatDownloadSize(blob.size);
  const toastId = showDownloadToast({
    fileName: safeName,
    status: 'downloading',
    subtitle: sizeLabel ? `Menyiapkan unduhan (${sizeLabel})...` : 'Menyiapkan unduhan...'
  });

  try {
    // 1. Native Android APK bridge (MainActivity @JavascriptInterface DeeperNovaDownloader)
    if (typeof window !== 'undefined' && typeof window.DeeperNovaDownloader?.saveBase64File === 'function') {
      const base64 = await blobToBase64(blob);
      const rawResult = window.DeeperNovaDownloader.saveBase64File(base64, safeName, mimeType);
      let parsed = {};
      try {
        parsed = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult || {};
      } catch (_) {
        parsed = { ok: false, error: 'Respons native downloader tidak valid.' };
      }

      if (parsed?.ok) {
        const finalName = parsed.fileName || safeName;
        const savedPath = parsed.savedPath || `Downloads/DeeperNova/${finalName}`;
        showDownloadToast({
          id: toastId,
          fileName: finalName,
          status: 'success',
          subtitle: `Tersimpan di ${savedPath}${sizeLabel ? ` • ${sizeLabel}` : ''}`,
          savedLocation: savedPath
        });
        return { ok: true, mode: 'android-bridge', fileName: finalName, savedPath };
      }
      console.warn('[UniversalDownload] Native saveBase64File failed, trying fallback:', parsed?.error);
    }

    // 2. Existing / Older Capacitor APK without DeeperNovaDownloader bridge
    if (await isCapacitorNative()) {
      try {
        const base64 = await blobToBase64(blob);
        const relayUrl = await uploadToTempDownloadRelay(base64, safeName, mimeType);
        const opened = window.open(relayUrl, '_system') || window.open(relayUrl, '_blank');
        if (!opened) {
          window.location.href = relayUrl;
        }
        await nativeBridge.showDownloadCompleteNotification({
          fileName: safeName,
          savedPath: 'Folder Download perangkat',
          subtitle: `Mengunduh ${safeName}${sizeLabel ? ` (${sizeLabel})` : ''} via sistem Android.`
        });
        showDownloadToast({
          id: toastId,
          fileName: safeName,
          status: 'success',
          subtitle: `Unduhan dikirim ke folder Download${sizeLabel ? ` • ${sizeLabel}` : ''}`,
          savedLocation: 'Download'
        });
        return { ok: true, mode: 'capacitor-relay', fileName: safeName, url: relayUrl };
      } catch (relayErr) {
        console.warn('[UniversalDownload] Relay fallback failed in native mode:', relayErr);
      }
    }

    // 3. Standard Web / Mobile Browser download
    triggerStandardBrowserBlobDownload(blob, safeName);
    const subtitle = sizeLabel ? `Berhasil diunduh (${sizeLabel})` : 'Berhasil diunduh';
    showDownloadToast({
      id: toastId,
      fileName: safeName,
      status: 'success',
      subtitle
    });
    showWebNotificationIfAllowed(safeName, subtitle);
    return { ok: true, mode: 'browser-blob', fileName: safeName };
  } catch (err) {
    const errorMessage = err?.message || 'Gagal mengunduh file.';
    showDownloadToast({
      id: toastId,
      fileName: safeName,
      status: 'error',
      subtitle: errorMessage
    });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Download plain text / code / markdown / HTML / JSON / SVG content.
 */
export async function downloadText(content, fileName, mimeType = 'text/plain;charset=utf-8') {
  const safeContent = content == null ? '' : String(content);
  const blob = new Blob([safeContent], { type: mimeType });
  return downloadBlob(blob, fileName, { mimeType });
}

/**
 * Download from any URL (blob:, data:, /api/..., or external http(s):).
 */
export async function downloadFromUrl(url, fileName, options = {}) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return { ok: false, error: 'URL unduhan kosong.' };

  const safeName = sanitizeFileName(fileName || rawUrl.split('/').pop(), 'deepernova-file');
  const resolvedUrl = resolveBackendUrl(rawUrl);

  // Fast-path: data: and blob: URLs must always be converted to Blob first
  if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:')) {
    try {
      const resp = await fetch(resolvedUrl);
      const blob = await resp.blob();
      return downloadBlob(blob, safeName, { mimeType: options.mimeType || blob.type });
    } catch (err) {
      showDownloadToast({
        fileName: safeName,
        status: 'error',
        subtitle: err?.message || 'Gagal membaca data unduhan.'
      });
      return { ok: false, error: err?.message || 'Gagal membaca data unduhan.' };
    }
  }

  const toastId = showDownloadToast({
    fileName: safeName,
    status: 'downloading',
    subtitle: 'Mengambil file dari server...'
  });

  // Prefer fetching via WebView/browser session cookies into a Blob so auth, filenames, and progress are exact
  try {
    const resp = await fetch(resolvedUrl, { credentials: 'include' });
    if (resp.ok) {
      const blob = await resp.blob();
      activeToasts.delete(toastId);
      notifyListeners();
      return downloadBlob(blob, safeName, { mimeType: options.mimeType || blob.type });
    }
  } catch (_) {
    // Fall through to native DownloadManager or direct link when CORS prevents fetch
  }

  try {
    // Updated Android APK native DownloadManager fallback for cross-origin URLs
    if (typeof window !== 'undefined' && typeof window.DeeperNovaDownloader?.downloadUrl === 'function') {
      const rawRes = window.DeeperNovaDownloader.downloadUrl(resolvedUrl, safeName, options.mimeType || '');
      let parsed = {};
      try {
        parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes || {};
      } catch (_) {}
      if (parsed?.ok !== false) {
        showDownloadToast({
          id: toastId,
          fileName: safeName,
          status: 'success',
          subtitle: 'Unduhan diproses oleh Android Download Manager'
        });
        return { ok: true, mode: 'android-download-manager', fileName: safeName };
      }
    }

    // Older Capacitor APK external handoff + LocalNotification
    if (await isCapacitorNative()) {
      const opened = window.open(resolvedUrl, '_system') || window.open(resolvedUrl, '_blank');
      if (!opened) {
        window.location.href = resolvedUrl;
      }
      await nativeBridge.showDownloadCompleteNotification({
        fileName: safeName,
        savedPath: 'Folder Download perangkat',
        subtitle: `Mengunduh ${safeName} melalui sistem Android.`
      });
      showDownloadToast({
        id: toastId,
        fileName: safeName,
        status: 'success',
        subtitle: 'Unduhan dibuka di Download Manager perangkat'
      });
      return { ok: true, mode: 'capacitor-external', fileName: safeName };
    }

    // Standard browser fallback link
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = safeName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showDownloadToast({
      id: toastId,
      fileName: safeName,
      status: 'success',
      subtitle: 'Unduhan file dimulai'
    });
    showWebNotificationIfAllowed(safeName, 'Unduhan file dimulai');
    return { ok: true, mode: 'browser-link', fileName: safeName };
  } catch (err) {
    showDownloadToast({
      id: toastId,
      fileName: safeName,
      status: 'error',
      subtitle: err?.message || 'Gagal mengunduh file.'
    });
    return { ok: false, error: err?.message || 'Gagal mengunduh file.' };
  }
}

export const universalDownloadService = {
  downloadBlob,
  downloadText,
  downloadFromUrl,
  showDownloadToast,
  dismissDownloadToast,
  subscribeDownloadToasts
};

export default universalDownloadService;

