/**
 * Configuration for Google AdSense and Monetization
 * You can override these using .env variables:
 * VITE_ADSENSE_CLIENT_ID='ca-pub-XXXXXXXXXXXXXXXX'
 * VITE_ADSENSE_SIDEBAR_SLOT='1234567890'
 * VITE_ADSENSE_CHAT_SLOT='0987654321'
 * VITE_ADSENSE_ENABLED='true'
 */
export const AD_CONFIG = {
  // Replace with your real AdSense Publisher ID (e.g., 'ca-pub-1234567890123456')
  adClient: import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX',
  sidebarSlotId: import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT || '',
  chatBottomSlotId: import.meta.env.VITE_ADSENSE_CHAT_SLOT || '',
  // Set to true once your AdSense account is approved
  enabled: import.meta.env.VITE_ADSENSE_ENABLED === 'true' || false,
  // Show subtle QRIS/sponsor fallback while AdSense is pending
  showDirectSponsorFallback: true,
};

export default AD_CONFIG;
