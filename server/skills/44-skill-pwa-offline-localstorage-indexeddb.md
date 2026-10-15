---
name: pwa-offline-localstorage-indexeddb
description: "Skill pembuatan aplikasi web Offline-First dengan penyimpanan lokal aman (safe localStorage wrapper, IndexedDB), fitur Undo/Redo state, serta Import/Export data JSON dan CSV."
---

# Offline-First Web Apps, Safe Storage & Data Import/Export Pro

## Wrapper `safeStorage` Anti-Crash di Sandbox Iframe
Di dalam sandbox iframe tertentu, akses `window.localStorage` dapat melempar `SecurityError`. Selalu gunakan wrapper dengan fallback memori ini:
```javascript
const safeStorage = (() => {
  const mem = {};
  return {
    get(key, fallback = null) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch (_) {
        return key in mem ? mem[key] : fallback;
      }
    },
    set(key, val) {
      mem[key] = val;
      try {
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch (_) {}
    }
  };
})();
```
