// Default backend URL hosted on Cloudflare Tunnel
const CLOUDFLARE_BACKEND_URL = 'https://wesley-language-starting-theories.trycloudflare.com';

const getApiBaseUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore env access issues in non-Vite runtimes such as Node-based tests
  }

  // If in browser and running on localhost or 127.0.0.1, use relative path so Vite proxy routes locally
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }

  // In production / Vercel, always point directly to the live Cloudflare tunnel backend
  return CLOUDFLARE_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

