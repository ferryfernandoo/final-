import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './GlobalMemorySettings.css';

/**
 * GlobalMemorySettings Component (Fine-Tune AI Hub)
 * Allows users to view, edit, clear, and export their persistent AI memory / knowledge base as TXT
 */
export default function GlobalMemorySettings({ isOpen, onClose, isAuthenticated, isGuest, userLanguage: propLanguage }) {
  const userLanguage = propLanguage || (typeof window !== 'undefined' ? (window.__DEEPERNOVA_CURRENT_LANG__ || localStorage.getItem('deepernova_language')) : 'id') || 'id';
  const [memory, setMemory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState(null);

  const loadMemory = async () => {
    try {
      setError(null);
      
      // For guests or if authenticated fails, use localStorage
      if (isGuest || !isAuthenticated) {
        const stored = localStorage.getItem('guest_global_memory');
        const timestamp = localStorage.getItem('guest_global_memory_updated');
        setMemory(stored || '');
        setLastUpdated(timestamp);
        setMessageCount(0);
        return;
      }
      
      // For authenticated users, try API
      const res = await fetch(`${API_BASE_URL}/api/memory/global`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Gagal memuat memori: ${res.status}`);
      }

      const data = await res.json();
      setMemory(data.globalMemory || '');
      setLastUpdated(data.lastUpdatedAt);
      setMessageCount(data.messageCount || 0);
    } catch (err) {
      setError(err.message);
      console.error('Error loading global memory:', err);
      
      // Fallback to localStorage on error
      const stored = localStorage.getItem('guest_global_memory');
      setMemory(stored || '');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // For guests, save to localStorage
      if (isGuest || !isAuthenticated) {
        localStorage.setItem('guest_global_memory', memory);
        localStorage.setItem('guest_global_memory_updated', new Date().toISOString());
        setLastUpdated(new Date().toISOString());
        setIsEditing(false);
        console.log('[GLOBAL_MEMORY] Saved to localStorage successfully');
        return;
      }

      // For authenticated users, save to API
      const res = await fetch(`${API_BASE_URL}/api/memory/global`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalMemory: memory })
      });

      if (!res.ok) {
        throw new Error(`Gagal menyimpan memori: ${res.status}`);
      }

      const data = await res.json();
      setMemory(data.globalMemory);
      setLastUpdated(data.lastUpdatedAt);
      setMessageCount(data.messageCount || 0);
      setIsEditing(false);
      console.log('[GLOBAL_MEMORY] Saved successfully');
    } catch (err) {
      setError(err.message);
      console.error('Error saving global memory:', err);
      
      // Fallback to localStorage on error
      localStorage.setItem('guest_global_memory', memory);
      localStorage.setItem('guest_global_memory_updated', new Date().toISOString());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadMemory();
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm(userLanguage === 'zh' ? '确定清除所有 AI 微调与长期记忆吗？这将重置您的长期记忆库。' : userLanguage === 'id' ? 'Hapus semua Fine-Tune & Memori AI ini? Ini akan mengosongkan pengetahuan ingatan jangka panjang Anda.' : 'Delete all AI fine-tune memory? This will reset your long-term knowledge base.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      // For guests, delete from localStorage
      if (isGuest || !isAuthenticated) {
        localStorage.removeItem('guest_global_memory');
        localStorage.removeItem('guest_global_memory_updated');
        setMemory('');
        setLastUpdated(null);
        setMessageCount(0);
        setIsEditing(false);
        setError(null);
        return;
      }

      // For authenticated users, delete from API
      const res = await fetch(`${API_BASE_URL}/api/memory/global`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Gagal menghapus memori: ${res.status}`);
      }

      const data = await res.json();
      setMemory(data.globalMemory || '');
      setLastUpdated(data.lastUpdatedAt);
      setMessageCount(data.messageCount || 0);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting global memory:', err);
      localStorage.removeItem('guest_global_memory');
      localStorage.removeItem('guest_global_memory_updated');
      setMemory('');
      setIsEditing(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export memory / knowledge base as formatted TXT file download
  const handleExportTxt = () => {
    if (!memory || memory.trim().length === 0) {
      alert(userLanguage === 'zh' ? '暂无可下载的 AI 微调知识 / 记忆。' : userLanguage === 'id' ? 'Belum ada pengetahuan / memori Fine-Tune untuk diunduh.' : 'No AI Fine-Tune knowledge / memory to download.');
      return;
    }

    const header = `=================================================\nDEEPERNOVA AI - EXPORTED KNOWLEDGE & MEMORY BASE\n=================================================\n${userLanguage === 'zh' ? '导出日期' : userLanguage === 'id' ? 'Tanggal Export' : 'Export Date'} : ${new Date().toLocaleString(userLanguage === 'zh' ? 'zh-CN' : userLanguage === 'id' ? 'id-ID' : 'en-US')}\n${userLanguage === 'zh' ? '训练会话' : userLanguage === 'id' ? 'Sesi Terlatih' : 'Trained Sessions'}  : ${messageCount} ${userLanguage === 'zh' ? '次' : 'sesi'}\n${userLanguage === 'zh' ? '最后更新' : userLanguage === 'id' ? 'Diperbarui' : 'Updated'}     : ${formatDate(lastUpdated)}\n=================================================\n\n${userLanguage === 'zh' ? 'AI 行为指令与知识库' : userLanguage === 'id' ? 'INSTUKSI & PENGETAHUAN AI' : 'AI INSTRUCTIONS & KNOWLEDGE'}:\n\n`;
    
    const fullContent = header + memory;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `Deepernova_AI_Memory_Knowledge_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Belum ada';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadMemory();
    }
  }, [isOpen, isAuthenticated, isGuest]);

  if (!isOpen) return null;

  return (
    <div className="global-memory-modal-overlay" onClick={onClose}>
      <div className="global-memory-modal-box" onClick={(e) => e.stopPropagation()}>
        
        {/* Fixed Header */}
        <div className="memory-modal-header">
          <div className="header-title-group">
            <span className="title-icon">🧬</span>
            <div>
              <h2>Fine-Tune AI & Memory</h2>
              <p className="subtitle">Latih Deepernova AI & Kelola Pengetahuan Jangka Panjang</p>
            </div>
          </div>
          <button className="memory-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="memory-error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="memory-modal-scroll-body">
          <div className="memory-stats-chips">
            <div className="stat-chip">
              <span className="chip-label">{userLanguage === 'zh' ? '📊 训练会话:' : userLanguage === 'id' ? '📊 Sesi Terlatih:' : '📊 Trained Sessions:'}</span>
              <span className="chip-val">{messageCount}</span>
            </div>
            <div className="stat-chip">
              <span className="chip-label">{userLanguage === 'zh' ? '⏱️ 更新时间:' : userLanguage === 'id' ? '⏱️ Diperbarui:' : '⏱️ Updated:'}</span>
              <span className="chip-val">{formatDate(lastUpdated)}</span>
            </div>
            <div className="stat-chip">
              <span className="chip-label">{userLanguage === 'zh' ? '📝 字符数:' : userLanguage === 'id' ? '📝 Karakter:' : '📝 Characters:'}</span>
              <span className="chip-val">{memory ? memory.length : 0}</span>
            </div>
          </div>

          <div className="memory-editor-section">
            <div className="editor-label-bar">
              <span>{isEditing ? (userLanguage === 'zh' ? '✏️ 知识编辑模式' : userLanguage === 'id' ? '✏️ Mode Edit Pengetahuan' : '✏️ Knowledge Editing Mode') : (userLanguage === 'zh' ? '📖 已记录的 AI 知识' : userLanguage === 'id' ? '📖 Pengetahuan AI Terdaftar' : '📖 Registered AI Knowledge')}</span>
            </div>

            {isEditing ? (
              <textarea
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                placeholder={userLanguage === 'zh' ? '在此输入行为准则、特定规则、关键事实、对话偏好或任何知识，Deepernova AI 将严格遵循这些设定...' : userLanguage === 'id' ? 'Tuliskan instruksi perilaku, aturan khusus, fakta penting, gaya bahasa, atau pengetahuan apa pun di sini agar Deepernova AI bertindak sesuai keinginan Anda...' : 'Write custom behavioral instructions, rules, facts, tone, or knowledge here so Deepernova AI behaves according to your preferences...'}
                className="memory-custom-textarea"
                rows={8}
              />
            ) : (
              <div className="memory-custom-display">
                {memory ? (
                  <pre className="memory-pre-text">{memory}</pre>
                ) : (
                  <div className="empty-memory-box">
                    <span className="empty-icon">💡</span>
                    <p>{userLanguage === 'zh' ? '暂无自定义 AI 记忆微调。点击“编辑”添加特定指令，或让 AI 在交流中自动学习您的偏好。' : userLanguage === 'id' ? <>Belum ada Fine-Tune AI kustom. Klik <strong>Edit</strong> untuk menambahkan instruksi khusus atau biarkan AI mempelajari pola komunikasi Anda secara otomatis.</> : <>No custom AI memory yet. Click <strong>Edit</strong> to add instructions or let AI learn from your conversations automatically.</>}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="memory-guide-box">
            <p>{userLanguage === 'zh' ? <>💡 <strong>使用 TXT 导出按钮：</strong>您可以将所有 AI 知识下载为 <code>.txt</code> 文件进行备份或迁移至其他平台。</> : userLanguage === 'id' ? <>💡 <strong>Gunakan Tombol TXT:</strong> Anda dapat mengunduh seluruh pengetahuan AI ini menjadi berkas <code>.txt</code> untuk dicadangkan atau ditransfer ke model AI lainnya.</> : <>💡 <strong>Use TXT Export:</strong> You can download all AI knowledge as a <code>.txt</code> file for backup or transferring to other AI models.</>}</p>
          </div>
        </div>

        {/* Sticky Fixed Bottom Actions Footer */}
        <div className="memory-modal-footer">
          <button 
            onClick={handleExportTxt} 
            disabled={!memory || memory.trim().length === 0}
            className="btn-export-txt"
            title={userLanguage === 'zh' ? '下载所有 AI 知识为 .txt 文件' : userLanguage === 'id' ? 'Download seluruh pengetahuan AI menjadi file .txt' : 'Download all AI knowledge as a .txt file'}
          >
            {userLanguage === 'zh' ? '📥 下载 TXT' : '📥 Download TXT'}
          </button>

          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn-memory-primary"
              >
                {userLanguage === 'zh' ? '✏️ 编辑' : '✏️ Edit'}
              </button>

              <button 
                onClick={handleDelete} 
                disabled={isDeleting || !memory}
                className="btn-memory-danger"
              >
                {isDeleting ? '🗑️...' : (userLanguage === 'zh' ? '🗑️ 清除' : userLanguage === 'id' ? '🗑️ Hapus' : '🗑️ Delete')}
              </button>

              <button onClick={onClose} className="btn-memory-secondary">
                Tutup
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="btn-memory-primary"
              >
                {isSaving ? (userLanguage === 'zh' ? '💾 保存中...' : userLanguage === 'id' ? '💾 Menyimpan...' : '💾 Saving...') : (userLanguage === 'zh' ? '💾 保存' : userLanguage === 'id' ? '💾 Simpan' : '💾 Save')}
              </button>

              <button 
                onClick={handleReset} 
                disabled={isSaving}
                className="btn-memory-secondary"
              >
                {userLanguage === 'zh' ? '↩️ 取消' : userLanguage === 'id' ? '↩️ Batal' : '↩️ Cancel'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
