import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, AlertCircle, X, FolderDown } from 'lucide-react';
import {
  subscribeDownloadToasts,
  dismissDownloadToast
} from '../services/universalDownloadService';

export default function DownloadToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeDownloadToasts(setToasts);
  }, []);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] z-[9999] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
      data-testid="download-toast-container"
    >
      {toasts.map((toast) => {
        const isDownloading = toast.status === 'downloading';
        const isError = toast.status === 'error';

        return (
          <div
            key={toast.id}
            data-testid={`download-toast-${toast.status}`}
            className={`pointer-events-auto flex items-start gap-3 px-3.5 py-3 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 ${
              isError
                ? 'bg-red-950/92 border-red-500/45 text-red-100'
                : isDownloading
                ? 'bg-zinc-900/94 border-blue-500/45 text-zinc-100'
                : 'bg-zinc-900/94 border-emerald-500/45 text-zinc-100'
            }`}
          >
            <div
              className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                isError
                  ? 'bg-red-500/20 text-red-400'
                  : isDownloading
                  ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4" />
              ) : isDownloading ? (
                <Download className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold tracking-tight text-white truncate">
                {isError
                  ? `Gagal mengunduh: ${toast.fileName}`
                  : isDownloading
                  ? `Mengunduh ${toast.fileName}...`
                  : `Berhasil mengunduh: ${toast.fileName}`}
              </div>
              {toast.subtitle && (
                <div className="mt-0.5 text-[11px] leading-snug text-zinc-300/90 flex items-center gap-1 break-words">
                  {!isError && !isDownloading && toast.savedLocation && (
                    <FolderDown className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  <span className="truncate">{toast.subtitle}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissDownloadToast(toast.id)}
              aria-label="Tutup notifikasi unduhan"
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

