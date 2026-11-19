import { useMemo, useState } from 'react';
import { weightedPercent, gradeFor, diplomaCheck, neededOnRemaining, DIPLOMA, DIPLOMA_SOURCES } from '../lib/grades.js';
import { actions } from '../lib/store.js';
import { useActive } from '../lib/active.js';
import { courseById } from '../content/index.js';

function BarChart({ values, labels, label, unit = '%' }) {
  const max = Math.max(...values, 1);
  return (
    <figure className="chart">
      <div className="chart-bars" role="img" aria-label={`${label}: ${values.map((v, i) => `grade ${labels[i]} ${v}${unit}`).join(', ')}`}>
        {values.map((v, i) => (
          <div key={i} className="chart-col" tabIndex={0} aria-hidden="true">
            <span className="chart-tip">{v}{unit}</span>
            <span className="chart-bar" style={{ height: `${(v / max) * 100}%` }} />
            <span className="chart-x">{labels[i]}</span>
          </div>
        ))}
      </div>
      <figcaption className="chart-cap">{label}</figcaption>
    </figure>
  );
}

function LevelSwitch({ meta, value, onChange, name }) {
  if (meta.levels.length < 2) return null;
  return (
    <div className="seg" role="radiogroup" aria-label="Level" style={{ marginBottom: 14 }}>
      {meta.levels.map((t) => (
        <label key={t} className={`seg-item ${value === t ? 'selected' : ''}`}>
          <input type="radio" name={name} checked={value === t} onChange={() => onChange(t)} />
          {meta.name} {t}
        </label>
      ))}
    </div>
  );
}

