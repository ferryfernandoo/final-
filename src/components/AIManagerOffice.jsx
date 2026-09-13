import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './AIManagerOffice.css';

// Helper: Real-time XMLHttpRequest upload with exact percentage tracking
const uploadWithProgress = (url, formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (err) {
          reject(new Error('Respons server tidak valid.'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Koneksi jaringan terputus saat mengunggah berkas.'));
    xhr.ontimeout = () => reject(new Error('Waktu pengunggahan habis (timeout).'));
    xhr.send(formData);
  });
};

// Helper: Safely resolve relative media URLs to backend API_BASE_URL if needed
const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  }
  return url;
};

// Built-in Multi-Media & Document Viewer Modal (Lega & Full View - 100% Uncompressed)
const CloudMediaViewerModal = ({ file, onClose, getFileIcon }) => {
  const [dataUrl, setDataUrl] = useState(file.dataUrl && file.dataUrl !== '[[stored]]' ? file.dataUrl : (file.fileData && file.fileData !== '[[stored]]' ? file.fileData : null));
  const [isLoading, setIsLoading] = useState(!file.dataUrl || file.dataUrl === '[[stored]]');
  const [loadError, setLoadError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [blobUrl, setBlobUrl] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const videoRef = useRef(null);

  const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
  const isVideo = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext) || file.category === 'video';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext) || file.category === 'image';
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext) || file.category === 'audio';
  const isCodeText = file.text || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext) || file.category === 'code';
  const isPdf = ext === 'pdf' || file.category === 'pdf';

  // Asynchronously fetch full data if missing or [[stored]]
  useEffect(() => {
    let isCancelled = false;
    if (!dataUrl || dataUrl === '[[stored]]') {
      let cached = null;
      if (typeof window !== 'undefined' && window.deepernova_file_cache?.has(file.id)) {
        cached = window.deepernova_file_cache.get(file.id)?.dataUrl;
      }
      if (!cached) {
        try { cached = sessionStorage.getItem(`cloud_file_data_${file.id}`); } catch {}
      }
      if (cached && cached !== '[[stored]]') {
        setDataUrl(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      fetch(`${API_BASE_URL}/api/cloud/files/${file.id}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (isCancelled) return;
          if (data.success && data.file) {
            const raw = data.file.dataUrl || data.file.fileData || data.file.content;
            if (raw && raw !== '[[stored]]') {
              setDataUrl(raw);
              try { sessionStorage.setItem(`cloud_file_data_${file.id}`, raw); } catch {}
            } else {
              setLoadError('Berkas media tidak memiliki data di server.');
            }
          } else {
            setLoadError(data.error || 'Gagal memuat berkas.');
          }
        })
        .catch(err => {
          if (!isCancelled) setLoadError(err.message || 'Koneksi ke server gagal.');
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    return () => { isCancelled = true; };
  }, [file.id]);

  // Convert base64 video/audio into Blob URL for HTML5 player (only if legacy inline base64)
  useEffect(() => {
    if (!dataUrl || dataUrl === '[[stored]]') return;

    if (typeof dataUrl === 'string') {
      // If it's already a streaming URL or Blob URL, use it directly without touching memory!
      if (dataUrl.startsWith('/') || dataUrl.startsWith('http') || dataUrl.startsWith('blob:')) {
        const fullUrl = dataUrl.startsWith('/') ? `${API_BASE_URL}${dataUrl}` : dataUrl;
        setBlobUrl(fullUrl);
        return;
      }

      // Legacy base64 handler
      if (dataUrl.startsWith('data:video/') || dataUrl.startsWith('data:audio/')) {
        try {
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || (isVideo ? 'video/mp4' : 'audio/mp3');
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);

          return () => {
            URL.revokeObjectURL(url);
          };
        } catch (err) {
          console.warn('Error converting dataUrl to Blob URL:', err);
          setBlobUrl(dataUrl);
        }
      } else {
        setBlobUrl(dataUrl);
      }
    }
  }, [dataUrl, isVideo, isAudio]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') setIsFullscreen(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeSrc = useMemo(() => {
    let src = blobUrl || dataUrl || file.dataUrl || file.fileData || file.url || file.filePath || null;
    if (!src && file.id) {
      src = `/api/cloud/files/${file.id}/raw`;
    }
    return resolveMediaUrl(src);
  }, [blobUrl, dataUrl, file.dataUrl, file.fileData, file.url, file.filePath, file.id]);

  const handleDownload = () => {
    if (!activeSrc) return;
    const a = document.createElement('a');
    a.href = activeSrc;
    a.download = file.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleToggleZoom = () => {
    setZoomLevel(prev => prev === 1 ? 1.75 : 1);
  };

  const handleTogglePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('PiP error:', err);
      }
    }
  };

  const handleVideoError = (e) => {
    console.warn('[Video Player] Playback error encountered:', e);
    const mediaError = videoRef.current?.error;
    let message = 'Pemutar bawaan browser mengalami kendala memproses codec berkas video ini. Berkas video Anda tetap tersimpan 100% utuh tanpa kompresi.';
    if (mediaError) {
      if (mediaError.code === 3) {
        message = 'Koneksi decode terhenti (MEDIA_ERR_DECODE). Berkas asli tetap utuh.';
      } else if (mediaError.code === 4) {
        message = 'Format/codec berkas video tidak didukung langsung oleh browser Anda. Anda dapat mengunduh dan memutarnya langsung di perangkat dalam 100% kualitas asli.';
      } else if (mediaError.code === 2) {
        message = 'Koneksi jaringan terputus saat streaming berkas video (MEDIA_ERR_NETWORK).';
      }
    }
    setVideoError(message);
  };

  return (
    <div className={`media-viewer-backdrop ${isFullscreen ? 'fullscreen-backdrop' : ''}`} onClick={onClose}>
      <div className={`media-viewer-content ${isFullscreen ? 'fullscreen' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <div className="media-title-group">
            <span className="media-type-badge">
              {isVideo ? '🎥 VIDEO PLAYER' : isImage ? '🖼️ GAMBAR' : isAudio ? '🎵 AUDIO' : isCodeText ? '💻 TEKS / KODE' : isPdf ? '📑 PDF' : '📄 BERKAS'}
            </span>
            <h3 title={file.name}>{file.name}</h3>
          </div>

          <div className="media-header-actions">
            {isImage && (
              <div className="image-toolbar-group" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button className="media-tool-btn" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))} title="Zoom Out (Perkecil)">🔍−</button>
                <button className="media-tool-btn" onClick={() => setZoomLevel(1)} title="Reset Ukuran">{Math.round(zoomLevel * 100)}%</button>
                <button className="media-tool-btn" onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} title="Zoom In (Perbesar)">🔍+</button>
                <button className="media-tool-btn" onClick={() => setRotation(prev => (prev + 90) % 360)} title="Putar 90°">🔄</button>
              </div>
            )}

            {isVideo && (
              <div className="video-toolbar-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select 
                  className="media-speed-select"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  title="Kecepatan Putar Video"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 6px', fontSize: '12px' }}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x Normal</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
                {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                  <button className="media-tool-btn" onClick={handleTogglePiP} title="Picture in Picture (Floating)">📺 PiP</button>
                )}
                <button
                  className="media-tool-btn"
                  onClick={handleDownload}
                  title="Unduh Berkas Video Asli (100% Kualitas Asli)"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  📥 Unduh Asli
                </button>
              </div>
            )}

            <button 
              className="media-tool-btn fullscreen-toggle-btn" 
              onClick={() => setIsFullscreen(prev => !prev)} 
              title={isFullscreen ? "Keluar Layar Penuh (ESC)" : "Layar Penuh / Full View"}
              style={{ background: isFullscreen ? '#0284c7' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              {isFullscreen ? '🗗 Normal' : '⛶ Full View'}
            </button>

            <button className="media-close-btn" onClick={onClose} title="Tutup Viewer (ESC)">✕</button>
          </div>
        </div>

        <div className="media-viewer-body">
          {isLoading ? (
            <div className="media-viewer-loading" style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner-border" role="status" style={{ width: 44, height: 44, border: '3px solid #38bdf8', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}></div>
              <p style={{ marginTop: 16, color: '#93c5fd', fontSize: 15, fontWeight: 600 }}>Sedang memuat berkas media resolusi tinggi dari Cloud...</p>
            </div>
          ) : loadError ? (
            <div className="media-viewer-error" style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>⚠️</span>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{loadError}</p>
              <button 
                onClick={() => { setLoadError(null); setDataUrl(null); }}
                style={{ marginTop: '12px', background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                🔄 Coba Muat Ulang
              </button>
            </div>
          ) : isVideo ? (
            <div className="media-video-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {videoError ? (
                <div style={{ textAlign: 'center', padding: '28px 24px', background: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.4)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', maxWidth: '480px', margin: '20px' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🎬</span>
                  <h4 style={{ color: '#38bdf8', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Berkas Asli (Tanpa Kompresi)</h4>
                  <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', marginBottom: '18px' }}>{videoError}</p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleDownload}
                      style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      📥 Unduh & Putar di Perangkat (Kualitas Asli)
                    </button>
                    <button
                      onClick={() => { setVideoError(null); if (videoRef.current) videoRef.current.load(); }}
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      🔄 Coba Putar Ulang
                    </button>
                  </div>
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  key={activeSrc}
                  controls 
                  playsInline
                  preload="metadata"
                  className="preview-video-element"
                  onError={handleVideoError}
                >
                  <source src={activeSrc} type="video/mp4" />
                  <source src={activeSrc} type="video/webm" />
                  <source src={activeSrc} />
                  Browser Anda tidak mendukung pemutar video HTML5.
                </video>
              )}
            </div>
          ) : isImage ? (
            <div className="media-image-container" onDoubleClick={handleToggleZoom} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', cursor: zoomLevel > 1 ? 'grab' : 'zoom-in' }}>
              <img 
                src={activeSrc} 
                alt={file.name} 
                className="preview-image-element"  
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
                onError={(e) => {
                  if (file.id && !e.target.src.includes(`/api/cloud/files/${file.id}/raw`)) {
                    e.target.src = resolveMediaUrl(`/api/cloud/files/${file.id}/raw`);
                  }
                }}
              />
            </div>
          ) : isAudio ? (
            <div className="media-audio-container" style={{ textAlign: 'center', padding: '40px', width: '100%' }}>
              <div className="audio-visualizer-disk" style={{ width: 140, height: 140, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(56, 189, 248, 0.3)', border: '2px solid rgba(56, 189, 248, 0.4)' }}>
                <span style={{ fontSize: '64px' }}>🎵</span>
              </div>
              <h4 style={{ color: '#fff', marginBottom: '8px', fontSize: '18px' }}>{file.name}</h4>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Format Audio Cloud • {file.size || 'Audio'}</p>
              <audio src={activeSrc} controls autoPlay style={{ width: '100%', maxWidth: '520px' }} />
            </div>
          ) : isCodeText ? (
            <div className="media-code-container" style={{ width: '100%', height: '100%', overflow: 'auto', background: '#090d16', padding: '20px', borderRadius: '8px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
              {file.text || (typeof file.content === 'string' ? file.content : JSON.stringify(file.content, null, 2)) || (typeof dataUrl === 'string' && !dataUrl.startsWith('data:') ? dataUrl : 'Menampilkan isi berkas teks...')}
            </div>
          ) : (
            <div className="media-fallback-container" style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>{getFileIcon ? getFileIcon(file, 64) : '📄'}</span>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{file.name}</p>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Ukuran: {file.size} • Format Cloud Vault</p>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>Silakan unduh berkas untuk membukanya secara penuh di perangkat Anda.</p>
            </div>
          )}
        </div>

        <div className="media-viewer-footer">
          <div className="media-footer-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>💾 {file.size || 'Ukuran Media'}</span>
            <span className="dot-divider">•</span>
            <span>📅 {file.date || 'Tersimpan di Cloud'}</span>
            {isImage && (
              <>
                <span className="dot-divider">•</span>
                <span style={{ color: '#38bdf8' }}>💡 Klik 2x pada gambar untuk zoom in/out</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleDownload}
              className="media-download-btn"
              title="Unduh Berkas ke Perangkat"
            >
              📥 Unduh Berkas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIManagerOffice = ({ user, onNavigate, isAuthenticated, onLoginRequest }) => {
  // 🔒 STRICT PRIVACY GUARD: Drive is 100% private and MUST require a registered user login (no guests)
  if (!isAuthenticated || !user || user?.guest || !user?.email) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(234, 88, 12, 0.15)',
          border: '1.5px solid rgba(234, 88, 12, 0.4)',
          borderRadius: '24px',
          padding: '40px 32px',
          maxWidth: '460px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          backdropFilter: 'blur(24px)'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: '#f8fafc' }}>
            Cloud Vault Pribadi Terkunci
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
            Deepernova Cloud Drive adalah ruang penyimpanan privat berstandar Enterprise Zero-Trust. Wajib login dengan akun resmi Anda untuk mengakses berkas pribadi.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => onLoginRequest ? onLoginRequest() : onNavigate?.('landing')}
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)'
              }}
            >
              Masuk ke Akun Anda ➔
            </button>
            <button
              onClick={() => onNavigate?.('landing')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Administrator';
  const userEmail = user?.email;

  const [files, setFiles] = useState([]);
  const [storageInfo, setStorageInfo] = useState({
    usedBytes: 0,
    totalBytes: 3221225472, // 3 GB Quota
    usedMB: '0.00',
    totalMB: 3072,
    percent: 0,
    tier: 'Free Tier (3 GB Cloud Vault)'
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [openingFileMessage, setOpeningFileMessage] = useState(null);
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState('grid');
  const [selectedMobileFile, setSelectedMobileFile] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCloudStorageData(false);
    } catch (_e) {}
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const triggerFileDownload = (file) => {
    if (!file) return;
    const url = file.dataUrl || file.fileData || `/api/cloud/files/${file.id}/raw`;
    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const a = document.createElement('a');
      a.href = `/api/cloud/files/${file.id}/raw`;
      a.download = file.name || 'download';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // ===== DESKTOP OS & WINDOW SYSTEM STATES =====
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [wallpaperIndex, setWallpaperIndex] = useState(0);

  const wallpapers = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1920&q=80'
  ];

  const cycleWallpaper = () => {
    setWallpaperIndex((prev) => (prev + 1) % wallpapers.length);
  };

  // Real-time clock for Windows Taskbar
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateString(now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([{ id: null, name: 'Server Cloud Drive' }]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // History stack for Back (←) and Forward (→) navigation
  const [navHistory, setNavHistory] = useState([
    { folderId: null, path: [{ id: null, name: 'Server Cloud Drive' }] }
  ]);
  const [navIndex, setNavIndex] = useState(0);

  const navigateToFolder = (folderId, newPath) => {
    setCurrentFolderId(folderId);
    setFolderPath(newPath);
    setActiveCategory('all');

    const updatedHistory = navHistory.slice(0, navIndex + 1);
    updatedHistory.push({ folderId, path: newPath });
    setNavHistory(updatedHistory);
    setNavIndex(updatedHistory.length - 1);
  };

  const handleNavBack = () => {
    if (navIndex > 0 && navHistory[navIndex - 1]) {
      const prev = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      setCurrentFolderId(prev.folderId);
      setFolderPath(prev.path);
      setActiveCategory('all');
    } else if (folderPath && folderPath.length > 1) {
      const parentPath = folderPath.slice(0, -1);
      const parentFolder = parentPath[parentPath.length - 1];
      setCurrentFolderId(parentFolder ? parentFolder.id : null);
      setFolderPath(parentPath);
      setActiveCategory('all');
    } else {
      setCurrentFolderId(null);
      setFolderPath([{ id: null, name: 'Server Cloud Drive' }]);
      setActiveCategory('all');
    }
  };

  const handleNavForward = () => {
    if (navIndex < navHistory.length - 1) {
      const next = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      setCurrentFolderId(next.folderId);
      setFolderPath(next.path);
      setActiveCategory('all');
    }
  };

  // ===== CONTEXT MENU & LONG PRESS STATES =====
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    file: null
  });
  const touchTimerRef = useRef(null);

  const handleItemContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 220);
    setContextMenu({
      visible: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      file: file
    });
  };

  const handleTouchStart = (e, file) => {
    const touch = e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    
    touchTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_e) {}
      }
      const x = Math.min(clientX, window.innerWidth - 230);
      const y = Math.min(clientY, window.innerHeight - 220);
      setContextMenu({
        visible: true,
        x: Math.max(10, x),
        y: Math.max(10, y),
        file: file
      });
    }, 450); // 450ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(prev => prev.visible ? { visible: false, x: 0, y: 0, file: null } : prev);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ===== FOLDER CREATION & EDITING STATES =====
  const [uploadNotification, setUploadNotification] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderType, setFolderType] = useState('private'); // 'private' | 'company'
  const [founderName, setFounderName] = useState(userName || 'Admin');
  const [founderEmail, setFounderEmail] = useState(userEmail || '');
  const [ceoName, setCeoName] = useState('');
  const [ceoEmail, setCeoEmail] = useState('');
  const [customRoles, setCustomRoles] = useState([]);

  const getFolderCreatorInfo = (folder) => {
    if (!folder) {
      return {
        name: userName || userEmail || 'authenticated@deepernova.com',
        role: 'Pemilik Cloud Drive (Root)',
        type: 'root'
      };
    }
    
    if (folder.folderType === 'private') {
      return {
        name: folder.ownerEmail || userEmail || 'Pengguna',
        role: 'Pemilik Private Folder',
        type: 'private'
      };
    }

    const fEmail = (folder.founderEmail || folder.ownerEmail || '').toLowerCase().trim();
    const cEmail = (folder.ceoEmail || '').toLowerCase().trim();
    const ownerEmail = (folder.ownerEmail || '').toLowerCase().trim();

    if (ownerEmail && ownerEmail === fEmail) {
      return {
        name: folder.founder || folder.ownerEmail?.split('@')[0] || 'Project Lead',
        email: fEmail,
        role: 'Project Lead',
        type: 'company'
      };
    }

    if (ownerEmail && cEmail && ownerEmail === cEmail) {
      return {
        name: folder.ceo || 'Executive Lead',
        email: cEmail,
        role: 'Executive Lead',
        type: 'company'
      };
    }

    if (folder.roles && Array.isArray(folder.roles)) {
      const matchRole = folder.roles.find(r => r.email && r.email.toLowerCase().trim() === ownerEmail);
      if (matchRole) {
        return {
          name: matchRole.name || ownerEmail,
          email: ownerEmail,
          role: matchRole.role || 'Anggota Tim',
          type: 'company'
        };
      }
    }

    return {
      name: folder.founder || folder.ownerEmail?.split('@')[0] || 'Administrator',
      email: folder.founderEmail || folder.ownerEmail || '',
      role: folder.founder ? 'Project Lead' : 'Pembuat Folder Organisasi',
      type: 'company'
    };
  };

  const getFileUploaderAndFolderInfo = (file) => {
    if (!file) return null;
    const cat = (file.category || file.type || '').toLowerCase();
    
    if (cat === 'folder') {
      const creator = getFolderCreatorInfo(file);
      return {
        uploaderName: creator.name,
        uploaderRole: creator.role,
        folderName: file.name,
        isFolder: true
      };
    }

    // It's a file
    const parentFolder = parentFolderMap.get(file.parentId);
    const uploaderEmail = (file.ownerEmail || '').toLowerCase().trim();
    
    let uploaderName = file.folderCreator || file.ownerEmail || userName || 'Pengguna';
    let uploaderRole = file.folderCreatorRole || 'Pengunggah Berkas';

    if (parentFolder && parentFolder.folderType === 'company') {
      const fEmail = (parentFolder.founderEmail || parentFolder.ownerEmail || '').toLowerCase().trim();
      const cEmail = (parentFolder.ceoEmail || '').toLowerCase().trim();
      
      if (uploaderEmail === fEmail) {
        uploaderName = parentFolder.founder || parentFolder.ownerEmail?.split('@')[0] || 'Project Lead';
        uploaderRole = 'Project Lead';
      } else if (cEmail && uploaderEmail === cEmail) {
        uploaderName = parentFolder.ceo || 'Executive Lead';
        uploaderRole = 'Executive Lead';
      } else if (parentFolder.roles && Array.isArray(parentFolder.roles)) {
        const rMatch = parentFolder.roles.find(r => r.email && r.email.toLowerCase().trim() === uploaderEmail);
        if (rMatch) {
          uploaderName = rMatch.name || uploaderEmail;
          uploaderRole = rMatch.role || 'Anggota Tim';
        }
      }
    }

    return {
      uploaderName: uploaderName,
      uploaderRole: uploaderRole,
      folderName: parentFolder ? parentFolder.name : 'Server Cloud Drive (Root)',
      isFolder: false
    };
  };

  const formatDeepmail = (str) => {
    if (!str) return '';
    const val = str.trim().toLowerCase();
    return val.endsWith('@deepmail.com') ? val : (val.includes('@') ? val : `${val}@deepmail.com`);
  };

  const openNewFolderModal = () => {
    setEditingFolder(null);
    setNewFolderName('');
    setFolderType('private');
    setFounderName(userName || 'Admin');
    setFounderEmail(userEmail || '');
    setCeoName('');
    setCeoEmail('');
    setCustomRoles([]);
    setShowNewFolderModal(true);
  };

  const handleEditFolder = (folder, e) => {
    e?.stopPropagation();
    setEditingFolder(folder);
    setNewFolderName(folder.name || '');
    setFolderType(folder.folderType || 'company');
    setFounderName(folder.founder || userName || 'Admin');
    setFounderEmail(folder.founderEmail || userEmail || '');
    setCeoName(folder.ceo || '');
    setCeoEmail(folder.ceoEmail || '');
    setCustomRoles(folder.roles && Array.isArray(folder.roles) ? folder.roles : []);
    setShowNewFolderModal(true);
  };

  const handleAddCustomRole = () => {
    setCustomRoles([...customRoles, { role: 'Editor', name: '', email: '' }]);
  };

  const handleUpdateCustomRole = (index, field, value) => {
    const updated = [...customRoles];
    updated[index] = { ...updated[index], [field]: value };
    setCustomRoles(updated);
  };

  const handleRemoveCustomRole = (index) => {
    setCustomRoles(customRoles.filter((_, i) => i !== index));
  };

  const handleSaveFolder = async () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const cleanRoles = customRoles.map(r => ({
      ...r,
      email: r.email ? formatDeepmail(r.email) : ''
    })).filter(r => r.role.trim() || r.name.trim() || r.email.trim());

    const defaultLeadName = userName || (userEmail ? userEmail.split('@')[0] : 'Administrator');
    const defaultLeadEmail = userEmail ? formatDeepmail(userEmail) : 'admin@deepmail.com';

    const fEmail = founderEmail ? formatDeepmail(founderEmail) : defaultLeadEmail;
    const cEmail = ceoEmail ? formatDeepmail(ceoEmail) : '';

    const empEmails = [];
    if (fEmail) empEmails.push(fEmail);
    if (cEmail) empEmails.push(cEmail);
    cleanRoles.forEach(r => {
      if (r.email) empEmails.push(r.email);
    });

    const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

    if (editingFolder) {
      const updatedFolder = {
        ...editingFolder,
        name: name,
        folderType: folderType,
        founder: folderType === 'company' ? (founderName.trim() || defaultLeadName) : null,
        founderEmail: folderType === 'company' ? fEmail : null,
        ceo: folderType === 'company' ? (ceoName.trim() || null) : null,
        ceoEmail: folderType === 'company' ? (cEmail || null) : null,
        roles: folderType === 'company' ? cleanRoles : [],
        employeeEmails: folderType === 'company' ? Array.from(new Set(empEmails)) : [currentOwner],
        ownerEmail: editingFolder.ownerEmail || currentOwner
      };

      const updatedFiles = files.map(f => f.id === editingFolder.id ? updatedFolder : f);
      setFiles(updatedFiles);

      setShowNewFolderModal(false);
      setEditingFolder(null);

      try {
        await fetch(`${API_BASE_URL}/api/cloud/folder/${editingFolder.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: updatedFolder })
        });
        fetchCloudStorageData(true);
      } catch (_e) {}
    } else {
      const newFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name,
        type: 'folder',
        category: 'folder',
        folderType: folderType,
        founder: folderType === 'company' ? (founderName.trim() || defaultLeadName) : null,
        founderEmail: folderType === 'company' ? fEmail : null,
        ceo: folderType === 'company' ? (ceoName.trim() || null) : null,
        ceoEmail: folderType === 'company' ? (cEmail || null) : null,
        roles: folderType === 'company' ? cleanRoles : [],
        employeeEmails: folderType === 'company' ? Array.from(new Set(empEmails)) : [currentOwner],
        ownerEmail: currentOwner,
        parentId: currentFolderId,
        size: '0 B',
        sizeBytes: 0,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedFiles = [newFolder, ...files];
      setFiles(updatedFiles);

      setShowNewFolderModal(false);

      try {
        await fetch(`${API_BASE_URL}/api/cloud/folder`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: newFolder })
        });
        fetchCloudStorageData(true);
      } catch (_e) {}
    }
  };

  const calculateDynamicStorage = (fileList) => {
    const totalBytesQuota = 3221225472; // 3 GB Quota
    const usedBytes = fileList.reduce((acc, f) => {
      if (f.sizeBytes && typeof f.sizeBytes === 'number') return acc + f.sizeBytes;
      if (f.size && typeof f.size === 'string') {
        const num = parseFloat(f.size);
        if (!isNaN(num)) {
          if (f.size.includes('KB')) return acc + Math.round(num * 1024);
          if (f.size.includes('MB')) return acc + Math.round(num * 1024 * 1024);
          if (f.size.includes('GB')) return acc + Math.round(num * 1024 * 1024 * 1024);
        }
      }
      return acc + 500000; // default 500 KB estimate
    }, 0);

    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
    const percent = Math.min(100, parseFloat(((usedBytes / totalBytesQuota) * 100).toFixed(2)));

    setStorageInfo(prev => ({
      ...prev,
      usedBytes,
      totalBytes: totalBytesQuota,
      usedMB,
      totalMB: 3072,
      percent: Math.max(0.5, percent)
    }));
  };

  // ============================================================
  // 🔥 CLEAN SERVER-ONLY SYNC (Single Source of Truth)
  // No more localStorage/sessionStorage/memory cache conflicts
  // ============================================================

  const fetchCloudStorageData = async (silent = false) => {
    if (!silent) {
      setIsServerSyncing(true);
      setSyncProgress(25);
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

    try {
      const fetchOpts = { credentials: 'include', cache: 'no-store' };
      if (controller) fetchOpts.signal = controller.signal;

      const timestamp = Date.now();
      const [infoRes, filesRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/cloud/storage-info?_t=${timestamp}`, fetchOpts),
        fetch(`${API_BASE_URL}/api/cloud/files?_t=${timestamp}`, fetchOpts)
      ]);

      if (!silent) setSyncProgress(80);

      if (infoRes.status === 'fulfilled' && infoRes.value.ok) {
        const infoData = await infoRes.value.json();
        if (infoData.success) {
          setStorageInfo(infoData);
        }
      }

      if (filesRes.status === 'fulfilled' && filesRes.value.ok) {
        const filesData = await filesRes.value.json();
        if (filesData.success && Array.isArray(filesData.files)) {
          setFiles(filesData.files);
          calculateDynamicStorage(filesData.files);
        }
      }
    } catch (_err) {
      // Quietly handle timeout or network error
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (!silent) {
        setSyncProgress(100);
        setTimeout(() => {
          setIsServerSyncing(false);
          setSyncProgress(0);
        }, 300);
      }
    }
  };

  useEffect(() => {
    fetchCloudStorageData(false);
    // Background sync: poll every 5 seconds when tab is active
    const interval = setInterval(() => {
      if (!document.hidden) fetchCloudStorageData(true);
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCloudStorageData(true);
      }
    };
    const handleFocus = () => {
      fetchCloudStorageData(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.email, isAuthenticated]);


  const MAX_SINGLE_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB (1024 MB) Limit per heavy video/file

  const handleFileUpload = async (e) => {
    const uploaded = Array.from(e.target.files || []);
    if (uploaded.length === 0) return;

    // Check for files exceeding 1 GB single file limit
    const oversizedFiles = uploaded.filter(file => file.size > MAX_SINGLE_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ');
      alert(`⚠️ Berkas melebihi batas maksimum 1 GB per berkas:\n${names}\n\nSilakan pilih berkas yang berukuran di bawah 1 GB.`);
    }

    const validFiles = uploaded.filter(file => file.size <= MAX_SINGLE_FILE_SIZE_BYTES);
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);

    const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;
    const creatorInfo = getFolderCreatorInfo(currentFolder);
    const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

    // 1. Process files with ZERO-RAM technique for mobile (no memory exhaustion / tab reload!)
    const filePayloads = [];
    for (const file of validFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let category = 'other';
      
      if (['docx', 'doc'].includes(ext)) category = 'docx';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'excel';
      else if (['pptx', 'ppt'].includes(ext)) category = 'pptx';
      else if (['pdf'].includes(ext)) category = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext)) category = 'image';
      else if (['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) category = 'video';
      else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) category = 'audio';
      else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) category = 'archive';
      else if (['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) category = 'code';
      else category = 'other';

      let localUrl = null;
      let thumbnail = null;
      let textContent = null;
      
      // Zero-RAM allocation: use native browser object URL pointer for videos/heavy media
      const isHeavy = category === 'video' || category === 'audio' || file.size > 5 * 1024 * 1024;
      if (isHeavy) {
        localUrl = URL.createObjectURL(file); // Native pointer, 0 bytes RAM allocated!
      } else if (category === 'image' && file.size <= 5 * 1024 * 1024) {
        try {
          const raw = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          localUrl = raw;
          if (raw) {
            thumbnail = await new Promise(resolve => {
              const img = new Image();
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  const maxDim = 180;
                  let w = img.width, h = img.height;
                  if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
                  else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
                  canvas.width = Math.max(1, w); canvas.height = Math.max(1, h);
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, w, h);
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                } catch { resolve(null); }
              };
              img.onerror = () => resolve(null);
              img.src = raw;
            });
          }
        } catch (_err) {
          localUrl = URL.createObjectURL(file);
        }
      } else if (category === 'code' || ['txt', 'md', 'json'].includes(ext)) {
        if (file.size < 2 * 1024 * 1024) {
          try {
            const reader = new FileReader();
            textContent = await new Promise(resolve => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsText(file);
            });
          } catch {}
        }
      } else {
        localUrl = URL.createObjectURL(file);
      }

      const singleFileId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      filePayloads.push({
        rawFile: file,
        id: singleFileId,
        parentId: currentFolderId || null,
        name: file.name,
        type: category,
        category: category,
        sizeBytes: file.size,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl: localUrl,
        thumbnail: thumbnail,
        text: textContent,
        ownerEmail: currentOwner,
        folderType: currentFolder ? currentFolder.folderType : null,
        founder: currentFolder ? currentFolder.founder : null,
        founderEmail: currentFolder ? currentFolder.founderEmail : null,
        ceo: currentFolder ? currentFolder.ceo : null,
        ceoEmail: currentFolder ? currentFolder.ceoEmail : null,
        employeeEmails: currentFolder ? currentFolder.employeeEmails : null,
        folderCreator: creatorInfo.name,
        folderCreatorRole: creatorInfo.role,
        date: new Date().toISOString().split('T')[0]
      });
    }

    // Immediately show in UI (Optimistic update)
    const newFileObjs = filePayloads.map(({ rawFile, ...rest }) => rest);
    const updatedFiles = [...newFileObjs, ...files];
    setFiles(updatedFiles);
    calculateDynamicStorage(updatedFiles);

    setUploadNotification({
      folderName: currentFolder ? currentFolder.name : 'Server Cloud Drive (Root)',
      creatorName: creatorInfo.name,
      creatorRole: creatorInfo.role,
      count: validFiles.length
    });

    // 2. Stream files directly to server using FormData multipart streaming with real-time percentage progress
    for (let i = 0; i < filePayloads.length; i++) {
      const item = filePayloads[i];
      const startTime = Date.now();

      setUploadProgress({
        active: true,
        fileName: item.name,
        fileIndex: i + 1,
        totalFiles: filePayloads.length,
        percent: 0,
        loadedBytes: 0,
        totalBytes: item.sizeBytes,
        speedStr: 'Memulai...',
        status: 'uploading',
        statusText: `Mengunggah berkas ke Cloud... (0%)`
      });

      try {
        const formData = new FormData();
        formData.append('file', item.rawFile); // Native browser streaming directly from storage!
        formData.append('id', item.id);
        formData.append('parentId', currentFolderId || '');
        formData.append('category', item.category);
        formData.append('ownerEmail', currentOwner);
        if (currentFolder) {
          formData.append('folderType', currentFolder.folderType || '');
          formData.append('founder', currentFolder.founder || '');
          formData.append('founderEmail', currentFolder.founderEmail || '');
          formData.append('ceo', currentFolder.ceo || '');
          formData.append('ceoEmail', currentFolder.ceoEmail || '');
          if (currentFolder.employeeEmails) {
            formData.append('employeeEmails', JSON.stringify(currentFolder.employeeEmails));
          }
        }
        formData.append('folderCreator', creatorInfo.name);
        formData.append('folderCreatorRole', creatorInfo.role);
        if (item.thumbnail) formData.append('thumbnail', item.thumbnail);
        if (item.text) formData.append('textContent', item.text);

        const data = await uploadWithProgress(
          `${API_BASE_URL}/api/cloud/upload-raw`,
          formData,
          (prog) => {
            const elapsedSec = (Date.now() - startTime) / 1000;
            let speed = '';
            if (elapsedSec > 0.3 && prog.loaded > 0) {
              const speedBps = prog.loaded / elapsedSec;
              speed = speedBps > 1024 * 1024 
                ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s` 
                : `${Math.round(speedBps / 1024)} KB/s`;
            }
            setUploadProgress({
              active: true,
              fileName: item.name,
              fileIndex: i + 1,
              totalFiles: filePayloads.length,
              percent: prog.percent,
              loadedBytes: prog.loaded,
              totalBytes: prog.total,
              speedStr: speed ? `• Kecepatan: ${speed}` : '',
              status: 'uploading',
              statusText: `Mengunggah data biner ke Cloud... (${prog.percent}%)`
            });
          }
        );

        // Data fully transmitted, now server is applying faststart/saving
        setUploadProgress(prev => prev ? {
          ...prev,
          percent: 100,
          loadedBytes: item.sizeBytes,
          status: 'processing',
          statusText: 'Memproses & mengoptimalkan faststart di Cloud Storage...'
        } : null);

        if (data && data.success && data.file) {
          // Replace optimistic local blob with permanent server stream URL
          setFiles(prevFiles => prevFiles.map(f => {
            if (f.id === item.id) {
              return {
                ...f,
                dataUrl: data.file.dataUrl,
                fileData: data.file.fileData,
                size: data.file.size || f.size,
                sizeBytes: data.file.sizeBytes || f.sizeBytes
              };
            }
            return f;
          }));

          if (data.storageInfo) {
            setStorageInfo(prev => ({
              ...prev,
              usedBytes: data.storageInfo.usedBytes,
              usedMB: data.storageInfo.usedMB,
              totalBytes: data.storageInfo.totalBytes,
              totalMB: data.storageInfo.totalMB,
              percent: Math.min(100, parseFloat(((data.storageInfo.usedBytes / data.storageInfo.totalBytes) * 100).toFixed(2)))
            }));
          }

          setUploadProgress(prev => prev ? {
            ...prev,
            percent: 100,
            status: 'completed',
            statusText: `Berkas "${item.name}" berhasil disimpan di Cloud! ✅`
          } : null);
        } else {
          console.warn('[CloudStorage] Upload error:', data?.error);
          setUploadProgress(prev => prev ? {
            ...prev,
            status: 'error',
            statusText: data?.error || 'Gagal menyimpan berkas ke server'
          } : null);
        }
      } catch (err) {
        console.warn('[CloudStorage] Streaming upload network error:', err.message);
        setUploadProgress(prev => prev ? {
          ...prev,
          status: 'error',
          statusText: `Gagal mengunggah: ${err.message}`
        } : null);
      }
    }

    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setUploadNotification(null);
      setUploadProgress(null);
    }, 4000);
  };

  const handleDeleteFile = async (id, e) => {
    e?.stopPropagation();
    const targetFile = files.find(f => f.id === id);
    if (!window.confirm(`Apakah Anda yakin ingin menghapus berkas "${targetFile?.name || 'ini'}" dari Cloud Storage?`)) {
      return;
    }

    const targetName = targetFile?.name;

    // 1. Gather all descendant IDs if deleting a folder
    const idsToRemove = new Set([id]);
    const queue = [id];
    while (queue.length > 0) {
      const parent = queue.shift();
      files.forEach(f => {
        if (f.parentId === parent && !idsToRemove.has(f.id)) {
          idsToRemove.add(f.id);
          queue.push(f.id);
        }
      });
    }

    // 2. Optimistic UI removal
    const updated = files.filter(f => !idsToRemove.has(f.id));
    setFiles(updated);
    calculateDynamicStorage(updated);

    // 3. Server delete + re-sync from server (Single Source of Truth)
    try {
      await fetch(`${API_BASE_URL}/api/cloud/files/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchCloudStorageData(true);
    } catch (err) {
      console.warn('[CloudStorage] Server delete error:', err.message);
    }
  };

  const [selectedMediaFile, setSelectedMediaFile] = useState(null);

  const handleOpenFile = async (file) => {
    if (file.type === 'folder' || file.category === 'folder') {
      const newPath = [...folderPath, { id: file.id, name: file.name }];
      navigateToFolder(file.id, newPath);
      return;
    }

    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'];
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'];
    const codeExts = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'];

    if (imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext) || codeExts.includes(ext) || 
        ['image', 'video', 'audio', 'code', 'archive'].includes(file.category)) {
      
      const mediaDataUrl = file.dataUrl || file.fileData || null;

      setSelectedMediaFile({
        ...file,
        dataUrl: mediaDataUrl,
        isMediaLoading: (!mediaDataUrl || mediaDataUrl === '[[stored]]')
      });
      return;
    }

    const cat = (file.category || file.type || '').toLowerCase();
    const isDocx = cat === 'docx' || cat === 'word' || cat === 'doc' || ext === 'docx' || ext === 'doc';
    const isExcel = cat === 'excel' || cat === 'xlsx' || ext === 'xlsx' || ext === 'csv';
    const isPpt = cat === 'pptx' || cat === 'ppt' || ext === 'pptx' || ext === 'ppt';
    const isPdf = cat === 'pdf' || ext === 'pdf';

    let editorCategory = 'word';
    let docxType = 'docx';
    if (isExcel) { editorCategory = 'excel'; docxType = 'excel'; }
    else if (isPpt) { editorCategory = 'ppt'; docxType = 'ppt'; }
    else { editorCategory = 'word'; docxType = 'docx'; }

    // Retrieve the actual file binary data (dataUrl)
    let fileDataUrl = file.dataUrl || file.fileData || null;

    let fileContent = file.content;

    // If file dataUrl & content are not available locally (or dataUrl is '[[stored]]'), fetch full file from server
    const needsFetch = (!fileDataUrl || fileDataUrl === '[[stored]]') && !fileContent && file.id && !file.id.startsWith('folder_') && !file.category?.includes('folder');
    if (needsFetch) {
      setOpeningFileMessage('loading sedang meminta data dari server...');
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const tid = controller ? setTimeout(() => controller.abort(), 8000) : null;
        const fetchOpts = { credentials: 'include' };
        if (controller) fetchOpts.signal = controller.signal;

        const res = await fetch(`${API_BASE_URL}/api/cloud/files/${file.id}`, fetchOpts);
        if (tid) clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.file) {
            fileDataUrl = data.file.dataUrl || data.file.fileData || null;
            fileContent = data.file.content || null;
          }
        }
      } catch (err) {
        console.warn('[CloudStorage] Server fetch file detail error:', err);
      } finally {
        setOpeningFileMessage(null);
      }
    }

    // Pass file to DocumentEditor via memory cache & sessionStorage
    const cloudFilePayload = {
      id: file.id,
      name: file.name,
      ext: ext,
      type: docxType,
      dataUrl: fileDataUrl,
      content: fileContent
    };

    if (typeof window !== 'undefined') {
      window.deepernova_active_cloud_file = cloudFilePayload;
    }

    // Ensure returning from DocumentEditor brings the user right back to Cloud Storage
    try {
      sessionStorage.setItem('editor_return_view', 'office');
    } catch (_e) {}

    if (fileDataUrl && fileDataUrl.startsWith('data:')) {
      try {
        sessionStorage.setItem('cloud_file_to_parse', JSON.stringify({
          id: file.id,
          name: file.name,
          ext: ext,
          type: docxType
        }));
      } catch (_e) {}
      onNavigate?.('documents', editorCategory);
      return;
    }

    // Fallback: use content/text if available (for AI-generated artifacts)
    let artifactContent = fileContent;
    if (!artifactContent || typeof artifactContent !== 'object') {
      artifactContent = {
        id: file.id || `doc_${Date.now()}`,
        title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Dokumen Cloud',
        type: docxType,
        content: file.text ? [{ type: 'paragraph', text: file.text }] : [{ type: 'paragraph', text: `Berkas ini tidak memiliki konten yang dapat dibaca. Silakan unggah ulang file.` }]
      };
    }

    try {
      sessionStorage.setItem('open_target_artifact', JSON.stringify(artifactContent));
    } catch (_e) {}

    onNavigate?.('documents', editorCategory);
  };

  const currentEmail = (userEmail || '').toLowerCase().trim();

  // O(1) parent folder lookup map — replaces O(n) files.find() inside filter loop
  const parentFolderMap = useMemo(() => {
    const map = new Map();
    for (const f of files) {
      if ((f.category || f.type || '').toLowerCase() === 'folder') {
        map.set(f.id, f);
      }
    }
    return map;
  }, [files]);

  const filteredFiles = useMemo(() => {
    const searchLower = searchTerm ? searchTerm.toLowerCase() : '';
    const hasSearch = searchLower.length > 0;

    return files.filter(file => {
      const matchesSearch = !hasSearch || file.name.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      // Filter by Folder & File Access Rights (Strict multi-tenant account isolation)
      const cat = (file.category || file.type || '').toLowerCase();
      if (cat === 'folder') {
        if (file.folderType === 'private') {
          const isOwner = !file.ownerEmail || file.ownerEmail.toLowerCase().trim() === currentEmail;
          if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
            return false;
          }
        }
      } else {
        // Non-folder file: only hide if explicitly marked as private and user is not owner
        if (file.folderType === 'private') {
          const isOwner = !file.ownerEmail || file.ownerEmail.toLowerCase().trim() === currentEmail;
          if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
            return false;
          }
        } else if (file.parentId) {
          // File inside a folder: check if parent folder is private — O(1) lookup
          const parentFolder = parentFolderMap.get(file.parentId);
          if (parentFolder && parentFolder.folderType === 'private') {
            const isOwner = !parentFolder.ownerEmail || parentFolder.ownerEmail.toLowerCase().trim() === currentEmail;
            if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
              return false;
            }
          }
        }
      }

      // Filter by Folder Location (Root vs Subfolder)
      if (!hasSearch) {
        if (currentFolderId === null) {
          if (file.parentId && file.parentId !== null) return false;
        } else {
          if (file.parentId !== currentFolderId) return false;
        }
      }

      if (activeCategory === 'all') return true;

      const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';

      if (cat === 'folder') return true; // Always show folders in current location

      if (activeCategory === 'docx') return cat === 'docx' || cat === 'word' || ext === 'docx' || ext === 'doc';
      if (activeCategory === 'excel') return cat === 'excel' || cat === 'xlsx' || ext === 'xlsx' || ext === 'csv';
      if (activeCategory === 'pptx') return cat === 'pptx' || cat === 'ppt' || ext === 'pptx' || ext === 'ppt';
      if (activeCategory === 'pdf') return cat === 'pdf' || ext === 'pdf';
      if (activeCategory === 'image') return cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);
      if (activeCategory === 'video') return cat === 'video' || ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext);
      if (activeCategory === 'audio') return cat === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext);
      if (activeCategory === 'archive') return cat === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext);
      if (activeCategory === 'code') return cat === 'code' || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext);

      return cat === activeCategory;
    });
  }, [files, searchTerm, activeCategory, currentFolderId, currentEmail, parentFolderMap]);

  const getFileIcon = (item, size = 48) => {
    const fileObj = typeof item === 'object' ? item : null;
    const cat = (fileObj ? (fileObj.category || fileObj.type || '') : String(item || '')).toLowerCase();
    const fileName = (fileObj ? (fileObj.name || '') : String(item || '')).toLowerCase();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    const isImg = cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);

    if (isImg && fileObj) {
      const storedSessionData = fileObj.id && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cloud_file_data_${fileObj.id}`) : null;
      const storedMemoryData = fileObj.id && typeof window !== 'undefined' && window.deepernova_file_cache ? window.deepernova_file_cache.get(fileObj.id)?.dataUrl : null;
      let imgSrc = fileObj.thumbnail || fileObj.dataUrl || fileObj.fileData || storedSessionData || storedMemoryData || fileObj.url || fileObj.filePath || fileObj.path;
      if (imgSrc === '[[stored]]') imgSrc = storedSessionData || storedMemoryData || null;
      if (!imgSrc && fileObj.id) {
        imgSrc = `/api/cloud/files/${fileObj.id}/raw`;
      }

      if (imgSrc) {
        const resolvedSrc = resolveMediaUrl(imgSrc);
        return (
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.1)',
              background: '#090d16',
              verticalAlign: 'middle',
              flexShrink: 0
            }}
          >
            <img
              src={resolvedSrc}
              alt={fileObj.name || 'Image'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                if (fileObj.id && !e.target.src.includes(`/api/cloud/files/${fileObj.id}/raw`)) {
                  e.target.src = resolveMediaUrl(`/api/cloud/files/${fileObj.id}/raw`);
                } else {
                  e.target.onerror = null;
                  e.target.src = 'https://img.icons8.com/fluency/96/image.png';
                  e.target.style.objectFit = 'contain';
                  e.target.style.padding = '4px';
                }
              }}
            />
          </div>
        );
      }
    }

    let url = 'https://img.icons8.com/fluency/96/document.png';

    if (cat === 'folder') {
      if (fileObj?.folderType === 'company') {
        url = 'https://img.icons8.com/fluency/96/organization.png';
      } else if (fileObj?.folderType === 'private') {
        url = 'https://img.icons8.com/fluency/96/lock.png';
      } else {
        url = 'https://img.icons8.com/fluency/96/folder-invoices.png';
      }
    }
    else if (cat === 'word' || cat === 'docx' || cat === 'doc' || ext === 'docx' || ext === 'doc') url = 'https://img.icons8.com/fluency/96/microsoft-word-2019.png';
    else if (cat === 'excel' || cat === 'xlsx' || cat === 'csv' || ext === 'xlsx' || ext === 'csv') url = 'https://img.icons8.com/fluency/96/microsoft-excel-2019.png';
    else if (cat === 'ppt' || cat === 'pptx' || ext === 'pptx' || ext === 'ppt') url = 'https://img.icons8.com/fluency/96/microsoft-powerpoint-2019.png';
    else if (cat === 'pdf' || ext === 'pdf') url = 'https://img.icons8.com/fluency/96/pdf-2.png';
    else if (isImg) url = 'https://img.icons8.com/fluency/96/image.png';
    else if (cat === 'video' || ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) url = 'https://img.icons8.com/fluency/96/video-file.png';
    else if (cat === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) url = 'https://img.icons8.com/color/96/music.png';
    else if (cat === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) url = 'https://img.icons8.com/fluency/96/zip.png';
    else if (cat === 'code' || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) url = 'https://img.icons8.com/fluency/96/code-file.png';

    return (
      <img
        src={url}
        alt="file icon"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))'
        }}
      />
    );
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'docx': return 'Dokumen (Typernova)';
      case 'excel': return 'Spreadsheet (Sheets)';
      case 'pptx': return 'Presentasi (Slide)';
      case 'pdf': return 'PDF Vault';
      case 'image': return 'Gambar & Art AI';
      case 'video': return 'Video & Media';
      case 'audio': return 'Suara & Audio';
      case 'archive': return 'Arsip & Zip';
      case 'code': return 'Kode & Teks';
      default: return 'Semua Berkas';
    }
  };

  return (
    <div className="os-desktop-container" style={{ backgroundImage: `url(${wallpapers[wallpaperIndex]})` }}>
      {/* Hidden File Input for ALL file types */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        multiple
      />

      {/* Windows 11 Desktop Shortcuts Grid */}
      <div className="win11-desktop-grid" onClick={() => setShowStartMenu(false)}>
        <div className="win11-desktop-icon" onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}>
          <img src="https://img.icons8.com/color/96/folder-invoices.png" alt="Cloud Explorer" />
          <span>Cloud Explorer</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => { try { sessionStorage.setItem('editor_return_view', 'office'); } catch {} onNavigate?.('documents', 'word'); }}>
          <img src="https://img.icons8.com/color/96/microsoft-word-2019.png" alt="Typernova" />
          <span>Typernova Word</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => { try { sessionStorage.setItem('editor_return_view', 'office'); } catch {} onNavigate?.('documents', 'excel'); }}>
          <img src="https://img.icons8.com/color/96/microsoft-excel-2019.png" alt="Sheets" />
          <span>Sheets Excel</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => { try { sessionStorage.setItem('editor_return_view', 'office'); } catch {} onNavigate?.('documents', 'ppt'); }}>
          <img src="https://img.icons8.com/color/96/microsoft-powerpoint-2019.png" alt="Presentation" />
          <span>Slide Deck</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => onNavigate?.('chat')}>
          <img src="https://img.icons8.com/color/96/chat.png" alt="AI Chat" />
          <span>AI Assistant</span>
        </div>

        <div className="win11-desktop-icon" onClick={cycleWallpaper} title="Klik untuk berganti wallpaper HD gratis dari Unsplash">
          <img src="https://img.icons8.com/color/96/picture.png" alt="Wallpaper" />
          <span>Ganti Wallpaper</span>
        </div>
      </div>

      {/* WINDOWS OS STYLE WINDOW FRAME */}
      <div 
        className={`os-window-frame ${isMaximized ? 'maximized' : ''}`} 
        style={!isWindowOpen || isMinimized ? { display: 'none' } : {}}
        onClick={() => setShowStartMenu(false)}
      >
        {/* Windows OS Window Titlebar */}
        <div className="os-window-titlebar">
          <div className="window-title-group">
            <img src="https://img.icons8.com/color/96/cloud-storage.png" alt="OS Logo" className="window-app-icon" style={{ width: 22, height: 22 }} />
            <span className="window-title-text">Deepernova Cloud Explorer v3.0 — Server Connected [{userName}]</span>
          </div>

          <div className="window-controls-group" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button 
              className="win-btn" 
              onClick={() => setIsMinimized(true)} 
              title="Minimize Window"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="5" width="12" height="2" rx="1" fill="#475569"/>
              </svg>
            </button>

            <button 
              className="win-btn" 
              onClick={() => setIsMaximized(!isMaximized)} 
              title={isMaximized ? "Restore Down" : "Maximize Window"}
            >
              {isMaximized ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 1H11V9H9V11H1V3H3V1ZM9 3H3V9H9V3ZM2 4V10H8V9H3C2.44772 9 2 8.55228 2 8V4Z" fill="#475569"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="#475569" strokeWidth="1.8" fill="none"/>
                </svg>
              )}
            </button>

            <button 
              className="win-btn close-btn" 
              onClick={() => setIsWindowOpen(false)} 
              title="Tutup Jendela Explorer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Explorer Address Bar & Action Bar */}
        <div className="explorer-toolbar">
          <div className="nav-history-btns" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="nav-circle-btn"
              onClick={handleNavBack}
              disabled={navIndex === 0}
              style={{
                opacity: navIndex === 0 ? 0.4 : 1,
                cursor: navIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px'
              }}
              title="Kembali (Back)"
            >
              <img src="https://img.icons8.com/fluency/48/back.png" alt="Back" style={{ width: 16, height: 16 }} />
            </button>

            <button
              className="nav-circle-btn"
              onClick={handleNavForward}
              disabled={navIndex >= navHistory.length - 1}
              style={{
                opacity: navIndex >= navHistory.length - 1 ? 0.4 : 1,
                cursor: navIndex >= navHistory.length - 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px'
              }}
              title="Maju (Forward)"
            >
              <img src="https://img.icons8.com/fluency/48/forward.png" alt="Forward" style={{ width: 16, height: 16 }} />
            </button>

            <button 
              className="nav-circle-btn" 
              title="Refresh Cloud Storage" 
              onClick={fetchCloudStorageData}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
            >
              <img src="https://img.icons8.com/fluency/48/refresh.png" alt="Refresh" style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Breadcrumb Address Bar */}
          <div className="address-breadcrumb-bar">
            <span 
              className="bc-item" 
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([{ id: null, name: 'Server Cloud Drive' }]);
                setActiveCategory('all');
              }}
            >
              <img src="https://img.icons8.com/fluency/48/universe.png" alt="Deepernova OS" style={{ width: 18, height: 18 }} />
              <span>Deepernova OS</span>
            </span>
            <span className="bc-sep">›</span>
            {folderPath.map((folder, idx) => (
              <React.Fragment key={idx}>
                <span 
                  className="bc-item"
                  style={{ cursor: 'pointer', fontWeight: idx === folderPath.length - 1 ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setFolderPath(folderPath.slice(0, idx + 1));
                    setActiveCategory('all');
                  }}
                >
                  {folder.id === null ? (
                    <>
                      <img src="https://img.icons8.com/fluency/48/cloud-storage.png" alt="Cloud" style={{ width: 18, height: 18 }} />
                      <span>Server Cloud Drive</span>
                    </>
                  ) : (
                    <>
                      <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Folder" style={{ width: 18, height: 18 }} />
                      <span>{folder.name}</span>
                    </>
                  )}
                </span>
                {idx < folderPath.length - 1 && <span className="bc-sep">›</span>}
              </React.Fragment>
            ))}

            {(() => {
              const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;
              if (currentFolder) {
                const info = getFolderCreatorInfo(currentFolder);
                return (
                  <div style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontWeight: 500
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="Creator" style={{ width: 16, height: 16 }} />
                      Pembuat Folder: <strong style={{ color: '#facc15' }}>{info.name}</strong>
                    </span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 16, height: 16 }} />
                      Jabatan: <strong style={{ color: '#38bdf8' }}>{info.role}</strong>
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="explorer-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="text"
                className="explorer-search-input"
                placeholder="Cari berkas apapun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <img 
                src="https://img.icons8.com/fluency/48/search.png" 
                alt="Search" 
                style={{ position: 'absolute', left: '10px', width: 16, height: 16, pointerEvents: 'none' }} 
              />
            </div>

            {/* Enterprise Zero-Trust Shield Badge */}
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#10b981',
                userSelect: 'none'
              }}
              title="Pertahanan Berlapis Enterprise: Zero-Trust Active | SHA-256 Tamper-Proof | Row-Level Security Quarantined"
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981'
              }}></span>
              <span>Zero-Trust Vault</span>
            </div>

            <button
              className="view-mode-toggle-btn"
              onClick={() => onNavigate?.('landing')}
              title="Kembali ke Beranda / Landing Page"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(234, 88, 12, 0.12)',
                borderColor: 'rgba(234, 88, 12, 0.3)',
                color: '#ea580c',
                fontWeight: 700
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Beranda</span>
            </button>

            <button
              className="create-upload-btn"
              style={{ background: '#059669', borderColor: '#047857', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={openNewFolderModal}
              title="Buat Folder Baru (Private / Company)"
            >
              <img src="https://img.icons8.com/fluency/48/add-folder.png" alt="New Folder" style={{ width: 18, height: 18 }} />
              <span>+ Folder Baru</span>
            </button>

            <button
              className="view-mode-toggle-btn"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title="Ganti Tampilan Grid / List"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <img 
                src={viewMode === 'grid' ? "https://img.icons8.com/fluency/48/list.png" : "https://img.icons8.com/fluency/48/grid.png"} 
                alt={viewMode === 'grid' ? 'List' : 'Grid'} 
                style={{ width: 18, height: 18 }} 
              />
              <span>{viewMode === 'grid' ? 'List' : 'Grid'}</span>
            </button>

            <button 
              className="create-upload-btn" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <img src="https://img.icons8.com/fluency/48/upload-to-cloud.png" alt="Upload" style={{ width: 18, height: 18 }} />
              <span>{isLoading ? 'Mengunggah...' : 'Upload Berkas'}</span>
            </button>
          </div>
        </div>

        {/* Server Sync Status Bar with Progress Percentage */}
        {isServerSyncing && (
          <div style={{
            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
            color: '#38bdf8',
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14, border: '2px solid #38bdf8', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              <span>Sedang mengambil data dari server...</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '160px', height: '7px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${syncProgress}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)', transition: 'width 0.3s ease' }}></div>
              </div>
              <span style={{ color: '#facc15', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>{syncProgress}%</span>
            </div>
          </div>
        )}

        {/* Explorer Main Content */}
        <div className="explorer-main-body">
          {/* Windows Left Navigation Sidebar */}
          <aside className="explorer-sidebar">
            <div>
              <div className="sidebar-group">
                <div className="sidebar-title">Penyimpanan Cloud (3 GB Free)</div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/cloud-storage.png" alt="Cloud" style={{ width: 20, height: 20 }} />
                    <span>My Cloud Drive</span>
                  </div>
                  <span className="item-count-badge">{files.length}</span>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'docx' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('docx')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-word-2019.png" alt="Word" style={{ width: 20, height: 20 }} />
                    <span>Typernova (Word)</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'excel' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('excel')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-excel-2019.png" alt="Excel" style={{ width: 20, height: 20 }} />
                    <span>Sheets (Excel)</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'pptx' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('pptx')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-powerpoint-2019.png" alt="PPT" style={{ width: 20, height: 20 }} />
                    <span>Presentasi Deck</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'pdf' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('pdf')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/pdf-2.png" alt="PDF" style={{ width: 20, height: 20 }} />
                    <span>PDF Vault</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'image' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('image')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/image.png" alt="Image" style={{ width: 20, height: 20 }} />
                    <span>Gambar & Art AI</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('video')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/video-file.png" alt="Video" style={{ width: 20, height: 20 }} />
                    <span>Video & Media</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'audio' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('audio')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/color/48/music.png" alt="Audio" style={{ width: 20, height: 20 }} />
                    <span>Suara & Audio</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'code' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('code')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/code-file.png" alt="Code" style={{ width: 20, height: 20 }} />
                    <span>Kode & Teks</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'archive' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('archive')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/zip.png" alt="Archive" style={{ width: 20, height: 20 }} />
                    <span>Arsip & Zip</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-group">
                <div className="sidebar-title">Akses Cepat</div>
                <div className="sidebar-nav-item">
                  <div className="nav-item-left">
                    <span>⭐</span>
                    <span>Berkas Favorit</span>
                  </div>
                </div>
                <div className="sidebar-nav-item">
                  <div className="nav-item-left">
                    <span>🗑️</span>
                    <span>Tempat Sampah</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Meter Widget (Real 3 GB Quota) */}
            <div className="sidebar-storage-widget">
              <h5>☁️ Real Cloud Storage (3 GB)</h5>
              <p>{storageInfo.usedMB} MB / {storageInfo.totalMB} MB (Free Tier)</p>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, storageInfo.percent)}%`, height: '100%', background: storageInfo.percent > 90 ? '#ef4444' : '#2563eb' }}></div>
              </div>
            </div>
          </aside>

          {/* Files Grid / List Workspace */}
          <main className="explorer-content-area">
            {filteredFiles.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="os-files-grid">
                  {filteredFiles.map(file => {
                    const cat = (file?.category || file?.type || '').toLowerCase();
                    const ext = file?.name ? file.name.split('.').pop().toLowerCase() : '';
                    const isImg = cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);
                    const storedSessionData = file?.id && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cloud_file_data_${file.id}`) : null;
                    const storedMemoryData = file?.id && typeof window !== 'undefined' && window.deepernova_file_cache ? window.deepernova_file_cache.get(file.id)?.dataUrl : null;
                    let imgSrc = file?.thumbnail || file?.dataUrl || file?.fileData || storedSessionData || storedMemoryData || file?.url || file?.filePath || file?.path;
                    if (imgSrc === '[[stored]]') imgSrc = storedSessionData || storedMemoryData || null;
                    if (!imgSrc && file?.id) {
                      imgSrc = `/api/cloud/files/${file.id}/raw`;
                    }
                    const resolvedGridImgSrc = imgSrc ? resolveMediaUrl(imgSrc) : null;
                    const hasVisualPreview = isImg && resolvedGridImgSrc;

                    return (
                      <div
                        key={file.id}
                        className={`os-file-item-card ${hasVisualPreview ? 'image-card' : ''}`}
                        onClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleItemContextMenu(e, file)}
                        onTouchStart={(e) => handleTouchStart(e, file)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                      >
                        <div className="file-hover-overlay">
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <button className="overlay-btn edit-btn" onClick={(e) => handleEditFolder(file, e)} title="Edit Folder & Struktur Organisasi">✏️</button>
                          )}
                          <button className="overlay-btn del-btn" onClick={(e) => handleDeleteFile(file.id, e)} title="Hapus Berkas">🗑️</button>
                        </div>

                        {hasVisualPreview ? (
                          <div className="file-image-preview-container">
                            <img
                              src={resolvedGridImgSrc}
                              alt={file.name}
                              onError={(e) => {
                                if (file?.id && !e.target.src.includes(`/api/cloud/files/${file.id}/raw`)) {
                                  e.target.src = resolveMediaUrl(`/api/cloud/files/${file.id}/raw`);
                                } else {
                                  e.target.onerror = null;
                                  e.target.src = 'https://img.icons8.com/fluency/96/image.png';
                                  e.target.style.objectFit = 'contain';
                                  e.target.style.padding = '12px';
                                }
                              }}
                            />
                            <span className="image-badge-tag">🖼️ {(ext || 'IMG').toUpperCase()}</span>
                          </div>
                        ) : (
                          <div className="file-icon-box">{getFileIcon(file, 56)}</div>
                        )}

                        <h4 className="file-name-text" title={file.name}>{file.name}</h4>
                        {(file.category === 'folder' || file.type === 'folder') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                            {file.folderType === 'private' ? (
                              <span className="folder-type-badge private">🔒 Private</span>
                            ) : (
                              <span className="folder-type-badge company">🏢 Organisasi • {file.founder || 'Folder Tim'}</span>
                            )}
                            <p className="file-meta-sub">{file.date || 'Today'}</p>
                          </div>
                        ) : (
                          <p className="file-meta-sub">{file.size} • {file.date || 'Today'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <table className="os-files-list-table">
                  <thead>
                    <tr>
                      <th>Nama Berkas</th>
                      <th>Kategori / Tipe</th>
                      <th>Ukuran</th>
                      <th>Tanggal Modified</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <tr
                        key={file.id}
                        onClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleItemContextMenu(e, file)}
                        onTouchStart={(e) => handleTouchStart(e, file)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }}>{getFileIcon(file, 28)}</span>
                          <strong>{file.name}</strong>
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <span style={{ marginLeft: '8px' }}>
                              {file.folderType === 'private' ? (
                                <span className="folder-type-badge private">🔒 Private</span>
                              ) : (
                                <span className="folder-type-badge company">🏢 Organisasi ({file.founder || 'Tim'})</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td>{(file.category || 'FILE').toUpperCase()}</td>
                        <td>{file.size}</td>
                        <td>{file.date || 'Today'}</td>
                        <td>
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <button className="overlay-btn edit-btn" onClick={(e) => handleEditFolder(file, e)} title="Edit Folder & Struktur" style={{ marginRight: '6px', display: 'inline-flex' }}>✏️</button>
                          )}
                          <button className="overlay-btn del-btn" onClick={(e) => handleDeleteFile(file.id, e)} title="Hapus" style={{ display: 'inline-flex' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>☁️</span>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Cloud Storage Masih Kosong</p>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}>Klik tombol "Upload Berkas" di atas untuk mengunggah file apapun (Word, Excel, PDF, Gambar, Video, Audio, ZIP, Kode, dll.)</p>
                <button 
                  className="create-upload-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ margin: '0 auto' }}
                >
                  <span>+</span> Upload Berkas Pertama Anda
                </button>
              </div>
            )}
          </main>
        </div>

        {/* OS Window Statusbar */}
        <footer className="os-statusbar">
          <span>{filteredFiles.length} item ditampilkan (Total {files.length} berkas)</span>
          <span>☁️ Connected to Deepernova Server ({userEmail})</span>
        </footer>
      </div>

      {/* ANDROID FILES OS MOBILE STYLE VIEW (ULTRA-MODERN ZERO-TRUST VAULT) */}
      <div className="android-files-app">
        {/* Hidden Camera Input for direct mobile document/photo scanning */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={cameraInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileUpload} 
        />

        {/* 1. Android Top App Bar */}
        <header className="android-top-appbar">
          <div className="android-title-group">
            {currentFolderId !== null ? (
              <button 
                className="android-back-btn" 
                onClick={handleNavBack}
                title="Kembali ke folder sebelumnya"
              >
                ‹
              </button>
            ) : (
              <button
                className="android-home-pill-btn"
                onClick={() => onNavigate?.('landing')}
                title="Kembali ke Beranda"
              >
                🏠 Beranda
              </button>
            )}
            <div className="android-title-meta">
              <h2>{currentFolderId ? folderPath[folderPath.length - 1]?.name || 'Folder' : 'Cloud Drive (3 GB)'}</h2>
              <span className="android-shield-badge">
                <span className="android-pulse-dot"></span> Zero-Trust SHA-256
              </span>
            </div>
          </div>

          <div className="android-header-actions">
            <button 
              className={`android-icon-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleManualRefresh}
              title="Segarkan data cloud"
            >
              🔄
            </button>
            <button 
              className="android-icon-btn"
              onClick={() => setMobileViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
              title={mobileViewMode === 'grid' ? 'Ganti ke Tampilan Daftar' : 'Ganti ke Tampilan Grid'}
            >
              {mobileViewMode === 'grid' ? '📋' : '📱'}
            </button>
            <button
              onClick={openNewFolderModal}
              className="android-header-new-folder-btn"
              title="Bikin Folder Baru"
            >
              📁+
            </button>
          </div>
        </header>

        {/* 2. Modern Storage Telemetry Card */}
        <div className="android-storage-card">
          <div className="android-storage-top">
            <div className="storage-label-group">
              <span className="storage-icon">☁️</span>
              <div>
                <strong>Kapasitas Cloud Vault</strong>
                <span className="storage-sub">Penyimpanan Privat & Aman</span>
              </div>
            </div>
            <span className="storage-percent-tag">{storageInfo.percent || 0}% Terpakai</span>
          </div>

          <div className="android-storage-bar-track">
            <div 
              className="android-storage-bar-fill" 
              style={{ width: `${Math.min(100, Math.max(2, parseFloat(storageInfo.percent || 0)))}%` }}
            ></div>
          </div>

          <div className="android-storage-bottom">
            <span>{storageInfo.usedMB || '0.00'} MB digunakan</span>
            <span>Maksimal 3072 MB (3 GB)</span>
          </div>
        </div>

        {/* 3. Search & Filter Bar */}
        <div className="android-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Cari berkas atau dokumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        {/* 4. Category Filter Chips */}
        <div className="android-chips-scroll">
          <button className={`android-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
            ✨ Semua ({filteredFiles.length})
          </button>
          <button className={`android-chip ${activeCategory === 'docx' ? 'active' : ''}`} onClick={() => setActiveCategory('docx')}>
            📄 Word
          </button>
          <button className={`android-chip ${activeCategory === 'excel' ? 'active' : ''}`} onClick={() => setActiveCategory('excel')}>
            📊 Excel
          </button>
          <button className={`android-chip ${activeCategory === 'pptx' ? 'active' : ''}`} onClick={() => setActiveCategory('pptx')}>
            📽️ Slide
          </button>
          <button className={`android-chip ${activeCategory === 'pdf' ? 'active' : ''}`} onClick={() => setActiveCategory('pdf')}>
            📕 PDF
          </button>
          <button className={`android-chip ${activeCategory === 'image' ? 'active' : ''}`} onClick={() => setActiveCategory('image')}>
            🖼️ Gambar
          </button>
          <button className={`android-chip ${activeCategory === 'video' ? 'active' : ''}`} onClick={() => setActiveCategory('video')}>
            🎬 Video
          </button>
          <button className={`android-chip ${activeCategory === 'audio' ? 'active' : ''}`} onClick={() => setActiveCategory('audio')}>
            🎵 Audio
          </button>
          <button className={`android-chip ${activeCategory === 'code' ? 'active' : ''}`} onClick={() => setActiveCategory('code')}>
            💻 Kode
          </button>
        </div>

        {/* 5. Main Files View (Grid or List) */}
        {filteredFiles.length === 0 ? (
          <div className="android-empty-state">
            <div className="empty-icon">📂</div>
            <h3>Belum Ada Berkas</h3>
            <p>Ketuk tombol <strong>+</strong> di bawah untuk mengunggah berkas atau membuat folder baru.</p>
          </div>
        ) : mobileViewMode === 'grid' ? (
          <div className="android-file-grid">
            {filteredFiles.map(file => (
              <div 
                key={file.id} 
                className="android-grid-card"
                onClick={() => handleOpenFile(file)}
              >
                <div className="grid-card-preview">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.name} className="grid-card-thumb" />
                  ) : (
                    <div className="grid-card-icon">{getFileIcon(file, 44)}</div>
                  )}
                  <button 
                    className="grid-card-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMobileFile(file);
                    }}
                    title="Menu Opsi Berkas"
                  >
                    ⋮
                  </button>
                </div>
                <div className="grid-card-info">
                  <h4 title={file.name}>{file.name}</h4>
                  <div className="grid-card-meta">
                    {(file.category === 'folder' || file.type === 'folder') ? (
                      <span className="folder-pill">{file.folderType === 'private' ? '🔒 Pribadi' : '🏢 Tim'}</span>
                    ) : (
                      <span>{file.size}</span>
                    )}
                    <span className="sha-dot" title="SHA-256 Protected">🛡️ SHA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="android-file-list">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="android-file-item"
                onClick={() => handleOpenFile(file)}
                onContextMenu={(e) => handleItemContextMenu(e, file)}
                onTouchStart={(e) => handleTouchStart(e, file)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                <div className="android-file-left">
                  <div className="android-file-icon">{getFileIcon(file, 38)}</div>
                  <div className="android-file-info">
                    <h4>{file.name}</h4>
                    {(file.category === 'folder' || file.type === 'folder') ? (
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {file.folderType === 'private' ? '🔒 Pribadi' : `🏢 Organisasi (${file.founder || 'Tim'})`}
                      </p>
                    ) : (
                      <p>{file.size} • {file.date || 'Today'} • <span style={{ color: '#10b981' }}>🛡️ SHA-256</span></p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    className="android-file-options-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMobileFile(file);
                    }}
                    title="Opsi Berkas"
                  >
                    ⋮
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Mobile Action Menu Modal / Sheet (FAB Triggered) */}
        {showMobileActionMenu && (
          <div className="mobile-fab-backdrop" onClick={() => setShowMobileActionMenu(false)}>
            <div className="mobile-fab-menu" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-sheet-drag-handle"></div>
              <div className="mobile-fab-menu-header">
                <span>➕ Tambah Berkas / Folder</span>
                <button className="mobile-fab-close" onClick={() => setShowMobileActionMenu(false)}>✕</button>
              </div>

              <button
                className="mobile-fab-item"
                onClick={() => {
                  setShowMobileActionMenu(false);
                  openNewFolderModal();
                }}
              >
                <div className="fab-item-icon folder-icon">📁</div>
                <div className="fab-item-text">
                  <strong>Bikin Folder Baru</strong>
                  <span>Buat direktori penyimpanan (Private / Tim)</span>
                </div>
              </button>

              <button
                className="mobile-fab-item"
                onClick={() => {
                  setShowMobileActionMenu(false);
                  cameraInputRef.current?.click();
                }}
              >
                <div className="fab-item-icon camera-icon">📸</div>
                <div className="fab-item-text">
                  <strong>Ambil Foto / Scan Dokumen</strong>
                  <span>Buka kamera HP dan upload langsung</span>
                </div>
              </button>

              <button
                className="mobile-fab-item"
                onClick={() => {
                  setShowMobileActionMenu(false);
                  fileInputRef.current?.click();
                }}
              >
                <div className="fab-item-icon upload-icon">📤</div>
                <div className="fab-item-text">
                  <strong>Upload Berkas / File</strong>
                  <span>Dokumen, Foto, Video, Audio, Arsip, dll.</span>
                </div>
              </button>

              <button
                className="mobile-fab-item"
                onClick={() => {
                  setShowMobileActionMenu(false);
                  try { sessionStorage.setItem('editor_return_view', 'office'); } catch {}
                  onNavigate?.('word');
                }}
              >
                <div className="fab-item-icon doc-icon">📝</div>
                <div className="fab-item-text">
                  <strong>Dokumen AI Baru</strong>
                  <span>Buka Document Editor (Word, Excel, Slide)</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 7. File Action Bottom Sheet (Tapped from File Item ⋮) */}
        {selectedMobileFile && (
          <div className="mobile-fab-backdrop" onClick={() => setSelectedMobileFile(null)}>
            <div className="mobile-fab-menu mobile-file-detail-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-sheet-drag-handle"></div>
              
              <div className="mobile-file-sheet-header">
                <div className="sheet-file-icon">{getFileIcon(selectedMobileFile, 40)}</div>
                <div className="sheet-file-info">
                  <h4>{selectedMobileFile.name}</h4>
                  <p>{selectedMobileFile.size} • {selectedMobileFile.date || 'Today'}</p>
                </div>
                <button className="mobile-fab-close" onClick={() => setSelectedMobileFile(null)}>✕</button>
              </div>

              {/* SHA-256 Checksum Fingerprint Card */}
              <div className="mobile-checksum-box">
                <div className="checksum-label">
                  <span>🛡️ Integritas Zero-Trust (SHA-256)</span>
                  <button 
                    className="copy-hash-btn"
                    onClick={() => {
                      if (selectedMobileFile.checksum) {
                        navigator.clipboard?.writeText(selectedMobileFile.checksum);
                        alert('Hash SHA-256 berhasil disalin ke clipboard!');
                      }
                    }}
                  >
                    📋 Salin
                  </button>
                </div>
                <code className="checksum-code">
                  {selectedMobileFile.checksum ? `${selectedMobileFile.checksum.substring(0, 24)}...` : 'Terenkripsi Server'}
                </code>
              </div>

              {/* Action Buttons */}
              <div className="mobile-sheet-action-list">
                <button 
                  className="mobile-sheet-action-btn primary"
                  onClick={() => {
                    const f = selectedMobileFile;
                    setSelectedMobileFile(null);
                    handleOpenFile(f);
                  }}
                >
                  <span className="action-icon">👁️</span>
                  <span>Buka / Putar Berkas</span>
                </button>

                {(selectedMobileFile.category !== 'folder' && selectedMobileFile.type !== 'folder') && (
                  <button 
                    className="mobile-sheet-action-btn"
                    onClick={() => {
                      const f = selectedMobileFile;
                      setSelectedMobileFile(null);
                      triggerFileDownload(f);
                    }}
                  >
                    <span className="action-icon">📥</span>
                    <span>Unduh Berkas Aman</span>
                  </button>
                )}

                {(selectedMobileFile.category === 'folder' || selectedMobileFile.type === 'folder') && (
                  <button 
                    className="mobile-sheet-action-btn"
                    onClick={(e) => {
                      const f = selectedMobileFile;
                      setSelectedMobileFile(null);
                      handleEditFolder(f, e);
                    }}
                  >
                    <span className="action-icon">✏️</span>
                    <span>Edit Nama Folder</span>
                  </button>
                )}

                <button 
                  className="mobile-sheet-action-btn danger"
                  onClick={(e) => {
                    const fId = selectedMobileFile.id;
                    setSelectedMobileFile(null);
                    handleDeleteFile(fId, e);
                  }}
                >
                  <span className="action-icon">🗑️</span>
                  <span>Hapus Berkas dari Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. Modern Floating Action Button (FAB) */}
        <button
          className={`android-fab ${showMobileActionMenu ? 'open' : ''}`}
          onClick={() => setShowMobileActionMenu(prev => !prev)}
          title="Tambah Berkas atau Folder"
        >
          {showMobileActionMenu ? '✕' : '+'}
        </button>

        {/* 9. Floating Frosted Bottom Navigation Dock */}
        <nav className="android-bottom-nav">
          <div className="bottom-nav-item active" onClick={() => { setActiveCategory('all'); setCurrentFolderId(null); }}>
            <span className="icon">☁️</span>
            <span>Drive (3 GB)</span>
          </div>
          <div className="bottom-nav-item" onClick={() => setCurrentFolderId(null)}>
            <span className="icon">📂</span>
            <span>Root</span>
          </div>
          <div className="bottom-nav-item" onClick={() => { try { sessionStorage.setItem('editor_return_view', 'office'); } catch {} onNavigate?.('word'); }}>
            <span className="icon">📝</span>
            <span>Editor</span>
          </div>
          <div className="bottom-nav-item" onClick={() => onNavigate?.('chat')}>
            <span className="icon">💬</span>
            <span>Chat AI</span>
          </div>
          <div className="bottom-nav-item" onClick={() => onNavigate?.('landing')}>
            <span className="icon">🏠</span>
            <span>Beranda</span>
          </div>
        </nav>
      </div>

      {/* Built-in Multi-Media & Document Viewer Modal (Lega & Full View) */}
      {selectedMediaFile && (
        <CloudMediaViewerModal 
          file={selectedMediaFile} 
          onClose={() => setSelectedMediaFile(null)} 
          getFileIcon={getFileIcon}
        />
      )}

      {/* Google Cloud Style Create / Edit Directory Resource Modal */}
      {showNewFolderModal && (
        <div className="gcloud-modal-backdrop" onClick={() => { setShowNewFolderModal(false); setEditingFolder(null); setNewFolderName(''); }}>
          <div className="gcloud-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Top Google Cloud Branding Bar */}
            <div className="gcloud-modal-topbar">
              <div className="gcloud-branding">
                <svg className="gcloud-logo-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#4285F4"/>
                  <path d="M19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" fill="#ffffff" opacity="0.2"/>
                </svg>
                <div className="gcloud-breadcrumbs">
                  <span className="gcloud-crumb-root">Deepernova Cloud Platform</span>
                  <span className="gcloud-crumb-sep">/</span>
                  <span className="gcloud-crumb-service">Cloud Storage & IAM</span>
                  <span className="gcloud-crumb-sep">/</span>
                  <span className="gcloud-crumb-active">{editingFolder ? 'Edit Directory Resource' : 'Create Directory Resource'}</span>
                </div>
              </div>
              <button 
                type="button"
                className="gcloud-modal-close-btn"
                onClick={() => { setShowNewFolderModal(false); setEditingFolder(null); setNewFolderName(''); }}
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Main Header */}
            <div className="gcloud-modal-header">
              <h2 className="gcloud-modal-title">
                {editingFolder ? 'Konfigurasi Resource Direktori' : 'Buat Direktori Resource Baru'}
              </h2>
              <p className="gcloud-modal-desc">
                Atur metadata alokasi penyimpanan, kontrol akses (IAM Policy Scope), dan delegasi peran akun.
              </p>
            </div>

            <div className="gcloud-modal-body">
              {/* Step 1: Directory Name */}
              <div className="gcloud-form-group">
                <label className="gcloud-label" htmlFor="gcloud-folder-name">
                  Nama Direktori (Directory Name) <span className="gcloud-required">*</span>
                </label>
                <input
                  id="gcloud-folder-name"
                  type="text"
                  className="gcloud-input"
                  placeholder="Contoh: Dokumen-Strategis, Production-Assets, Riset-AI"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFolder(); }}
                  autoFocus
                />
                <span className="gcloud-input-hint">Gunakan penamaan deskriptif untuk alokasi hierarki resource folder.</span>
              </div>

              {/* Step 2: Storage Access Scope (Cards) */}
              <div className="gcloud-form-group">
                <label className="gcloud-label">
                  Kontrol Akses & Scope IAM (Access Control) <span className="gcloud-required">*</span>
                </label>
                <div className="gcloud-scope-cards">
                  {/* Card 1: Private */}
                  <div 
                    className={`gcloud-scope-card ${folderType === 'private' ? 'active' : ''}`}
                    onClick={() => setFolderType('private')}
                  >
                    <div className="gcloud-scope-radio">
                      <span className={`gcloud-radio-circle ${folderType === 'private' ? 'checked' : ''}`} />
                    </div>
                    <div className="gcloud-scope-content">
                      <div className="gcloud-scope-header">
                        <span className="gcloud-scope-icon">🔒</span>
                        <span className="gcloud-scope-name">Private Resource (Uniform Access)</span>
                        <span className="gcloud-tag-pill private">Restricted IAM</span>
                      </div>
                      <p className="gcloud-scope-desc">
                        Akses terisolasi eksklusif untuk pemilik akun. Berkas privat dan tidak dapat diakses atau diubah oleh pihak luar.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Organization Shared */}
                  <div 
                    className={`gcloud-scope-card ${folderType === 'company' ? 'active' : ''}`}
                    onClick={() => setFolderType('company')}
                  >
                    <div className="gcloud-scope-radio">
                      <span className={`gcloud-radio-circle ${folderType === 'company' ? 'checked' : ''}`} />
                    </div>
                    <div className="gcloud-scope-content">
                      <div className="gcloud-scope-header">
                        <span className="gcloud-scope-icon">🏢</span>
                        <span className="gcloud-scope-name">Organization Shared (Cloud IAM)</span>
                        <span className="gcloud-tag-pill org">Enterprise IAM</span>
                      </div>
                      <p className="gcloud-scope-desc">
                        Akses kolaboratif tim & perusahaan. Delegasikan izin peran (Admin, Editor, Viewer) ke anggota terdaftar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Cloud IAM Roles & Principals (If folderType === 'company') */}
              {folderType === 'company' && (
                <div className="gcloud-iam-section">
                  <div className="gcloud-iam-banner">
                    <div className="gcloud-iam-banner-icon">ℹ️</div>
                    <div className="gcloud-iam-banner-text">
                      <strong>Kebijakan Akses IAM (Identity & Access Management):</strong> Prinsipal yang didaftarkan dengan akun <strong>@deepmail.com</strong> atau email perusahaan akan memiliki hak akses otomatis sesuai peran saat login.
                    </div>
                  </div>

                  {/* Project Lead / Founder */}
                  <div className="gcloud-iam-card">
                    <div className="gcloud-iam-card-header">
                      <span className="gcloud-role-badge admin">👑 Resource Owner / Project Lead</span>
                      <span className="gcloud-role-tag">Role: Administrator (Full Access)</span>
                    </div>
                    <div className="gcloud-grid-2">
                      <div>
                        <label className="gcloud-sublabel">Nama Penanggung Jawab / Lead</label>
                        <input
                          type="text"
                          className="gcloud-input"
                          placeholder="Nama Lengkap Penanggung Jawab"
                          value={founderName}
                          onChange={(e) => setFounderName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="gcloud-sublabel">Email Prinsipal (Identitas Akun)</label>
                        <input
                          type="email"
                          className="gcloud-input"
                          placeholder="lead@deepmail.com"
                          value={founderEmail}
                          onChange={(e) => setFounderEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Co-Lead / Secondary Manager */}
                  <div className="gcloud-iam-card">
                    <div className="gcloud-iam-card-header">
                      <span className="gcloud-role-badge co-lead">👔 Co-Lead / Manager Pendamping (Opsional)</span>
                      <span className="gcloud-role-tag">Role: Security Co-Manager</span>
                    </div>
                    <div className="gcloud-grid-2">
                      <div>
                        <label className="gcloud-sublabel">Nama Co-Lead</label>
                        <input
                          type="text"
                          className="gcloud-input"
                          placeholder="Nama Manager / Co-Lead (Opsional)"
                          value={ceoName}
                          onChange={(e) => setCeoName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="gcloud-sublabel">Email Prinsipal Co-Lead</label>
                        <input
                          type="email"
                          className="gcloud-input"
                          placeholder="manager@deepmail.com (Opsional)"
                          value={ceoEmail}
                          onChange={(e) => setCeoEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional IAM Principals Table */}
                  <div className="gcloud-iam-principals-box">
                    <div className="gcloud-principals-header">
                      <div>
                        <h4 className="gcloud-principals-title">Prinsipal & Delegasi Peran Anggota</h4>
                        <span className="gcloud-principals-subtitle">{customRoles.length} Prinsipal terkonfigurasi</span>
                      </div>
                      <button
                        type="button"
                        className="gcloud-btn-add-principal"
                        onClick={handleAddCustomRole}
                      >
                        <span>+</span> Tambah Anggota (Add Principal)
                      </button>
                    </div>

                    {customRoles.length === 0 ? (
                      <div className="gcloud-empty-principals">
                        <span>👥 Belum ada anggota tambahan. Klik "+ Tambah Anggota" untuk mendelegasikan izin peran.</span>
                      </div>
                    ) : (
                      <div className="gcloud-principals-list">
                        {customRoles.map((item, idx) => (
                          <div key={idx} className="gcloud-principal-row">
                            <div className="gcloud-principal-col role-col">
                              <label className="gcloud-row-label">Peran IAM</label>
                              <select
                                className="gcloud-select"
                                value={item.role}
                                onChange={(e) => handleUpdateCustomRole(idx, 'role', e.target.value)}
                              >
                                <option value="Editor">✏️ Editor (Read & Write)</option>
                                <option value="Viewer">👁️ Viewer (Read Only)</option>
                                <option value="Administrator">👑 Administrator (Full Control)</option>
                                <option value="Contributor">📦 Contributor (Upload & Sync)</option>
                                <option value="Auditor">🔍 Auditor (Audit Log Only)</option>
                              </select>
                            </div>

                            <div className="gcloud-principal-col name-col">
                              <label className="gcloud-row-label">Nama Anggota</label>
                              <input
                                type="text"
                                className="gcloud-input"
                                placeholder="Nama Anggota Tim"
                                value={item.name}
                                onChange={(e) => handleUpdateCustomRole(idx, 'name', e.target.value)}
                              />
                            </div>

                            <div className="gcloud-principal-col email-col">
                              <label className="gcloud-row-label">Email Prinsipal (@deepmail.com)</label>
                              <input
                                type="email"
                                className="gcloud-input"
                                placeholder="member@deepmail.com"
                                value={item.email || ''}
                                onChange={(e) => handleUpdateCustomRole(idx, 'email', e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              className="gcloud-btn-remove-principal"
                              onClick={() => handleRemoveCustomRole(idx)}
                              title="Hapus Anggota Ini"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Google Cloud Modal Actions Footer */}
            <div className="gcloud-modal-footer">
              <div className="gcloud-footer-status">
                <span className="gcloud-status-dot" />
                <span>Deepernova Cloud Resource Manager • Ready</span>
              </div>
              <div className="gcloud-footer-buttons">
                <button
                  type="button"
                  className="gcloud-btn-secondary"
                  onClick={() => { setShowNewFolderModal(false); setEditingFolder(null); setNewFolderName(''); }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="gcloud-btn-primary"
                  onClick={handleSaveFolder}
                  disabled={!newFolderName.trim()}
                >
                  {editingFolder ? 'Simpan Perubahan Resource' : (folderType === 'company' ? 'Buat Organization Directory' : 'Buat Private Directory')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Windows 11 Taskbar at Bottom */}
      <div className="win11-taskbar">
        {/* Left Side: Live Clock, Date, and System Tray */}
        <div className="taskbar-left-group" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="taskbar-clock" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
            <span className="time-text" style={{ fontWeight: 700, color: '#ffffff', fontSize: '12px' }}>{timeString}</span>
            <span className="date-text" style={{ color: '#94a3b8', fontSize: '10px' }}>{dateString}</span>
          </div>
          <div className="taskbar-system-tray" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#e2e8f0' }}>
            <span title="Koneksi Cloud Online">📶</span>
            <span title="Suara System 100%">🔊</span>
            <span title="Baterai 100%">🔋</span>
          </div>
        </div>

        {/* Center Side: Start Button, Search Box, App Icons */}
        <div className="taskbar-center-group">
          {/* Start Menu Button */}
          <button 
            className={`taskbar-btn start-btn ${showStartMenu ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowStartMenu(!showStartMenu); }}
            title="Start Menu"
          >
            <img src="https://img.icons8.com/color/48/windows-11.png" alt="Start Menu" />
          </button>

          {/* Taskbar Search Input */}
          <div className="taskbar-search-box">
            <img src="https://img.icons8.com/material-outlined/24/94a3b8/search.png" alt="Search" />
            <input 
              type="text" 
              placeholder="Search files or apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}
            />
          </div>

          {/* App Icons */}
          <button 
            className={`taskbar-btn ${isWindowOpen && !isMinimized ? 'active' : ''}`}
            onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}
            title="Deepernova Cloud Explorer"
          >
            <img src="https://img.icons8.com/color/48/folder-invoices.png" alt="Explorer" />
            {isWindowOpen && <span className="active-dot"></span>}
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('documents', 'word')} title="Typernova Word">
            <img src="https://img.icons8.com/color/48/microsoft-word-2019.png" alt="Word" />
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('documents', 'excel')} title="Sheets Excel">
            <img src="https://img.icons8.com/color/48/microsoft-excel-2019.png" alt="Excel" />
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('chat')} title="AI Assistant">
            <img src="https://img.icons8.com/color/48/chat.png" alt="Chat" />
          </button>
        </div>

        {/* Right Side: Desktop Quick Switch */}
        <div className="taskbar-right-group" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="taskbar-btn" 
            onClick={() => setIsWindowOpen(!isWindowOpen)} 
            title="Tampilkan Desktop"
            style={{ width: '12px', borderLeft: '1px solid rgba(255,255,255,0.2)', height: '48px', borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Windows 11 Start Menu Popup */}
      {showStartMenu && (
        <div className="win11-start-menu-popup" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <div className="user-profile-info">
              <img src="https://img.icons8.com/fluency/96/user-male-circle.png" alt="User Avatar" />
              <div>
                <h4>{userName}</h4>
                <p>{userEmail}</p>
              </div>
            </div>
          </div>

          <div className="start-menu-section-title">Pinned Apps</div>
          <div className="start-menu-grid">
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); setIsWindowOpen(true); setIsMinimized(false); }}>
              <img src="https://img.icons8.com/color/96/folder-invoices.png" alt="Explorer" />
              <span>Cloud Explorer</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'word'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-word-2019.png" alt="Word" />
              <span>Typernova Word</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'excel'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-excel-2019.png" alt="Excel" />
              <span>Sheets Excel</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'ppt'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-powerpoint-2019.png" alt="PPT" />
              <span>Slide Deck</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('chat'); }}>
              <img src="https://img.icons8.com/color/96/chat.png" alt="Chat" />
              <span>AI Assistant</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); cycleWallpaper(); }}>
              <img src="https://img.icons8.com/color/96/picture.png" alt="Wallpaper" />
              <span>Ganti Background</span>
            </div>
          </div>

          <div className="start-menu-footer">
            <button className="power-btn" onClick={() => { setShowStartMenu(false); onNavigate?.('universe'); }}>
              <span>⏻</span> Exit OS / Universe
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CONTEXT MENU (RIGHT-CLICK & LONG-PRESS) */}
      {contextMenu.visible && contextMenu.file && (
        <div
          className="os-context-menu"
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-header">
            <span className="menu-file-icon">{getFileIcon(contextMenu.file, 20)}</span>
            <span className="menu-file-name">{contextMenu.file.name}</span>
          </div>

          {(() => {
            const info = getFileUploaderAndFolderInfo(contextMenu.file);
            if (!info) return null;
            return (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.75)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="User" style={{ width: 14, height: 14 }} />
                  <span>{info.isFolder ? 'Pembuat Folder' : 'Diunggah oleh'}: <strong style={{ color: '#facc15' }}>{info.uploaderName}</strong></span>
                </div>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 14, height: 14 }} />
                  <span>Jabatan: <strong style={{ color: '#38bdf8' }}>{info.uploaderRole}</strong></span>
                </div>
                {!info.isFolder && (
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Location" style={{ width: 13, height: 13 }} />
                    <span>Lokasi Folder: <span style={{ color: '#e2e8f0' }}>{info.folderName}</span></span>
                  </div>
                )}
                {contextMenu.file.checksum && (
                  <div style={{ color: '#10b981', fontSize: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                    <span title={`SHA-256: ${contextMenu.file.checksum}`}>🛡️ SHA-256: {contextMenu.file.checksum.substring(0, 16)}...</span>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="menu-divider" />
          <button className="menu-item" onClick={() => { handleOpenFile(contextMenu.file); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="https://img.icons8.com/fluency/48/opened-folder.png" alt="Open" style={{ width: 16, height: 16 }} />
            <span>Buka Berkas</span>
          </button>
          {(contextMenu.file.category === 'folder' || contextMenu.file.type === 'folder') && (
            <button className="menu-item" onClick={(e) => { handleEditFolder(contextMenu.file, e); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="https://img.icons8.com/fluency/48/edit.png" alt="Edit" style={{ width: 16, height: 16 }} />
              <span>Edit Folder & Struktur</span>
            </button>
          )}
          {contextMenu.file.category !== 'folder' && contextMenu.file.type !== 'folder' && (
            <a
              className="menu-item"
              href={contextMenu.file.dataUrl || contextMenu.file.url || '#'}
              download={contextMenu.file.name}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setContextMenu({ visible: false, x: 0, y: 0, file: null })}
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src="https://img.icons8.com/fluency/48/download.png" alt="Download" style={{ width: 16, height: 16 }} />
              <span>Unduh Berkas</span>
            </a>
          )}
          <div className="menu-divider" />
          <button className="menu-item danger" onClick={(e) => { handleDeleteFile(contextMenu.file.id, e); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="https://img.icons8.com/fluency/48/trash.png" alt="Delete" style={{ width: 16, height: 16 }} />
            <span>Hapus Berkas</span>
          </button>
        </div>
      )}

      {/* REAL-TIME UPLOAD PROGRESS WIDGET (% INDICATOR) */}
      {uploadProgress && (
        <div style={{
          position: 'fixed',
          bottom: uploadNotification ? '150px' : '24px',
          right: '24px',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(56, 189, 248, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>
                {uploadProgress.status === 'completed' ? '✅' : uploadProgress.status === 'error' ? '⚠️' : '🚀'}
              </span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#38bdf8' }}>
                {uploadProgress.status === 'completed' ? 'Unggahan Selesai' : `Mengunggah (${uploadProgress.fileIndex}/${uploadProgress.totalFiles})`}
              </span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: uploadProgress.status === 'completed' ? '#34d399' : '#38bdf8' }}>
              {uploadProgress.percent}%
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={uploadProgress.fileName}>
            {uploadProgress.fileName}
          </div>

          {/* Dynamic Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${uploadProgress.percent}%`,
              background: uploadProgress.status === 'completed' 
                ? 'linear-gradient(90deg, #10b981, #34d399)' 
                : uploadProgress.status === 'error' 
                  ? '#ef4444' 
                  : 'linear-gradient(90deg, #0284c7, #38bdf8, #60a5fa)',
              borderRadius: '999px',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
            <span>
              {uploadProgress.loadedBytes > 0 
                ? `${(uploadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB` 
                : uploadProgress.statusText}
            </span>
            {uploadProgress.speedStr && (
              <span style={{ color: '#67e8f9', fontWeight: 600 }}>{uploadProgress.speedStr}</span>
            )}
          </div>
        </div>
      )}

      {/* FLOATING UPLOAD NOTIFICATION TOAST */}
      {uploadNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '420px'
        }}>
          <div style={{ fontSize: '28px', display: 'flex', alignItems: 'center' }}>
            <img src="https://img.icons8.com/fluency/48/checked.png" alt="Success" style={{ width: 32, height: 32 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#38bdf8', marginBottom: '2px' }}>
              Berhasil Mengunggah {uploadNotification.count} Berkas!
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Folder" style={{ width: 14, height: 14 }} />
              <span>Folder: <strong style={{ color: '#fff' }}>{uploadNotification.folderName}</strong></span>
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="Creator" style={{ width: 14, height: 14 }} />
              <span>Pembuat Folder: <strong style={{ color: '#facc15' }}>{uploadNotification.creatorName}</strong></span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 14, height: 14 }} />
              <span>Jabatan: <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{uploadNotification.creatorRole}</span></span>
            </div>
          </div>
          <button 
            onClick={() => setUploadNotification(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast Notification: "loading sedang meminta data dari server" */}
      {openingFileMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <div className="spinner-border spinner-border-sm" role="status" style={{ width: 18, height: 18, border: '2px solid #fff', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span>{openingFileMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AIManagerOffice;
