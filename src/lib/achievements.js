// Badges computed from progress (nothing extra is stored).
import { THEMES, TOPICS } from '../content/index.js';

const themeLessons = Object.fromEntries(THEMES.map((t) => [t.id, TOPICS.filter((x) => x.theme === t.id).flatMap((x) => x.lessons.filter((l) => !l.hl).map((l) => l.id))]));

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', name: 'First steps', desc: 'Complete your first lesson', test: (s) => Object.keys(s.lessons).some((k) => !k.startsWith('__')) },
  { id: 'streak3', icon: '🔥', name: 'Warming up', desc: 'Reach a 3-day streak', test: (s) => (s.streak.best ?? 0) >= 3 },
  { id: 'streak7', icon: '📅', name: 'Week warrior', desc: 'Reach a 7-day streak', test: (s) => (s.streak.best ?? 0) >= 7 },
  { id: 'streak30', icon: '🏔️', name: 'Unstoppable', desc: 'Reach a 30-day streak', test: (s) => (s.streak.best ?? 0) >= 30 },
  { id: 'perfect', icon: '💎', name: 'Flawless', desc: 'Finish a session without a mistake', test: (s) => (s.stats.perfect ?? 0) >= 1 },
  { id: 'perfect10', icon: '👑', name: 'Precision', desc: '10 flawless sessions', test: (s) => (s.stats.perfect ?? 0) >= 10 },
  { id: 'q100', icon: '💯', name: 'Century', desc: 'Answer 100 questions', test: (s) => s.stats.questions >= 100 },
  { id: 'q1000', icon: '🧬', name: 'Biologist', desc: 'Answer 1,000 questions', test: (s) => s.stats.questions >= 1000 },
  { id: 'xp1000', icon: '⚡', name: 'Charged', desc: 'Earn 1,000 XP', test: (s) => s.xp >= 1000 },
  { id: 'mastered25', icon: '🧠', name: 'Memory palace', desc: 'Master 25 keyterms', test: (s) => Object.values(s.terms).filter((t) => t.box >= 5).length >= 25 },
  { id: 'cleared20', icon: '🎯', name: 'Mistake crusher', desc: 'Clear 20 questions from your mistakes notebook', test: (s) => (s.stats.cleared ?? 0) >= 20 },
  { id: 'cards100', icon: '🃏', name: 'Card shark', desc: 'Review 100 flashcards', test: (s) => (s.stats.cards ?? 0) >= 100 },
  { id: 'exam', icon: '⏱️', name: 'Under pressure', desc: 'Complete an exam simulation', test: (s) => s.exams.length >= 1 },
  { id: 'examAce', icon: '🏆', name: 'Exam ace', desc: 'Score 80%+ on a 20+ question exam', test: (s) => s.exams.some((e) => e.total >= 20 && e.score / e.total >= 0.8) },
  { id: 'structured', icon: '✍️', name: 'Examiner\'s eye', desc: 'Self-mark 5 exam-style questions', test: (s) => Object.keys(s.items).length >= 5 },
  { id: 'daily7', icon: '☀️', name: 'Daily devotee', desc: 'Complete 7 daily challenges', test: (s) => Object.keys(s.daily).length >= 7 },
  ...THEMES.map((t) => ({
    id: `theme${t.id}`, icon: ['🔬', '🫀', '🌿', '🧪'][THEMES.indexOf(t)], name: `Theme ${t.id} complete`, desc: `Finish every SL lesson in ${t.title}`,
    test: (s) => themeLessons[t.id].length > 0 && themeLessons[t.id].every((id) => s.lessons[id]),
  })),
];

export function unlocked(state) {
  return ACHIEVEMENTS.filter((a) => a.test(state));
}
