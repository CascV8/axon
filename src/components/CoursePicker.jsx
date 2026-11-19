// Choose IB courses (and SL/HL for each). Controlled: value = [{ id, level }].
import { COURSES, COURSE_GROUPS } from '../content/courses.js';

export function CoursePicker({ value, onChange }) {
  const selected = new Map(value.map((c) => [c.id, c]));
  const toggle = (course) => {
    if (selected.has(course.id)) onChange(value.filter((c) => c.id !== course.id));
    else onChange([...value, { id: course.id, level: course.noLevel ? null : course.slOnly ? 'SL' : 'HL' }]);
  };
  const setLevel = (id, level) => onChange(value.map((c) => (c.id === id ? { ...c, level } : c)));

  return (
    <div className="course-picker">
      {COURSE_GROUPS.map((g) => (
        <fieldset key={g} className="fieldset">
          <legend>{g}</legend>
          <ul className="course-grid">
            {COURSES.filter((c) => c.group === g).map((c) => {
              const sel = selected.get(c.id);
              return (
                <li key={c.id} className={`course-card ${sel ? 'selected' : ''} ${c.available ? '' : 'soon'}`}>
                  <button type="button" className="course-toggle" aria-pressed={!!sel} onClick={() => toggle(c)}>
                    <span className="course-icon" aria-hidden="true">{c.icon}</span>
                    <span className="course-name">{c.name}</span>
                    <span className={`course-tag ${c.available ? 'live' : ''}`}>{c.available ? 'Available' : 'Coming soon'}</span>
                    <span className="course-check" aria-hidden="true">{sel ? '✓' : '+'}</span>
                  </button>
                  {sel && !c.noLevel && !c.slOnly && (
                    <div className="seg seg-mini" role="radiogroup" aria-label={`${c.name} level`}>
                      {['SL', 'HL'].map((l) => (
                        <label key={l} className={`seg-item ${sel.level === l ? 'selected' : ''}`}>
                          <input type="radio" name={`lvl-${c.id}`} checked={sel.level === l} onChange={() => setLevel(c.id, l)} />{l}
                        </label>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