function SubjectCalculator({ p, meta, level, setLevel }) {
  const a = meta.assessment[level];
  const sessions = meta.boundaries[level];
  const [sessionIdx, setSessionIdx] = useState(0);
  const key = `${meta.id}:${level}`;
  const legacy = meta.id === 'biology' ? p.ia?.calc?.[level] : undefined;
  const marks = p.ia?.calc?.[key] ?? legacy ?? {};
  const setMark = (id, v) => actions.setIa({ calc: { ...(p.ia?.calc ?? {}), [key]: { ...marks, [id]: v } } });
  const b = sessions[Math.min(sessionIdx, sessions.length - 1)];
  const pct = weightedPercent(a, marks);
  const grade = gradeFor(pct, b.min);
  const anyBlank = a.components.some((c) => marks[c.id] === '' || marks[c.id] === undefined);
  const next = grade < 7 ? b.min[grade] : null;

  return (
    <section className="card" aria-labelledby="calc-title">
      <h2 id="calc-title">{meta.name} grade calculator</h2>
      <LevelSwitch meta={meta} value={level} onChange={(l) => { setLevel(l); setSessionIdx(0); }} name="calc-level" />
      <div className="calc-grid">
        {a.components.map((c) => (
          <label key={c.id} className="field calc-field">
            <span>{c.name} <small>/ {c.max}</small></span>
            <input
              className="input" type="number" inputMode="decimal" min={0} max={c.max} step="1"
              value={marks[c.id] ?? ''} placeholder="–"
              onChange={(e) => setMark(c.id, e.target.value === '' ? '' : Math.min(c.max, Math.max(0, Number(e.target.value))))}
            />
            {c.detail && <small className="muted-small">{c.detail}</small>}
          </label>
        ))}
      </div>
      <label className="field">
        <span>Grade boundaries to use</span>
        <select className="select" value={sessionIdx} onChange={(e) => setSessionIdx(Number(e.target.value))}>
          {sessions.map((s, i) => <option key={i} value={i}>{s.session}{s.tz ? ` ${s.tz}` : ''}{s.old ? ' (previous syllabus)' : ''}</option>)}
        </select>
      </label>
      <div className="calc-result" aria-live="polite">
        <div className="calc-grade"><span className="calc-grade-num">{grade}</span><span>{anyBlank ? 'so far' : 'predicted grade'}</span></div>
        <div className="calc-detail">
          <p><strong>{pct.toFixed(1)}%</strong> weighted total ({Object.values(a.groups).map((g) => `${g.name} ${g.weight}%`).join(', ')}).</p>
          {!anyBlank && <p>{next != null ? <>You need <strong>{(next - pct).toFixed(1)}%</strong> more for a {grade + 1}.</> : 'Top grade. Nice work!'}</p>}
        </div>
      </div>
      {anyBlank && (
        <div className="card-inset">
          <h3 className="mini-title">What do I need on the rest?</h3>
          <p className="muted-small">Average score needed on the components you've left blank:</p>
          <ul className="need-list">
            {[4, 5, 6, 7].map((g) => {
              const need = neededOnRemaining(a, marks, b.min[g - 1]);
              return <li key={g}><strong>Grade {g}:</strong> {need <= 0 ? 'already secured' : need > 100 ? 'not reachable with these marks' : `${Math.ceil(need)}%`}</li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
function DiplomaCalculator({ p }) {
  const [subjects, setSubjects] = useState(() => {
    const mine = (p.profile.courses ?? []).filter((c) => courseById.has(c.id)).map((c) => ({ name: courseById.get(c.id).name, level: c.level, grade: 5 }));
    const filler = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6'].map((g) => ({ name: g, level: 'SL', grade: 5 }));
    return [...mine, ...filler].slice(0, 6);
  });
  const [tok, setTok] = useState('B');
  const [ee, setEe] = useState('B');
  const r = diplomaCheck(subjects, tok, ee);
  const upd = (i, patch) => setSubjects((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <section className="card" aria-labelledby="dip-title">
      <h2 id="dip-title">Diploma points calculator</h2>
      <div className="dip-table">
        {subjects.map((s, i) => (
          <div key={i} className="dip-row">
            <input className="input" aria-label={`Subject ${i + 1} name`} value={s.name} onChange={(e) => upd(i, { name: e.target.value })} />
            <select className="select" aria-label={`${s.name} level`} value={s.level} onChange={(e) => upd(i, { level: e.target.value })}>
              <option>HL</option><option>SL</option>
            </select>
            <select className="select" aria-label={`${s.name} grade`} value={s.grade} onChange={(e) => upd(i, { grade: Number(e.target.value) })}>
              {[7, 6, 5, 4, 3, 2, 1].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        ))}
        <div className="dip-row dip-core">
          <label className="field"><span>TOK</span>
            <select className="select" value={tok} onChange={(e) => setTok(e.target.value)}>{LETTERS.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
          <label className="field"><span>Extended essay</span>
            <select className="select" value={ee} onChange={(e) => setEe(e.target.value)}>{LETTERS.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </div>
      </div>
      <div className={`calc-result ${r.pass ? '' : 'is-fail'}`} aria-live="polite">
        <div className="calc-grade"><span className="calc-grade-num">{r.total}</span><span>/ 45 points</span></div>
        <div className="calc-detail">
          <p><strong>{r.pass ? '✓ Diploma awarded' : '✕ Diploma not awarded'}</strong> · {r.bonus} bonus point{r.bonus === 1 ? '' : 's'} from TOK/EE</p>
          {!r.pass && <ul className="need-list">{r.problems.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="muted-small">Also requires CAS completion and no academic misconduct.</p>
        </div>
      </div>
      <h3 className="mini-title">Whole diploma, recent sessions</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th><th scope="col">Pass rate</th><th scope="col">Mean points</th></tr></thead>
          <tbody>{DIPLOMA.overall.map((row) => <tr key={row.session}><th scope="row">{row.session}</th><td>{row.passRate}%</td><td>{row.meanPoints}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function BoundariesTable({ meta, level }) {
  const rows = meta.boundaries[level];
  return (
    <section className="card" aria-labelledby="bnd-title">
      <h2 id="bnd-title">Grade boundaries · {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}</h2>
      <p className="muted-small">Minimum overall % for each grade. Boundaries change every session and timezone.</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th>{[1, 2, 3, 4, 5, 6, 7].map((g) => <th key={g} scope="col">{g}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.old ? 'is-old' : ''}>
                <th scope="row">{r.session}{r.tz ? ` ${r.tz}` : ''}{r.old && <small> previous syllabus</small>}</th>
                {r.min.map((m, j) => <td key={j}>{m}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Statistics({ meta, level }) {
  const rows = meta.stats?.[level] ?? [];
  const withDist = [...rows].reverse().find((r) => r.dist);
  return (
    <section className="card" aria-labelledby="stats-title">
      <h2 id="stats-title">How students score · {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}</h2>
      {withDist && (
        <BarChart values={withDist.dist} labels={[1, 2, 3, 4, 5, 6, 7]} label={`% of candidates at each grade, ${withDist.session}${withDist.provisional ? ' (provisional)' : ''}`} />
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th><th scope="col">Candidates</th><th scope="col">Mean</th>{rows.some((r) => r.pct7 != null) && <><th scope="col">% 7</th><th scope="col">% 6–7</th></>}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.session}>
                <th scope="row">{r.session}{r.provisional && <small> prov.</small>}</th>
                <td>{r.candidates.toLocaleString()}</td><td>{r.mean}</td>
                {rows.some((x) => x.pct7 != null) && <><td>{r.pct7 ?? '–'}</td><td>{r.pct67 ?? '–'}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Grades() {
  const { p, meta, level: myLevel } = useActive();
  const [level, setLevel] = useState(myLevel);
  const hasStats = meta.levels.some((l) => meta.stats?.[l]?.length);
  const [tab, setTab] = useState('calc');
  const tabs = useMemo(() => [['calc', 'Calculator'], ['diploma', 'Diploma'], ['bounds', 'Boundaries'], ...(hasStats ? [['stats', 'Statistics']] : [])], [hasStats]);
  const statsForLevel = meta.stats?.[level]?.length;

  return (
    <div className="grades">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">Grades &amp; boundaries <small className="page-course">{meta.icon} {meta.name}</small></h1>
      <div className="seg seg-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`seg-item ${tab === id ? 'selected' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'calc' && <SubjectCalculator p={p} meta={meta} level={level} setLevel={setLevel} />}
      {tab === 'diploma' && <DiplomaCalculator p={p} />}
      {(tab === 'bounds' || tab === 'stats') && <LevelSwitch meta={meta} value={level} onChange={setLevel} name="bnd-level" />}
      {tab === 'bounds' && <BoundariesTable meta={meta} level={level} />}
      {tab === 'stats' && (statsForLevel ? <Statistics meta={meta} level={level} /> : <section className="card"><p>No published statistics for {meta.name} {level} yet. Try the other level.</p></section>)}
      <details className="details card">
        <summary>Sources &amp; accuracy</summary>
        <p>Weightings come from the subject guide. Grade boundaries are compiled from published boundary collations and are <strong>indicative only</strong>; your school can confirm official figures.</p>
        <ul className="source-list">{[...meta.sources, ...DIPLOMA_SOURCES].map((s) => <li key={s.label + s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul>
      </details>
    </div>
  );
}
