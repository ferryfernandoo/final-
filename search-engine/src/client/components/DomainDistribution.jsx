import React from 'react';
import { PieChart, Globe } from 'lucide-react';

export default function DomainDistribution({ topDomains, totalPages }) {
  const domains = topDomains || [];
  const maxCount = domains.length > 0 ? (domains[0].count || 1) : 1;

  return (
    <div className="panel-card" style={{ marginTop: '1.5rem' }}>
      <div className="panel-header">
        <div className="panel-title">
          <PieChart size={18} className="text-purple" />
          <span>Host Distribution & Frontier Graph</span>
        </div>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          {domains.length} active domains
        </span>
      </div>

      <div className="domain-bars-list">
        {domains.length === 0 ? (
          <div className="empty-hint">
            No domain index distribution available yet. Start crawling to see graph breakdown.
          </div>
        ) : (
          domains.slice(0, 8).map((d) => {
            const percent = Math.round((d.count / maxCount) * 100);
            return (
              <div className="domain-bar-item" key={d.domain}>
                <div className="domain-bar-header">
                  <span className="domain-name">🌐 {d.domain}</span>
                  <span className="domain-count">
                    {d.count.toLocaleString()} pages ({Math.round((d.count / (totalPages || 1)) * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
