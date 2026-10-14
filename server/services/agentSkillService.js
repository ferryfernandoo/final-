import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

class AgentSkillService {
  constructor() {
    this.skills = new Map();
    this.isLoaded = false;
    this.loadSkills();
  }

  loadSkills() {
    try {
      if (!fs.existsSync(SKILLS_DIR)) {
        fs.mkdirSync(SKILLS_DIR, { recursive: true });
      }

      const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
      this.skills.clear();

      for (const file of files) {
        const id = file.replace(/\.md$/, '');
        const fullPath = path.join(SKILLS_DIR, file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Parse Metadata
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : id;

        const catMatch = content.match(/^Category:\s*(.+)$/m);
        const category = catMatch ? catMatch[1].trim() : 'General';

        const kwMatch = content.match(/^Keywords:\s*\[([^\]]+)\]/m);
        const keywords = kwMatch 
          ? kwMatch[1].split(',').map(k => k.trim().toLowerCase().replace(/['"]/g, '')) 
          : [];

        // Summary extract (first sentence or purpose)
        let summary = '';
        const goalMatch = content.match(/##\s+🎯\s+TUJUAN[^\n]*\n+([^#\n]+)/m);
        if (goalMatch) {
          summary = goalMatch[1].trim().slice(0, 150) + '...';
        } else {
          summary = `Panduan komprehensif untuk ${id.replace(/-/g, ' ')}.`;
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

      this.isLoaded = true;
      console.log(`[AgentSkillService] Berhasil memuat ${this.skills.size} skill profesional.`);
    } catch (err) {
      console.error('[AgentSkillService] Gagal memuat direktori skills:', err);
    }
  }

  /**
   * Menghasilkan katalog ringkas dalam format Markdown yang super hemat token (~150 token)
   */
  getCompactCatalog() {
    if (!this.isLoaded || this.skills.size === 0) {
      this.loadSkills();
    }

    let markdown = "### 📚 ON-DEMAND SKILL CATALOG (Gunakan `<read_skill name=\"...\" />` atau `<search_skill query=\"...\" />`)\n";
    markdown += "| Skill Identifier | Kategori | Kata Kunci Relevan |\n";
    markdown += "|---|---|---|\n";

    for (const [id, meta] of this.skills.entries()) {
      const kwPreview = meta.keywords.slice(0, 5).join(', ');
      markdown += `| \`${id}\` | ${meta.category} | ${kwPreview} |\n`;
    }

    markdown += "\n> **PENTING**: Agen memiliki memori token hemat. Jangan menebak format! Panggil `<read_skill name=\"...\" />` saat menangani tugas terkait untuk melihat arsitektur & kode template yang sudah 100% teruji.";
    return markdown;
  }

  /**
   * Mencari skill berdasarkan query pengguna atau intent agen
   */
  searchSkills(query = '') {
    if (!this.isLoaded) this.loadSkills();
    const q = query.toLowerCase().trim();
    if (!q) return Array.from(this.skills.values());

    const terms = q.split(/\s+/).filter(Boolean);
    const scored = [];

    for (const [id, meta] of this.skills.entries()) {
      let score = 0;
      const idLower = id.toLowerCase();
      const titleLower = meta.title.toLowerCase();
      const catLower = meta.category.toLowerCase();

      for (const term of terms) {
        if (idLower.includes(term)) score += 10;
        if (titleLower.includes(term)) score += 6;
        if (catLower.includes(term)) score += 4;
        if (meta.keywords.some(k => k.includes(term))) score += 8;
        if (meta.content.toLowerCase().includes(term)) score += 1;
      }

      if (score > 0) {
        scored.push({ meta, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.meta);
  }

  /**
   * Membaca isi lengkap dokumen skill berdasarkan ID atau nama
   */
  readSkill(skillName = '') {
    if (!this.isLoaded) this.loadSkills();
    const target = skillName.trim().toLowerCase().replace(/\.md$/, '');

    // 1. Direct match by ID
    if (this.skills.has(target)) {
      const s = this.skills.get(target);
      return {
        found: true,
        id: s.id,
        title: s.title,
        content: s.content
      };
    }

    // 2. Partial match
    for (const [id, s] of this.skills.entries()) {
      if (id.includes(target) || target.includes(id)) {
        return {
          found: true,
          id: s.id,
          title: s.title,
          content: s.content
        };
      }
    }

    // 3. Search closest
    const results = this.searchSkills(target);
    if (results.length > 0) {
      const best = results[0];
      return {
        found: true,
        id: best.id,
        title: best.title,
        content: best.content,
        note: `Skill '${skillName}' dicocokkan otomatis ke '${best.id}'.`
      };
    }

    const available = Array.from(this.skills.keys()).map(k => `\`${k}\``).join(', ');
    return {
      found: false,
      error: `Skill '${skillName}' tidak ditemukan. Skill tersedia: ${available}`
    };
  }

  /**
   * Menganalisis pesan pengguna dan menyarankan skill terbaik jika ada kecocokan tinggi
   */
  suggestSkill(userMessage = '') {
    const results = this.searchSkills(userMessage);
    if (results.length > 0) {
      return results[0];
    }
    return null;
  }
}

export const agentSkillService = new AgentSkillService();
export default agentSkillService;
