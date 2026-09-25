#!/usr/bin/env node
/**
 * Setup Google AdSense & Monetization CLI for Deepernova AI
 * Usage:
 *   node scripts/setup_ads.mjs ca-pub-1234567890123456
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputPubId = process.argv[2]?.trim();

console.log('\n======================================================');
console.log('  🚀 DEEPERNOVA AI — ADSENSE & MONETIZATION SETUP');
console.log('======================================================\n');

if (!inputPubId) {
  console.log('ℹ️  Cara pakai: node scripts/setup_ads.mjs [ID_PUBLISHER_ADSENSE]');
  console.log('   Contoh: node scripts/setup_ads.mjs ca-pub-1234567890123456\n');
  console.log('📌 Status saat ini:');
  console.log('   - File ads.txt: SIAP di public/ads.txt');
  console.log('   - File Privacy Policy: SIAP di public/privacy.html');
  console.log('   - File Terms of Service: SIAP di public/terms.html');
  console.log('   - Komponen Iklan: SIAP di src/components/AdBanner.jsx');
  console.log('   - AdSense Loader: SIAP di index.html');
  console.log('   - QRIS Rekening Langsung: AKTIF di modal donasi & fallback iklan\n');
  process.exit(0);
}

// Normalize ID
let caPubId = inputPubId;
if (!caPubId.startsWith('ca-pub-')) {
  caPubId = caPubId.startsWith('pub-') ? `ca-${caPubId}` : `ca-pub-${caPubId}`;
}
const rawPubId = caPubId.replace('ca-', '');

console.log(`🎯 Mengonfigurasi Publisher ID: ${caPubId} (${rawPubId})...\n`);

// 1. Update public/ads.txt
const adsTxtPath = path.join(rootDir, 'public', 'ads.txt');
const adsTxtContent = `# Google AdSense ads.txt for deepernova.com
google.com, ${rawPubId}, DIRECT, f08c47fec0942fa0
`;
fs.writeFileSync(adsTxtPath, adsTxtContent, 'utf8');
console.log('✅ 1. public/ads.txt diperbarui!');

// 2. Update index.html
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-[a-zA-Z0-9_-]+/g,
    `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${caPubId}`
  );
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log('✅ 2. index.html diperbarui dengan tag AdSense Anda!');
}

// 3. Update .env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('VITE_ADSENSE_CLIENT_ID=')) {
    envContent = envContent.replace(/VITE_ADSENSE_CLIENT_ID=.*/g, `VITE_ADSENSE_CLIENT_ID=${caPubId}`);
  } else {
    envContent += `\nVITE_ADSENSE_CLIENT_ID=${caPubId}\nVITE_ADSENSE_ENABLED=true\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ 3. .env diperbarui dengan VITE_ADSENSE_CLIENT_ID!');
}

// 4. Update src/config/adConfig.js
const adConfigPath = path.join(rootDir, 'src', 'config', 'adConfig.js');
if (fs.existsSync(adConfigPath)) {
  let adConfig = fs.readFileSync(adConfigPath, 'utf8');
  adConfig = adConfig.replace(/'ca-pub-XXXXXXXXXXXXXXXX'/g, `'${caPubId}'`);
  adConfig = adConfig.replace(/enabled:\s*import\.meta\.env\.VITE_ADSENSE_ENABLED === 'true' \|\| false/g, `enabled: true`);
  fs.writeFileSync(adConfigPath, adConfig, 'utf8');
  console.log('✅ 4. src/config/adConfig.js diaktifkan!');
}

console.log('\n🎉 SEMUA PENGATURAN IKLAN SELESAI DISET DI TERMINAL!');
console.log('======================================================');
console.log('Langkah Pencairan Uang ke Rekening Bank:');
console.log('1. Buka https://adsense.google.com > Masuk dengan akun Google Anda.');
console.log('2. Buka menu "Payments / Pembayaran" > "Add Payment Method".');
console.log('3. Masukkan nomor rekening bank Anda (BCA, Mandiri, BRI, BNI).');
console.log('4. Google akan transfer uang otomatis tiap tanggal 21-26 ke rekening Anda!');
console.log('======================================================\n');
