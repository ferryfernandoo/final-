/**
 * Language Detection & Persistence Utility for Deepernova AI
 *
 * Rules:
 * 1. If user previously chose a language manually -> respect saved language.
 * 2. Country detection:
 *    - Indonesia (ID, Asia/Jakarta, etc.) -> 'id' (Bahasa Indonesia).
 *    - China / Taiwan / Hong Kong (CN/TW/HK, Asia/Shanghai, zh locale) -> 'zh' (中文).
 *    - All other countries -> MUST NOT use Indonesian, default strictly to 'en' (English).
 */

export const SUPPORTED_LANGUAGES = ['id', 'en', 'zh'];

export const LANGUAGE_OPTIONS = [
  { code: 'id', label: 'Bahasa Indonesia', shortLabel: 'ID', flag: '🇮🇩' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  { code: 'zh', label: '简体中文', shortLabel: '中文', flag: '🇨🇳' }
];

const STORAGE_KEY = 'deepernova_language';

export function getSavedLanguage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    }
  } catch (_) {}
  return null;
}

export function saveLanguage(lang) {
  try {
    if (typeof localStorage !== 'undefined' && SUPPORTED_LANGUAGES.includes(lang)) {
      localStorage.setItem(STORAGE_KEY, lang);
      // Dispatch custom event so all components/tabs can react
      window.dispatchEvent(new CustomEvent('deepernova_language_changed', { detail: { language: lang } }));
    }
  } catch (_) {}
}

/**
 * Synchronous client-side detection based on Timezone & Navigator Locales
 */
export function detectLanguageSync() {
  // 1. Check user manual override
  const saved = getSavedLanguage();
  if (saved) return saved;

  if (typeof window === 'undefined') return 'en';

  try {
    // 2. Timezone detection (very fast & reliable for geographical detection)
    const timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

    // Indonesian Timezones (WIB, WITA, WIT)
    const isIndonesianTimezone = [
      'asia/jakarta',
      'asia/pontianak',
      'asia/makassar',
      'asia/jayapura'
    ].some(tz => timeZone.includes(tz));

    if (isIndonesianTimezone) {
      return 'id';
    }

    // Chinese Timezones (Mainland, HK, Macau, Taiwan)
    const isChineseTimezone = [
      'asia/shanghai',
      'asia/beijing',
      'asia/chongqing',
      'asia/urumqi',
      'asia/harbin',
      'asia/kashgar',
      'asia/taipei',
      'asia/hong_kong',
      'asia/macau'
    ].some(tz => timeZone.includes(tz));

    if (isChineseTimezone) {
      return 'zh';
    }

    // If browser primary is Chinese, or timezone is Chinese
    if (navLangs.some(l => l.startsWith('zh'))) {
      return 'zh';
    }

    // Only allow 'id' if the timezone is confirmed to be Indonesian
    if (isIndonesianTimezone) {
      return 'id';
    }
  } catch (_) {}

  // 4. Strict rule: ANY country outside Indonesia and China MUST NOT use Indonesian, default strictly to English ('en')
  return 'en';
}

/**
 * Asynchronous detection using GeoIP API for enhanced accuracy.
 * Follows the strict rule:
 * - ID -> 'id'
 * - CN/TW/HK/MO -> 'zh'
 * - Everything else -> 'en'
 */
export async function detectLanguageAsync() {
  const saved = getSavedLanguage();
  if (saved) return saved;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const resp = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      const country = (data.country_code || '').toUpperCase();

      if (country === 'ID') {
        saveLanguage('id');
        return 'id';
      }

      if (['CN', 'TW', 'HK', 'MO'].includes(country)) {
        saveLanguage('zh');
        return 'zh';
      }

      // Any other country outside Indonesia & China: MUST NOT use Indonesian, default to English
      saveLanguage('en');
      return 'en';
    }
  } catch (_) {}

  return detectLanguageSync();
}
