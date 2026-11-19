// Internal assessment helper: self-assessment against the four criteria, checklist, notes with word count.
import { IA_CRITERIA } from '../content/ibData.js';
import { actions, useProgress } from '../lib/store.js';

const PITFALLS = [
  'Research question names the independent and dependent variables, with units/range',
  'At least 5 levels of the independent variable, with enough repeats for each',
  'Uncertainties stated for every measuring instrument',
  'A worked example for each calculation',
  'Graphs have titles, labelled axes with units, and error bars',
  'Statistical test chosen and justified (e.g. t-test, chi-squared, correlation)',
  'Conclusion quotes processed values and refers back to the research question',
  'Weaknesses are specific to YOUR method, each with a realistic improvement',
  'Report is under 3,000 words (excluding tables, graphs, references)',
  'All sources referenced consistently',
];

export function IaToolkit() {
  const p = useProgress();
  const ia = p.ia ?? {};
  const marks = ia.marks ?? {};
  const checks = ia.checks ?? {};
  const notes = p.drafts['ia:notes'] ?? '';
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const total = IA_CRITERIA.reduce((s, c) => s + (Number(marks[c.id]) || 0), 0);
  const done = PITFALLS.filter((_, i) => checks[i]).length;

  return (
    <div className="ia">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">IA toolkit</h1>
      <p>The scientific investigation is worth 20% of your grade, marked out of 24 across four criteria (6 marks each), with a 3,000-word limit.</p>

      <div className="tiles tiles-2">
        <div className="tile tile-acc"><span className="tile-label">Self-assessed</span><span className="tile-value">{total}/24</span></div>
        <div className="tile"><span className="tile-label">Checklist</span><span className="tile-value">{done}/{PITFALLS.length}</span></div>
      </div>

      {IA_CRITERIA.map((c) => (
        <section key={c.id} className="card">
          <div className="row-between">
            <h2>{c.name}</h2>
            <span className="score-pill">{marks[c.id] ?? 0}/{c.max}</span>
          </div>
          <p className="mini-title">What strong work shows</p>
          <ul className="look-list">{c.look.map((l) => <li key={l}>{l}</li>)}</ul>
          <label className="field">
            <span>Your honest estimate: {marks[c.id] ?? 0}/6</span>
            <input type="range" min={0} max={6} step={1} value={marks[c.id] ?? 0}
              onChange={(e) => actions.setIa({ marks: { ...marks, [c.id]: Number(e.target.value) } })}
              aria-valuetext={`${marks[c.id] ?? 0} out of 6`} className="range" />
          </label>
        </section>
      ))}

      <section className="card">
        <h2>Before you submit</h2>
        <ul className="check-list">
          {PITFALLS.map((t, i) => (
            <li key={i}>
              <label className="switch-row">
                <input type="checkbox" checked={!!checks[i]} onChange={(e) => actions.setIa({ checks: { ...checks, [i]: e.target.checked } })} />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Notes &amp; draft planning</h2>
          <span className={`score-pill ${words > 3000 ? 'low' : ''}`}>{words.toLocaleString()} / 3,000 words</span>
        </div>
        <label className="sr-only" htmlFor="ia-notes">IA notes</label>
        <textarea id="ia-notes" className="textarea" rows={10} value={notes}
          placeholder="Research question, variables, method plan, results notes… saved in this browser automatically."
          onChange={(e) => actions.saveDraft('ia:notes', e.target.value)} />
        <p className="muted-small">Saved on this device only. Use Profile → Download backup to keep a copy.</p>
      </section>
      <p className="footnote">Guidance is written by Axon in its own words. Your teacher and the official criteria are the final authority.</p>
    </div>
  );
}
