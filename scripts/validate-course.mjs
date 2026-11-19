// Validates course content against COURSE_SCHEMA.md.
// Usage: node scripts/validate-course.mjs [courseId ...]   (no args = every course)
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'courses');
const COMMANDS = new Set(['Analyse', 'Annotate', 'Apply', 'Calculate', 'Classify', 'Comment', 'Compare', 'Compare and contrast', 'Construct', 'Contrast', 'Deduce', 'Define', 'Demonstrate', 'Derive', 'Describe', 'Design', 'Determine', 'Differentiate', 'Discuss', 'Distinguish', 'Draw', 'Estimate', 'Evaluate', 'Examine', 'Explain', 'Explore', 'Find', 'Formulate', 'Hence', 'Identify', 'Integrate', 'Interpret', 'Investigate', 'Justify', 'Label', 'List', 'Measure', 'Outline', 'Plot', 'Predict', 'Prove', 'Show', 'Show that', 'Sketch', 'Solve', 'State', 'Suggest', 'Summarize', 'To what extent', 'Trace', 'Translate', 'Verify', 'Write', 'Read', 'Respond', 'Recommend', 'Present']);

const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const all = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort();
const only = process.argv.slice(2);
const targets = only.length ? only : all;

// Global id registries (across every course, so collisions are caught even when validating one).
const seen = { topic: new Map(), lesson: new Map(), question: new Map(), term: new Map(), item: new Map() };
const errorsByCourse = new Map();
const summary = [];

function loadJson(path, err) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch (e) { err(`invalid JSON in ${path.split(/[\\/]/).slice(-2).join('/')}: ${e.message}`); return null; }
}
function claim(kind, id, course, err) {
  if (!isStr(id)) { err(`missing ${kind} id`); return; }
  const prev = seen[kind].get(id);
  if (prev) err(`duplicate ${kind} id "${id}" (also in ${prev})`);
  else seen[kind].set(id, course);
}

