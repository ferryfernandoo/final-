// Use relative path '/api' so Vite proxy (locally) and Vercel rewrites (in production) seamlessly route requests to the backend server
const getApiBaseUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore env access issues in non-Vite runtimes such as Node-based tests
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

