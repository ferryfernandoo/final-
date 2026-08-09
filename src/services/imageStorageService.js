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
    const updatedList = [imageToSave, ...existingList].slice(0, MAX_LOCAL_IMAGES);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
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
