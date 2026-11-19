import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  textMatches, grade, srsUpdate, levelForXp, xpForLevel, bumpStreak, liveStreak,
  currentHearts, HEART_REGEN_MS, daysBetween, shuffleNotIdentity, levelProgress,
} from '../src/lib/core.js';
import { weightedPercent, gradeFor, diplomaCheck, BOUNDARIES } from '../src/content/ibData.js';
import { mergeStates } from '../src/lib/merge.js';

test('textMatches is forgiving but not sloppy', () => {
  assert.ok(textMatches('Cohesion', 'cohesion'));
  assert.ok(textMatches(' cohesion. ', 'cohesion'));
  assert.ok(textMatches('cohesoin', 'cohesion'));
  assert.ok(textMatches('ribosomes', 'ribosome'));
  assert.ok(textMatches('hydrogen-bond', 'hydrogen bond'));
  assert.ok(!textMatches('adhesion', 'cohesion'));
  assert.ok(!textMatches('', 'cohesion'));
  assert.ok(!textMatches('rna', 'dna'));
});

test('grade handles each question type', () => {
  assert.ok(grade({ type: 'mcq', answer: 2 }, 2));
  assert.ok(!grade({ type: 'mcq', answer: 2 }, 1));
  assert.ok(grade({ type: 'tf', answer: false }, false));
  assert.ok(grade({ type: 'fill', answer: 'polar', accept: ['dipolar'] }, 'Dipolar'));
  assert.ok(grade({ type: 'order', items: ['a', 'b', 'c'] }, ['a', 'b', 'c']));
  assert.ok(!grade({ type: 'order', items: ['a', 'b', 'c'] }, ['b', 'a', 'c']));
  assert.ok(grade({ type: 'match' }, { complete: true, mistakes: 0 }));
  assert.ok(!grade({ type: 'match' }, { complete: true, mistakes: 1 }));
});

test('srs moves boxes up on success and resets on failure', () => {
  const now = 1_000_000;
  let s = srsUpdate(undefined, true, now);
  assert.equal(s.box, 1);
  s = srsUpdate(s, true, now);
  assert.equal(s.box, 2);
  assert.equal(s.due, now + 2 * 86400000);
  s = srsUpdate(s, false, now);
  assert.equal(s.box, 1);
  assert.equal(s.wrong, 1);
  assert.equal(s.seen, 3);
});

test('levels', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 50);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(49), 1);
  assert.equal(levelForXp(50), 2);
  assert.equal(levelForXp(150), 3);
  assert.equal(levelProgress(100).into, 50);
});

test('streak bumps on consecutive days and resets after a gap', () => {
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
  let s = bumpStreak(undefined, '2026-01-01');
  assert.equal(s.count, 1);
  s = bumpStreak(s, '2026-01-01');
  assert.equal(s.count, 1);
  s = bumpStreak(s, '2026-01-02');
  assert.equal(s.count, 2);
  assert.equal(liveStreak(s, '2026-01-03'), 2);
  assert.equal(liveStreak(s, '2026-01-04'), 0);
  s = bumpStreak(s, '2026-01-05');
  assert.equal(s.count, 1);
  assert.equal(s.best, 2);
});

test('hearts regenerate over time and cap at max', () => {
  const t = 0;
  const h = { count: 2, since: t };
  assert.equal(currentHearts(h, t + HEART_REGEN_MS - 1).count, 2);
  assert.equal(currentHearts(h, t + HEART_REGEN_MS).count, 3);
  assert.equal(currentHearts(h, t + 10 * HEART_REGEN_MS).count, 5);
});

test('grade calculator weights components', () => {
  assert.equal(Math.round(weightedPercent('HL', { p1a: 40, p1b: 35, p2: 80, ia: 24 })), 100);
  assert.equal(Math.round(weightedPercent('SL', { p1a: 15, p1b: 12.5, p2: 25, ia: 12 })), 50);
  assert.equal(weightedPercent('HL', {}), 0);
  const min = BOUNDARIES.HL[0].min;
  assert.equal(gradeFor(76, min), 7);
  assert.equal(gradeFor(75.9, min), 6);
  assert.equal(gradeFor(0, min), 1);
});

