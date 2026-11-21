# Axon course content schema

Every IB course lives in `src/content/courses/<courseId>/`:

```
course.json          course metadata, assessment, grade boundaries, IA
topics/<topicId>.json one file per syllabus topic (lessons + keyterms)
exam/<unitId>.json    ORIGINAL exam-style structured questions for that unit (array)
```

Validate with `node scripts/validate-course.mjs <courseId>`. It must print `OK`.
`src/content/courses/biology/` is the complete worked example: copy its style.

**Non-negotiables**
- Accuracy against the CURRENT IB subject guide (the one examined in May 2027). Prefer omitting something to guessing.
- Never copy IB past-paper questions or IB guide text. Write original questions, contexts and data.
- Every id is globally unique across ALL courses. Prefix every topic id with the course id (`chemistry-S1.1`). Lesson, question and keyterm ids derive from the topic id. (Biology is the only exception, for legacy reasons.)

---

## course.json

```json
{
  "id": "chemistry",
  "name": "Chemistry",
  "short": "Chem",
  "group": "Group 4: Sciences",
  "icon": "⚗️",
  "blurb": "One line: what the course covers (shown on the course card)",
  "syllabus": "Subject guide first assessed May 2025",
  "levels": ["SL", "HL"],
  "units": [ { "id": "S1", "title": "Models of the particulate nature of matter", "blurb": "One sentence." } ],
  "papers": { "P1B": "Paper 1B · data-based", "P2": "Paper 2" },
  "mcqExam": { "label": "Paper 1A simulator", "SL": 30, "HL": 40, "secondsPerQuestion": 80 },
  "assessment": {
    "SL": {
      "components": [ { "id": "p1", "name": "Paper 1", "detail": "Multiple choice + data-based", "max": 55, "group": "p1" } ],
      "groups": { "p1": { "name": "Paper 1", "weight": 36, "time": "1 h 30 min" } }
    },
    "HL": { "components": [], "groups": {} }
  },
  "boundaries": {
    "SL": [ { "session": "May 2025", "tz": "TZ1", "min": [0, 13, 26, 39, 52, 64, 77] } ],
    "HL": [ ]
  },
  "stats": { "SL": [ { "session": "May 2025", "candidates": 21939, "mean": 4.3, "pct7": 5.9, "pct67": 19.8 } ] },
  "ia": {
    "name": "Scientific investigation",
    "max": 24,
    "weight": 20,
    "limit": "3,000 words",
    "criteria": [ { "id": "rd", "name": "Research design", "max": 6, "look": ["what strong work shows (own words)"] } ],
    "checklist": ["8–12 concrete pre-submission checks (own words)"]
  },
  "examTips": ["exactly 5 subject-specific examiner-style tips (own words)"],
  "sources": [ { "label": "Where a figure came from", "url": "https://..." } ]
}
```

- `id`: lowercase slug, the same as the folder name. `short`: at most 6 characters, shown in the header pill.
- `levels`: `["SL","HL"]`, or `["SL"]` for SL-only courses (ab initio).
- `unitLabel` (optional): what the guide calls its units, e.g. `"Theme"`, `"Topic"`, `"Unit"` (the default).
- `units`: the guide's top-level structure, 3–8 units with short ids (e.g. `"1"`, `"S1"`, `"R2"`, `"A"`, `"Theme1"`). The app colours units in order.
- `papers`: the paper codes used by this course's exam items (keys), mapped to a display label.
- `mcqExam`: include it ONLY if the course has a multiple-choice paper (`SL`/`HL` are the question counts on the real paper). Otherwise set it to `null`; the app then offers a "Timed quiz" built from lesson MCQs.
- `assessment`: one entry per level in `levels`. Each external paper and the internal assessment is a component. `group` links components that share one weighting (e.g. Paper 1A + 1B). The group weights must sum to 100. The internal assessment must be its own group with key `"ia"` (its weight can differ between SL and HL). Use the real marks, times and weights from the current guide.
- `boundaries`: REQUIRED for each level. `min` is the 7 minimum overall percentages for grades 1–7 (grade 1 is always 0). Use real published sessions (most recent first, 2–6 rows). Source: https://www.ibcalculator.com/resources/boundaries/<subject-slug> (e.g. `chemistry-hl`, `economics-sl`, `spanish-b-hl`, `mathematics-aa-sl`), or another reliable collation. If a session belongs to an older syllabus, add `"old": true`. List each source in `sources`.
- `stats`: OPTIONAL (IB statistical bulletin rows). Omit the key if you can't find reliable figures; the app hides the statistics tab.
- `ia`: the course's internal assessment (exploration, investigation, individual oral, commentary, etc.). `max` must equal the sum of criterion maxima. Describe criteria in your own words. `limit` is the word or time limit.

