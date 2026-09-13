// Cloudflare Tunnel backend URL (live proxy target)
const CLOUDFLARE_BACKEND_URL = 'https://concluded-kurt-charleston-harley.trycloudflare.com';

const getApiBaseUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore env access issues in non-Vite runtimes
  }

  // If in browser:
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Localhost, 127.0.0.1, Vercel deployments (*.vercel.app), or production domains
    // Using relative paths ('') leverages vercel.json rewrites so requests are same-origin.
    // This completely eliminates CORS issues and ensures session cookies (connect.sid) persist flawlessly.
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

  // Fallback direct URL when loaded outside reverse-proxy domains
  return CLOUDFLARE_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();
