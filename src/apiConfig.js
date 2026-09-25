// Cloudflare Tunnel backend URL (live proxy target)
const CLOUDFLARE_BACKEND_URL = 'https://shed-hear-conclude-walking.trycloudflare.com';

const getApiBaseUrl = () => {
  // 1. In browser, prioritize same-origin relative URL for known proxy hosts
  // This leverages vercel.json rewrites so all requests are same-origin on Vercel deployments.
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'deepernova.com' ||
      hostname === 'www.deepernova.com'
    ) {
      return '';
    }
  }

  // 2. Custom environment override
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore env access issues in non-Vite runtimes
  }

  // 3. Fallback direct URL when loaded outside reverse-proxy domains
  return CLOUDFLARE_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Order DTE Portal URL (Local Vite Port 5173 or Public Cloudflare Tunnel)
export const ORDER_DTE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ORDER_DTE_URL) ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5173'
    : 'https://tennessee-mount-keno-difficulties.trycloudflare.com');