## topics/<topicId>.json

```json
{
  "id": "chemistry-S1.1",
  "code": "S1.1",
  "unit": "S1",
  "title": "Introduction to the particulate nature of matter",
  "level": "SL",
  "summary": "One or two student-friendly sentences.",
  "keyterms": [ { "id": "chemistry-s1.1-element", "term": "Element", "definition": "≤ 30 words", "hl": false } ],
  "lessons": [ { "id": "chemistry-S1.1-1", "title": "…", "hl": false, "questions": [ ] } ]
}
```

- `unit` must be one of course.units. `code` is the guide's own numbering (shown to students).
- `level`: `"SL"` (in the core, may still contain HL lessons/keyterms flagged `"hl": true`) or `"HL"` (the whole topic is HL-only). For SL-only courses everything is `"SL"` and nothing is flagged hl.
- Keyterms: 8–16 per topic. ids are the lowercase topic id + `-` + a slug.
- Lessons: 2–3 per topic, 8–12 questions each (aim for 10). HL extension material goes in a final lesson with `"hl": true`.
- Size: cover the WHOLE syllabus. Group small subtopics so the course has roughly 15–35 topic files.

### Questions (ids `<lessonId>-qNN`)
Every question has `id`, `type`, `explanation` (1–2 teaching sentences) and `terms` (keyterm ids tested, ≥ 1 where possible).

| type | fields |
|---|---|
| `mcq` | `prompt`, `options` (3–4 unique strings), `answer` (0-based index; vary the position) |
| `tf` | `statement`, `answer` (boolean) |
| `fill` | `text` with exactly one `___`, `answer`, optional `accept` [], `bank` (3–5 unique entries including `answer`) |
| `match` | optional `prompt`, `pairs` [{`left`,`right`}] (3–5; lefts unique, rights unique, right ≤ 12 words) |
| `order` | `prompt`, `items` (3–6, listed in the CORRECT order; only for real sequences) |

Mix per 10 questions: about 4 mcq, 2 tf, 2 fill, 1 match, 1 order (use an mcq if there's no sensible sequence).
Text is plain Unicode: use x², √, π, ≤, ≠, →, ⇌, subscripts like CO₂, and Δ. No LaTeX or HTML.
Languages: questions may be in the target language (vocabulary, grammar, comprehension, culture/themes); explanations are in English. Mandarin includes characters and pinyin, e.g. "学校 (xuéxiào)".

## exam/<unitId>.json: original exam-style items (array)

```json
{
  "id": "chemistry-X-S1-01",
  "unit": "S1",
  "topics": ["chemistry-S1.1"],
  "paper": "P2",
  "level": "SL",
  "title": "Short descriptive title",
  "stem": "Context/source text the student reads",
  "data": { "caption": "…", "columns": ["…"], "rows": [["…"]] },
  "parts": [ { "label": "a", "command": "Calculate", "prompt": "…", "marks": 2,
               "numeric": { "value": 1.5, "tolerance": 0.05, "unit": "mol dm⁻³" },
               "markscheme": ["marking point", "…"], "notes": "optional examiner tip" } ]
}
```

- `id`: `<courseId>-X-<unitId>-NN`. `paper` must be a key of course.papers. `topics` must be topic ids of this course.
- `data` is optional: a table whose rows are the same length as the columns.
- Parts are labelled a, b, c… `command` is an IB command term (see the validator list). `marks` 1–15 (a full extended-response essay can be one 15-mark part). `markscheme` lists at least `marks` points (IB style: "/" for alternatives, OWTTE, Allow, Reject).
- `numeric` (optional, for calculation parts) must be correct; double-check it.
- Languages and English A: the stem can be a short ORIGINAL text with comprehension or analysis parts, or a writing task whose markscheme lists the criteria points an answer should hit.
- Quantity: 8–12 items per course in total, spread across the units and the course's papers.
