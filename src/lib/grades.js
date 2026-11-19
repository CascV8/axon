// Grade maths shared by every course (pure; unit-tested).

/** Weighted overall % from component marks, using a course's assessment block for one level. */
export function weightedPercent(assessment, marks) {
  let total = 0;
  for (const [gid, g] of Object.entries(assessment.groups)) {
    const comps = assessment.components.filter((c) => c.group === gid);
    const max = comps.reduce((s, c) => s + c.max, 0);
    const got = comps.reduce((s, c) => s + Math.min(c.max, Math.max(0, Number(marks[c.id]) || 0)), 0);
    total += max ? (got / max) * g.weight : 0;
  }
  return total;
}

/** Weight (in % of the final grade) carried by each component. */
export function componentWeights(assessment) {
  const out = {};
  for (const [gid, g] of Object.entries(assessment.groups)) {
    const comps = assessment.components.filter((c) => c.group === gid);
    const max = comps.reduce((s, c) => s + c.max, 0);
    for (const c of comps) out[c.id] = max ? (c.max / max) * g.weight : 0;
  }
  return out;
}

/**
 * Average % needed on the components the student hasn't entered yet to reach `targetPercent`.
 * Returns null when every component is entered.
 */
export function neededOnRemaining(assessment, marks, targetPercent) {
  const w = componentWeights(assessment);
  let have = 0;
  let remaining = 0;
  for (const c of assessment.components) {
    const v = marks[c.id];
    if (v === '' || v === undefined || v === null) remaining += w[c.id];
    else have += (Math.min(c.max, Math.max(0, Number(v) || 0)) / c.max) * w[c.id];
  }
  if (remaining <= 0) return null;
  return ((targetPercent - have) / remaining) * 100;
}

export function gradeFor(percent, min) {
  let g = 1;
  for (let i = 0; i < min.length; i++) if (percent >= min[i]) g = i + 1;
  return g;
}

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

export const DIPLOMA_SOURCES = [
  { label: 'IB DP statistical bulletins', url: 'https://www.ibo.org/about-the-ib/facts-and-figures/statistical-bulletins/' },
  { label: 'IB DP passing criteria', url: 'https://www.ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/' },
];
