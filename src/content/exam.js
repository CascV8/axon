// Structured exam-style items (Paper 1B / Paper 2), see EXAM_SCHEMA.md.
import { COMMAND_TERMS } from './commandTerms.js';

const modules = import.meta.glob('./exam/*.json', { eager: true, import: 'default' });

export const EXAM_ITEMS = Object.values(modules).flat().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
export const examItemById = new Map(EXAM_ITEMS.map((it) => [it.id, it]));
export const PAPER_LABEL = { '1B': 'Paper 1B · data-based', '2A': 'Paper 2 · Section A', '2B': 'Paper 2 · Section B' };
export const commandDef = new Map(COMMAND_TERMS.map((c) => [c.term, c.definition]));

export function itemMarks(it) {
  return it.parts.reduce((s, p) => s + p.marks, 0);
}

const STOP = new Set('the a an of to and or in on is are be by for with as at from that this which it its into than then their there these those was were has have not no also eg ie owtte allow accept reject do max per'.split(' '));
/** Words from a marking point used for the approximate keyword hint. */
export function keywords(point) {
  return [...new Set(
    point.toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .split(/[^a-z0-9₀-₉²³⁻+%.-]+/)
      .map((w) => w.replace(/^[.-]+|[.-]+$/g, ''))
      .filter((w) => w.length > 3 && !STOP.has(w)),
  )];
}
/** Rough check whether a student's answer mentions a marking point (≥ half its key words). */
export function pointHit(answer, point) {
  const a = ` ${answer.toLowerCase()} `;
  const ks = keywords(point);
  if (!ks.length) return false;
  const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
  const hits = ks.filter((k) => a.includes(stem(k))).length;
  return hits / ks.length >= 0.5;
}

/** Parse a numeric answer: accepts "−50", "-50 %", "50% decrease". */
export function parseNumber(str) {
  if (str == null) return NaN;
  const s = String(str).replace(/−/g, '-').replace(/,/g, '.').replace(/\s+/g, ' ');
  const m = s.match(/-?\d+(\.\d+)?(e-?\d+)?/i);
  if (!m) return NaN;
  let v = parseFloat(m[0]);
  if (/decrease|fall|drop|reduc/i.test(s) && v > 0) v = -v;
  return v;
}
export function numericCorrect(input, spec) {
  const v = parseNumber(input);
  if (Number.isNaN(v)) return false;
  // Accept magnitude for percentage changes written as "50 % decrease" vs -50, handled above.
  return Math.abs(v - spec.value) <= spec.tolerance + 1e-9;
}
