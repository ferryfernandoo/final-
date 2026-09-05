import { API_BASE_URL } from '../apiConfig';

const LOCAL_STORAGE_KEY = 'deepernova_saved_images';
const MAX_LOCAL_IMAGES = 50; // Prevent localStorage QuotaExceededError

export const saveImageToGallery = async (imageData, isAuthenticated = false, user = null) => {
  if (!imageData || (!imageData.imageUrl && !imageData.dataUrl && !imageData.publicUrl)) return null;

  const imageToSave = {
    id: imageData.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    prompt: imageData.prompt || imageData.fileName || 'Gambar Tersimpan',
    imageUrl: imageData.imageUrl || imageData.dataUrl || imageData.publicUrl,
    type: imageData.type || 'uploaded', // 'uploaded', 'generated', 'edited'
    model: imageData.model || 'imagen-4-fast',
    createdAt: imageData.createdAt || new Date().toISOString()
  };

  // 1. ALWAYS Save to LocalStorage (works for local mode & guest)
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let existingList = existingRaw ? JSON.parse(existingRaw) : [];
    if (!Array.isArray(existingList)) existingList = [];

    // Filter duplicate by ID or exact image URL
    existingList = existingList.filter(img => img.id !== imageToSave.id && img.imageUrl !== imageToSave.imageUrl);

    // Unshift to top
    let updatedList = [imageToSave, ...existingList].slice(0, MAX_LOCAL_IMAGES);
    
    // Save with quota retry fallback (trim oldest if full)
    let saved = false;
    while (!saved && updatedList.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        saved = true;
      } catch (quotaErr) {
        if (updatedList.length > 1) {
          // Drop oldest items to fit in quota
          updatedList = updatedList.slice(0, Math.max(1, Math.floor(updatedList.length * 0.75)));
        } else {
          break;
        }
      }
    }
    console.log('[ImageStorageService] Saved to LocalStorage:', imageToSave.prompt);
  } catch (err) {
    console.warn('[ImageStorageService] LocalStorage save warning:', err.message);
  }

  // 2. IF Logged-in user, ALSO Save to Backend Database
  const isReallyAuthenticated = isAuthenticated && user && !user.guest;
  if (isReallyAuthenticated) {
    try {
      await fetch(`${API_BASE_URL}/api/images/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(imageToSave)
      });
      console.log('[ImageStorageService] Synced to Backend DB');
    } catch (err) {
      console.warn('[ImageStorageService] Backend DB save warning:', err.message);
    }
  }

  return imageToSave;
};

export const getSavedImages = async (isAuthenticated = false, user = null) => {
  // Read local images first
  let localImages = [];
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    localImages = existingRaw ? JSON.parse(existingRaw) : [];
    if (!Array.isArray(localImages)) localImages = [];
  } catch (err) {
    console.warn('[ImageStorageService] LocalStorage read warning:', err.message);
    localImages = [];
  }

  const isReallyAuthenticated = isAuthenticated && user && !user.guest;
  if (!isReallyAuthenticated) {
    return localImages;
  }

  // Fetch backend images and merge with local images
  try {
    const response = await fetch(`${API_BASE_URL}/api/images/user`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const serverImages = data.images || [];

      // Merge server + local images, deduplicating by ID or imageUrl
      const imageMap = new Map();
      [...serverImages, ...localImages].forEach(img => {
        const key = img.id || img.imageUrl;
        if (key && !imageMap.has(key)) {
          imageMap.set(key, img);
        }
      });

      return Array.from(imageMap.values());
    }
  } catch (err) {
    console.warn('[ImageStorageService] Fetch backend images fallback to local:', err.message);
  }

  return localImages;
};

export const deleteSavedImage = async (imageId, isAuthenticated = false, user = null) => {
  // Remove from local storage
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let existingList = existingRaw ? JSON.parse(existingRaw) : [];
    if (Array.isArray(existingList)) {
      const filtered = existingList.filter(img => img.id !== imageId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('[ImageStorageService] LocalStorage delete warning:', err.message);
  }

  // Remove from backend DB if authenticated
  const isReallyAuthenticated = isAuthenticated && user && !user.guest;
  if (isReallyAuthenticated) {
    try {
      await fetch(`${API_BASE_URL}/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[ImageStorageService] Backend delete warning:', err.message);
    }
  }
};

/**
 * Universal client-side image downloader that works completely WITHOUT a server (mode lokal).
 * Supports Data URLs, Blob URLs, direct fetch Blob, Canvas conversion, and direct download.
 */
export const downloadImageDirectly = async (imageUrl, defaultFilename = 'deepernova-image.png') => {
  if (!imageUrl) throw new Error('Image URL is empty');

  const filename = defaultFilename.endsWith('.png') || defaultFilename.endsWith('.jpg') || defaultFilename.endsWith('.webp')
    ? defaultFilename
    : `${defaultFilename}.png`;

  // 1. Data URL (Base64) -> Direct Blob Download
  if (imageUrl.startsWith('data:')) {
    try {
      const blob = dataURLtoBlob(imageUrl);
      triggerBlobDownload(blob, filename);
      return true;
    } catch (e) {
      console.warn('[ImageStorageService] dataURL conversion fallback to anchor:', e);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
  }

  // 2. Blob URL -> Direct link download
  if (imageUrl.startsWith('blob:')) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  // 3. Try Direct Fetch + Blob
  let downloadBlob = null;
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      downloadBlob = await response.blob();
    }
  } catch (err) {
    console.log('[ImageStorageService] Direct fetch failed, trying client canvas:', err.message);
  }

  if (downloadBlob && downloadBlob.size > 0) {
    triggerBlobDownload(downloadBlob, filename);
    return true;
  }

  // 4. Pure Client-Side Image -> Canvas -> Blob conversion (no server needed)
  try {
    const canvasBlob = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) resolve(blob);
            else reject(new Error('Canvas generated empty blob'));
          }, 'image/png');
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };
      img.onerror = () => reject(new Error('Canvas image load error'));
      img.src = imageUrl;
    });

    if (canvasBlob) {
      triggerBlobDownload(canvasBlob, filename);
      return true;
    }
  } catch (canvasErr) {
    console.log('[ImageStorageService] Canvas conversion error:', canvasErr.message);
  }

  // 5. Direct Anchor download fallback
  const link = document.createElement('a');
  link.href = imageUrl;
  link.setAttribute('download', filename);
  link.setAttribute('target', '_blank');
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
};

export const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export const triggerBlobDownload = (blob, filename) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    try { URL.revokeObjectURL(blobUrl); } catch (_) {}
  }, 4000);
};

