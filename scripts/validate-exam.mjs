// Validates src/content/exam/*.json against EXAM_SCHEMA.md.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const dir = join(root, 'exam');
const topicIds = new Set(readdirSync(join(root, 'topics')).map((f) => f.replace(/\.json$/, '')));
const COMMANDS = new Set(['Calculate', 'State', 'Identify', 'Outline', 'Describe', 'Compare', 'Compare and contrast', 'Distinguish', 'Explain', 'Suggest', 'Evaluate', 'Discuss', 'Deduce', 'Predict', 'Determine', 'Estimate', 'Analyse', 'Annotate', 'Sketch', 'Define', 'List', 'Label', 'Draw', 'Show', 'Comment', 'Construct', 'Design', 'Measure']);
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const errors = [];
const ids = new Set();
let n = 0, marks = 0;

if (!existsSync(dir)) { console.log('OK — no exam files yet'); process.exit(0); }
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  let items;
  const err = (m) => errors.push(`${file}: ${m}`);
  try { items = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch (e) { err(`invalid JSON: ${e.message}`); continue; }
  if (!Array.isArray(items)) { err('must be an array'); continue; }
  for (const it of items) {
    n++;
    const e = (m) => err(`${it.id ?? '?'}: ${m}`);
    if (!isStr(it.id) || ids.has(it.id)) e('bad/duplicate id');
    ids.add(it.id);
    if (!/^[ABCD]$/.test(it.theme) || file !== `${it.theme}.json`) e('theme must match file');
    if (!Array.isArray(it.topics) || !it.topics.length) e('topics required');
    for (const t of it.topics ?? []) if (topicIds.size && !topicIds.has(t)) e(`unknown topic ${t}`);
    if (!['1B', '2A', '2B'].includes(it.paper)) e('paper must be 1B, 2A or 2B');
    if (!['SL', 'HL'].includes(it.level)) e('level must be SL or HL');
    if (!isStr(it.title) || !isStr(it.stem)) e('title and stem required');
    if (it.paper === '1B' && !it.data) e('1B items need data');
    if (it.data) {
      const d = it.data;
      if (!Array.isArray(d.columns) || !Array.isArray(d.rows) || !d.rows.length) e('data needs columns and rows');
      else for (const r of d.rows) if (!Array.isArray(r) || r.length !== d.columns.length) e('row length must match columns');
    }
    if (!Array.isArray(it.parts) || it.parts.length < 1) { e('parts required'); continue; }
    it.parts.forEach((p, i) => {
      const pe = (m) => e(`part ${p.label ?? i}: ${m}`);
      if (p.label !== String.fromCharCode(97 + i)) pe('labels must be a, b, c...');
      if (!COMMANDS.has(p.command)) pe(`unknown command term ${p.command}`);
      if (!isStr(p.prompt)) pe('prompt required');
      if (!Number.isInteger(p.marks) || p.marks < 1 || p.marks > 8) pe('marks must be 1–8');
      if (!Array.isArray(p.markscheme) || p.markscheme.length < p.marks || !p.markscheme.every(isStr)) pe('markscheme needs ≥ marks points');
      if (p.numeric) {
        if (typeof p.numeric.value !== 'number' || typeof p.numeric.tolerance !== 'number' || typeof p.numeric.unit !== 'string') pe('numeric needs value, tolerance, unit');
      }
      marks += p.marks ?? 0;
    });
  }
}
if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`OK — ${n} exam items, ${marks} marks`);
