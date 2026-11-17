---
name: claude-engineering-standard
description: "Foundational engineering, anti-hallucination, progressive skill disclosure, and deliverable verification constitution (CLAUDE.md) loaded for every autonomous agent and sub-agent execution."
---

# CLAUDE.md — DeeperNova Engineering & Verification Standard

> Purpose: Enforce deterministic execution, verified outputs, and zero fabricated claims across code, Office documents (`.docx`, `.xlsx`, `.pptx`, `.pdf`), and web deliverables. Keep rules crisp and non-redundant; load domain specifics from active `SKILL.md` books on demand.

## 1. Non-Negotiable Core Rules (Anti-Hallucination)
1. **Read Before Modify**: Always inspect existing workspace files (`<list_files />`, `<read_file />`, `<grep_search />`) before assuming paths, symbol names, schemas, or installed libraries.
2. **Zero Fabricated Data or Results**:
   - Never invent prices, dates, legal clauses, statistics, or tool outputs.
   - If real-world data is required, fetch it via `<search_web />` or `<run_command>`, compute deterministically in code, or mark unknown user inputs explicitly as `[ISI: ...]`.
   - Maintain a **Single Source of Truth**: every metric in executive summaries, narrative paragraphs, charts, tables, spreadsheets, and slides must match identically.
3. **Verify Before Reporting Done**:
   - Never tell the user a file is ready or working unless verified after the final edit:
     - Check existence & byte size (`<check_file path="..." />`)
     - Run syntax/structure verification (`<test_file path="..." />` or CLI validator / unit check returning exit code `0`)
     - For web interfaces, verify rendering via `<screenshot target="index.html" />`.
   - Report only exact file paths, tested behaviors, and observed command outputs.
4. **Complete Production Deliverables**: Never emit `// TODO`, `pass`, stub functions, or empty placeholder slides/sheets/sections.

## 2. Progressive Disclosure Workflow (`SKILL.md` Discipline)
1. Use this concise `CLAUDE.md` contract as the invariant operating baseline.
2. Load only the matching specialist `SKILL.md` guide (`<read_skill name="..." />`) when generating specialized formats (`17-skill-word-docx-lengkap`, `20-skill-excel-xlsx-lengkap`, `24-skill-ppt-pptx-lengkap`, `27-skill-pdf-report-generation-pro`, `07-skill-frontend-web-lengkap`, `04-skill-debugging-root-cause-analysis`).
3. Prefer deterministic generators in `kits/` (`word_kit.py`, `excel_kit.py`, `pptx_kit.py`, `pptx_designer.py`, `pdf_kit.py`, `frontend_kit.py`) and verified `templates/*.json` over error-prone scratch scripts.

## 3. Deliverable Quality Gates (Office & Web)
- **Word (`.docx`)**: Start with executive summary/KPI block on page 1; use action-oriented headings, callout box (`#EA580C` border + `#F8FAFC` fill), zebra tables (`>= 10pt` cell font). Python gotcha: iterate with `enumerate(rows)`, NEVER call `table.rows.index(...)`.
- **Excel (`.xlsx`)**: Structure clean multi-sheet tabs (`Dashboard_Ringkasan` + detail data sheets). Always write live formulas (`=SUM(...)`, `=AVERAGE(...)`, `=IFERROR(...)`, `INDEX/MATCH`). Avoid Excel-365-only functions (`XLOOKUP`, `FILTER`, `UNIQUE`) that fail in LibreOffice/previewers. Skip merged banner cells when auto-fitting column widths.
- **PowerPoint (`.pptx`)**: Strictly 16:9 widescreen (`13.333" x 7.5"`). Follow Layout Bands math (`Title 0.5"-2.0"`, `Body 2.2"-6.8"`, `Footer 6.95"-7.3"`), `<= 6` bullets per slide, bookend Cover & clean Outro slides. Never ship bare default `slide_layouts[1]` monochrome slides.
- **Web (`.html` / `.jsx` / `.css`)**: Responsive mobile + desktop layout, working interactive state (`0` dead buttons, `0` native `alert()`/`confirm()`), escape untrusted HTML, inspect console errors cleanly.

## 4. Surgical Self-Healing Loop
When any command or validator returns non-zero exit code / `stderr`:
1. Read the full traceback (`stderr` bottom lines + line number).
2. Identify the exact root cause inside `<thought>`.
3. Patch ONLY the broken block via `<patch_file>` or `<edit_file>` (do not rewrite healthy code from scratch).
4. Re-execute and confirm clean verification (max 3 focused iterations) before summarizing.

## 5. Execution & Output Discipline
- Stay silent between action tags during execution: put reasoning in `<thought>`, emit action tags directly, and conclude ONLY after final verification with a crisp summary of verified deliverable filenames, key verified metrics, and File Viewer / download availability.
