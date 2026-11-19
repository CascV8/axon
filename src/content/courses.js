// IB DP course catalog. Only courses with `available: true` have content today;
// the rest can be picked so students see them the moment they launch.
export const COURSES = [
  { id: 'biology', name: 'Biology', group: 'Sciences', icon: '🧬', available: true },
  { id: 'chemistry', name: 'Chemistry', group: 'Sciences', icon: '⚗️' },
  { id: 'physics', name: 'Physics', group: 'Sciences', icon: '🪐' },
  { id: 'ess', name: 'Environmental Systems & Societies', group: 'Sciences', icon: '🌍', slOnly: true },
  { id: 'computer-science', name: 'Computer Science', group: 'Sciences', icon: '💻' },
  { id: 'sehs', name: 'Sports, Exercise & Health Science', group: 'Sciences', icon: '🏃' },
  { id: 'math-aa', name: 'Maths: Analysis & Approaches', group: 'Mathematics', icon: '📐' },
  { id: 'math-ai', name: 'Maths: Applications & Interpretation', group: 'Mathematics', icon: '📊' },
  { id: 'psychology', name: 'Psychology', group: 'Individuals & Societies', icon: '🧠' },
  { id: 'economics', name: 'Economics', group: 'Individuals & Societies', icon: '💹' },
  { id: 'business', name: 'Business Management', group: 'Individuals & Societies', icon: '💼' },
  { id: 'history', name: 'History', group: 'Individuals & Societies', icon: '🏛️' },
  { id: 'geography', name: 'Geography', group: 'Individuals & Societies', icon: '🗺️' },
  { id: 'english-ll', name: 'English A: Language & Literature', group: 'Language & Literature', icon: '📖' },
  { id: 'english-lit', name: 'English A: Literature', group: 'Language & Literature', icon: '📚' },
  { id: 'spanish-b', name: 'Spanish B', group: 'Language Acquisition', icon: '🇪🇸' },
  { id: 'french-b', name: 'French B', group: 'Language Acquisition', icon: '🇫🇷' },
  { id: 'visual-arts', name: 'Visual Arts', group: 'The Arts', icon: '🎨' },
  { id: 'tok', name: 'Theory of Knowledge', group: 'Core', icon: '💭', noLevel: true },
];

export const courseById = new Map(COURSES.map((c) => [c.id, c]));
export const COURSE_GROUPS = [...new Set(COURSES.map((c) => c.group))];
