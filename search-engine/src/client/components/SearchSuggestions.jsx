import React from 'react';
import { Search, ArrowUpLeft, Clock } from 'lucide-react';

export default function SearchSuggestions({
  suggestions = [],
  query = '',
  selectedIndex = -1,
  onSelectSuggestion,
  onFillQuery,
  isVisible = false
}) {
  if (!isVisible || !suggestions || suggestions.length === 0) {
    return null;
  }

  /**
   * Highlights matched portion of the query (Google style: typed portion regular, predicted portion bold)
   */
  const renderHighlightedQuery = (itemQuery, currentPrefix) => {
    if (!currentPrefix || !currentPrefix.trim()) {
      return <span className="suggestion-main-text">{itemQuery}</span>;
    }

    const cleanPrefix = currentPrefix.trim().toLowerCase();
    const cleanItem = (itemQuery || '').toLowerCase();
    const matchIdx = cleanItem.indexOf(cleanPrefix);

    if (matchIdx === -1) {
      return <span className="suggestion-main-text">{itemQuery}</span>;
    }

    const before = itemQuery.slice(0, matchIdx);
    const match = itemQuery.slice(matchIdx, matchIdx + cleanPrefix.length);
    const after = itemQuery.slice(matchIdx + cleanPrefix.length);

    return (
      <span className="suggestion-main-text">
        {before}
        <span className="suggestion-matched">{match}</span>
        <strong>{after}</strong>
      </span>
    );
  };

  return (
    <div className="search-suggestions-dropdown google-suggestions-dropdown" role="listbox">
      <ul className="suggestions-list">
        {suggestions.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          const itemQuery = typeof item === 'string' ? item : (item.query || '');
          const isHistory = (typeof item === 'object' && item.type === 'history') || (!query.trim() && !item.isTrending);
          const subtitle = typeof item === 'object' ? (item.subtitle || '') : '';
          const thumbnail = typeof item === 'object' ? (item.thumbnail || item.image || '') : '';

          return (
            <li
              key={`${itemQuery}-${idx}`}
              role="option"
              aria-selected={isSelected}
              className={`suggestion-item google-suggestion-row ${isSelected ? 'selected' : ''} ${isHistory ? 'is-history' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectSuggestion(itemQuery);
              }}
            >
              <div className="suggestion-left">
                {/* Left circular icon: Clock for history, Search for query suggestions */}
                <div className={`suggestion-icon-wrap ${isHistory ? 'history' : 'search'}`}>
                  {isHistory ? (
                    <Clock size={16} />
                  ) : (
                    <Search size={16} />
                  )}
                </div>

                <div className="suggestion-query-wrap">
                  {isHistory || !query.trim() ? (
                    <span className="suggestion-main-text">{itemQuery}</span>
                  ) : (
                    renderHighlightedQuery(itemQuery, query)
                  )}
                  {subtitle && (
                    <div className="suggestion-subtitle-text">{subtitle}</div>
                  )}
                </div>
              </div>

              <div className="suggestion-right">
                {/* Thumbnail image if available (e.g. Celebrity / Movie / Entity) */}
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt=""
                    className="suggestion-thumb-img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                {/* Diagonal Arrow to insert query into search box without submitting */}
                {onFillQuery && !isHistory && (
                  <button
                    type="button"
                    className="suggestion-fill-btn"
                    title="Gunakan kata kunci ini"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFillQuery(itemQuery);
                    }}
                  >
                    <ArrowUpLeft size={16} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
