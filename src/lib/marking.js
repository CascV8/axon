// Helpers for self-marking structured exam-style items.
import { COMMAND_TERMS } from '../content/commandTerms.js';

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
      .split(/[^\p{L}\p{N}%.+-]+/u)
      .map((w) => w.replace(/^[.-]+|[.-]+$/g, ''))
      .filter((w) => (/[㐀-鿿]/.test(w) ? w.length >= 2 : w.length > 3) && !STOP.has(w)),
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

/** Parse a numeric answer: accepts "−50", "-50 %", "50% decrease", "1,5". */
export function parseNumber(str) {
  if (str == null) return NaN;
  const s = String(str).replace(/−/g, '-').replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/,/g, '.').replace(/\s+/g, ' ');
  const m = s.match(/-?\d+(\.\d+)?(e-?\d+)?/i);
  if (!m) return NaN;
  let v = parseFloat(m[0]);
  if (/decrease|fall|drop|reduc/i.test(s) && v > 0) v = -v;
  return v;
}
export function numericCorrect(input, spec) {
  const v = parseNumber(input);
  if (Number.isNaN(v)) return false;
  return Math.abs(v - spec.value) <= spec.tolerance + 1e-9;
}
