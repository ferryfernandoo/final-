import './services/securityShield.js'
import './services/clientSearchService.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DownloadToastContainer from './components/DownloadToastContainer.jsx'

// Auto-recover from stale Vite chunk/preload errors after a new deployment (prevents blank white screen)
const recoverFromStaleChunk = () => {
  try {
    const key = 'dpn_chunk_reload_at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem(key, String(Date.now()));
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
        window.location.reload();
      });
      return;
    }
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

window.addEventListener('vite:preloadError', (event) => {
  event?.preventDefault?.();
  recoverFromStaleChunk();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(msg)) {
    event?.preventDefault?.();
    recoverFromStaleChunk();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <DownloadToastContainer />
  </StrictMode>,
)
