// Pure logic shared by the app and unit tests (no DOM / React).

/* ---------- dates ---------- */
export function dayKey(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export function daysBetween(aKey, bKey) {
  const [ay, am, ad] = aKey.split('-').map(Number);
  const [by, bm, bd] = bKey.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/* ---------- random ---------- */
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Shuffle, but never return the original order when length > 1. */
export function shuffleNotIdentity(arr, rand = Math.random) {
  if (arr.length < 2) return arr.slice();
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(arr, rand);
    if (s.some((x, i) => x !== arr[i])) return s;
  }
  return arr.slice(1).concat(arr[0]);
}

/* ---------- answer matching ---------- */
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/[^\p{L}\p{N}+ ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  // Optimal string alignment distance: adjacent transpositions count as one edit.
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}
/** Forgiving comparison for typed answers: case, punctuation, plural "s", one typo on longer words. */
export function textMatches(input, expected) {
  const a = normalize(input), b = normalize(expected);
  if (!a) return false;
  if (a === b) return true;
  const strip = (s) => s.replace(/(es|s)$/, '');
  if (strip(a) === strip(b)) return true;
  if (b.length >= 6 && levenshtein(a, b) <= 1) return true;
  if (b.length >= 10 && levenshtein(a, b) <= 2) return true;
  return false;
}

/* ---------- grading ---------- */
export function grade(q, response) {
  switch (q.type) {
    case 'mcq': return response === q.answer;
    case 'tf': return response === q.answer;
    case 'fill': return [q.answer, ...(q.accept ?? [])].some((x) => textMatches(response, x));
    case 'match': return !!response?.complete && response.mistakes === 0;
    case 'order':
      return Array.isArray(response) && response.length === q.items.length && response.every((x, i) => x === q.items[i]);
    default: return false;
  }
}
/** Human-readable correct answer, shown in the feedback sheet. */
export function correctAnswerText(q) {
  switch (q.type) {
    case 'mcq': return q.options[q.answer];
    case 'tf': return q.answer ? 'True' : 'False';
    case 'fill': return q.answer;
    case 'order': return q.items.join(' → ');
    case 'match': return null;
    default: return null;
  }
}

/* ---------- spaced repetition (Leitner boxes) ---------- */
const DAY = 86400000;
export const SRS_INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // days, indexed by box
export const MAX_BOX = SRS_INTERVALS.length - 1;

export function srsUpdate(prev, correct, now = Date.now()) {
  const s = prev ?? { box: 0, due: now, seen: 0, right: 0, wrong: 0 };
  const box = correct ? Math.min(MAX_BOX, s.box + 1) : 1;
  // A wrong answer comes back in ~10 minutes so it can be reviewed the same day.
  const due = correct ? now + SRS_INTERVALS[box] * DAY : now + 10 * 60 * 1000;
  return {
    box,
    due,
    seen: s.seen + 1,
    right: s.right + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
    last: now,
  };
}
/** 0 (unseen/weak) .. 1 (mastered) */
export function termStrength(s) {
  if (!s) return 0;
  return Math.min(1, s.box / 5);
}
/** Lower score = more in need of review. Due + low box + many wrongs first. */
export function reviewPriority(s, now = Date.now()) {
  const overdue = Math.max(0, now - s.due) / DAY;
  const errRate = s.seen ? s.wrong / s.seen : 0;
  return s.box - overdue * 0.5 - errRate * 2;
}

/* ---------- XP & levels ---------- */
/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level) {
  return 25 * (level - 1) * level;
}
export function levelForXp(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}
export function levelProgress(xp) {
  const level = levelForXp(xp);
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, into: xp - base, span: next - base, pct: (xp - base) / (next - base) };
}
export function lessonXp({ firstTryCorrect, total, perfect }) {
  return 10 + firstTryCorrect + (perfect && total > 0 ? 5 : 0);
}

/* ---------- streak ---------- */
export function bumpStreak(streak, today) {
  const s = streak ?? { count: 0, last: null, best: 0 };
  if (s.last === today) return s;
  const gap = s.last ? daysBetween(s.last, today) : Infinity;
  const count = gap === 1 ? s.count + 1 : 1;
  return { count, last: today, best: Math.max(s.best ?? 0, count) };
}
/** Streak as displayed: falls to 0 once a full day has been missed. */
export function liveStreak(streak, today) {
  if (!streak?.last) return 0;
  return daysBetween(streak.last, today) <= 1 ? streak.count : 0;
}

/* ---------- hearts ---------- */
export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export function currentHearts(h, now = Date.now()) {
  if (!h) return { count: MAX_HEARTS, since: now };
  if (h.count >= MAX_HEARTS) return { count: MAX_HEARTS, since: now };
  const gained = Math.floor((now - h.since) / HEART_REGEN_MS);
  if (gained <= 0) return h;
  const count = Math.min(MAX_HEARTS, h.count + gained);
  return { count, since: count >= MAX_HEARTS ? now : h.since + gained * HEART_REGEN_MS };
}
export function msToNextHeart(h, now = Date.now()) {
  const c = currentHearts(h, now);
  if (c.count >= MAX_HEARTS) return 0;
  return HEART_REGEN_MS - (now - c.since);
}
