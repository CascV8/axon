// Progress store: one versioned object in localStorage, exposed to React via useSyncExternalStore.
import { useSyncExternalStore } from 'react';
import {
  dayKey, bumpStreak, srsUpdate, currentHearts, MAX_HEARTS,
} from './core.js';

const KEY = 'axon:v1';
const VERSION = 1;

export const DEFAULT_STATE = {
  version: VERSION,
  profile: {
    name: '',
    track: 'HL',          // Biology level; 'SL' hides HL-only content
    courses: [],          // [{ id: 'biology', level: 'HL' }, ...]
    activeCourse: 'biology',
    dailyGoal: 30,        // XP per day
    sound: true,
    relaxed: false,       // unlimited hearts
    theme: 'system',      // 'system' | 'light' | 'dark'
    onboarded: false,
  },
  xp: 0,
  xpByDay: {},            // { 'YYYY-MM-DD': xp }
  streak: { count: 0, last: null, best: 0 },
  hearts: { count: MAX_HEARTS, since: 0 },
  lessons: {},            // { lessonId: { done, best, last } }
  terms: {},              // { termId: srs state }
  mistakes: {},           // { questionId: { lessonId, at, times } }
  exams: [],              // [{ at, score, total, themes, secs }]
  topicStats: {},         // { topicId: { seen, right } } first-try answers
  items: {},              // structured exam items: { itemId: { score, max, best, at, tries } }
  drafts: {},             // { 'itemId:part': text, 'ia:notes': text }
  ia: {},                 // IA self-assessment { criterionId: mark, checks: {...} }
  daily: {},              // { 'YYYY-MM-DD': { score, total } }
  stats: { questions: 0, correct: 0, lessons: 0, seconds: 0, perfect: 0, cleared: 0, cards: 0 },
};

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return structuredClone(base);
  const out = { ...structuredClone(base), ...saved };
  out.profile = { ...base.profile, ...(saved.profile ?? {}) };
  out.stats = { ...base.stats, ...(saved.stats ?? {}) };
  // Migrate early users (before course selection existed): they were studying Biology.
  if (out.profile.onboarded && !out.profile.courses?.length) {
    out.profile.courses = [{ id: 'biology', level: out.profile.track || 'HL' }];
  }
  out.version = VERSION;
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return merge(DEFAULT_STATE, raw ? JSON.parse(raw) : null);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

let state = load();
const listeners = new Set();
let storageOk = true;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

function set(updater) {
  state = typeof updater === 'function' ? updater(state) : updater;
  persist();
  listeners.forEach((l) => l());
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

/** Notified after every change (used by cloud sync). */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}
export function isStorageAvailable() {
  return storageOk;
}
export function useProgress() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

