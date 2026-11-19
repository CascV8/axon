import { useMemo, useState } from 'react';
import { ASSESSMENT, BOUNDARIES, STATS, DIPLOMA, SOURCES, weightedPercent, gradeFor, diplomaCheck } from '../content/ibData.js';
import { useProgress, actions } from '../lib/store.js';

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

function SubjectCalculator({ track, setTrack }) {
  const p = useProgress();
  const a = ASSESSMENT[track];
  const sessions = BOUNDARIES[track];
  const [sessionIdx, setSessionIdx] = useState(0);
  const marks = p.ia?.calc?.[track] ?? {};
  const setMark = (id, v) => actions.setIa({ calc: { ...(p.ia?.calc ?? {}), [track]: { ...marks, [id]: v } } });
  const b = sessions[sessionIdx];
  const pct = weightedPercent(track, marks);
  const grade = gradeFor(pct, b.min);
  const next = grade < 7 ? b.min[grade] : null;

  // Target mode: what % is needed on the papers (given IA) for each grade.
  const iaPart = ((Number(marks.ia) || 0) / 24) * 20;
  const needs = [4, 5, 6, 7].map((g) => {
    const need = b.min[g - 1] - iaPart;
    return { g, paperPct: Math.max(0, need / 80) * 100 };
  });

  return (
    <section className="card" aria-labelledby="calc-title">
      <h2 id="calc-title">Biology grade calculator</h2>
      <div className="seg" role="radiogroup" aria-label="Level">
        {['SL', 'HL'].map((t) => (
          <label key={t} className={`seg-item ${track === t ? 'selected' : ''}`}>
            <input type="radio" name="calc-track" checked={track === t} onChange={() => { setTrack(t); setSessionIdx(0); }} />
            Biology {t}
          </label>
        ))}
      </div>
      <div className="calc-grid">
        {a.components.map((c) => (
          <label key={c.id} className="field calc-field">
            <span>{c.name} <small>/ {c.max}</small></span>
            <input
              className="input" type="number" inputMode="decimal" min={0} max={c.max} step="1"
              value={marks[c.id] ?? ''} placeholder="0"
              onChange={(e) => setMark(c.id, e.target.value === '' ? '' : Math.min(c.max, Math.max(0, Number(e.target.value))))}
            />
            <small className="muted-small">{c.detail}</small>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Boundaries to use</span>
        <select className="select" value={sessionIdx} onChange={(e) => setSessionIdx(Number(e.target.value))}>
          {sessions.map((s, i) => <option key={i} value={i}>{s.session} {s.tz}{s.old ? ' (old syllabus)' : ''}</option>)}
        </select>
      </label>
      <div className="calc-result" aria-live="polite">
        <div className="calc-grade"><span className="calc-grade-num">{grade}</span><span>predicted grade</span></div>
        <div className="calc-detail">
          <p><strong>{pct.toFixed(1)}%</strong> weighted total (Paper 1 36%, Paper 2 44%, IA 20%).</p>
          <p>{next != null ? <>You need <strong>{(next - pct).toFixed(1)}%</strong> more for a {grade + 1}.</> : 'Top grade — nice work!'}</p>
        </div>
      </div>
      <details className="details">
        <summary>What do I need on the exams?</summary>
        <p>With your IA mark of {Number(marks.ia) || 0}/24, this is the average you need across Papers 1 and 2:</p>
        <ul className="need-list">
          {needs.map((n) => <li key={n.g}><strong>Grade {n.g}:</strong> {n.paperPct > 100 ? 'not reachable with this IA mark' : `${n.paperPct.toFixed(0)}% on the papers`}</li>)}
        </ul>
      </details>
    </section>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
function DiplomaCalculator() {
  const [subjects, setSubjects] = useState([
    { name: 'Biology', level: 'HL', grade: 6 }, { name: 'Group 1', level: 'HL', grade: 5 }, { name: 'Group 2', level: 'SL', grade: 6 },
    { name: 'Group 3', level: 'HL', grade: 6 }, { name: 'Group 5', level: 'SL', grade: 5 }, { name: 'Group 4/6', level: 'SL', grade: 5 },
  ]);
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
    </section>
  );
}

function BoundariesTable({ track }) {
  const rows = BOUNDARIES[track];
  return (
    <section className="card" aria-labelledby="bnd-title">
      <h2 id="bnd-title">Grade boundaries · Biology {track}</h2>
      <p className="muted-small">Minimum overall % for each grade. Boundaries change every session and timezone.</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th>{[1, 2, 3, 4, 5, 6, 7].map((g) => <th key={g} scope="col">{g}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.old ? 'is-old' : ''}>
                <th scope="row">{r.session} {r.tz}{r.old && <small> old</small>}</th>
                {r.min.map((m, j) => <td key={j}>{m}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Statistics({ track }) {
  const rows = STATS[track];
  const withDist = [...rows].reverse().find((r) => r.dist);
  return (
    <section className="card" aria-labelledby="stats-title">
      <h2 id="stats-title">How students score · Biology {track}</h2>
      {withDist && (
        <BarChart values={withDist.dist} labels={[1, 2, 3, 4, 5, 6, 7]} label={`% of candidates at each grade, ${withDist.session}${withDist.provisional ? ' (provisional)' : ''}`} />
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th><th scope="col">Candidates</th><th scope="col">Mean</th><th scope="col">% 7</th><th scope="col">% 6–7</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.session}>
                <th scope="row">{r.session}{r.provisional && <small> prov.</small>}</th>
                <td>{r.candidates.toLocaleString()}</td><td>{r.mean}</td><td>{r.pct7}</td><td>{r.pct67}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mini-title">Whole diploma</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Session</th><th scope="col">Pass rate</th><th scope="col">Mean points</th></tr></thead>
          <tbody>{DIPLOMA.overall.map((r) => <tr key={r.session}><th scope="row">{r.session}</th><td>{r.passRate}%</td><td>{r.meanPoints}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

export function Grades() {
  const p = useProgress();
  const [track, setTrack] = useState(p.profile.track);
  const [tab, setTab] = useState('calc');
  const tabs = useMemo(() => [['calc', 'Calculator'], ['diploma', 'Diploma'], ['bounds', 'Boundaries'], ['stats', 'Statistics']], []);
  return (
    <div className="grades">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">Grades &amp; boundaries</h1>
      <div className="seg seg-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`seg-item ${tab === id ? 'selected' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'calc' && <SubjectCalculator track={track} setTrack={setTrack} />}
      {tab === 'diploma' && <DiplomaCalculator />}
      {tab !== 'calc' && tab !== 'diploma' && (
        <div className="seg" role="radiogroup" aria-label="Level" style={{ marginBottom: 14 }}>
          {['SL', 'HL'].map((t) => (
            <label key={t} className={`seg-item ${track === t ? 'selected' : ''}`}>
              <input type="radio" name="bnd-track" checked={track === t} onChange={() => setTrack(t)} />Biology {t}
            </label>
          ))}
        </div>
      )}
      {tab === 'bounds' && <BoundariesTable track={track} />}
      {tab === 'stats' && <Statistics track={track} />}
      <details className="details card">
        <summary>Sources &amp; accuracy</summary>
        <p>Weightings and statistics come from IB publications (statistical bulletins, subject brief). Grade boundaries are compiled from third-party collations of IB boundary documents and are <strong>indicative only</strong>; your school can confirm official figures.</p>
        <ul className="source-list">{SOURCES.map((s) => <li key={s.label}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul>
      </details>
    </div>
  );
}
