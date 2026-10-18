import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const FFMPEG_PATH = 'F:\\a final deepernova ai\\deepernova ai\\server\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe';
const ROOT_DIR = 'F:\\a final deepernova ai\\deepernova ai';
const FRAMES_DIR = path.join(ROOT_DIR, 'scratch', 'promo_frames');
const AUDIO_PATH = path.join(ROOT_DIR, 'scratch', 'promo_soundtrack.aac');
const PUBLIC_MP4 = path.join(ROOT_DIR, 'public', 'deepernova-iklan-30s.mp4');
const ROOT_MP4 = path.join(ROOT_DIR, 'deepernova-iklan-30s.mp4');

// Clean and recreate frames dir
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

async function generateSoundtrack() {
  console.log('🎵 Generating synced 30-second soundtrack...');
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, [
      '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=165:duration=30',
      '-f', 'lavfi', '-i', 'sine=frequency=523.25:duration=0.35',
      '-f', 'lavfi', '-i', 'sine=frequency=659.25:duration=0.35',
      '-f', 'lavfi', '-i', 'sine=frequency=783.99:duration=0.35',
      '-f', 'lavfi', '-i', 'sine=frequency=1046.50:duration=0.35',
      '-f', 'lavfi', '-i', 'sine=frequency=587.33:duration=0.45',
      '-filter_complex',
      '[0:a]volume=0.03,lowpass=f=400[pad];' +
      '[1:a]adelay=100|100,volume=0.15[c1];' +
      '[2:a]adelay=7500|7500,volume=0.15[c2];' +
      '[3:a]adelay=15000|15000,volume=0.15[c3];' +
      '[4:a]adelay=22500|22500,volume=0.15[c4];' +
      '[5:a]adelay=29200|29200,volume=0.18[c5];' +
      '[pad][c1][c2][c3][c4][c5]amix=inputs=6:duration=first[out]',
      '-map', '[out]',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', '30',
      AUDIO_PATH
    ]);

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Audio synth failed with code ${code}`));
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log('🎬 DEEPERNOVA 30-SECOND COMMERCIAL MP4 VIDEO GENERATOR');
  console.log('====================================================');

  await generateSoundtrack();

  console.log('🚀 Launching Chrome Headless at 1280x720 (16:9 HD)...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
      '--disable-dev-shm-usage',
      '--disable-gpu-vsync'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  console.log('🌐 Opening http://localhost:3001/promo ...');
  await page.goto('http://localhost:3001/promo', { waitUntil: 'networkidle2' });

  // Reset to 0:00
  await page.evaluate(() => {
    if (window.__setPromoTime) {
      window.__setPromoTime(0);
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const client = await page.createCDPSession();
  let frameCount = 0;

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    frameCount++;
    const frameNumber = String(frameCount).padStart(5, '0');
    const filePath = path.join(FRAMES_DIR, `frame_${frameNumber}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch (_) {}
  });

  // Start Screencast at 95% JPEG quality
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 95,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1
  });

  // Ensure playback is running
  await page.evaluate(() => {
    const playBtn = document.querySelector('.play-pause-btn');
    const icon = playBtn?.querySelector('i');
    if (icon && icon.classList.contains('fa-play')) {
      playBtn.click();
    }
  });

  console.log('🎥 Recording 30-second live presentation from Chrome compositor...');
  for (let sec = 5; sec <= 30; sec += 5) {
    await new Promise(r => setTimeout(r, 5000));
    console.log(`⏱️ Recorded ${sec}s / 30s (${frameCount} frames)...`);
  }

  // Stop screencast
  try {
    await client.send('Page.stopScreencast');
  } catch (_) {}

  await browser.close();
  console.log(`✅ Recording complete! Total captured frames: ${frameCount}`);

  const calculatedFps = Math.max(24, Math.round(frameCount / 30));
  console.log(`🎞️ Source framerate: ${calculatedFps} fps`);

  console.log('⚙️ Encoding with FFmpeg (H.264 High Profile, AAC 192k, Web faststart)...');
  const encodeProc = spawn(FFMPEG_PATH, [
    '-y',
    '-framerate', String(calculatedFps),
    '-i', path.join(FRAMES_DIR, 'frame_%05d.jpg'),
    '-i', AUDIO_PATH,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-t', '30',
    '-movflags', '+faststart',
    PUBLIC_MP4
  ]);

  let ffmpegLog = '';
  encodeProc.stderr.on('data', d => { ffmpegLog += d.toString(); });

  await new Promise((resolve, reject) => {
    encodeProc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg encoding exited with code ${code}\nLog: ${ffmpegLog.slice(-400)}`));
    });
  });

  // Duplicate to root directory
  fs.copyFileSync(PUBLIC_MP4, ROOT_MP4);

  // Clean frames to save disk space
  try { fs.rmSync(FRAMES_DIR, { recursive: true, force: true }); } catch (_) {}
  try { fs.unlinkSync(AUDIO_PATH); } catch (_) {}

  const stats = fs.statSync(ROOT_MP4);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('====================================================');
  console.log('🎉 SUCCESS! Commercial Video MP4 is ready:');
  console.log(`📦 Video File 1: ${ROOT_MP4} (${sizeMB} MB)`);
  console.log(`📦 Video File 2: ${PUBLIC_MP4} (${sizeMB} MB)`);
  console.log(`🌐 Public URL: http://localhost:3001/deepernova-iklan-30s.mp4`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ Error during MP4 generation:', err);
  process.exit(1);
});
