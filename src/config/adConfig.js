/**
 * Configuration for Ad Networks (Adsterra & Google AdSense)
 */
export const AD_CONFIG = {
  // Active Ad Network Provider: 'adsterra' | 'adsense'
  activeProvider: import.meta.env.VITE_AD_PROVIDER || 'adsterra',

  // Adsterra Network Configuration
  adsterra: {
    bannerKey: import.meta.env.VITE_ADSTERRA_BANNER_KEY || '7317733ecee97feb95833c9722b8d59f',
    scriptUrl: 'https://pl31510602.profitableratecpmnetwork.com/7317733ecee97feb95833c9722b8d59f/invoke.js',
    containerId: 'container-7317733ecee97feb95833c9722b8d59f',
    placementId: '6077087',
    format: '300x50',
    enabled: true,
  },

  // Google AdSense Configuration (Preserved for when approved)
  adClient: import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-6822768824603153',
  sidebarSlotId: import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT || '',
  chatBottomSlotId: import.meta.env.VITE_ADSENSE_CHAT_SLOT || '',
  enabled: true,
  showDirectSponsorFallback: true,
};

export default AD_CONFIG;