function validateCourse(cid) {
  const errors = [];
  const err = (m) => errors.push(m);
  const dir = join(ROOT, cid);
  const stats = { topics: 0, lessons: 0, questions: 0, terms: 0, items: 0, types: {} };
  if (!existsSync(join(dir, 'course.json'))) { err('missing course.json'); return { errors, stats }; }
  const c = loadJson(join(dir, 'course.json'), err);
  if (!c) return { errors, stats };

  // ---- course.json ----
  if (c.id !== cid) err(`course.id "${c.id}" must equal folder "${cid}"`);
  for (const k of ['name', 'short', 'group', 'icon', 'blurb', 'syllabus']) if (!isStr(c[k])) err(`course.${k} missing`);
  if (isStr(c.short) && c.short.length > 6) err('course.short must be ≤ 6 chars');
  const levels = c.levels;
  if (!Array.isArray(levels) || !levels.length || !levels.every((l) => l === 'SL' || l === 'HL')) err('course.levels must be ["SL"] or ["SL","HL"]');
  const unitIds = new Set();
  if (!Array.isArray(c.units) || c.units.length < 2 || c.units.length > 10) err('course.units must have 2–10 units');
  for (const u of c.units ?? []) {
    if (!isStr(u.id) || !isStr(u.title)) err(`unit needs id and title: ${JSON.stringify(u).slice(0, 60)}`);
    if (unitIds.has(u.id)) err(`duplicate unit id ${u.id}`);
    unitIds.add(u.id);
  }
  if (!c.papers || typeof c.papers !== 'object' || !Object.keys(c.papers).length) err('course.papers required');
  if (c.mcqExam !== null && c.mcqExam !== undefined) {
    const m = c.mcqExam;
    if (!isStr(m.label) || !Number.isInteger(m.secondsPerQuestion)) err('mcqExam needs label and secondsPerQuestion');
    for (const l of levels ?? []) if (!Number.isInteger(m[l])) err(`mcqExam.${l} question count missing`);
  } else if (c.mcqExam === undefined) err('course.mcqExam must be an object or null');

  for (const l of levels ?? []) {
    const a = c.assessment?.[l];
    if (!a || !Array.isArray(a.components) || !a.components.length || !a.groups) { err(`assessment.${l} missing`); continue; }
    const used = new Set();
    for (const comp of a.components) {
      if (!isStr(comp.id) || !isStr(comp.name) || !(comp.max > 0) || !a.groups[comp.group]) err(`assessment.${l} bad component ${JSON.stringify(comp).slice(0, 80)}`);
      used.add(comp.group);
    }
    const w = Object.entries(a.groups).reduce((s, [gid, g]) => {
      if (!isStr(g.name) || !(g.weight > 0)) err(`assessment.${l}.groups.${gid} needs name and weight`);
      if (!used.has(gid)) err(`assessment.${l}.groups.${gid} has no components`);
      return s + (g.weight || 0);
    }, 0);
    if (Math.abs(w - 100) > 0.01) err(`assessment.${l} group weights sum to ${w}, not 100`);

    const b = c.boundaries?.[l];
    if (!Array.isArray(b) || !b.length) err(`boundaries.${l} required`);
    for (const row of b ?? []) {
      if (!isStr(row.session) || !Array.isArray(row.min) || row.min.length !== 7) { err(`boundaries.${l} row needs session and 7 mins`); continue; }
      if (row.min[0] !== 0) err(`boundaries.${l} ${row.session}: grade 1 min must be 0`);
      for (let i = 1; i < 7; i++) if (!(row.min[i] > row.min[i - 1]) || row.min[i] > 100) err(`boundaries.${l} ${row.session} ${row.tz ?? ''}: mins must increase and be ≤ 100`);
    }
    for (const s of c.stats?.[l] ?? []) if (!isStr(s.session) || !(s.candidates > 0) || typeof s.mean !== 'number') err(`stats.${l} row needs session, candidates, mean`);
  }
  const ia = c.ia;
  if (!ia || !isStr(ia.name) || !(ia.max > 0) || !(ia.weight > 0) || !isStr(ia.limit) || !Array.isArray(ia.criteria) || !ia.criteria.length) err('course.ia incomplete');
  else {
    const sum = ia.criteria.reduce((s, cr) => s + (cr.max || 0), 0);
    if (sum !== ia.max) err(`ia criteria maxima sum to ${sum}, ia.max is ${ia.max}`);
    for (const cr of ia.criteria) if (!isStr(cr.id) || !isStr(cr.name) || !(cr.max > 0) || !Array.isArray(cr.look) || cr.look.length < 2) err(`ia criterion ${cr.id} incomplete (needs id, name, max, ≥2 look)`);
    if (!Array.isArray(ia.checklist) || ia.checklist.length < 5) err('ia.checklist needs ≥ 5 items');
  }
  if (!Array.isArray(c.examTips) || c.examTips.length < 3) err('examTips needs ≥ 3');
  if (!Array.isArray(c.sources) || !c.sources.length || !c.sources.every((s) => isStr(s.label) && /^https?:\/\//.test(s.url ?? ''))) err('sources need label + url');

  // ---- topics ----
  const topicIds = new Set();
  const termIds = new Set();
  const tdir = join(dir, 'topics');
  const tfiles = existsSync(tdir) ? readdirSync(tdir).filter((f) => f.endsWith('.json')) : [];
  if (tfiles.length < 3) err(`only ${tfiles.length} topic files`);
  const topics = [];
  for (const f of tfiles) {
    const t = loadJson(join(tdir, f), err);
    if (t) topics.push([f, t]);
  }
  for (const [f, t] of topics) for (const k of t.keyterms ?? []) termIds.add(k.id);
  const unitsUsed = new Set();
  for (const [f, t] of topics) {
    const te = (m) => err(`${f}: ${m}`);
    stats.topics++;
    if (`${t.id}.json` !== f) te(`id "${t.id}" must match filename`);
    if (cid !== 'biology' && !String(t.id).startsWith(`${cid}-`)) te(`topic id must start with "${cid}-"`);
    claim('topic', t.id, cid, te);
    topicIds.add(t.id);
    if (!isStr(t.code) || !isStr(t.title) || !isStr(t.summary)) te('needs code, title, summary');
    if (!unitIds.has(t.unit)) te(`unit "${t.unit}" not in course.units`);
    unitsUsed.add(t.unit);
    if (!['SL', 'HL'].includes(t.level)) te('level must be SL or HL');
    if (t.level === 'HL' && !levels?.includes('HL')) te('HL topic in an SL-only course');
    if (!Array.isArray(t.keyterms) || t.keyterms.length < 6) te('needs ≥ 6 keyterms');
    for (const k of t.keyterms ?? []) {
      if (!isStr(k.term) || !isStr(k.definition)) te(`bad keyterm ${k.id}`);
      if (cid !== 'biology' && !String(k.id).toLowerCase().startsWith(String(t.id).toLowerCase())) te(`keyterm id ${k.id} must start with topic id`);
      claim('term', k.id, cid, te);
      stats.terms++;
    }
    if (!Array.isArray(t.lessons) || !t.lessons.length) te('needs lessons');
    for (const l of t.lessons ?? []) {
      stats.lessons++;
      claim('lesson', l.id, cid, te);
      if (!String(l.id).startsWith(`${t.id}-`)) te(`lesson id ${l.id} must start with topic id`);
      if (!isStr(l.title)) te(`${l.id}: missing title`);
      if (l.hl && !levels?.includes('HL')) te(`${l.id}: hl lesson in SL-only course`);
      const qs = l.questions ?? [];
      if (qs.length < 8 || qs.length > 12) te(`${l.id}: ${qs.length} questions (need 8–12)`);
      for (const q of qs) {
        stats.questions++;
        const qe = (m) => te(`${q.id ?? l.id + '?'}: ${m}`);
        claim('question', q.id, cid, qe);
        if (!String(q.id).startsWith(`${l.id}-q`)) qe('question id must be <lessonId>-qNN');
        stats.types[q.type] = (stats.types[q.type] ?? 0) + 1;
        if (!isStr(q.explanation)) qe('missing explanation');
        if (q.terms && !Array.isArray(q.terms)) qe('terms must be an array');
        for (const tid of q.terms ?? []) if (!termIds.has(tid)) qe(`unknown term ${tid}`);
        switch (q.type) {
          case 'mcq':
            if (!isStr(q.prompt)) qe('missing prompt');
            if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4 || !q.options.every(isStr)) qe('options must be 3–4 strings');
            else if (new Set(q.options).size !== q.options.length) qe('duplicate options');
            if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) qe('answer index out of range');
            break;
          case 'tf':
            if (!isStr(q.statement)) qe('missing statement');
            if (typeof q.answer !== 'boolean') qe('answer must be boolean');
            break;
          case 'fill':
            if (!isStr(q.text) || q.text.split('___').length !== 2) qe('text needs exactly one ___');
            if (!isStr(q.answer)) qe('missing answer');
            if (!Array.isArray(q.bank) || q.bank.length < 3 || q.bank.length > 5) qe('bank must have 3–5 entries');
            else if (!q.bank.includes(q.answer)) qe('bank must include answer');
            else if (new Set(q.bank).size !== q.bank.length) qe('duplicate bank entries');
            break;
          case 'match': {
            const p = q.pairs;
            if (!Array.isArray(p) || p.length < 3 || p.length > 5) { qe('pairs must have 3–5 entries'); break; }
            if (!p.every((x) => isStr(x.left) && isStr(x.right))) qe('pairs need left/right');
            if (new Set(p.map((x) => x.left)).size !== p.length) qe('duplicate left');
            if (new Set(p.map((x) => x.right)).size !== p.length) qe('duplicate right');
            break;
          }
          case 'order':
            if (!isStr(q.prompt)) qe('missing prompt');
            if (!Array.isArray(q.items) || q.items.length < 3 || q.items.length > 6 || !q.items.every(isStr)) qe('items must be 3–6 strings');
            else if (new Set(q.items).size !== q.items.length) qe('duplicate items');
            break;
          default:
            qe(`unknown type ${q.type}`);
        }
      }
    }
  }
  for (const u of unitIds) if (topics.length && !unitsUsed.has(u)) err(`unit ${u} has no topics`);

  // ---- exam items ----
  const edir = join(dir, 'exam');
  const efiles = existsSync(edir) ? readdirSync(edir).filter((f) => f.endsWith('.json')) : [];
  for (const f of efiles) {
    const items = loadJson(join(edir, f), err);
    if (!items) continue;
    if (!Array.isArray(items)) { err(`exam/${f} must be an array`); continue; }
    for (const it of items) {
      stats.items++;
      const e = (m) => err(`exam/${f} ${it.id ?? '?'}: ${m}`);
      claim('item', it.id, cid, e);
      if (!unitIds.has(it.unit)) e(`unit ${it.unit} not in course.units`);
      if (!Array.isArray(it.topics) || !it.topics.length) e('topics required');
      for (const t of it.topics ?? []) if (!topicIds.has(t)) e(`unknown topic ${t}`);
      if (!c.papers?.[it.paper]) e(`paper "${it.paper}" not in course.papers`);
      if (!levels?.includes(it.level)) e(`level ${it.level} not offered`);
      if (!isStr(it.title) || !isStr(it.stem)) e('title and stem required');
      if (it.data) {
        const d = it.data;
        if (!Array.isArray(d.columns) || !Array.isArray(d.rows) || !d.rows.length) e('data needs columns and rows');
        else for (const r of d.rows) if (!Array.isArray(r) || r.length !== d.columns.length) e('data row length must match columns');
      }
      if (!Array.isArray(it.parts) || !it.parts.length) { e('parts required'); continue; }
      it.parts.forEach((p, i) => {
        const pe = (m) => e(`part ${p.label ?? i}: ${m}`);
        if (p.label !== String.fromCharCode(97 + i)) pe('labels must be a, b, c…');
        if (!COMMANDS.has(p.command)) pe(`unknown command term "${p.command}"`);
        if (!isStr(p.prompt)) pe('prompt required');
        if (!Number.isInteger(p.marks) || p.marks < 1 || p.marks > 10) pe('marks must be 1–10');
        if (!Array.isArray(p.markscheme) || p.markscheme.length < Math.min(p.marks, 8) || !p.markscheme.every(isStr)) pe('markscheme needs ≥ marks points');
        if (p.numeric && (typeof p.numeric.value !== 'number' || typeof p.numeric.tolerance !== 'number' || typeof p.numeric.unit !== 'string')) pe('numeric needs value, tolerance, unit');
      });
    }
  }
  if (stats.items < 6) err(`only ${stats.items} exam items (need ≥ 6)`);
  return { errors, stats };
}

// Validate every course so the cross-course id registry is complete, report only targets.
let failed = 0;
for (const cid of all) {
  const { errors, stats } = validateCourse(cid);
  if (!targets.includes(cid)) continue;
  if (errors.length) {
    failed++;
    console.error(`✕ ${cid}: ${errors.length} error(s)\n  ${errors.slice(0, 60).join('\n  ')}${errors.length > 60 ? `\n  …and ${errors.length - 60} more` : ''}`);
  } else {
    summary.push(`OK ${cid}: ${stats.topics} topics, ${stats.lessons} lessons, ${stats.questions} questions, ${stats.terms} keyterms, ${stats.items} exam items ${JSON.stringify(stats.types)}`);
  }
}
for (const t of targets) if (!all.includes(t)) { failed++; console.error(`✕ ${t}: no such course folder`); }
if (summary.length) console.log(summary.join('\n'));
if (failed) process.exit(1);
console.log('OK');