/* ---------- actions ---------- */
export const actions = {
  setProfile(patch) {
    set((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },

  /** Change SL/HL for one course. */
  setCourseLevel(courseId, level) {
    set((s) => ({
      ...s,
      profile: { ...s.profile, courses: (s.profile.courses ?? []).map((c) => (c.id === courseId ? { ...c, level } : c)) },
    }));
  },

  setActiveCourse(courseId) {
    set((s) => ({ ...s, profile: { ...s.profile, activeCourse: courseId } }));
  },

  /** Replace everything (cloud sync / restore). */
  replace(next) {
    set(merge(DEFAULT_STATE, next));
  },

  addXp(amount) {
    if (!amount) return;
    const today = dayKey();
    set((s) => ({
      ...s,
      xp: s.xp + amount,
      xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + amount },
      streak: bumpStreak(s.streak, today),
    }));
  },

  /** Record a single answer: SRS for the tested keyterms, mistakes notebook, global stats. */
  recordAnswer(question, correct, { lessonId, firstTry = true } = {}) {
    const now = Date.now();
    set((s) => {
      const terms = { ...s.terms };
      // Only the first attempt moves SRS boxes; retries of a missed question do not inflate mastery.
      if (firstTry) for (const t of question.terms ?? []) terms[t] = srsUpdate(terms[t], correct, now);
      const topicStats = { ...s.topicStats };
      const tid = question.topicId ?? question.lessonId?.split('-')[0];
      if (firstTry && tid) {
        const ts = topicStats[tid] ?? { seen: 0, right: 0 };
        topicStats[tid] = { seen: ts.seen + 1, right: ts.right + (correct ? 1 : 0) };
      }
      const mistakes = { ...s.mistakes };
      if (!correct) {
        const prev = mistakes[question.id];
        mistakes[question.id] = { lessonId: lessonId ?? prev?.lessonId, at: now, times: (prev?.times ?? 0) + 1 };
      }
      return {
        ...s,
        terms,
        mistakes,
        topicStats,
        stats: {
          ...s.stats,
          questions: s.stats.questions + (firstTry ? 1 : 0),
          correct: s.stats.correct + (firstTry && correct ? 1 : 0),
        },
      };
    });
  },

  /** Direct SRS update for a keyterm (flashcard-style review questions). */
  recordTerm(termId, correct) {
    set((s) => ({ ...s, terms: { ...s.terms, [termId]: srsUpdate(s.terms[termId], correct) } }));
  },

  clearMistake(questionId) {
    set((s) => {
      if (!s.mistakes[questionId]) return s;
      const mistakes = { ...s.mistakes };
      delete mistakes[questionId];
      return { ...s, mistakes, stats: { ...s.stats, cleared: s.stats.cleared + 1 } };
    });
  },

  /** Flashcard review: SRS update plus a card counter. */
  recordCard(termId, correct) {
    set((s) => ({
      ...s,
      terms: { ...s.terms, [termId]: srsUpdate(s.terms[termId], correct) },
      stats: { ...s.stats, cards: s.stats.cards + 1 },
    }));
  },

  saveDraft(key, text) {
    set((s) => ({ ...s, drafts: { ...s.drafts, [key]: text } }));
  },

  scoreItem(itemId, score, max) {
    set((s) => {
      const prev = s.items[itemId];
      return {
        ...s,
        items: { ...s.items, [itemId]: { score, max, best: Math.max(prev?.best ?? 0, score), at: Date.now(), tries: (prev?.tries ?? 0) + 1 } },
      };
    });
  },

  setIa(patch) {
    set((s) => ({ ...s, ia: { ...s.ia, ...patch } }));
  },

  completeDaily(day, score, total) {
    set((s) => ({ ...s, daily: { ...s.daily, [day]: { score, total } } }));
  },

  completeLesson(lessonId, { accuracy, seconds }) {
    set((s) => {
      const prev = s.lessons[lessonId];
      return {
        ...s,
        lessons: {
          ...s.lessons,
          [lessonId]: { done: (prev?.done ?? 0) + 1, best: Math.max(prev?.best ?? 0, accuracy), last: Date.now() },
        },
        stats: { ...s.stats, lessons: s.stats.lessons + 1, seconds: s.stats.seconds + (seconds ?? 0), perfect: s.stats.perfect + (accuracy >= 1 ? 1 : 0) },
      };
    });
  },

  logExam(result) {
    set((s) => ({ ...s, exams: [...s.exams, result].slice(-50) }));
  },

  loseHeart() {
    set((s) => {
      if (s.profile.relaxed) return s;
      const h = currentHearts(s.hearts);
      const count = Math.max(0, h.count - 1);
      return { ...s, hearts: { count, since: h.count >= MAX_HEARTS ? Date.now() : h.since } };
    });
  },
  gainHeart(n = 1) {
    set((s) => {
      const h = currentHearts(s.hearts);
      const count = Math.min(MAX_HEARTS, h.count + n);
      return { ...s, hearts: { count, since: count >= MAX_HEARTS ? Date.now() : h.since } };
    });
  },

  importState(obj) {
    if (!obj || typeof obj !== 'object' || !('xp' in obj)) throw new Error('This file is not an Axon progress backup.');
    set(merge(DEFAULT_STATE, obj));
  },
  reset() {
    set(structuredClone(DEFAULT_STATE));
  },
};

export function heartsNow(s) {
  return s.profile.relaxed ? Infinity : currentHearts(s.hearts).count;
}
