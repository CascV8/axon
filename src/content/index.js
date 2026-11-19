// Course registry. Course metadata loads up front (small); each course's topics and
// exam items load on demand as one chunk per course (see vite.config.js manualChunks).
import { useEffect, useSyncExternalStore } from 'react';

import READY from './ready.json';

const metaModules = import.meta.glob('./courses/*/course.json', { eager: true, import: 'default' });
const topicLoaders = import.meta.glob('./courses/*/topics/*.json', { import: 'default' });
const examLoaders = import.meta.glob('./courses/*/exam/*.json', { import: 'default' });

const GROUP_ORDER = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6'];
const groupRank = (g) => {
  const i = GROUP_ORDER.findIndex((p) => g.startsWith(p));
  return i < 0 ? 99 : i;
};

// Only courses that passed scripts/validate-course.mjs at build time are offered.
export const COURSES = Object.values(metaModules).filter((c) => READY.includes(c.id)).sort(
  (a, b) => groupRank(a.group) - groupRank(b.group) || a.name.localeCompare(b.name),
);
export const courseById = new Map(COURSES.map((c) => [c.id, c]));
export const COURSE_GROUPS = [...new Set(COURSES.map((c) => c.group))];

const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });

function build(meta, topicFiles, examFiles) {
  const unitIndex = new Map(meta.units.map((u, i) => [u.id, i]));
  const units = meta.units.map((u, i) => ({ ...u, index: i, tone: `tone-${i % 6}` }));
  const topics = topicFiles
    .map((t) => structuredClone(t))
    .sort((a, b) => (unitIndex.get(a.unit) ?? 99) - (unitIndex.get(b.unit) ?? 99) || naturalCompare(a.code, b.code));
  const topicById = new Map();
  const lessonById = new Map();
  const termById = new Map();
  const questionById = new Map();
  for (const t of topics) {
    t.tone = units[unitIndex.get(t.unit)]?.tone ?? 'tone-0';
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
        q.topicId = t.id;
        questionById.set(q.id, q);
      }
    }
  }
  const examItems = examFiles.flat().map((it) => structuredClone(it)).sort((a, b) => naturalCompare(a.id, b.id));
  return {
    id: meta.id,
    meta,
    units,
    unitById: new Map(units.map((u) => [u.id, u])),
    topics,
    topicById,
    lessonById,
    termById,
    questionById,
    examItems,
    examItemById: new Map(examItems.map((it) => [it.id, it])),
    totals: { topics: topics.length, lessons: lessonById.size, questions: questionById.size, terms: termById.size, items: examItems.length },
  };
}

/* ---------- lazy loading with a tiny observable cache ---------- */
const loaded = new Map();
const pending = new Map();
const failed = new Map();
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

const pick = (loaders, cid, folder) => Object.entries(loaders).filter(([p]) => p.startsWith(`./courses/${cid}/${folder}/`)).map(([, load]) => load());

export function loadCourse(cid) {
  if (loaded.has(cid)) return Promise.resolve(loaded.get(cid));
  if (pending.has(cid)) return pending.get(cid);
  const meta = courseById.get(cid);
  if (!meta) return Promise.reject(new Error(`Unknown course ${cid}`));
  const p = Promise.all([Promise.all(pick(topicLoaders, cid, 'topics')), Promise.all(pick(examLoaders, cid, 'exam'))])
    .then(([topics, exams]) => {
      const course = build(meta, topics, exams);
      loaded.set(cid, course);
      failed.delete(cid);
      pending.delete(cid);
      notify();
      return course;
    })
    .catch((e) => {
      pending.delete(cid);
      failed.set(cid, e);
      notify();
      throw e;
    });
  pending.set(cid, p);
  return p;
}

export function getCourse(cid) {
  return loaded.get(cid) ?? null;
}
export function loadedCourses() {
  return [...loaded.values()];
}

/** Returns the loaded course (or null while it loads) and starts loading it. */
export function useCourse(cid) {
  const course = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => loaded.get(cid) ?? null,
  );
  const error = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => failed.get(cid) ?? null,
  );
  useEffect(() => { if (cid && !loaded.has(cid)) loadCourse(cid).catch(() => {}); }, [cid]);
  return { course, error, retry: () => loadCourse(cid).catch(() => {}) };
}

/* ---------- level filtering ---------- */
export function visibleTopics(course, level) {
  if (!course) return [];
  if (level === 'HL') return course.topics;
  return course.topics
    .filter((t) => t.level !== 'HL')
    .map((t) => ({ ...t, lessons: t.lessons.filter((l) => !l.hl), keyterms: t.keyterms.filter((k) => !k.hl) }));
}
export function visibleTerms(course, level) {
  return visibleTopics(course, level).flatMap((t) => t.keyterms);
}
export function visibleItems(course, level) {
  if (!course) return [];
  return level === 'HL' ? course.examItems : course.examItems.filter((it) => it.level !== 'HL');
}
