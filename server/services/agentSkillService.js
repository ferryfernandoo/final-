import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Primary and fallback skill directories
const SERVER_SKILLS_DIR = path.resolve(__dirname, '..', 'skills');
const SCRATCH_SKILLS_DIR = path.resolve(__dirname, '..', '..', 'scratch', 'Complete_LLM_Skills_And_Kits_Pro_Suite', 'skills');

class AgentSkillService {
  constructor() {
    this.skills = new Map();
    this.indexMap = new Map();
    this.isLoaded = false;
    this.loadSkills();
  }

  /**
   * Load skills from both server/skills and scratch suite, plus parse KONTEKS_INDEKS_BUKU_SKILL.txt
   */
  loadSkills() {
    try {
      this.skills.clear();
      this.indexMap.clear();

      // Ensure directory exists
      if (!fs.existsSync(SERVER_SKILLS_DIR)) {
        fs.mkdirSync(SERVER_SKILLS_DIR, { recursive: true });
      }

      // Check available directories
      const dirsToScan = [SERVER_SKILLS_DIR, SCRATCH_SKILLS_DIR].filter(d => fs.existsSync(d));

      // 1. Parse KONTEKS_INDEKS_BUKU_SKILL.txt if available
      this.loadIndexMapping();

      // 2. Read all markdown files from available directories
      for (const dir of dirsToScan) {
        try {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
          for (const file of files) {
            const id = file.replace(/\.md$/, '');
            if (this.skills.has(id)) continue; // Already loaded from primary

            const fullPath = path.join(dir, file);
            const content = fs.readFileSync(fullPath, 'utf-8');

            // Metadata parsing
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const indexEntry = this.indexMap.get(id) || this.indexMap.get(file);
            const title = titleMatch ? titleMatch[1].trim() : (indexEntry?.title || id);

            const catMatch = content.match(/^Category:\s*(.+)$/m);
            const category = catMatch ? catMatch[1].trim() : (this.categorizeSkill(id));

            const kwMatch = content.match(/^Keywords:\s*\[([^\]]+)\]/m);
            const keywords = kwMatch 
              ? kwMatch[1].split(',').map(k => k.trim().toLowerCase().replace(/['"]/g, '')) 
              : this.extractKeywords(id, title, content);

            // Summary extraction
            let summary = indexEntry?.desc || '';
            if (!summary) {
              const goalMatch = content.match(/##\s+🎯\s+TUJUAN[^\n]*\n+([^#\n]+)/m);
              if (goalMatch) {
                summary = goalMatch[1].trim().slice(0, 180) + '...';
              } else {
                summary = `Buku panduan keahlian komprehensif untuk ${title}.`;
              }
            }

            this.skills.set(id, {
              id,
              file,
              fullPath,
              title,
              category,
              keywords,
              summary,
              content
            });
          }
        } catch (dirErr) {
          console.warn(`[AgentSkillService] Gagal membaca direktori ${dir}:`, dirErr.message);
        }
      }

      this.isLoaded = true;
      console.log(`[AgentSkillService] Berhasil memuat ${this.skills.size} buku skill profesional & indeks pemetaan cepat.`);
    } catch (err) {
      console.error('[AgentSkillService] Gagal memuat pustaka skills:', err);
    }
  }

  /**
   * Parse KONTEKS_INDEKS_BUKU_SKILL.txt to create quick mapping dictionary
   */
  loadIndexMapping() {
    const candidatePaths = [
      path.join(SERVER_SKILLS_DIR, 'KONTEKS_INDEKS_BUKU_SKILL.txt'),
      path.resolve(__dirname, '..', '..', 'scratch', 'Complete_LLM_Skills_And_Kits_Pro_Suite', 'KONTEKS_INDEKS_BUKU_SKILL.txt')
    ];

    for (const txtPath of candidatePaths) {
      if (fs.existsSync(txtPath)) {
        try {
          const raw = fs.readFileSync(txtPath, 'utf-8');
          const lines = raw.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('skills/') && trimmed.includes('|')) {
              const [fPart, descPart] = trimmed.split('|').map(s => s.trim());
              const fileName = fPart.replace(/^skills\//, '');
              const id = fileName.replace(/\.md$/, '');
              const titleMatch = descPart.match(/^([A-Z0-9\s/()-]+(?:\.\.\.)?)/i);
              const title = titleMatch ? titleMatch[1].trim() : id;
              this.indexMap.set(id, { id, fileName, title, desc: descPart });
              this.indexMap.set(fileName, { id, fileName, title, desc: descPart });
            }
          }
          break;
        } catch (e) {
          console.warn('[AgentSkillService] Gagal parse index file:', e.message);
        }
      }
    }
  }

  /**
   * Categorize skill based on ID and content
   */
  categorizeSkill(id = '') {
    const lower = id.toLowerCase();
    if (lower.includes('3d') || lower.includes('threejs') || lower.includes('webgl') || lower.includes('godot') || lower.includes('unity') || lower.includes('cad') || lower.includes('blender')) return '3D Graphics & Engineering';
    if (lower.includes('svg')) return 'Vector SVG & Infographics';
    if (lower.includes('word') || lower.includes('docx')) return 'Office Document (DOCX)';
    if (lower.includes('excel') || lower.includes('xlsx') || lower.includes('vba')) return 'Spreadsheet & Financial (XLSX)';
    if (lower.includes('ppt') || lower.includes('pptx')) return 'Presentation (PPTX)';
    if (lower.includes('pdf')) return 'PDF Generation';
    if (lower.includes('android') || lower.includes('apk') || lower.includes('flutter') || lower.includes('mobile')) return 'Mobile & Android Development';
    if (lower.includes('frontend') || lower.includes('web') || lower.includes('react') || lower.includes('vue') || lower.includes('svelte') || lower.includes('nextjs')) return 'Modern Web & Frontend';
    if (lower.includes('backend') || lower.includes('api') || lower.includes('python') || lower.includes('nodejs') || lower.includes('golang') || lower.includes('rust') || lower.includes('laravel')) return 'Backend & Systems';
    if (lower.includes('agribisnis') || lower.includes('peternakan')) return 'Agribusiness & Farming';
    if (lower.includes('kuliner') || lower.includes('fnb') || lower.includes('umkm')) return 'Culinary & F&B Management';
    if (lower.includes('hrd') || lower.includes('payroll') || lower.includes('kpi')) return 'HRD & Payroll';
    if (lower.includes('sop') || lower.includes('iso') || lower.includes('fmea')) return 'Quality Management & SOP';
    if (lower.includes('coding') || lower.includes('agentic') || lower.includes('tdd') || lower.includes('debug')) return 'Agentic Software Engineering';
    return 'Professional Suite';
  }

  /**
   * Extract semantic keywords from skill ID and title
   */
  extractKeywords(id, title, content) {
    const rawTokens = `${id} ${title}`.toLowerCase().replace(/[^a-z0-9_-]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    return Array.from(new Set(rawTokens)).slice(0, 10);
  }

  /**
   * 🎯 MANDATORY REQUIREMENT:
   * "setiap ai mau jawab dia harus tentukan dia perlu md apa ga untuk jawab"
   * Determines if the user's prompt needs a skill book or not.
   * - Casual chit-chat / simple questions -> requiresSkill: false
   * - Any task, coding, document, analysis, creation -> requiresSkill: true (with best matching skill)
   */
  evaluateSkillRequirement(userPrompt = '') {
    if (!this.isLoaded) this.loadSkills();
    const prompt = (userPrompt || '').trim();
    if (!prompt) {
      return { requiresSkill: false, reason: 'Pesan kosong' };
    }

    const pLower = prompt.toLowerCase();

    // 1. Casual chit-chat / greetings without task
    const greetingPhrases = [
      'halo', 'hai', 'hi', 'hey', 'hello', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
      'apa kabar', 'gimana kabarnya', 'siapa kamu', 'kamu siapa', 'kamu ai apa', 'siapa namamu',
      'terima kasih', 'makasih', 'thanks', 'thank you', 'ok', 'oke', 'sip', 'mantap', 'tes', 'test', 'p',
      'deepernova', 'ai', 'bot', 'bro', 'min', 'admin', 'kawan', 'teman'
    ];

    let cleaned = pLower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const gp of greetingPhrases) {
      cleaned = cleaned.replace(new RegExp('\\b' + gp + '\\b', 'g'), '').trim();
    }
    const isPureGreeting = cleaned.length === 0;

    const isSimpleQuestion = /^(1\+1|2\+2|\d+\s*[\+\-\*\/]\s*\d+|sebutkan\s+ibukota|hari\s+ini\s+hari\s+apa|jam\s+berapa\s+sekarang|cuaca\s+hari\s+ini)[?.]*$/i.test(pLower);

    if (isPureGreeting || isSimpleQuestion) {
      return {
        requiresSkill: false,
        selectedSkill: null,
        reason: 'Percakapan umum atau sapaan santai yang tidak memerlukan buku panduan khusus.'
      };
    }

    // 2. High-speed Instant Routing Table based on KONTEKS_INDEKS_BUKU_SKILL.txt
    const routedSkill = this.routePromptToSkill(prompt);
    if (routedSkill) {
      return {
        requiresSkill: true,
        selectedSkill: routedSkill,
        reason: `Tugas teridentifikasi memerlukan standar profesional '${routedSkill.title}' (${routedSkill.file})`
      };
    }

    // 3. Fallback: If it's an actionable prompt, default to 00-MASTER-AGENTIC-STEPPING-OS.md
    const isActionable = /\b(buat|bikin|rancang|buatkan|tulis|koding|coding|analisis|eksekusi|jalankan|perbaiki|debug|bantu|susun|hitung|jelaskan\s+cara)\b/i.test(pLower);
    if (isActionable) {
      const master = this.readSkill('00-MASTER-AGENTIC-STEPPING-OS');
      if (master.found) {
        return {
          requiresSkill: true,
          selectedSkill: master,
          reason: 'Tugas umum diarahkan ke Otak Utama: Master Agentic Stepping OS'
        };
      }
    }

    return {
      requiresSkill: false,
      selectedSkill: null,
      reason: 'Pertanyaan konseptual langsung.'
    };
  }

  /**
   * ⚡ ZERO-SEARCH FAST ROUTER:
   * Maps user prompt directly to the exact .md skill using KONTEKS_INDEKS_BUKU_SKILL.txt routing table
   */
  routePromptToSkill(userPrompt = '') {
    if (!this.isLoaded) this.loadSkills();
    const p = userPrompt.toLowerCase();

    // 00-A. WEB FETCHING, SCRAPING, CRAWLER & TERMINAL NETWORK
    if (/\b(fetch|scraping|scrape|crawler|crawl|curl|ambil\s*web|buka\s*link|buka\s*url|kunjungi\s*web|cek\s*web|cek\s*url|baca\s*web|download\s*web|ambil\s*data\s*dari|api\s*eksternal|request\s*web|http\s*request|terminal\s*fetch|web\s*fetch|situs|website)\b/i.test(p) || /(https?:\/\/[^\s]+)/i.test(p)) {
      return this.readSkill('web-scraping-crawler');
    }

    // 00. POWERPOINT (.pptx) & SLIDE DECK (Evaluated early to ensure creative specialized PPT skills)
    if (/\b(ppt|pptx|powerpoint|slide|slides|presentasi|pitch\s*deck|c-level\s*deck|deck)\b/i.test(p)) {
      if (/\b(sapi|ternak|peternakan|kambing|domba|unggas|agribisnis|farm|nature|biogas|susu|hewan)\b/i.test(p)) {
        return this.readSkill('184-skill-ppt-agribisnis-peternakan-nature-modern');
      }
      if (/\b(bento|grid|card|kotak|modern\s*ui|apple|linear)\b/i.test(p)) {
        return this.readSkill('181-skill-ppt-bento-grid-modern-ui');
      }
      if (/\b(dark|cyber|tech|ai|keamanan|security|cloud|obsidian|neon|hacker)\b/i.test(p)) {
        return this.readSkill('182-skill-ppt-dark-mode-tech-cyber');
      }
      if (/\b(pitch|investor|sequoia|yc|startup|unicorn|funding|valuasi|modal)\b/i.test(p)) {
        return this.readSkill('183-skill-ppt-pitch-deck-unicorn-sequoia');
      }
      if (/\b(roadmap|alur|timeline|tahapan|proses|infografis|fase|jadwal)\b/i.test(p)) {
        return this.readSkill('185-skill-ppt-infografis-diagram-proses-roadmap');
      }
      if (/\b(mckinsey|bcg|bain|konsultan|eksekutif|c-level|ebitda|mece|corporate)\b/i.test(p)) {
        return this.readSkill('186-skill-ppt-mckinsey-executive-consulting');
      }
      if (/\b(portofolio|kreatif|studio|brand|agency|showcase|desain|kemasan)\b/i.test(p)) {
        return this.readSkill('187-skill-ppt-creative-portfolio-showcase');
      }
      if (/\b(akademik|ilmiah|tesis|disertasi|konferensi|riset|paper|seminar|sidang)\b/i.test(p)) {
        return this.readSkill('188-skill-ppt-academic-scientific-conference');
      }
      return this.readSkill('24-skill-ppt-pptx-lengkap');
    }

    // 01. ANDROID (.apk) & MOBILE DEVELOPMENT (Prioritize software architecture over feature topic)
    if (/\b(apk|android|kotlin|jetpack\s*compose|flutter|react\s*native|expo|capacitor)\b/i.test(p)) {
      if (/\b(flutter|dart)\b/i.test(p)) return this.readSkill('70-skill-flutter-dart-multiplatform-apk-pro');
      if (/\b(react\s*native|expo)\b/i.test(p)) return this.readSkill('71-skill-react-native-expo-mobile-pro');
      if (/\b(capacitor|pwa|web\s*to\s*apk)\b/i.test(p)) return this.readSkill('72-skill-capacitor-html-to-apk-pwa-wrapper');
      return this.readSkill('66-skill-android-kotlin-jetpack-compose-pro');
    }

    // 02. UMKM KULINER, RESTORAN, KAFE & HPP RESEP (Prioritize food/culinary before livestock)
    if (/\b(kuliner|fnb|resep|makanan|minuman|food\s*cost|hpp|restoran|kafe|cafe|menu|katering|warung|ayam\s*(geprek|goreng|bakar|kremes|crispy)|bebek\s*(goreng|bakar))\b/i.test(p)) {
      return this.readSkill('36-skill-umkm-fnb-kuliner-hpp-resep');
    }

    // 03. AGRIBISNIS, PETERNAKAN UNGGAS, AYAM, BEBEK & PAKAN
    if (/\b(bebek|ayam|unggas|ternak|peternakan|pakan|ransum|telur|fcr|hdp|kandang|doc|broiler|layer|agribisnis)\b/i.test(p)) {
      return this.readSkill('35-skill-agribisnis-peternakan-unggas-pakan');
    }

    // 04. HRD, PAYROLL, LEMBUR & KPI
    if (/\b(hrd|gaji|payroll|lembur|bpjs|karyawan|kpi|okr|absensi|cuti)\b/i.test(p)) {
      return this.readSkill('39-skill-hrd-payroll-kpi-karyawan-indonesia');
    }

    // 05. SOP OPERASIONAL, ISO 9001/45001, K3 & FMEA
    if (/\b(sop|iso\s*9001|iso\s*45001|k3|loto|fmea|rpn|8d|instruksi\s*kerja|kalibrasi)\b/i.test(p)) {
      return this.readSkill('29-skill-sop-iso-manufacturing-indonesia');
    }

    // 06. DOKUMEN WORD (.docx)
    if (/\b(docx|word|dokumen\s*word|laporan\s*word|proposal\s*word|format\s*word)\b/i.test(p)) {
      return this.readSkill('17-skill-word-docx-lengkap');
    }

    // 07. EXCEL (.xlsx) & MACRO VBA & FINANCIAL MODELING
    if (/\b(xlsx|excel|spreadsheet|tabel\s*excel|rumus\s*excel|vba|macro|makro|finansial|financial|cashflow|npv|irr|oee|six\s*sigma|cpk)\b/i.test(p)) {
      if (/\b(vba|macro|makro)\b/i.test(p)) return this.readSkill('22-skill-excel-vba-macro-mastery');
      if (/\b(finansial|financial|laba|rugi|cashflow|npv|irr|oee|six\s*sigma|cpk)\b/i.test(p)) return this.readSkill('23-skill-excel-financial-industrial-modeling');
      return this.readSkill('20-skill-excel-xlsx-lengkap');
    }

    // 08. DOKUMEN PDF (.pdf)
    if (/\b(pdf|dokumen\s*pdf|laporan\s*pdf|cetak\s*pdf)\b/i.test(p)) {
      return this.readSkill('27-skill-pdf-report-generation-pro');
    }

    // 10. GRAFIK KURVA 300-DPI ('Kurva Gila')
    if (/\b(kurva|grafik\s*300|spline|six\s*sigma\s*bell|pareto|s-curve|waterfall|heatmap|radar\s*kpi)\b/i.test(p)) {
      return this.readSkill('26-skill-data-viz-kurva-gila');
    }

    // 11. 3D DIGITAL TWIN, SCADA, ROBOT ARM & CAD
    if (/\b(digital\s*twin|scada|robot\s*arm|6dof|kinematics|cad|stl|obj\s*3d|openscad|blender|bpy)\b/i.test(p)) {
      if (/\b(robot|kinematics|6dof)\b/i.test(p)) return this.readSkill('134-skill-3d-inverse-kinematics-6dof-robot-arm');
      if (/\b(cad|stl|obj)\b/i.test(p)) return this.readSkill('125-skill-3d-cad-parametric-stl-obj-generator');
      return this.readSkill('124-skill-3d-industrial-digital-twin-scada');
    }

    // 12. GAME 3D WEBGL (Three.js / Godot / Unity)
    if (/\b(threejs|three\.js|webgl|game\s*3d|fps\s*3d|racing\s*3d|voxel|shader|glsl|godot|unity)\b/i.test(p)) {
      if (/\b(fps|first\s*person)\b/i.test(p)) return this.readSkill('101-skill-3d-fps-first-person-shooter-engine');
      if (/\b(racing|balap|mobil|suspensi)\b/i.test(p)) return this.readSkill('102-skill-3d-racing-vehicle-suspension-physics');
      if (/\b(voxel|minecraft)\b/i.test(p)) return this.readSkill('103-skill-3d-voxel-world-minecraft-chunk-engine');
      if (/\b(shader|glsl)\b/i.test(p)) return this.readSkill('80-skill-webgl-glsl-shaders-postprocessing');
      if (/\b(godot)\b/i.test(p)) return this.readSkill('83-skill-godot-4-gdscript-2d-3d-game-pro');
      if (/\b(unity)\b/i.test(p)) return this.readSkill('84-skill-unity-csharp-3d-game-architecture');
      return this.readSkill('76-skill-threejs-webgl-3d-engine-lengkap');
    }

    // 13. SURAT RESMI, KONTRAK MOU/PKS & CV ATS
    if (/\b(surat\s*resmi|surat\s*dinas|mou|pks|kontrak|perjanjian|notulen|cv|resume|ats|lamaran)\b/i.test(p)) {
      if (/\b(cv|resume|ats|lamaran|portofolio)\b/i.test(p)) return this.readSkill('32-skill-cv-resume-ats-portofolio');
      return this.readSkill('31-skill-surat-resmi-kontrak-notulen-indonesia');
    }

    // 14. PROPOSAL BISNIS & PITCH INVESTOR
    if (/\b(proposal\s*bisnis|pitch\s*investor|pitching|studi\s*kelayakan|rab|roi)\b/i.test(p)) {
      return this.readSkill('30-skill-proposal-bisnis-pitch-investor');
    }

    // 15. AKUNTANSI, PAJAK & LAPORAN LABA RUGI
    if (/\b(akuntansi|pembukuan|jurnal|neraca|laba\s*rugi|balance\s*sheet|pajak|umkm\s*pembukuan)\b/i.test(p)) {
      return this.readSkill('40-skill-akuntansi-pajak-umkm-pembukuan');
    }

    // 16. SVG VEKTOR & DIAGRAM
    if (/\b(svg|vektor|diagram\s*svg|flowchart\s*svg|isometrik|speedometer\s*svg|infografis\s*svg)\b/i.test(p)) {
      if (/\b(isometrik|isometric)\b/i.test(p)) return this.readSkill('137-skill-svg-isometric-3d-illustration-engine');
      if (/\b(flowchart|uml|erd|diagram)\b/i.test(p)) return this.readSkill('138-skill-svg-architecture-flowchart-uml-erd-diagrams');
      if (/\b(speedometer|gauge)\b/i.test(p)) return this.readSkill('142-skill-svg-gauges-speedometer-circular-kpi-meters');
      return this.readSkill('42-skill-svg-diagram-flowchart-infografis');
    }

    // 17. EMBEDDED IOT, ESP32, ARDUINO, MODBUS & MQTT
    if (/\b(esp32|arduino|iot|embedded|modbus|mqtt|sensor|mikrokontroler)\b/i.test(p)) {
      if (/\b(modbus|mqtt|telemetri)\b/i.test(p)) return this.readSkill('52-skill-network-protocol-mqtt-modbus-websocket');
      return this.readSkill('13-skill-iot-esp32-embedded-c-pro');
    }

    // 18. CYBERSECURITY & DEFENSIVE CODING
    if (/\b(keamanan|security|cyber|pentest|owasp|sqli|xss|vulnerability|audit\s*kode)\b/i.test(p)) {
      return this.readSkill('12-skill-cybersecurity-secure-coding-audit');
    }

    // 19. DATA SCIENCE, PANDAS, NUMPY & ETL
    if (/\b(pandas|numpy|data\s*science|data\s*cleaning|etl|iqr|z-score|dataframe)\b/i.test(p)) {
      return this.readSkill('14-skill-python-data-science-pandas-numpy');
    }

    // 20. AI / ML / RAG / FINE-TUNING
    if (/\b(fine-tuning|finetuning|rag|lora|qlora|embedding|huggingface|llm\s*training)\b/i.test(p)) {
      return this.readSkill('15-skill-ai-ml-finetuning-rag-pipeline');
    }

    // 21. WEB FRAMEWORKS & FULLSTACK
    if (/\b(nextjs|next\.js|react|vue|nuxt|svelte|angular|astro|tailwind|html|css|web\s*app|dashboard)\b/i.test(p)) {
      if (/\b(nextjs|next\.js)\b/i.test(p)) return this.readSkill('86-skill-nextjs-app-router-fullstack-pro');
      if (/\b(vue|nuxt)\b/i.test(p)) return this.readSkill('87-skill-vue3-composition-api-pinia-nuxt');
      if (/\b(svelte)\b/i.test(p)) return this.readSkill('88-skill-svelte5-runes-sveltekit-pro');
      if (/\b(angular)\b/i.test(p)) return this.readSkill('89-skill-angular-signals-standalone-rxjs-pro');
      if (/\b(astro|htmx)\b/i.test(p)) return this.readSkill('90-skill-astro-htmx-alpinejs-lightweight-web');
      if (/\b(react|tailwind|shadcn)\b/i.test(p)) return this.readSkill('09-skill-react-tailwind-shadcn-pro');
      return this.readSkill('07-skill-frontend-web-lengkap');
    }

    // 22. BACKEND API FRAMEWORKS
    if (/\b(fastapi|django|flask|express|nestjs|golang|gin|fiber|rust|axum|laravel)\b/i.test(p)) {
      if (/\b(fastapi|django|flask)\b/i.test(p)) return this.readSkill('95-skill-python-fastapi-django-flask-sqlalchemy');
      if (/\b(nestjs|fastify)\b/i.test(p)) return this.readSkill('94-skill-nodejs-nestjs-fastify-hono-pro');
      if (/\b(golang|gin|fiber)\b/i.test(p)) return this.readSkill('96-skill-golang-gin-fiber-concurrency-pro');
      if (/\b(rust|axum|tokio)\b/i.test(p)) return this.readSkill('97-skill-rust-axum-tokio-memory-safety-pro');
      if (/\b(laravel|php)\b/i.test(p)) return this.readSkill('98-skill-php-laravel-eloquent-mvc-pro');
      return this.readSkill('10-skill-backend-rest-api-python-node');
    }

    // 23. AGENTIC CODING / DEBUGGING / TDD / REFACTORING
    if (/\b(koding|coding|debug|debugging|error|traceback|refactor|tdd|unit\s*test)\b/i.test(p)) {
      if (/\b(debug|debugging|error|traceback)\b/i.test(p)) return this.readSkill('04-skill-debugging-root-cause-analysis');
      if (/\b(tdd|unit\s*test|testing)\b/i.test(p)) return this.readSkill('03-skill-tdd-testing-qa-automation');
      if (/\b(refactor|clean\s*architecture)\b/i.test(p)) return this.readSkill('05-skill-refactoring-clean-architecture');
      return this.readSkill('01-skill-agentic-coding-flow-lengkap');
    }

    // 24. Database / SQL
    if (/\b(database|sql|sqlite|postgres|mysql|query|indeks|relasional)\b/i.test(p)) {
      return this.readSkill('11-skill-sql-database-query-optimization');
    }

    // 25. High-threshold Search across all 181 skills by score (only if meaningful keywords match)
    const searchResults = this.searchSkills(userPrompt);
    if (searchResults.length > 0 && searchResults[0].score >= 15) {
      return this.readSkill(searchResults[0].id);
    }

    return null;
  }

  /**
   * Search skills across all 181 skills with stopword filtering and scoring
   */
  searchSkills(query = '') {
    if (!this.isLoaded) this.loadSkills();
    const q = query.toLowerCase().trim();
    if (!q) return Array.from(this.skills.values());

    const STOPWORDS = new Set([
      'apa', 'siapa', 'bagaimana', 'kenapa', 'mengapa', 'dimana', 'kapan', 'dan', 'atau',
      'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'untuk', 'pada', 'adalah', 'yaitu', 'yakni',
      'bisa', 'dapat', 'tolong', 'coba', 'dong', 'ya', 'kan', 'lah', 'kah', 'pun', 'saja',
      'ada', 'tidak', 'bukan', 'the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for', 'of'
    ]);

    const terms = q.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
    if (terms.length === 0) return [];

    const scored = [];

    for (const [id, meta] of this.skills.entries()) {
      let score = 0;
      const idLower = id.toLowerCase();
      const titleLower = meta.title.toLowerCase();
      const catLower = meta.category.toLowerCase();
      const descLower = (meta.summary || '').toLowerCase();

      for (const term of terms) {
        if (idLower.includes(term)) score += 15;
        if (titleLower.includes(term)) score += 10;
        if (catLower.includes(term)) score += 6;
        if (descLower.includes(term)) score += 5;
        if (meta.keywords.some(k => k.includes(term))) score += 8;
      }

      if (score > 0) {
        scored.push({ ...meta, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Read full skill content by ID or filename
   */
  readSkill(skillName = '') {
    if (!this.isLoaded) this.loadSkills();
    const rawTarget = (skillName || '').trim().replace(/\.md$/, '');
    const target = rawTarget.toLowerCase();

    // 1. Direct match by ID
    if (this.skills.has(rawTarget)) {
      const s = this.skills.get(rawTarget);
      return { found: true, ...s };
    }

    // 2. Case-insensitive / normalized ID match
    for (const [id, s] of this.skills.entries()) {
      if (id.toLowerCase() === target) {
        return { found: true, ...s };
      }
    }

    // 3. Partial number or prefix match (e.g. "17", "word", "excel")
    for (const [id, s] of this.skills.entries()) {
      if (id.toLowerCase().startsWith(target) || id.toLowerCase().includes(target)) {
        return { found: true, ...s };
      }
    }

    // 4. Fallback search
    const results = this.searchSkills(rawTarget);
    if (results.length > 0) {
      const best = results[0];
      return {
        found: true,
        ...best,
        note: `Skill '${skillName}' dicocokkan otomatis ke '${best.id}'.`
      };
    }

    return {
      found: false,
      id: rawTarget,
      title: 'Skill Tidak Ditemukan',
      error: `Skill '${skillName}' tidak ditemukan di perpustakaan 181 buku skill.`
    };
  }

  /**
   * Build Ultra-Strict prompt injection to force the LLM to follow the skill verbatim
   */
  getStrictAdherencePrompt(skill) {
    if (!skill || !skill.content) return '';

    return `
================================================================================
📖 [BUKU SKILL PROFESIONAL WAJIB DIIKUTI: ${skill.file || skill.id + '.md'} - "${skill.title}"]
Kategori: ${skill.category || 'Spesialis'}

🚨 ATURAN KEPATUHAN MUTLAK (ULTRA-STRICT SKILL ADHERENCE MODE):
PERINGATAN SANGAT PENTING: Anda TIDAK DIPERBOLEHKAN MENGARANG SINTAKS ATAU MEMBUAT STRUKTUR MINIMALIS ASAL-ASALAN!
Karena model AI bertugas mengeksekusi instruksi standar industri secara presisi:
1. ANDA WAJIB BERPEGANG TEGUH 100% PADA SELURUH ATURAN, ARSITEKTUR, DAN TEMPLATE KODE DALAM BUKU SKILL INI!
2. JANGAN MENGABAIKAN STANDAR KUALITAS (warna, margin, formula dinamis, pola anti-error, komponen).
3. DILARANG KERAS MEMBUAT DOKUMEN / SLIDE POLOS TANPA ESTETIKA:
   - DILARANG 'prs.slide_layouts[0]' atau 'prs.slide_layouts[1]' mentah teks hitam putih tanpa background tema gelap, tanpa card KPI, tanpa layout bands 16:9 widescreen!
   - DILARANG membuat file Word polos tanpa callout box ber-border oranye, tanpa header McKinsey, dan tanpa tabel zebra-striped!
   - DILARANG membuat file Excel polos tanpa banner gelap, tanpa kartu KPI, tanpa format angka (Rp/#,##0), dan tanpa formula dinamis!
4. MESIN OTOMASI KITS SIAP PAKAI DI WORKSPACE SANDBOX (JALUR PALING CEPAT & TERBAIK):
   - Presentasi PPTX 16:9 Widescreen Modern: Tulis <write_file path="spec.json">...</write_file> lalu eksekusi <run_command>python kits/pptx_designer.py spec.json nama_file.pptx</run_command> (atau kits/pptx_kit.py).
   - Dokumen Word DOCX Eksekutif: Tulis <write_file path="spec.json">...</write_file> lalu eksekusi <run_command>python kits/word_kit.py spec.json nama_file.docx</run_command>.
   - Spreadsheet Excel XLSX Ber-rumus: Tulis <write_file path="spec.json">...</write_file> lalu eksekusi <run_command>python kits/excel_kit.py spec.json nama_file.xlsx</run_command>.
   - Dokumen PDF Siap Cetak: Tulis <write_file path="spec.json">...</write_file> lalu eksekusi <run_command>python kits/pdf_kit.py spec.json nama_file.pdf</run_command>.
   - Grafik Kurva 300-DPI: Impor viz_kit atau gunakan blok curve/chart di spec.json.
   - Pustaka kits ini sudah aktif di PYTHONPATH dan siap dijalankan langsung di terminal sandbox.
5. PROTOKOL AKSI & HEMAT TOKEN (ACTION-FIRST & CRISP EXECUTIVE SUMMARY):
   - LANGSUNG KERJAKAN: Mulai langsung dengan tag aksi (<write_file>, <run_command>, <check_file>).
   - DILARANG KERAS ngedumel, curhat kendala teknis, atau menulis ceramah panjang yang menghabiskan token!
   - KESIMPULAN SAAT SELESAI: Setelah berkas tuntas diverifikasi, berikan HANYA KESIMPULAN EKSEKUTIF ringkas (Status 100%, berkas jadi, 3-4 poin pokok intisari, dan panduan unduh/preview).
6. Jalankan instruksi di bawah ini langkah demi langkah dengan teliti dan setia:

[ISI LENGKAP PANDUAN BUKU SKILL]:
${skill.content}
================================================================================
`;
  }

  /**
   * Get Compact catalog for prompt injection
   */
  getCompactCatalog() {
    return `### 📚 ON-DEMAND SKILL CATALOG (181 BUKU SKILL STANDAR TINGGI)
Gunakan tag \`<read_skill name="nama_skill" />\` untuk membaca panduan buku skill secara lengkap kapan saja.
Indeks Cepat: Word (.docx) -> \`17-skill-word-docx-lengkap\`, Excel (.xlsx) -> \`20-skill-excel-xlsx-lengkap\`, PPT (.pptx) -> \`24-skill-ppt-pptx-lengkap\`, PDF -> \`27-skill-pdf-report-generation-pro\`, Kurva 300-DPI -> \`26-skill-data-viz-kurva-gila\`, WebApp -> \`07-skill-frontend-web-lengkap\`, Game 3D -> \`76-skill-threejs-webgl-3d-engine-lengkap\`, 3D Twin -> \`124-skill-3d-industrial-digital-twin-scada\`, Android APK -> \`66-skill-android-kotlin-jetpack-compose-pro\`, Agribisnis Bebek/Ayam -> \`35-skill-agribisnis-peternakan-unggas-pakan\`, Kuliner HPP -> \`36-skill-umkm-fnb-kuliner-hpp-resep\`, HRD Payroll -> \`39-skill-hrd-payroll-kpi-karyawan-indonesia\`, SOP ISO/K3 -> \`29-skill-sop-iso-manufacturing-indonesia\`, Surat/Kontrak/CV ATS -> \`31-skill-surat-resmi-kontrak-notulen-indonesia\`.`;
  }

  suggestSkill(userMessage = '') {
    const res = this.evaluateSkillRequirement(userMessage);
    return res.requiresSkill ? res.selectedSkill : null;
  }
}

export const agentSkillService = new AgentSkillService();
export default agentSkillService;
