// Production Base URL (Vercel CDN + reverse proxy)
export const CLOUDFLARE_BACKEND_URL = 'https://roommates-pda-turns-follow.trycloudflare.com';
export const PUBLIC_API_BASE_URL = CLOUDFLARE_BACKEND_URL;

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Same-origin relative URLs on production domains and dev hosts
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'deepernova.com' ||
      hostname.endsWith('.deepernova.com')
    ) {
      return '';
    }
  }

  // Custom environment override
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore env access issues in non-Vite runtimes
  }

  // Persistent production fallback
  return 'https://deepernova.com';
};

export const API_BASE_URL = getApiBaseUrl();

// Direct DeeperNova AI Public Endpoint (Cloudflare Tunnel to GPU Engine)
export const DEEPERNOVA_AI_PUBLIC_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPERNOVA_PUBLIC_API_URL) ||
  'https://acknowledge-gathering-chairs-migration.trycloudflare.com';

// Order DTE Portal URL (Local Vite Port 5173 or Public Cloudflare Tunnel)
export const ORDER_DTE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ORDER_DTE_URL) ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5173'
    : 'https://pat-maximum-decorating-achieved.trycloudflare.com');

// Deepernova Search Engine URL (Hosted directly on Vercel CDN under /search)
export const SEARCH_ENGINE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SEARCH_ENGINE_URL) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/search` : '/search');
