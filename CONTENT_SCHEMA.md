# Axon content schema

All course content lives in `src/content/topics/<TOPIC_ID>.json`, one file per IB Biology syllabus topic
(2023 guide, first assessment 2025: themes A–D, e.g. `A1.1.json`, `B2.3.json`).
Run `node scripts/validate-content.mjs` after writing; it must print `OK`.

## Topic file

```json
{
  "id": "A1.1",
  "theme": "A",
  "title": "Water",
  "level": "SL",
  "summary": "One or two student-friendly sentences on what this topic is about.",
  "keyterms": [
    { "id": "a1.1-cohesion", "term": "Cohesion", "definition": "Attraction between water molecules due to hydrogen bonding.", "hl": false }
  ],
  "lessons": [
    { "id": "A1.1-1", "title": "Hydrogen bonding", "hl": false, "questions": [ ] }
  ]
}
```

- `level`: `"SL"` if the topic is in the SL+HL core (it may still contain HL-only lessons/terms marked `"hl": true`), `"HL"` if the whole topic is AHL/HL-only.
- `keyterms`: 10–16 per topic. `id` = lowercase topic id + `-` + slug, globally unique. Definitions are concise (≤ 30 words), IB-mark-scheme accurate.
- `lessons`: 2–3 per topic, each 10 questions (allowed range 8–12). Lessons build from basics to application. HL extension material goes in a final lesson with `"hl": true`.

## Questions

Every question has:
- `id`: `<lessonId>-q<NN>`, e.g. `A1.1-1-q01`, globally unique
- `type`: one of `mcq`, `tf`, `fill`, `match`, `order`
- `explanation`: 1–2 sentences explaining the correct answer (shown when the student is wrong; for `tf` always shown)
- `terms`: array of keyterm ids this question tests (≥ 1 where possible; used by spaced-repetition review)

### mcq
```json
{ "id": "A1.1-1-q01", "type": "mcq", "prompt": "Why is water a polar molecule?",
  "options": ["...", "...", "...", "..."], "answer": 2, "explanation": "...", "terms": ["a1.1-polarity"] }
```
3–4 options, `answer` is the 0-based index. Distractors must be plausible misconceptions, not jokes. Vary the answer position.

### tf
```json
{ "id": "...", "type": "tf", "statement": "Ice is denser than liquid water.", "answer": false, "explanation": "...", "terms": [] }
```

### fill
```json
{ "id": "...", "type": "fill", "text": "The attraction between water molecules is called ___.",
  "answer": "cohesion", "accept": ["cohesive forces"], "bank": ["cohesion", "adhesion", "osmosis", "capillarity"],
  "explanation": "...", "terms": ["a1.1-cohesion"] }
```
`text` contains exactly one `___`. `bank` has 3–5 entries and includes `answer`. `accept` is optional.

### match
```json
{ "id": "...", "type": "match", "prompt": "Match each property to its cause.",
  "pairs": [ { "left": "Cohesion", "right": "Water–water hydrogen bonds" }, ... ],
  "explanation": "...", "terms": ["a1.1-cohesion", "a1.1-adhesion"] }
```
3–5 pairs. Left items unique, right items unique, right side ≤ 12 words.

### order
```json
{ "id": "...", "type": "order", "prompt": "Put the stages of mitosis in order.",
  "items": ["Prophase", "Metaphase", "Anaphase", "Telophase"], "explanation": "...", "terms": [] }
```
`items` are listed in the CORRECT order (the app shuffles). 3–6 items. Only use for genuine sequences.

## Mix per 10-question lesson
Roughly: 3 mcq, 2 tf, 2 fill, 1 match, 1 order (replace with mcq if no sensible sequence), 1 any.
Use IB command-term style where natural ("Outline", "Distinguish", "Explain"). Use exact IB terminology.
No content outside the IB Biology guide. Accuracy matters more than volume.
