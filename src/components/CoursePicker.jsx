// Choose courses and the level for each. Controlled: value = [{ id, level }].
import { COURSES } from '../content/courses.js';

export function CoursePicker({ value, onChange, keepOne = false }) {
  const selected = new Map(value.map((c) => [c.id, c]));
  const toggle = (course) => {
    if (selected.has(course.id)) onChange(value.filter((c) => c.id !== course.id));
    else onChange([...value, { id: course.id, level: course.levels.at(-1) }]);
  };
  const setLevel = (id, level) => onChange(value.map((c) => (c.id === id ? { ...c, level } : c)));

  return (
    <ul className="course-grid course-picker">
      {COURSES.map((c) => {
        const sel = selected.get(c.id);
        return (
          <li key={c.id} className={`course-card ${sel ? 'selected' : ''}`}>
            {keepOne && sel && value.length === 1 ? (
              // The last course can't be removed, so show it as a label rather than a button that does nothing.
              <div className="course-toggle">
                <span className="course-icon" aria-hidden="true">{c.icon}</span>
                <span className="course-name">{c.name}</span>
                <span className="course-tag live">{c.blurb}</span>
                <span className="course-check" aria-hidden="true">✓</span>
              </div>
            ) : (
              <button type="button" className="course-toggle" aria-pressed={!!sel} onClick={() => toggle(c)}>
                <span className="course-icon" aria-hidden="true">{c.icon}</span>
                <span className="course-name">{c.name}</span>
                <span className="course-tag live">{c.blurb}</span>
                <span className="course-check" aria-hidden="true">{sel ? '✓' : '+'}</span>
              </button>
            )}
            {sel && c.levels.length > 1 && (
              <div className="seg seg-mini" role="radiogroup" aria-label={`${c.name} level`}>
                {c.levels.map((l) => (
                  <label key={l} className={`seg-item ${sel.level === l ? 'selected' : ''}`}>
                    <input type="radio" name={`lvl-${c.id}`} checked={sel.level === l} onChange={() => setLevel(c.id, l)} />
                    {l === 'SL' ? 'Standard (SL)' : 'Higher (HL)'}
                  </label>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
