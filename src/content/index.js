// Loads every topic JSON at build time and builds lookup tables.
const modules = import.meta.glob('./topics/*.json', { eager: true, import: 'default' });

export const THEMES = [
  { id: 'A', title: 'Unity and diversity', color: 'var(--theme-a)', blurb: 'Water, nucleic acids, cells, classification and evolution.' },
  { id: 'B', title: 'Form and function', color: 'var(--theme-b)', blurb: 'Biomolecules, membranes, organelles, gas exchange and transport.' },
  { id: 'C', title: 'Interaction and interdependence', color: 'var(--theme-c)', blurb: 'Enzymes, respiration, photosynthesis, signalling and ecosystems.' },
  { id: 'D', title: 'Continuity and change', color: 'var(--theme-d)', blurb: 'DNA, division, inheritance, homeostasis and climate change.' },
];

function topicSort(a, b) {
  const pa = a.id.slice(1).split('.').map(Number);
  const pb = b.id.slice(1).split('.').map(Number);
  return a.theme.localeCompare(b.theme) || pa[0] - pb[0] || pa[1] - pb[1];
}

export const TOPICS = Object.values(modules).sort(topicSort);

export const topicById = new Map();
export const lessonById = new Map();   // lessonId -> lesson (with .topicId)
export const termById = new Map();     // termId -> keyterm (with .topicId)
export const questionById = new Map(); // questionId -> question (with .lessonId)

for (const t of TOPICS) {
  topicById.set(t.id, t);
  for (const k of t.keyterms) {
    k.topicId = t.id;
    if (t.level === 'HL') k.hl = true;
    termById.set(k.id, k);
  }
  for (const l of t.lessons) {
    l.topicId = t.id;
    if (t.level === 'HL') l.hl = true;
    lessonById.set(l.id, l);
    for (const q of l.questions) {
      q.lessonId = l.id;
      questionById.set(q.id, q);
    }
  }
}

/** Topics/lessons/terms visible for a track. SL hides HL-only material. */
export function visibleTopics(track) {
  if (track === 'HL') return TOPICS;
  return TOPICS.filter((t) => t.level !== 'HL')
    .map((t) => ({ ...t, lessons: t.lessons.filter((l) => !l.hl), keyterms: t.keyterms.filter((k) => !k.hl) }));
}
export function visibleTerms(track) {
  return visibleTopics(track).flatMap((t) => t.keyterms);
}

export const TOTALS = {
  topics: TOPICS.length,
  lessons: TOPICS.reduce((n, t) => n + t.lessons.length, 0),
  questions: questionById.size,
  terms: termById.size,
};
