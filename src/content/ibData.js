// Public factual data about IB Biology assessment (first assessment May 2025).
// Figures come from IB statistical bulletins and widely circulated boundary tables;
// they are indicative only — always check with your school / the IB.

export const ASSESSMENT = {
  SL: {
    components: [
      { id: 'p1a', name: 'Paper 1A', detail: '30 multiple-choice questions', max: 30, group: 'p1' },
      { id: 'p1b', name: 'Paper 1B', detail: 'Data-based questions', max: 25, group: 'p1' },
      { id: 'p2', name: 'Paper 2', detail: 'Data, short answer and extended response', max: 50, group: 'p2' },
      { id: 'ia', name: 'Internal assessment', detail: 'Scientific investigation', max: 24, group: 'ia' },
    ],
    groups: { p1: { name: 'Paper 1 (1A + 1B)', weight: 36, time: '1 h 30 min' }, p2: { name: 'Paper 2', weight: 44, time: '1 h 30 min' }, ia: { name: 'IA', weight: 20, time: '10 hours of class time' } },
  },
  HL: {
    components: [
      { id: 'p1a', name: 'Paper 1A', detail: '40 multiple-choice questions', max: 40, group: 'p1' },
      { id: 'p1b', name: 'Paper 1B', detail: 'Data-based questions', max: 35, group: 'p1' },
      { id: 'p2', name: 'Paper 2', detail: 'Data, short answer and extended response', max: 80, group: 'p2' },
      { id: 'ia', name: 'Internal assessment', detail: 'Scientific investigation', max: 24, group: 'ia' },
    ],
    groups: { p1: { name: 'Paper 1 (1A + 1B)', weight: 36, time: '2 h' }, p2: { name: 'Paper 2', weight: 44, time: '2 h 30 min' }, ia: { name: 'IA', weight: 20, time: '10 hours of class time' } },
  },
};

/** Overall % needed for grades 1–7 (index 0 = grade 1). Third-party collation of IB boundary documents. */
export const BOUNDARIES = {
  HL: [
    { session: 'May 2026', tz: 'TZ1', min: [0, 13, 22, 35, 49, 62, 76] },
    { session: 'May 2026', tz: 'TZ2', min: [0, 13, 25, 37, 51, 65, 78] },
    { session: 'May 2026', tz: 'TZ3', min: [0, 13, 21, 34, 46, 59, 71] },
    { session: 'Nov 2025', tz: 'TZ1', min: [0, 14, 24, 38, 51, 65, 78] },
    { session: 'Nov 2025', tz: 'TZ3', min: [0, 13, 21, 34, 48, 63, 77] },
    { session: 'May 2025', tz: 'TZ1', min: [0, 13, 25, 36, 49, 62, 76] },
    { session: 'May 2025', tz: 'TZ2', min: [0, 14, 25, 36, 49, 62, 74] },
    { session: 'May 2025', tz: 'TZ3', min: [0, 13, 23, 36, 49, 63, 76] },
    { session: 'Nov 2024', tz: 'TZ1', min: [0, 13, 23, 35, 50, 64, 79], old: true },
    { session: 'May 2024', tz: 'TZ1', min: [0, 14, 25, 36, 50, 62, 76], old: true },
    { session: 'May 2024', tz: 'TZ2', min: [0, 15, 25, 35, 50, 62, 76], old: true },
  ],
  SL: [
    { session: 'May 2026', tz: 'TZ1', min: [0, 14, 26, 38, 51, 64, 77] },
    { session: 'May 2026', tz: 'TZ2', min: [0, 14, 24, 36, 48, 61, 74] },
    { session: 'May 2026', tz: 'TZ3', min: [0, 13, 23, 35, 48, 61, 75] },
    { session: 'Nov 2025', tz: 'TZ1', min: [0, 14, 25, 40, 52, 66, 78] },
    { session: 'Nov 2025', tz: 'TZ3', min: [0, 14, 24, 39, 52, 64, 77] },
    { session: 'May 2025', tz: 'TZ1', min: [0, 13, 26, 39, 52, 64, 77] },
    { session: 'May 2025', tz: 'TZ2', min: [0, 13, 24, 36, 48, 60, 72] },
    { session: 'May 2025', tz: 'TZ3', min: [0, 11, 21, 33, 46, 59, 72] },
    { session: 'Nov 2024', tz: 'TZ1', min: [0, 14, 26, 40, 52, 64, 76], old: true },
    { session: 'Nov 2024', tz: 'TZ2', min: [0, 16, 29, 43, 55, 68, 81], old: true },
    { session: 'May 2024', tz: 'TZ1', min: [0, 15, 27, 40, 52, 64, 76], old: true },
    { session: 'May 2024', tz: 'TZ2', min: [0, 15, 25, 38, 50, 63, 75], old: true },
  ],
};

/** IB Statistical Bulletin figures for Biology. dist = % of candidates at grades 1–7 where available. */
export const STATS = {
  HL: [
    { session: 'May 2023', candidates: 31912, mean: 4.41, pct7: 6.3, pct67: 22.8 },
    { session: 'May 2024', candidates: 32155, mean: 4.4, pct7: 7.1, pct67: 23.8 },
    { session: 'May 2025', candidates: 33102, mean: 4.5, pct7: 7.2, pct67: 23.8, dist: [1.0, 6.7, 18.0, 24.8, 23.9, 16.6, 7.2] },
    { session: 'May 2026', provisional: true, candidates: 33585, mean: 4.5, pct7: 7.4, pct67: 24.6, dist: [0.9, 5.1, 19.5, 24.9, 23.2, 17.2, 7.4] },
  ],
  SL: [
    { session: 'May 2023', candidates: 20865, mean: 4.15, pct7: 5.3, pct67: 18.6 },
    { session: 'May 2024', candidates: 21564, mean: 4.2, pct7: 5.6, pct67: 18.5 },
    { session: 'May 2025', candidates: 21939, mean: 4.3, pct7: 5.9, pct67: 19.8 },
    { session: 'May 2026', provisional: true, candidates: 22064, mean: 4.3, pct7: 5.5, pct67: 20.8, dist: [1.7, 8.0, 18.9, 25.6, 22.2, 15.3, 5.5] },
  ],
};

