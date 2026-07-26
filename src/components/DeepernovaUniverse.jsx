import React from 'react';

const DeepernovaUniverse = ({ onNavigate }) => {
  const openEditor = (type) => {
    if (typeof onNavigate === 'function') onNavigate('documents', type);
  };

  return (
    <div className="universe-page">
      <div className="universe-header">
        <button className="back-btn" onClick={() => onNavigate?.('chat')} title="Kembali">
          <i className="fas fa-chevron-left"></i>
        </button>
        <img src="https://img.icons8.com/fluency/48/universe.png" alt="Universe" className="universe-logo" style={{ width: '40px', height: '40px' }} />
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>Deepernova Universe</h1>
          <p className="universe-sub" style={{ margin: '4px 0 0 0' }}>Platform kreatif: Typernova (Word), Spreadsheet, dan Presentasi.</p>
        </div>
      </div>

      <div className="universe-grid">
        <div className="universe-card" onClick={() => openEditor('word')} role="button" tabIndex={0}>
          <div className="universe-icon">
            <img src="https://img.icons8.com/color/96/microsoft-word-2019.png" alt="Word Logo" style={{ width: '64px', height: '64px' }} />
          </div>
          <h3>Typernova (Word)</h3>
          <p>Buat dokumen seperti Word dengan editor teks canggih.</p>
        </div>

        <div className="universe-card" onClick={() => openEditor('excel')} role="button" tabIndex={0}>
          <div className="universe-icon">
            <img src="https://img.icons8.com/color/96/microsoft-excel-2019.png" alt="Excel Logo" style={{ width: '64px', height: '64px' }} />
          </div>
          <h3>Sheets</h3>
          <p>Spreadsheet interaktif untuk perhitungan dan analisis.</p>
        </div>

        <div className="universe-card" onClick={() => openEditor('ppt')} role="button" tabIndex={0}>
          <div className="universe-icon">
            <img src="https://img.icons8.com/color/96/microsoft-powerpoint-2019.png" alt="Powerpoint Logo" style={{ width: '64px', height: '64px' }} />
          </div>
          <h3>Presentasi</h3>
          <p>Buat slide PowerPoint dengan template siap pakai.</p>
        </div>
      </div>
    </div>
  );
};

export default DeepernovaUniverse;
