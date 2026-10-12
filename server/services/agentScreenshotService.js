import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import agentSandboxService from './agentSandboxService.js';

/**
 * Locate Chrome, Edge, or Chromium on Windows / Linux / macOS
 */
function getBrowserExecutable() {
  const isWin = process.platform === 'win32';
  if (isWin) {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else {
    const linuxCandidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge'
    ];
    for (const c of linuxCandidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

/**
 * Capture a high-definition screenshot of an HTML file in the sandbox session
 */
export async function captureWebScreenshot(sessionId, relativeHtmlPath = 'index.html', outputFilename = 'screenshot.png') {
  try {
    const sandboxDir = agentSandboxService.getSandboxDir(sessionId);
    let targetHtmlPath = agentSandboxService.safeResolvePath(sessionId, relativeHtmlPath);

    // If specified HTML doesn't exist, search for any HTML file in the sandbox
    if (!fs.existsSync(targetHtmlPath)) {
      const files = agentSandboxService.listFiles(sessionId);
      const anyHtml = files.find(f => f.ext === 'html');
      if (anyHtml) {
        targetHtmlPath = agentSandboxService.safeResolvePath(sessionId, anyHtml.path);
      } else {
        return { success: false, error: 'Tidak ada berkas HTML untuk diambil tangkapan layar (screenshot).' };
      }
    }

    const browserExe = getBrowserExecutable();
    if (!browserExe) {
      return { success: false, error: 'Browser Chrome/Edge tidak ditemukan untuk headless screenshot.' };
    }

    const outputPath = agentSandboxService.safeResolvePath(sessionId, outputFilename);
    const fileUrl = 'file:///' + targetHtmlPath.replace(/\\/g, '/');

    // Remove old screenshot if exists
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (_) {}
    }

    const cmd = `"${browserExe}" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size=1280,800 --screenshot="${outputPath}" "${fileUrl}"`;

    await new Promise((resolve, reject) => {
      exec(cmd, { timeout: 12000, cwd: sandboxDir }, (err, stdout, stderr) => {
        if (err && !fs.existsSync(outputPath)) {
          return reject(err);
        }
        resolve();
      });
    });

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      return {
        success: true,
        filename: outputFilename,
        size: stats.size,
        url: `/api/agent/screenshot/${sessionId}?t=${Date.now()}`
      };
    } else {
      return { success: false, error: 'Berkas screenshot gagal dibuat oleh browser.' };
    }
  } catch (err) {
    console.error('[SCREENSHOT_SERVICE] Error capturing screenshot:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Intelligently find or generate visual preview for a session
 * - If screenshot.png already exists, return it
 * - If HTML exists, capture screenshot and return it
 * - If chart.png or any image exists, return that as visual preview!
 */
export async function getSessionVisualPreview(sessionId) {
  try {
    const files = agentSandboxService.listFiles(sessionId);

    // 1. Check if screenshot.png already exists
    const existingSs = files.find(f => f.name === 'screenshot.png' || f.name === 'preview.png');
    if (existingSs && existingSs.size > 0) {
      return {
        type: 'screenshot',
        filename: existingSs.name,
        url: `/api/agent/screenshot/${sessionId}?t=${Date.now()}`
      };
    }

    // 2. Check if an HTML file exists -> auto capture screenshot!
    const htmlFile = files.find(f => f.ext === 'html');
    if (htmlFile) {
      const captureRes = await captureWebScreenshot(sessionId, htmlFile.path, 'screenshot.png');
      if (captureRes.success) {
        return {
          type: 'screenshot',
          filename: 'screenshot.png',
          url: captureRes.url
        };
      }
    }

    // 3. Check if any chart/image exists (e.g. chart.png, kurva.png, graph.png)
    const chartFile = files.find(f => ['png', 'jpg', 'jpeg', 'webp'].includes(f.ext) && !f.name.startsWith('_'));
    if (chartFile && chartFile.size > 0) {
      return {
        type: 'chart',
        filename: chartFile.name,
        url: `/api/agent/file/raw?sessionId=${sessionId}&path=${encodeURIComponent(chartFile.path)}&t=${Date.now()}`
      };
    }

    return null;
  } catch (err) {
    console.error('[SCREENSHOT_SERVICE] Error getting visual preview:', err);
    return null;
  }
}

export default {
  captureWebScreenshot,
  getSessionVisualPreview,
  getBrowserExecutable
};
