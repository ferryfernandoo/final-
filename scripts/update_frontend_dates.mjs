import fs from 'fs';

// 1. Update PublicSearch.jsx
const publicSearchPath = 'C:/deepernova-search-main/src/client/components/PublicSearch.jsx';
let psCode = fs.readFileSync(publicSearchPath, 'utf8').replace(/\r\n/g, '\n');

const oldHeaderBlock = `                                  {item.isVerifiedTrust && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
                                      <ShieldCheck size={11} /> Terverifikasi
                                    </span>
                                  )}

                                  {item.readingTimeMin && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <Clock size={11} /> {item.readingTimeMin} min baca
                                    </span>
                                  )}`;

const newHeaderBlock = `                                  {item.isVerifiedTrust && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
                                      <ShieldCheck size={11} /> Terverifikasi
                                    </span>
                                  )}

                                  {(item.formattedDate || item.date) && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                      <Clock size={11} /> {item.formattedDate || item.date}
                                    </span>
                                  )}

                                  {item.readingTimeMin && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <BookOpen size={11} /> {item.readingTimeMin} min baca
                                    </span>
                                  )}`;

if (psCode.includes(oldHeaderBlock)) {
  psCode = psCode.replace(oldHeaderBlock, newHeaderBlock);
  console.log('✓ Updated PublicSearch.jsx header badges with date');
} else {
  console.warn('⚠️ oldHeaderBlock not found in PublicSearch.jsx');
}

const oldSnippetBlock = `                              {/* Snippet */}
                              {item.snippet && (
                                <p 
                                  className="result-snippet"
                                  dangerouslySetInnerHTML={{ __html: item.snippet }}
                                />
                              )}`;

const newSnippetBlock = `                              {/* Snippet */}
                              {item.snippet && (
                                <p className="result-snippet">
                                  {(item.formattedDate || item.date) && (
                                    <span style={{ color: '#64748b', fontWeight: 700, marginRight: '0.35rem', fontSize: '0.82rem' }}>
                                      {item.formattedDate || item.date} —
                                    </span>
                                  )}
                                  <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
                                </p>
                              )}`;

if (psCode.includes(oldSnippetBlock)) {
  psCode = psCode.replace(oldSnippetBlock, newSnippetBlock);
  console.log('✓ Updated PublicSearch.jsx snippet with date prefix');
} else {
  console.warn('⚠️ oldSnippetBlock not found in PublicSearch.jsx');
}

fs.writeFileSync(publicSearchPath, psCode, 'utf8');

// 2. Update SearchTab.jsx
const searchTabPath = 'C:/deepernova-search-main/src/client/components/SearchTab.jsx';
let stCode = fs.readFileSync(searchTabPath, 'utf8').replace(/\r\n/g, '\n');

const oldStHeader = `                      <div className="pr-badge" title="PageRank Graph Authority Score">
                        ⭐ PR {pr}
                      </div>`;

const newStHeader = `                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {(item.formattedDate || item.date) && (
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}>
                            🕒 {item.formattedDate || item.date}
                          </span>
                        )}
                        <div className="pr-badge" title="PageRank Graph Authority Score">
                          ⭐ PR {pr}
                        </div>
                      </div>`;

if (stCode.includes(oldStHeader)) {
  stCode = stCode.replace(oldStHeader, newStHeader);
  console.log('✓ Updated SearchTab.jsx header with date badge');
}

const oldStSnippet = `                    <p
                      className="result-snippet"
                      dangerouslySetInnerHTML={{ __html: item.snippet || 'No description snippet available.' }}
                    />`;

const newStSnippet = `                    <p className="result-snippet">
                      {(item.formattedDate || item.date) && (
                        <span style={{ color: '#64748b', fontWeight: 600, marginRight: '5px' }}>
                          {item.formattedDate || item.date} —
                        </span>
                      )}
                      <span dangerouslySetInnerHTML={{ __html: item.snippet || 'No description snippet available.' }} />
                    </p>`;

if (stCode.includes(oldStSnippet)) {
  stCode = stCode.replace(oldStSnippet, newStSnippet);
  console.log('✓ Updated SearchTab.jsx snippet with date prefix');
}

fs.writeFileSync(searchTabPath, stCode, 'utf8');
console.log('✓ Both frontend components updated successfully');
