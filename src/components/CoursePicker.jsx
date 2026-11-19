// Choose IB courses and the level for each. Controlled: value = [{ id, level }].
import { COURSES, COURSE_GROUPS } from '../content/index.js';

export function CoursePicker({ value, onChange, keepOne = false }) {
  const selected = new Map(value.map((c) => [c.id, c]));
  const toggle = (course) => {
    if (selected.has(course.id)) onChange(value.filter((c) => c.id !== course.id));
    else onChange([...value, { id: course.id, level: course.levels[course.levels.length - 1] }]);
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
              const locked = keepOne && sel && value.length === 1;
              const inner = (
                <>
                  <span className="course-icon" aria-hidden="true">{c.icon}</span>
                  <span className="course-name">{c.name}</span>
                  <span className="course-tag">{c.levels.length > 1 ? 'SL / HL' : 'SL'} · {c.blurb}</span>
                  <span className="course-check" aria-hidden="true">{sel ? '✓' : '+'}</span>
                </>
              );
              return (
                <li key={c.id} className={`course-card ${sel ? 'selected' : ''}`}>
                  {locked ? (
                    // The last course can't be removed, so show it as a label rather than a button that does nothing.
                    <div className="course-toggle">{inner}</div>
                  ) : (
                    <button type="button" className="course-toggle" aria-pressed={!!sel} onClick={() => toggle(c)}>{inner}</button>
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
        </fieldset>
      ))}
    </div>
  );
}