test('diploma check applies passing conditions', () => {
  const subj = (g, l) => ({ grade: g, level: l });
  const ok = diplomaCheck([subj(6, 'HL'), subj(6, 'HL'), subj(5, 'HL'), subj(5, 'SL'), subj(5, 'SL'), subj(4, 'SL')], 'B', 'B');
  assert.equal(ok.total, 33);
  assert.ok(ok.pass);
  const bad = diplomaCheck([subj(4, 'HL'), subj(4, 'HL'), subj(3, 'HL'), subj(5, 'SL'), subj(5, 'SL'), subj(5, 'SL')], 'C', 'E');
  assert.ok(!bad.pass);
  assert.ok(bad.problems.some((p) => p.includes('HL')));
  assert.ok(bad.problems.some((p) => p.includes('TOK')));
});

test('mergeStates keeps the best of both devices', () => {
  const local = {
    profile: { onboarded: true, track: 'HL', courses: [{ id: 'biology', level: 'HL' }] },
    xp: 120, xpByDay: { '2026-01-01': 30, '2026-01-02': 10 },
    streak: { count: 2, last: '2026-01-02', best: 2 },
    lessons: { 'A1.1-1': { done: 1, best: 0.8, last: 5 } },
    terms: { t1: { box: 2, last: 10 } },
    mistakes: { q1: { at: 3, times: 1 } },
    exams: [{ at: 1, score: 5, total: 10 }],
    stats: { questions: 40, correct: 30 },
    drafts: { a: 'local' },
  };
  const remote = {
    profile: { onboarded: true, track: 'SL', courses: [{ id: 'chemistry', level: 'SL' }] },
    xp: 200, xpByDay: { '2026-01-01': 50 },
    streak: { count: 5, last: '2026-01-01', best: 5 },
    lessons: { 'A1.1-1': { done: 3, best: 0.6, last: 9 }, 'A1.1-2': { done: 1, best: 1, last: 2 } },
    terms: { t1: { box: 4, last: 20 }, t2: { box: 1, last: 1 } },
    mistakes: { q2: { at: 4, times: 2 } },
    exams: [{ at: 1, score: 5, total: 10 }, { at: 2, score: 8, total: 10 }],
    stats: { questions: 50, correct: 20 },
    drafts: { a: 'remote', b: 'remote' },
  };
  const m = mergeStates(local, remote);
  assert.equal(m.xp, 200);
  assert.equal(m.xpByDay['2026-01-01'], 50);
  assert.equal(m.xpByDay['2026-01-02'], 10);
  assert.equal(m.streak.last, '2026-01-02');
  assert.equal(m.streak.best, 5);
  assert.deepEqual(m.lessons['A1.1-1'], { done: 3, best: 0.8, last: 9 });
  assert.ok(m.lessons['A1.1-2']);
  assert.equal(m.terms.t1.box, 4);
  assert.ok(m.terms.t2 && m.mistakes.q1 && m.mistakes.q2);
  assert.equal(m.exams.length, 2);
  assert.deepEqual(m.stats, { questions: 50, correct: 30 });
  assert.equal(m.drafts.a, 'local');
  assert.equal(m.profile.track, 'HL');
  assert.deepEqual(m.profile.courses.map((c) => c.id).sort(), ['biology', 'chemistry']);
  assert.equal(mergeStates(local, null), local);
});

test('shuffleNotIdentity never returns the original order', () => {
  for (let i = 0; i < 50; i++) {
    const s = shuffleNotIdentity([1, 2, 3]);
    assert.notDeepEqual(s, [1, 2, 3]);
  }
});
