import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './SavedImagesGallery.css';

const GalleryItem = ({ image, onClick, userLanguage }) => {
  const [isError, setIsError] = useState(false);

  return (
    <div 
      className={`gallery-item ${isError ? 'broken' : ''}`}
      onClick={onClick}
    >
      {isError ? (
        <div className="broken-image-placeholder">
          <span style={{ fontSize: '20px', marginBottom: '4px' }}>⚠️</span>
          <span>{userLanguage === 'id' ? 'Gambar Rusak' : 'Broken Image'}</span>
        </div>
      ) : (
        <img 
          src={image.imageUrl} 
          alt={userLanguage === 'id' ? 'Gambar tersimpan' : 'Saved image'} 
          onError={() => setIsError(true)}
        />
      )}
    </div>
  );
};

const DetailImage = ({ src, prompt, userLanguage }) => {
  const [isError, setIsError] = useState(false);

  if (isError) {
    return (
      <div className="broken-detail-placeholder" style={{ width: '100%', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '8px', color: '#94a3b8', border: '1px dashed #cbd5e1', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px', marginBottom: '6px' }}>⚠️</span>
        <span style={{ fontSize: '12px' }}>{userLanguage === 'id' ? 'Gagal memuat gambar' : 'Failed to load image'}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={prompt} 
      className="detail-image" 
      onError={() => setIsError(true)}
    />
  );
};

const SavedImagesGallery = ({ isOpen, onClose, isAuthenticated, user }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userLanguage, setUserLanguage] = useState('id');

  // Fetch saved images when panel opens
  useEffect(() => {
    const lang = localStorage.getItem('deepernova_language') || 'id';
    setUserLanguage(lang);

    // Only fetch if authenticated (not guest)
    const isReallyAuthenticated = isAuthenticated && user && !user.guest;
    if (isOpen && isReallyAuthenticated) {
      fetchSavedImages();
    }
  }, [isOpen, isAuthenticated, user?.guest, user?.id]);

  const fetchSavedImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/user`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      console.error('[SavedImages] Error fetching:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (image) => {
    try {
      const link = document.createElement('a');
      link.href = image.imageUrl;
      link.download = `deepernova-${image.id.substring(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[SavedImages] Download error:', err);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm(userLanguage === 'id' ? 'Hapus gambar ini?' : 'Delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.status}`);
      }

      // Remove from local state
      setImages(images.filter(img => img.id !== imageId));
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('[SavedImages] Delete error:', err);
      setError(err.message);
    }
  };

  if (!isOpen || !isAuthenticated || user?.guest) return null;

  return (
    <div className="saved-images-overlay" onClick={onClose}>
      <div className="saved-images-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="saved-images-header">
          <h2>{userLanguage === 'id' ? '🖼️ Gambar Saya' : '🖼️ My Images'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Main Content */}
        <div className="saved-images-content" style={{ position: 'relative' }}>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{userLanguage === 'id' ? 'Memuat gambar...' : 'Loading images...'}</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={fetchSavedImages} className="retry-btn">
                {userLanguage === 'id' ? 'Coba Lagi' : 'Retry'}
              </button>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" role="img" aria-label="No images">📷</div>
              <p className="empty-text">
                {userLanguage === 'id' ? 'Belum ada gambar yang disimpan.' : 'No saved images found.'}
              </p>
            </div>
          ) : (
            <div className="images-container">
              <div className="gallery-grid">
                {images.map((image) => (
                  <GalleryItem 
                    key={image.id}
                    image={image}
                    onClick={() => setSelectedImage(image)}
                    userLanguage={userLanguage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lightbox / Detail Overlay */}
          {selectedImage && (
            <div className="lightbox-overlay" onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px', borderRadius: '12px' }}>
              <div className="lightbox-content" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>
                    {userLanguage === 'id' ? 'Detail Gambar' : 'Image Details'}
                  </h3>
                  <button 
                    onClick={() => setSelectedImage(null)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%' }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '260px' }}>
                  <DetailImage 
                    src={selectedImage.imageUrl}
                    prompt={selectedImage.prompt}
                    userLanguage={userLanguage}
                  />
                </div>

                <div className="detail-info">
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {userLanguage === 'id' ? 'Deskripsi Prompt' : 'Prompt Description'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'break-word', maxHeight: '80px', overflowY: 'auto' }}>
                    {selectedImage.prompt}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <button 
                    onClick={() => handleDownload(selectedImage)}
                    style={{ padding: '8px 14px', background: '#ff6b00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    ⬇️ {userLanguage === 'id' ? 'Unduh' : 'Download'}
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedImage.id)}
                    style={{ padding: '8px 14px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    🗑️ {userLanguage === 'id' ? 'Hapus' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="saved-images-footer">
          <button className="btn-refresh" onClick={fetchSavedImages} aria-label="Refresh images">
            🔄
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedImagesGallery;