export const DIPLOMA = {
  overall: [
    { session: 'May 2023', passRate: 79.7, meanPoints: 30.24 },
    { session: 'May 2024', passRate: 80.5, meanPoints: 30.32 },
    { session: 'May 2025', passRate: 81.3, meanPoints: 30.5 },
  ],
  // Bonus points: rows = TOK grade, columns = EE grade (A–D). E in either = failing condition.
  matrix: {
    A: { A: 3, B: 3, C: 2, D: 2 },
    B: { A: 3, B: 2, C: 2, D: 1 },
    C: { A: 2, B: 2, C: 1, D: 0 },
    D: { A: 2, B: 1, C: 0, D: 0 },
  },
};

export const IA_CRITERIA = [
  {
    id: 'rd', name: 'Research design', max: 6,
    look: [
      'A focused, relevant research question with clearly defined variables',
      'Background that explains the biology and why the question matters',
      'A method that is detailed enough to repeat, with controlled variables and how they are controlled',
      'Enough data (range, increments, repeats) to answer the question',
      'Safety, ethical and environmental issues considered where relevant',
    ],
  },
  {
    id: 'da', name: 'Data analysis', max: 6,
    look: [
      'Raw data recorded clearly with units and uncertainties',
      'Appropriate processing (means, SD, rates, statistical test) shown with a worked example',
      'Graphs that suit the data, with labelled axes, units and error bars',
      'Uncertainties carried through and their impact considered',
    ],
  },
  {
    id: 'co', name: 'Conclusion', max: 6,
    look: [
      'A conclusion that directly answers the research question',
      'Justified with the processed data, quoting values',
      'Compared with accepted scientific context or published research',
      'Acknowledges how far the data support the conclusion',
    ],
  },
  {
    id: 'ev', name: 'Evaluation', max: 6,
    look: [
      'Specific methodological weaknesses identified and their effect on the results explained',
      'Distinguishes systematic and random errors',
      'Realistic, specific improvements linked to each weakness',
      'Sensible extensions to the investigation',
    ],
  },
];

export const SOURCES = [
  { label: 'IB DP final statistical bulletin, May 2025', url: 'https://www.ibo.org/about-the-ib/facts-and-figures/statistical-bulletins/' },
  { label: 'IB DP statistical bulletins, May 2023 & May 2024', url: 'https://www.ibo.org/about-the-ib/facts-and-figures/statistical-bulletins/' },
  { label: 'IB Biology subject brief (assessment weightings)', url: 'https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/biology/' },
  { label: 'IB DP passing criteria', url: 'https://www.ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/' },
  { label: 'Grade boundary collation (third party, ibcalculator.com)', url: 'https://www.ibcalculator.com/resources/boundaries/biology-hl' },
];

/* ---------- calculations ---------- */
export function weightedPercent(track, marks) {
  const a = ASSESSMENT[track];
  let total = 0;
  for (const [gid, g] of Object.entries(a.groups)) {
    const comps = a.components.filter((c) => c.group === gid);
    const max = comps.reduce((s, c) => s + c.max, 0);
    const got = comps.reduce((s, c) => s + Math.min(c.max, Math.max(0, Number(marks[c.id]) || 0)), 0);
    total += (got / max) * g.weight;
  }
  return total;
}
export function gradeFor(percent, min) {
  let g = 1;
  for (let i = 0; i < min.length; i++) if (percent >= min[i]) g = i + 1;
  return g;
}
export function diplomaCheck(subjects, tok, ee) {
  const grades = subjects.map((s) => Number(s.grade) || 0);
  const bonus = tok === 'E' || ee === 'E' ? 0 : DIPLOMA.matrix[tok]?.[ee] ?? 0;
  const total = grades.reduce((a, b) => a + b, 0) + bonus;
  const hl = subjects.filter((s) => s.level === 'HL').map((s) => Number(s.grade) || 0).sort((a, b) => b - a).slice(0, 3);
  const sl = subjects.filter((s) => s.level === 'SL').map((s) => Number(s.grade) || 0);
  const problems = [];
  if (total < 24) problems.push('Fewer than 24 points in total');
  if (tok === 'E' || ee === 'E') problems.push('An E in TOK or the extended essay');
  if (grades.some((g) => g === 1)) problems.push('A grade 1 in a subject');
  if (grades.filter((g) => g === 2).length > 2) problems.push('More than two grade 2s');
  if (grades.filter((g) => g <= 3).length > 3) problems.push('More than three grades of 3 or below');
  if (hl.reduce((a, b) => a + b, 0) < 12) problems.push('Fewer than 12 points on HL subjects');
  const slNeeded = sl.length === 2 ? 5 : 9;
  if (sl.length && sl.reduce((a, b) => a + b, 0) < slNeeded) problems.push(`Fewer than ${slNeeded} points on SL subjects`);
  return { total, bonus, pass: problems.length === 0, problems };
}
