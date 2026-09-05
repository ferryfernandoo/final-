import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const indexPath = path.join(rootDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

const helpDataPath = path.join(rootDir, 'scratch_help_data.json');
const helpData = JSON.parse(fs.readFileSync(helpDataPath, 'utf8'));

// 1. Build complete FAQPage mainEntity array for index.html (all 18 Q&As)
const faqArray = helpData.map(item => {
  const steps = item.solution.map((s, idx) => `${idx + 1}. ${s}`).join(' ');
  const tips = item.tips ? ` Tips: ${item.tips}` : '';
  return {
    '@type': 'Question',
    'name': item.title,
    'acceptedAnswer': {
      '@type': 'Answer',
      'text': `${item.summary} Langkah-langkah: ${steps}${tips}`
    }
  };
});

// Replace FAQPage mainEntity in index.html
const faqJsonMatch = indexHtml.match(/("@type":\s*"FAQPage",[\s\S]*?"mainEntity":\s*)\[[\s\S]*?\](\s*\}\s*,\s*\{\s*"@type":\s*"HowTo")/);
if (faqJsonMatch) {
  const replacement = `${faqJsonMatch[1]}${JSON.stringify(faqArray, null, 12).trim()}${faqJsonMatch[2]}`;
  indexHtml = indexHtml.replace(faqJsonMatch[0], replacement);
  console.log('✅ Updated FAQPage in index.html with 18 comprehensive entities.');
} else {
  console.warn('⚠️ Could not match FAQPage JSON-LD in index.html');
}

// 2. Build complete pre-rendered static semantic HTML for index.html <noscript> section
const CATEGORIES = [
  { id: 'vibecoding', label: '1. Agentic Vibe Coding (CodeDance IDE)' },
  { id: 'image', label: '2. AI Gambar & Art Studio (Text-to-Image)' },
  { id: 'typernova', label: '3. Typernova Document Studio (Word, Excel, PPT)' },
  { id: 'memory', label: '4. Autonomous Memory System (CRUD)' },
  { id: 'chatbot', label: '5. Chatbot Multi-Model & Vision OCR' },
  { id: 'troubleshooting', label: '6. Pemecahan Masalah & Troubleshooting' },
  { id: 'account', label: '7. Akun, Keamanan & Profil CEO' }
];

let helpSectionsHtml = '';
CATEGORIES.forEach(cat => {
  const items = helpData.filter(d => d.category === cat.id);
  if (items.length === 0) return;

  helpSectionsHtml += `
            <div style="margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
              <h3 style="font-size: 19px; font-weight: 700; color: #ea580c; margin: 0 0 12px 0;">${cat.label}</h3>
  `;

  items.forEach(item => {
    const stepsHtml = item.solution.map(s => {
      const sanitized = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<li style="margin-bottom: 6px;">${sanitized}</li>`;
    }).join('\n                ');
    const tipsHtml = item.tips ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #9a3412; background: #fff7ed; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ea580c;"><strong>Tips:</strong> ${item.tips.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '';

    helpSectionsHtml += `
              <div style="margin-bottom: 18px;">
                <h4 style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">${item.title}</h4>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;">${item.summary}</p>
                <ol style="margin: 0 0 6px 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
                  ${stepsHtml}
                </ol>
                ${tipsHtml}
              </div>
    `;
  });

  helpSectionsHtml += `
            </div>
  `;
});

// CEO Card inside noscript
const ceoNoscriptHtml = `
            <!-- Profil CEO & Misi Pengabdian Deepernova -->
            <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #fed7aa; border-radius: 12px; padding: 24px; margin-top: 24px;">
              <h3 style="font-size: 20px; font-weight: 800; color: #9a3412; margin: 0 0 8px 0;">Profil Founder &amp; CEO — Ferry Fernando (FF)</h3>
              <p style="font-size: 15px; color: #475569; margin: 0 0 12px 0;">
                <strong>Ferry Fernando</strong> adalah Founder dan Chief Executive Officer (CEO) Deepernova Corp asal Kebumen, Jawa Tengah, Indonesia, didampingi <strong>Anju Malinton Pakpahan</strong> (Co-Founder &amp; Vice CEO).
              </p>
              <blockquote style="font-size: 16px; font-weight: 700; color: #ea580c; border-left: 4px solid #ea580c; padding-left: 14px; margin: 12px 0;">
                "Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya."
              </blockquote>
              <p style="font-size: 14px; color: #7c2d12; margin: 0;">
                Instagram Resmi CEO: <a href="https://instagram.com/ferryfernandoo_" target="_blank" rel="noopener" style="color: #ea580c; font-weight: bold;">@ferryfernandoo_</a> | Panduan Lengkap: <a href="https://deepernova.com/help" style="color: #ea580c; font-weight: bold;">https://deepernova.com/help</a>
              </p>
            </div>
`;

const noscriptSectionRegex = /<!-- Pusat Bantuan & Pemecahan Masalah \(Help & Troubleshooting Manual\) -->[\s\S]*?<\/section>/;
const newNoscriptSection = `<!-- Pusat Bantuan & Pemecahan Masalah (Help & Troubleshooting Manual) -->
          <section id="panduan-solusi-masalah" style="margin-bottom: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 20px; border-bottom: 2px solid #ea580c; padding-bottom: 12px;">
              <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Pusat Bantuan Resmi &amp; Solusi Pintar Deepernova AI (Help Center Directory)</h2>
              <a href="https://deepernova.com/help" style="font-size: 14px; font-weight: 700; color: #ea580c; text-decoration: underline;">Buka Halaman Bantuan Lengkap ➔</a>
            </div>
            ${helpSectionsHtml}
            ${ceoNoscriptHtml}
          </section>`;

if (noscriptSectionRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(noscriptSectionRegex, newNoscriptSection);
  console.log('✅ Replaced noscript Help Center section in index.html with all 18 articles and CEO mission.');
} else {
  console.warn('⚠️ Could not match noscript section in index.html');
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log(`✅ Saved updated index.html (${indexHtml.length} bytes)`);
