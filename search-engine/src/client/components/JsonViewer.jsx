import React, { useState } from 'react';
import { Copy, Check, Download, Code2, Maximize2, Minimize2 } from 'lucide-react';

export default function JsonViewer({ data, title = "Search API JSON Response" }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepernova-search-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Syntax highlighting for JSON
  const renderHighlightedJson = (json) => {
    if (!json) return '';
    
    // Convert JSON to formatted string with syntax highlighting spans
    const highlighted = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );

    return { __html: highlighted };
  };

  return (
    <div className="json-viewer-card">
      <div className="json-viewer-header">
        <div className="json-viewer-title">
          <Code2 size={18} className="text-blue-600" />
          <span>{title}</span>
          <span className="json-badge">
            {Array.isArray(data?.results) ? `${data.results.length} items` : `${jsonString.length} bytes`}
          </span>
        </div>

        <div className="json-viewer-actions">
          <button 
            type="button"
            className="json-action-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse viewer" : "Expand viewer"}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{expanded ? 'Kecilkan' : 'Perbesar'}</span>
          </button>

          <button 
            type="button"
            className={`json-action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Salin JSON ke clipboard"
          >
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            <span>{copied ? 'Tersalin!' : 'Salin JSON'}</span>
          </button>

          <button 
            type="button"
            className="json-action-btn primary"
            onClick={handleDownload}
            title="Download file .json"
          >
            <Download size={15} />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="json-viewer-body">
          <pre className="json-code-block" dangerouslySetInnerHTML={renderHighlightedJson(data)} />
        </div>
      )}
    </div>
  );
}
