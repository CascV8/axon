// Builds question lists for practice modes from content + progress.
import { shuffle, reviewPriority } from './core.js';
import { visibleTopics, questionById } from '../content/index.js';
import { COMMAND_TERMS } from '../content/commandTerms.js';

const BANK_TYPES_FOR_REVIEW = new Set(['mcq', 'tf', 'fill']);

/** Keyterm flashcard-style question generated from the glossary. */
export function termQuestion(term, pool, variant) {
  const others = shuffle(pool.filter((t) => t.id !== term.id && t.term !== term.term)).slice(0, 3);
  if (others.length < 2) return null;
  const base = {
    id: `syn-${term.id}-${variant}`,
    synthetic: true,
    terms: [term.id],
    explanation: `${term.term}: ${term.definition}`,
  };
  if (variant === 'def') {
    const opts = shuffle([term, ...others]);
    return { ...base, type: 'mcq', prompt: `Which keyterm is defined as: “${term.definition}”`, options: opts.map((t) => t.term), answer: opts.indexOf(term) };
  }
  if (variant === 'term') {
    const opts = shuffle([term, ...others]);
    return { ...base, type: 'mcq', prompt: `What is the best definition of ${term.term}?`, options: opts.map((t) => t.definition), answer: opts.indexOf(term) };
  }
  // fill
  const bank = shuffle([term, ...others]).map((t) => t.term);
  return { ...base, type: 'fill', text: `___ — ${term.definition}`, answer: term.term, bank };
}

/**
 * Smart review: due keyterms first, then the weakest seen ones, then new terms from
 * topics already studied. Mixes real bank questions with generated ones.
 */
export function buildReview(state, track, n = 12, now = Date.now()) {
  const topics = visibleTopics(track);
  const terms = topics.flatMap((t) => t.keyterms);
  const byId = new Map(terms.map((t) => [t.id, t]));
  const seen = terms.filter((t) => state.terms[t.id]);
  const due = seen.filter((t) => state.terms[t.id].due <= now)
    .sort((a, b) => reviewPriority(state.terms[a.id], now) - reviewPriority(state.terms[b.id], now));
  const weak = seen.filter((t) => state.terms[t.id].due > now)
    .sort((a, b) => reviewPriority(state.terms[a.id], now) - reviewPriority(state.terms[b.id], now));
  const studiedTopics = new Set(Object.keys(state.lessons).map((id) => id.split('-')[0]));
  const fresh = shuffle(terms.filter((t) => !state.terms[t.id] && studiedTopics.has(t.topicId)));
  const fallback = shuffle(terms.filter((t) => !state.terms[t.id]));

  const picked = [];
  for (const list of [due, weak.slice(0, 8), fresh, fallback]) {
    for (const t of list) {
      if (picked.length >= n) break;
      if (!picked.includes(t)) picked.push(t);
    }
  }

  // Questions that test each term, from the hand-written bank.
  const bankByTerm = new Map();
  for (const topic of topics) for (const l of topic.lessons) for (const q of l.questions) {
    if (!BANK_TYPES_FOR_REVIEW.has(q.type)) continue;
    for (const tid of q.terms ?? []) {
      if (!byId.has(tid)) continue;
      if (!bankByTerm.has(tid)) bankByTerm.set(tid, []);
      bankByTerm.get(tid).push(q);
    }
  }

  const usedQ = new Set();
  const variants = ['def', 'term', 'fill'];
  const out = [];
  picked.forEach((term, i) => {
    const sameTopic = terms.filter((t) => t.topicId === term.topicId);
    const pool = sameTopic.length >= 4 ? sameTopic : terms;
    const bank = shuffle(bankByTerm.get(term.id) ?? []).filter((q) => !usedQ.has(q.id));
    if (bank.length && i % 2 === 1) {
      usedQ.add(bank[0].id);
      out.push(bank[0]);
    } else {
      const q = termQuestion(term, pool, variants[i % 3]);
      if (q) out.push(q);
    }
  });
  return shuffle(out);
}

export function dueCount(state, track, now = Date.now()) {
  return visibleTopics(track).flatMap((t) => t.keyterms).filter((t) => state.terms[t.id]?.due <= now).length;
}

export function mistakeQuestions(state, track, n = 12) {
  const visible = new Set(visibleTopics(track).flatMap((t) => t.lessons.flatMap((l) => l.questions.map((q) => q.id))));
  return Object.entries(state.mistakes)
    .filter(([id]) => visible.has(id) && questionById.has(id))
    .sort((a, b) => b[1].times - a[1].times || b[1].at - a[1].at)
    .slice(0, n)
    .map(([id]) => questionById.get(id));
}

export function topicQuestions(topic, n = 10) {
  return shuffle(topic.lessons.flatMap((l) => l.questions)).slice(0, n);
}

export function commandTermQuestions(n = 10) {
  const pool = COMMAND_TERMS.map((c) => ({ id: `cmd-${c.term.toLowerCase().replace(/\s+/g, '-')}`, term: c.term, definition: c.definition, topicId: 'cmd' }));
  return shuffle(pool).slice(0, n).map((t, i) => {
    const q = termQuestion(t, pool, ['def', 'term'][i % 2]);
    return { ...q, terms: [] };
  });
}

/** Deterministic RNG so everyone gets the same daily challenge on a given date. */
export function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function dailyQuestions(day, track, n = 10) {
  const rand = seededRandom(`axon-${day}-${track}`);
  const pool = visibleTopics(track).flatMap((t) => t.lessons.flatMap((l) => l.questions)).filter((q) => q.type === 'mcq' || q.type === 'tf' || q.type === 'fill');
  return shuffle(pool, rand).slice(0, n);
}

/** Paper 1A-style exam: MCQs drawn evenly across the chosen themes. */
export function buildExam(track, themes, n) {
  const topics = visibleTopics(track).filter((t) => themes.includes(t.theme));
  const byTopic = topics.map((t) => shuffle(t.lessons.flatMap((l) => l.questions).filter((q) => q.type === 'mcq')));
  const out = [];
  let round = 0;
  while (out.length < n && byTopic.some((list) => list.length > round)) {
    for (const list of shuffle(byTopic)) {
      if (out.length >= n) break;
      if (list[round]) out.push(list[round]);
    }
    round++;
  }
  return shuffle(out);
}
