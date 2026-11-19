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

**Accounts**
- Optional free account: email + password, cloud sync of all progress across devices, email confirmation and password reset (via Resend), log out, delete account
- Guests can use everything; their progress comes with them when they sign up

**Everything else**
- Glossary with search, theme filter and mastery dots, plus the IB command terms
- Profile: activity heatmap, per-topic accuracy, 20 badges, settings, and a JSON backup you can download and restore
- Mobile-first, keyboard shortcuts, screen-reader labels, light and dark themes, reduced motion, installable PWA

## Develop

```sh
npm install
npm run dev        # front end only (accounts show as unavailable)
npm run dev:full   # front end + API + local D1 via wrangler pages dev (http://localhost:8788)
npm test           # unit tests + content validators
npm run test:api -- http://localhost:8788   # end-to-end API check (creates and deletes a test account)
npm run build      # → dist/
```

## Backend (Cloudflare)

- `functions/api/[[route]].js`: accounts and progress API (Pages Functions); helpers in `server/`
- D1 database `axon` bound as `DB`; tables are created automatically, and `migrations/0001_init.sql` documents them
- Pages variables: `APP_URL`, `EMAIL_FROM`; secret: `RESEND_API_KEY` (Pages → Settings → Variables and Secrets). Without the secret, email features stay hidden.
- Passwords: PBKDF2-SHA256 (100k iterations, per-user salt). Sessions: random 256-bit tokens, stored hashed, HttpOnly + Secure + SameSite=Lax cookies. Writes from other origins are rejected, and logins and emails are rate-limited.

Content lives in `src/content/topics/*.json` ([CONTENT_SCHEMA.md](CONTENT_SCHEMA.md)) and `src/content/exam/*.json` ([EXAM_SCHEMA.md](EXAM_SCHEMA.md)).

## Content & data policy

All questions are written for Axon. None are copied from IB past papers, which are IB copyright. Assessment weightings and statistics are factual figures from IB publications. Grade boundaries come from third-party collations and are indicative only.

Axon is an independent study tool and is not affiliated with or endorsed by the International Baccalaureate Organization.
