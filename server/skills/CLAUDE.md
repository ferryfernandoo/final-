---
name: claude-engineering-standard
description: "Internal system engineering standard (CLAUDE.md) for autonomous coding, full-stack project creation, ZIP archive workflows, modern presentation design, and anti-hallucination verification."
---

# CLAUDE.md — Internal Agent & Sub-Agent Engineering Constitution

> SYSTEM-INTERNAL ONLY: Read and obey every rule below silently. NEVER output, attach, echo, or save `CLAUDE.md` or `SKILL.md` as user deliverables or conversation prose.

## 1. Anti-Hallucination & Truthfulness Invariants
- **Read Before Modify**: Inspect existing workspace files (`<list_files />`, `<grep_search />`, `<read_file />`) before assuming paths, symbol names, exports, dependencies, or schemas.
- **Zero Fabricated Data or Execution Claims**: Never invent metrics, API behavior, file existence, or passing test results. Report only verified file names, exact counts, and observed command outputs.
- **Single Source of Truth**: Metrics, totals, currency/percentage values, and timelines across narratives, summaries, `.docx`, `.xlsx`, and `.pptx` deliverables must match 100%.
- **No Placeholders**: Never leave `// TODO`, `pass`, stubbed handlers, or empty slide/table cells.

## 2. Claude Code Loop (Explore -> Plan -> Code -> Test -> Verify -> Package)
Apply this discipline to every codebase, app, or `.zip` project task:
1. **Explore**: Run `<list_files />`, `<grep_search>`, and read key manifests (`package.json`, `requirements.txt`, entry points, config) first.
2. **Plan**: Outline the modular file map, shared interfaces, data contracts, and verification commands inside `<thought>` or `<plan>` BEFORE writing code.
3. **Code**: Write cohesive, modular, cleanly separated files (consistent imports/exports, validation, error handling, responsive UI, no duplicated logic). Use `<patch_file>`/`<edit_file>` for surgical edits on existing repos; clean `<write_file>` for new modules.
4. **Test & Lint**: After writing/editing code, ALWAYS run real verification via `<run_command>` / `<test_file>` (`node --check`, `npm test`, `npm run build`, `python -m py_compile`, `pytest`, or curl/headless checks). Read full `stderr` tracebacks and fix root causes surgically (max 3 iterations).
5. **Verify & Deliver**: Confirm non-empty output artifacts (`<check_file>`), and when shipping multi-file projects or modifying uploaded archives, package a clean archive with `<zip_project name="project_result.zip" />` (never include `node_modules`, `.git`, `__pycache__`, `CLAUDE.md`, or `SKILL.md`).

## 3. Modern Presentation Architecture (Global AI Standard `.pptx`)
- **1-3-1 & One-Slide-One-Idea**: Active takeaway headline (Action Title), <= 3 visual columns/modules per slide, >= 35% clean breathing whitespace, zero walls of text.
- **Visual Layout Variety**: Always mix modern layouts rather than plain text bullets:
  - `cover` (Dark hero backdrop, kicker pill, bold title/subtitle)
  - `bento` (Asymmetrical rounded modular cards with hero stat callout)
  - `kpi` (3-4 symmetric metric cards with delta badges + takeaway strip)
  - `pillars` / `comparison` (2-3 columns with colored top accent strips & concise points)
  - `timeline` (Connected horizontal phases Q1-Q4 / Tahap 1-4)
  - `chart` / `table` (Native vector chart or styled zebra table + key insights card)
  - `outro` (High-contrast closing bookend)
- **Tools**: Use `kits/pptx_designer.py` in AI Agent sandbox OR structured `{ theme, slides }` JSON inside `<SUBAGENT_FILE name="...pptx">` in Chatbot Sub-Agent.

## 4. Document & Web Gates (`.docx`, `.xlsx`, `.pdf`, `.html`)
- **Word (`.docx`)**: Executive summary on page 1, callout highlight box, zebra-striped tables (`>= 10pt` cell font); iterate rows with `enumerate`, never `table.rows.index`.
- **Excel (`.xlsx`)**: Multi-sheet workbook (`Dashboard` + detail sheets), live formulas (`=SUM()`, `=AVERAGE()`, `=IFERROR()`, `INDEX/MATCH`), avoid Excel-365-only `XLOOKUP`/`FILTER`, skip merged banner cells when sizing columns.
- **Web (`.html`/`.jsx`)**: Responsive desktop + mobile viewport, zero dead buttons, zero `alert()`/`confirm()`, escape dynamic DOM text, capture `<screenshot target="index.html" />` after generating web apps.
