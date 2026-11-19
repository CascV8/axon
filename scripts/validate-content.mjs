// Validates every src/content/topics/*.json against CONTENT_SCHEMA.md.
// Usage: node scripts/validate-content.mjs [TOPIC_ID ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'topics');
const only = process.argv.slice(2);
const errors = [];
const termIds = new Map();
const qIds = new Set();
const lessonIds = new Set();
let nQ = 0, nT = 0, nL = 0;
const typeCount = {};

const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  let topic;
  const err = (m) => errors.push(`${file}: ${m}`);
  try { topic = JSON.parse(readFileSync(join(dir, file), 'utf8')); }
  catch (e) { err(`invalid JSON: ${e.message}`); continue; }

  if (topic.id + '.json' !== file) err(`id "${topic.id}" does not match filename`);
  if (!/^[ABCD]$/.test(topic.theme) || topic.id?.[0] !== topic.theme) err('bad theme');
  if (!isStr(topic.title)) err('missing title');
  if (!['SL', 'HL'].includes(topic.level)) err('level must be SL or HL');
  if (!isStr(topic.summary)) err('missing summary');
  if (!Array.isArray(topic.keyterms) || topic.keyterms.length < 6) err('need ≥ 6 keyterms');
  const localTerms = new Set();
  for (const k of topic.keyterms ?? []) {
    if (!isStr(k.id) || !isStr(k.term) || !isStr(k.definition)) { err(`bad keyterm ${JSON.stringify(k).slice(0, 60)}`); continue; }
    if (termIds.has(k.id)) err(`duplicate keyterm id ${k.id}`);
    termIds.set(k.id, file); localTerms.add(k.id); nT++;
  }
  if (!Array.isArray(topic.lessons) || topic.lessons.length < 1) err('need ≥ 1 lesson');
  for (const l of topic.lessons ?? []) {
    nL++;
    if (!isStr(l.id) || lessonIds.has(l.id)) err(`bad/duplicate lesson id ${l.id}`);
    lessonIds.add(l.id);
    if (!isStr(l.title)) err(`${l.id}: missing title`);
    const qs = l.questions ?? [];
    if (qs.length < 8 || qs.length > 12) err(`${l.id}: has ${qs.length} questions (need 8–12)`);
    for (const q of qs) {
      nQ++;
      const qe = (m) => err(`${q.id ?? l.id + '?'}: ${m}`);
      if (!isStr(q.id) || qIds.has(q.id)) qe('bad/duplicate question id');
      qIds.add(q.id);
      typeCount[q.type] = (typeCount[q.type] ?? 0) + 1;
      if (!isStr(q.explanation)) qe('missing explanation');
      if (q.terms && !Array.isArray(q.terms)) qe('terms must be an array');
      for (const t of q.terms ?? []) if (!localTerms.has(t) && !termIds.has(t)) qe(`unknown term ${t}`);
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

const shown = only.length ? errors.filter((e) => only.some((id) => e.startsWith(id + '.json'))) : errors;
if (shown.length) {
  console.error(shown.join('\n'));
  console.error(`\n${shown.length} error(s)`);
  process.exit(1);
}
console.log(`OK — ${files.length} topics, ${nL} lessons, ${nQ} questions, ${nT} keyterms`, typeCount);
