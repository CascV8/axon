// Exam prep hub for the active course.
import { useActive } from '../lib/active.js';
import { visibleItems } from '../content/index.js';

export function Exams() {
  const { p, course, meta, level } = useActive();
  const a = meta.assessment[level];
  const items = visibleItems(course, level);
  const lastExam = p.exams.filter((e) => (e.course ?? 'biology') === meta.id).at(-1);
  const examLabel = meta.mcqExam?.label ?? 'Timed quiz';

  return (
    <div className="exams">
      <h1 className="page-title">Exam prep <small className="page-course">{meta.icon} {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}</small></h1>

      {items.length > 0 && (
        <a className="card action-card" href="#/bank">
          <span className="action-icon" aria-hidden="true">✍️</span>
          <span className="action-main">
            <span className="action-title">Question bank</span>
            <span className="action-sub">{items.length} original exam-style questions with markschemes · self-mark like an examiner</span>
          </span>
        </a>
      )}
      <a className="card action-card action-exam" href="#/exam">
        <span className="action-icon" aria-hidden="true">⏱️</span>
        <span className="action-main">
          <span className="action-title">{examLabel}</span>
          <span className="action-sub">
            {lastExam ? `Last score ${Math.round((lastExam.score / lastExam.total) * 100)}% · ` : ''}
            {meta.mcqExam ? `Timed multiple choice, ${meta.mcqExam[level]} questions for a full paper` : 'Timed multiple-choice quiz from across the course'}
          </span>
        </span>
      </a>
      <a className="card action-card" href="#/grades">
        <span className="action-icon" aria-hidden="true">📊</span>
        <span className="action-main">
          <span className="action-title">Grade calculator &amp; boundaries</span>
          <span className="action-sub">Predict your 1–7, see past boundaries and work out your diploma points</span>
        </span>
      </a>
      <a className="card action-card" href="#/ia">
        <span className="action-icon" aria-hidden="true">🧪</span>
        <span className="action-main">
          <span className="action-title">IA toolkit: {meta.ia.name}</span>
          <span className="action-sub">Self-assess the {meta.ia.criteria.length} criteria, pre-submission checklist, notes with word count</span>
        </span>
      </a>

      <section className="card" aria-labelledby="papers-title">
        <h2 id="papers-title">Know your papers · {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Component</th><th scope="col">Marks</th><th scope="col">Time</th><th scope="col">Weight</th></tr></thead>
            <tbody>
              {Object.entries(a.groups).map(([gid, g]) => {
                const comps = a.components.filter((c) => c.group === gid);
                return (
                  <tr key={gid}>
                    <th scope="row">{g.name}<small>{comps.map((c) => `${c.name}${c.detail ? `: ${c.detail}` : ''} (${c.max})`).join(' · ')}</small></th>
                    <td>{comps.reduce((s, c) => s + c.max, 0)}</td>
                    <td>{g.time ?? '–'}</td>
                    <td>{g.weight}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted-small">{meta.syllabus}.</p>
        <h3 className="mini-title">Examiner tips</h3>
        <ul className="look-list">{meta.examTips.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
    </div>
  );
}
