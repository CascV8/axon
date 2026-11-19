// Badges computed from progress (nothing extra is stored). `courses` = loaded courses.
import { COURSES } from '../content/index.js';

/** Which course a lesson id belongs to (Biology ids are the only un-prefixed ones). */
export function courseOfLesson(lessonId) {
  let best = null;
  for (const c of COURSES) if (lessonId.startsWith(`${c.id}-`) && (!best || c.id.length > best.length)) best = c.id;
  return best ?? 'biology';
}

function unitsComplete(s, courses) {
  let n = 0;
  for (const c of courses) {
    for (const u of c.units) {
      const ids = c.topics.filter((t) => t.unit === u.id && t.level !== 'HL').flatMap((t) => t.lessons.filter((l) => !l.hl).map((l) => l.id));
      if (ids.length && ids.every((id) => s.lessons[id])) n++;
    }
  }
  return n;
}
function coursesComplete(s, courses) {
  return courses.filter((c) => {
    const ids = c.topics.filter((t) => t.level !== 'HL').flatMap((t) => t.lessons.filter((l) => !l.hl).map((l) => l.id));
    return ids.length && ids.every((id) => s.lessons[id]);
  }).length;
}
const realLessons = (s) => Object.keys(s.lessons).filter((k) => !k.startsWith('__')).length;

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', name: 'First steps', desc: 'Complete your first lesson', test: (s) => realLessons(s) >= 1 },
  { id: 'lessons50', icon: '📚', name: 'Bookworm', desc: 'Complete 50 lessons', test: (s) => realLessons(s) >= 50 },
  { id: 'streak3', icon: '🔥', name: 'Warming up', desc: 'Reach a 3-day streak', test: (s) => (s.streak.best ?? 0) >= 3 },
  { id: 'streak7', icon: '📅', name: 'Week warrior', desc: 'Reach a 7-day streak', test: (s) => (s.streak.best ?? 0) >= 7 },
  { id: 'streak30', icon: '🏔️', name: 'Unstoppable', desc: 'Reach a 30-day streak', test: (s) => (s.streak.best ?? 0) >= 30 },
  { id: 'perfect', icon: '💎', name: 'Flawless', desc: 'Finish a session without a mistake', test: (s) => (s.stats.perfect ?? 0) >= 1 },
  { id: 'perfect10', icon: '👑', name: 'Precision', desc: '10 flawless sessions', test: (s) => (s.stats.perfect ?? 0) >= 10 },
  { id: 'q100', icon: '💯', name: 'Century', desc: 'Answer 100 questions', test: (s) => s.stats.questions >= 100 },
  { id: 'q1000', icon: '🎓', name: 'Scholar', desc: 'Answer 1,000 questions', test: (s) => s.stats.questions >= 1000 },
  { id: 'xp1000', icon: '⚡', name: 'Charged', desc: 'Earn 1,000 XP', test: (s) => s.xp >= 1000 },
  { id: 'mastered25', icon: '🧠', name: 'Memory palace', desc: 'Master 25 keyterms', test: (s) => Object.values(s.terms).filter((t) => t.box >= 5).length >= 25 },
  { id: 'cleared20', icon: '🎯', name: 'Mistake crusher', desc: 'Clear 20 questions from your mistakes notebook', test: (s) => (s.stats.cleared ?? 0) >= 20 },
  { id: 'cards100', icon: '🃏', name: 'Card shark', desc: 'Review 100 flashcards', test: (s) => (s.stats.cards ?? 0) >= 100 },
  { id: 'exam', icon: '⏱️', name: 'Under pressure', desc: 'Complete a timed exam', test: (s) => s.exams.length >= 1 },
  { id: 'examAce', icon: '🏆', name: 'Exam ace', desc: 'Score 80%+ on a timed exam of 20+ questions', test: (s) => s.exams.some((e) => e.total >= 20 && e.score / e.total >= 0.8) },
  { id: 'structured', icon: '✍️', name: 'Examiner\'s eye', desc: 'Self-mark 5 exam-style questions', test: (s) => Object.keys(s.items).length >= 5 },
  { id: 'daily7', icon: '☀️', name: 'Daily devotee', desc: 'Complete 7 daily challenges', test: (s) => Object.keys(s.daily).length >= 7 },
  { id: 'polymath', icon: '🌐', name: 'Polymath', desc: 'Complete lessons in 3 different courses', test: (s) => new Set(Object.keys(s.lessons).filter((k) => !k.startsWith('__')).map(courseOfLesson)).size >= 3 },
  { id: 'unit1', icon: '🧩', name: 'Unit cleared', desc: 'Finish every SL lesson in one unit', test: (s, cs) => unitsComplete(s, cs) >= 1 },
  { id: 'unit4', icon: '🗺️', name: 'Explorer', desc: 'Finish every SL lesson in four units', test: (s, cs) => unitsComplete(s, cs) >= 4 },
  { id: 'course', icon: '🏅', name: 'Course complete', desc: 'Finish every SL lesson in a whole course', test: (s, cs) => coursesComplete(s, cs) >= 1 },
];
