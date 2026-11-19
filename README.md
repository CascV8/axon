# Axon

Free, gamified revision for IB Biology (syllabus first assessed in 2025). No account, no paywall, works offline.

## Features

**Learn**
- Course map for all 40 syllabus topics across themes A–D, drawn as a winding path, with SL/HL filtering
- 116 lessons and 1,173 questions in five types: multiple choice, true/false, fill in the blank (word bank or typed, typo-tolerant), match pairs, order the steps
- Every wrong answer explains why; missed questions come back at the end of the lesson
- XP, levels, daily streak, hearts (with an unlimited-hearts relaxed mode), level-up and lesson-complete animations

**Practise**
- Smart review: Leitner spaced repetition over 597 keyterms, mixing the question bank with generated questions
- Flashcards for every topic, a mistakes notebook, a daily challenge that is the same for everyone each day, topic quick-fire, and a command-terms drill
- Paper 1A simulator: timed MCQs with a topic-by-topic breakdown

**Exam prep**
- Question bank: 40 original Paper 1B / Paper 2 style questions (396 marks) with data tables, auto-checked calculations, and markschemes you self-mark against
- Grade calculator (weighted Paper 1, Paper 2 and IA → 1–7), a target finder, a diploma points calculator with pass conditions, grade boundaries from May 2024 to May 2026, and statistical bulletin figures
- IA toolkit: self-assessment against the four criteria, a pre-submission checklist, and notes with a 3,000-word counter

**Everything else**
- Glossary with search, theme filter and mastery dots, plus the IB command terms
- Profile: activity heatmap, per-topic accuracy, 20 badges, settings, and a JSON backup you can download and restore
- Mobile-first, keyboard shortcuts, screen-reader labels, light and dark themes, reduced motion, installable PWA

## Develop

```sh
npm install
npm run dev
npm test                          # unit tests
node scripts/validate-content.mjs # lesson content
node scripts/validate-exam.mjs    # exam-style items
npm run build                     # → dist/
```

Content lives in `src/content/topics/*.json` ([CONTENT_SCHEMA.md](CONTENT_SCHEMA.md)) and `src/content/exam/*.json` ([EXAM_SCHEMA.md](EXAM_SCHEMA.md)).

## Content & data policy

All questions are written for Axon. None are copied from IB past papers, which are IB copyright. Assessment weightings and statistics are factual figures from IB publications. Grade boundaries come from third-party collations and are indicative only.

Axon is an independent study tool and is not affiliated with or endorsed by the International Baccalaureate Organization.
