// Courses with content in Axon. Only list a course here once its lessons exist,
// so nothing is shown that can't be studied.
export const COURSES = [
  {
    id: 'biology',
    name: 'Biology',
    group: 'Group 4: Sciences',
    icon: '🧬',
    blurb: 'All 40 syllabus topics (first assessment 2025)',
    levels: ['SL', 'HL'],
  },
];

export const courseById = new Map(COURSES.map((c) => [c.id, c]));
