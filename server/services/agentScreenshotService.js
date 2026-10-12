import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
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
 * Capture a pixel-perfect, fully executed screenshot using Puppeteer with real browser engine.
 * Waits for DOM, CSS, CDNs, JavaScript execution, Canvas, and layout paint before snapping.
 */
export async function captureWebScreenshot(sessionId, relativeHtmlPath = 'index.html', outputFilename = 'screenshot.png') {
  let browser = null;
  try {
    const sandboxDir = agentSandboxService.getSandboxDir(sessionId);
    let targetHtmlPath = agentSandboxService.safeResolvePath(sessionId, relativeHtmlPath);
    let actualHtmlFile = relativeHtmlPath;

    // If specified HTML doesn't exist, search for any HTML file in the sandbox
    if (!fs.existsSync(targetHtmlPath)) {
      const files = agentSandboxService.listFiles(sessionId);
      const anyHtml = files.find(f => f.ext === 'html');
      if (anyHtml) {
        targetHtmlPath = agentSandboxService.safeResolvePath(sessionId, anyHtml.path);
        actualHtmlFile = anyHtml.path;
      } else {
        return { success: false, error: 'Tidak ada berkas HTML di sandbox untuk diambil tangkapan layar.' };
      }
    }

    const browserExe = getBrowserExecutable();
    if (!browserExe) {
      return { success: false, error: 'Browser Chrome/Edge tidak ditemukan untuk headless screenshot.' };
    }

    const outputPath = agentSandboxService.safeResolvePath(sessionId, outputFilename);

    // Launch real headless browser via puppeteer-core
    browser = await puppeteer.launch({
      executablePath: browserExe,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-file-access-from-files',
        '--hide-scrollbars'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    // Navigate: Try HTTP preview first (allows relative scripts & local assets over HTTP)
    let navigationSucceeded = false;
    const httpPreviewUrl = `http://localhost:3001/api/agent/preview/${sessionId}/${encodeURIComponent(actualHtmlFile)}`;
    
    try {
      await page.goto(httpPreviewUrl, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 9000
      });
      navigationSucceeded = true;
    } catch (httpNavErr) {
      // Fallback: file:// scheme if HTTP server is busy or unreachable
      try {
        const fileUrl = 'file:///' + targetHtmlPath.replace(/\\/g, '/');
        await page.goto(fileUrl, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
          timeout: 7000
        });
        navigationSucceeded = true;
      } catch (fileNavErr) {
        // Last attempt with domcontentloaded only
        const fileUrl = 'file:///' + targetHtmlPath.replace(/\\/g, '/');
        await page.goto(fileUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        });
        navigationSucceeded = true;
      }
    }

    // Wait 700ms for JavaScript execution, CSS animations, Chart.js/Canvas rendering, and web fonts
    await new Promise(resolve => setTimeout(resolve, 700));

    // Remove old screenshot file if exists
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (_) {}
    }

    // Capture the high-definition screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png'
    });

    await browser.close();
    browser = null;

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      return {
        success: true,
        filename: outputFilename,
        size: stats.size,
        url: `/api/agent/screenshot/${sessionId}?t=${Date.now()}`
      };
    } else {
      return { success: false, error: 'Berkas tangkapan layar gagal disimpan ke disk.' };
    }
  } catch (err) {
    console.error('[SCREENSHOT_SERVICE] Error during puppeteer capture:', err);
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    return { success: false, error: err.message };
  }
}

/**
 * Intelligently find or generate visual preview for a session:
 * - If HTML exists, ALWAYS captures / refreshes screenshot with Puppeteer
 * - If chart.png or any image exists, returns that as visual preview
 */
export async function getSessionVisualPreview(sessionId) {
  try {
    const files = agentSandboxService.listFiles(sessionId);

    // 1. Check if an HTML file exists -> auto capture fresh screenshot with Puppeteer!
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

    // 2. Check if screenshot.png already exists and is non-empty (> 2KB)
    const existingSs = files.find(f => (f.name === 'screenshot.png' || f.name === 'preview.png') && f.size > 2000);
    if (existingSs) {
      return {
        type: 'screenshot',
        filename: existingSs.name,
        url: `/api/agent/screenshot/${sessionId}?t=${Date.now()}`
      };
    }

    // 3. Check if any chart/image exists (e.g. chart.png, kurva.png, graph.png)
    const chartFile = files.find(f => ['png', 'jpg', 'jpeg', 'webp'].includes(f.ext) && !f.name.startsWith('_') && f.name !== 'screenshot.png');
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
