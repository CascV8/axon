# Axon exam-style question schema

Structured, ORIGINAL exam-style questions modelled on IB Biology (first assessment 2025) Paper 1B and Paper 2.
Never copy or paraphrase real IB past-paper questions. Invent your own contexts and data (plausible, internally consistent numbers).
Files: `src/content/exam/<THEME>.json` (A.json, B.json, C.json, D.json), each a JSON array of items.
Validate with `node scripts/validate-exam.mjs` — it must print OK.

```json
{
  "id": "XA-01",
  "theme": "A",
  "topics": ["A1.1", "A2.2"],
  "paper": "1B",
  "level": "SL",
  "title": "Salt stress in grass seedlings",
  "stem": "Seedlings of a grass were grown for 21 days at three soil salt concentrations. Mean dry biomass per plant (n = 20) is shown.",
  "data": {
    "caption": "Mean dry mass of seedlings after 21 days",
    "columns": ["NaCl / mmol dm⁻³", "Mean dry mass / mg", "SD / mg"],
    "rows": [["0", "84", "6"], ["50", "71", "9"], ["100", "42", "11"]]
  },
  "parts": [
    {
      "label": "a",
      "command": "Calculate",
      "prompt": "Calculate the percentage change in mean dry mass between 0 and 100 mmol dm⁻³.",
      "marks": 2,
      "numeric": { "value": -50, "tolerance": 0.5, "unit": "%" },
      "markscheme": ["(42 − 84) / 84 × 100", "−50 % / 50 % decrease (sign or 'decrease' required)"],
      "notes": "ECF from an incorrect subtraction."
    },
    {
      "label": "b",
      "command": "Evaluate",
      "prompt": "Evaluate the hypothesis that ...",
      "marks": 3,
      "markscheme": ["supporting point ...", "limitation ...", "..."],
      "notes": "At least one supporting and one limiting point for full marks."
    }
  ]
}
```

Rules
- `id`: `X<THEME>-NN`, unique. `theme`: A–D. `topics`: syllabus topic ids (e.g. "B3.1") that exist in src/content/topics.
- `paper`: `"1B"` (data-based, 3–5 parts, 6–10 marks total), `"2A"` (Paper 2 section A short answer, 2–4 parts, 5–9 marks) or `"2B"` (extended response: 3 parts typically 4 + 4 + 7 = 15 marks, no data needed).
- `level`: `"SL"` or `"HL"` (HL if any part needs AHL content).
- `data` optional (required for 1B): a table (`columns` + `rows` of strings, all rows same length as columns). Use proper units in headers ("/ mg", "/ s").
- Parts: `label` a, b, c...; `command` must be an IB command term (Calculate, State, Identify, Outline, Describe, Compare, Compare and contrast, Distinguish, Explain, Suggest, Evaluate, Discuss, Deduce, Predict, Determine, Estimate, Analyse, Annotate, Sketch, Define, List); `prompt` starts appropriately; `marks` 1–8.
- `markscheme`: array of marking points, ≥ `marks` entries (IB style: list more points than the max, one mark each). Use IB conventions in the text: "/" for alternatives, "OWTTE", "Reject ...", "Allow ...".
- `numeric` (optional, only for Calculate/Determine/Estimate parts): `value` number, `tolerance` absolute number, `unit` string ("" if none). The answer must be correct!
- `notes` optional: examiner-style guidance or a common mistake (one sentence).
- Mix per theme file: 4 × 1B, 3 × 2A, 3 × 2B (10 items). Cover different topics of the theme; include some HL items.
- Double-check every calculation. Accuracy matters more than volume.
