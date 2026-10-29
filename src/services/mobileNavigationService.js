/**
 * mobileNavigationService.js
 * 
 * Centralized Mobile Navigation & Back Button Manager for Deepernova AI.
 * Handles:
 * 1. Mobile browser back gestures / popstate events.
 * 2. Android hardware & gesture back button via @capacitor/app & Cordova.
 * 3. Priority-based modal, drawer, sidebar, and overlay dismissal.
 * 4. Hierarchical page transitions (Secondary Views -> Chat -> Landing).
 * 5. Double-tap back guard with native toast to prevent accidental app/tab closure.
 */

import { Capacitor } from '@capacitor/core';

// Stack of active back handlers (modals, drawers, galleries, etc.)
// Format: { id: string, priority: number, handler: () => boolean }
let activeBackHandlers = [];

// Reference to current navigation dispatcher provided by App.jsx
let navigationDispatcher = null;

// Double tap back tracking
let lastBackPressTimestamp = 0;
const DOUBLE_BACK_DELAY_MS = 2000;
let exitToastTimeout = null;

/**
 * Register the main view navigator from App.jsx
 */
export function setNavigationDispatcher(dispatcher) {
  navigationDispatcher = dispatcher;
}

/**
 * Register a modal/overlay dismissal handler.
 * When the user presses back, handlers with higher priority are executed first.
 * The handler should return `true` if it consumed the back event (e.g. closed a modal).
 * 
 * Returns an unregister function.
 */
export function registerBackHandler(handler, priority = 10) {
  const handlerId = 'back_' + Math.random().toString(36).substring(2, 9);
  const entry = { id: handlerId, priority, handler };
  
  activeBackHandlers.push(entry);
  activeBackHandlers.sort((a, b) => b.priority - a.priority);

  return () => {
    activeBackHandlers = activeBackHandlers.filter((h) => h.id !== handlerId);
  };
}

/**
 * Show a sleek native-like bottom toast on screen
 */
export function showBackExitToast(message = 'Tekan sekali lagi untuk keluar') {
  if (typeof document === 'undefined') return;

  // Remove existing toast if present
  const existing = document.getElementById('deepernova-back-exit-toast');
  if (existing) {
    existing.remove();
  }
  if (exitToastTimeout) {
    clearTimeout(exitToastTimeout);
  }

  const toast = document.createElement('div');
  toast.id = 'deepernova-back-exit-toast';
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(15, 23, 42, 0.92);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 10px 22px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 999999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  document.body.appendChild(toast);

  // Trigger smooth entrance
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  exitToastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, DOUBLE_BACK_DELAY_MS);
}

/**
 * Central global back logic invoked by popstate, Capacitor backButton, or Cordova.
 * Returns true if the back event was handled and prevented exiting.
 */
export function handleGlobalBack(isPopstate = false) {
  // 1. Check if any modal / drawer / sidebar is currently open
  if (activeBackHandlers.length > 0) {
    for (const item of activeBackHandlers) {
      try {
        const handled = item.handler();
        if (handled) {
          // If this was a browser popstate, re-push a dummy state to keep the history buffer intact
          if (isPopstate && typeof window !== 'undefined' && window.history) {
            try {
              window.history.pushState({ modalGuarded: true }, '', window.location.href);
            } catch (_) {}
          }
          return true;
        }
      } catch (err) {
        console.warn('[mobileNavigationService] Handler error:', err);
      }
    }
  }

  // 2. If no modal is open, delegate to the view navigation hierarchy
  if (navigationDispatcher) {
    const handledView = navigationDispatcher.onNavigateBack();
    if (handledView) {
      // Re-push history buffer if needed
      if (isPopstate && typeof window !== 'undefined' && window.history) {
        try {
          window.history.pushState({ viewGuarded: true }, '', window.location.href);
        } catch (_) {}
      }
      return true;
    }
  }

  // 3. At the root view: check double-tap guard
  const now = Date.now();
  if (now - lastBackPressTimestamp < DOUBLE_BACK_DELAY_MS) {
    // Confirmed second tap -> Allow exit
    lastBackPressTimestamp = 0;
    return false; // Not handled, will exit app or close tab
  } else {
    // First tap at root -> Show warning toast and guard
    lastBackPressTimestamp = now;
    showBackExitToast('Tekan sekali lagi untuk keluar');
    
    // On web popstate, re-push state to prevent browser from leaving
    if (isPopstate && typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ rootGuarded: true }, '', window.location.href);
      } catch (_) {}
    }
    return true; // Handled / Guarded
  }
}

/**
 * Initialize all mobile listeners (Web Popstate, History Buffer, Capacitor & Cordova)
 */
export function initMobileNavigation() {
  if (typeof window === 'undefined') return () => {};

  // 1. Establish initial History Safety Buffer so pressing back never immediately leaves the site
  try {
    if (window.history && window.history.length <= 1) {
      window.history.replaceState({ deepernova_root: true }, '', window.location.href);
      window.history.pushState({ deepernova_active: true }, '', window.location.href);
    }
  } catch (_) {}

  // 2. Handle Browser Popstate (Mobile Swipe Back / Browser Back)
  const onPopState = (e) => {
    const handled = handleGlobalBack(true);
    if (handled && e) {
      // In modern browsers popstate cannot be cancelled via preventDefault,
      // so handleGlobalBack re-pushes state to keep the view active.
    }
  };
  window.addEventListener('popstate', onPopState);

  // 3. Handle Native Capacitor App Back Button (Android hardware / navigation bar back)
  let capacitorListenerRemove = null;
  const setupCapacitorBack = async () => {
    try {
      const appPlugin = Capacitor.Plugins?.App || (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App);
      if (appPlugin && typeof appPlugin.addListener === 'function') {
        const listener = await appPlugin.addListener('backButton', () => {
          const handled = handleGlobalBack(false);
          if (!handled) {
            // User double-tapped on root -> exit app gracefully
            if (typeof appPlugin.exitApp === 'function') {
              appPlugin.exitApp();
            }
          }
        });
        capacitorListenerRemove = () => listener?.remove?.();
      }
    } catch (err) {
      console.warn('[mobileNavigationService] Capacitor back listener setup error:', err);
    }
  };
  setupCapacitorBack();

  // 4. Handle Cordova / Webview legacy backbutton event
  const onCordovaBackButton = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const handled = handleGlobalBack(false);
    if (!handled && navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    }
  };
  document.addEventListener('backbutton', onCordovaBackButton, false);

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('backbutton', onCordovaBackButton);
    if (capacitorListenerRemove) capacitorListenerRemove();
  };
}
