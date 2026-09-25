import React, { useState } from 'react';
import AD_CONFIG from '../config/adConfig';
import './AdsterraBanner.css';

/**
 * AdsterraBanner Component
 * Renders an isolated, secure Adsterra 300x50 / 320x50 banner unit
 * Placed directly under the AI chat messages and response generator.
 */
export default function AdsterraBanner({ 
  bannerKey = AD_CONFIG?.adsterra?.bannerKey,
  scriptUrl = AD_CONFIG?.adsterra?.scriptUrl,
  containerId = AD_CONFIG?.adsterra?.containerId,
  width = 320,
  height = 50 
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const activeKey = bannerKey || '7317733ecee97feb95833c9722b8d59f';
  const activeScript = scriptUrl || `https://pl31510602.profitableratecpmnetwork.com/${activeKey}/invoke.js`;
  const activeContainer = containerId || `container-${activeKey}`;

  // Safe isolated HTML for Adsterra banner execution
  const iframeSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base target="_blank">
    <style>
      * { box-sizing: border-box; }
      body, html {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: transparent;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
      }
      #${activeContainer} {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    </style>
  </head>
  <body>
    <div id="${activeContainer}"></div>
    <script type="text/javascript">
      atOptions = {
        'key' : '${activeKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    </script>
    <script async="async" data-cfasync="false" src="${activeScript}"></script>
  </body>
</html>`;

  return (
    <div className="adsterra-banner-container" role="region" aria-label="Sponsor Banner">
      <div className="adsterra-banner-top-bar">
        <span className="adsterra-sponsor-tag">
          <span className="adsterra-tag-dot"></span>
          Sponsor • Adsterra
        </span>
        <button 
          type="button" 
          className="adsterra-banner-close" 
          onClick={() => setIsDismissed(true)}
          title="Tutup Iklan"
          aria-label="Tutup Iklan"
        >
          ✕
        </button>
      </div>

      <div className="adsterra-banner-frame-wrap" style={{ minHeight: `${height}px` }}>
        <iframe
          key={activeKey}
          srcDoc={iframeSrcDoc}
          title="Sponsor Banner Adsterra"
          className="adsterra-iframe"
          style={{ width: `${width}px`, height: `${height}px`, border: 'none', overflow: 'hidden' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}
