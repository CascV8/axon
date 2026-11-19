// Internal assessment helper for the active course: criteria self-assessment, checklist, notes.
import { actions } from '../lib/store.js';
import { useActive } from '../lib/active.js';

export function IaToolkit() {
  const { p, meta } = useActive();
  const ia = meta.ia;
  // Biology stored its IA data at the top level before courses existed.
  const legacy = meta.id === 'biology' ? { marks: p.ia?.marks, checks: p.ia?.checks } : {};
  const mine = p.ia?.courses?.[meta.id] ?? legacy;
  const marks = mine.marks ?? {};
  const checks = mine.checks ?? {};
  const save = (patch) => actions.setIa({ courses: { ...(p.ia?.courses ?? {}), [meta.id]: { marks, checks, ...patch } } });
  const notesKey = `ia:${meta.id}:notes`;
  const notes = p.drafts[notesKey] ?? (meta.id === 'biology' ? p.drafts['ia:notes'] : '') ?? '';
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const total = ia.criteria.reduce((s, c) => s + (Number(marks[c.id]) || 0), 0);
  const done = ia.checklist.filter((_, i) => checks[i]).length;
  const wordCap = Number((ia.limit.match(/([\d,]+)\s*words/i)?.[1] ?? '').replace(/,/g, '')) || null;

  return (
    <div className="ia">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">IA toolkit <small className="page-course">{meta.icon} {meta.name}: {ia.name}</small></h1>
      <p>The {ia.name.toLowerCase()} is worth {ia.weight}% of your {meta.name} grade, marked out of {ia.max} across {ia.criteria.length} criteria. Limit: {ia.limit}.</p>

      <div className="tiles tiles-2">
        <div className="tile tile-acc"><span className="tile-label">Self-assessed</span><span className="tile-value">{total}/{ia.max}</span></div>
        <div className="tile"><span className="tile-label">Checklist</span><span className="tile-value">{done}/{ia.checklist.length}</span></div>
      </div>

      {ia.criteria.map((c) => (
        <section key={c.id} className="card">
          <div className="row-between">
            <h2>{c.name}</h2>
            <span className="score-pill">{marks[c.id] ?? 0}/{c.max}</span>
          </div>
          <p className="mini-title">What strong work shows</p>
          <ul className="look-list">{c.look.map((l) => <li key={l}>{l}</li>)}</ul>
          <label className="field">
            <span>Your honest estimate: {marks[c.id] ?? 0}/{c.max}</span>
            <input type="range" min={0} max={c.max} step={1} value={marks[c.id] ?? 0}
              onChange={(e) => save({ marks: { ...marks, [c.id]: Number(e.target.value) } })}
              aria-valuetext={`${marks[c.id] ?? 0} out of ${c.max}`} className="range" />
          </label>
        </section>
      ))}

      <section className="card">
        <h2>Before you submit</h2>
        <ul className="check-list">
          {ia.checklist.map((t, i) => (
            <li key={i}>
              <label className="switch-row">
                <input type="checkbox" checked={!!checks[i]} onChange={(e) => save({ checks: { ...checks, [i]: e.target.checked } })} />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Notes &amp; planning</h2>
          <span className={`score-pill ${wordCap && words > wordCap ? 'low' : ''}`}>{words.toLocaleString()}{wordCap ? ` / ${wordCap.toLocaleString()}` : ''} words</span>
        </div>
        <label className="sr-only" htmlFor="ia-notes">IA notes</label>
        <textarea id="ia-notes" className="textarea" rows={10} value={notes}
          placeholder="Ideas, research question, plan, sources, oral notes… saved automatically."
          onChange={(e) => actions.saveDraft(notesKey, e.target.value)} />
        <p className="muted-small">Saved with your progress (and synced if you have an account).</p>
      </section>
      <p className="footnote">Guidance is written by Axon in its own words. Your teacher and the official criteria are the final authority.</p>
    </div>
  );
}
