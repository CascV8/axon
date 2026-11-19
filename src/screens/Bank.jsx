// Question bank: filterable list of the active course's structured exam-style items.
import { useMemo, useState } from 'react';
import { itemMarks } from '../lib/marking.js';
import { visibleItems } from '../content/index.js';
import { useActive } from '../lib/active.js';

export function Bank() {
  const { p, course, meta, level } = useActive();
  const all = useMemo(() => visibleItems(course, level), [course, level]);
  const [unit, setUnit] = useState('all');
  const [paper, setPaper] = useState('all');
  const [status, setStatus] = useState('all');
  const [command, setCommand] = useState('all');

  const commands = useMemo(() => [...new Set(all.flatMap((it) => it.parts.map((x) => x.command)))].sort(), [all]);
  const papers = useMemo(() => Object.entries(meta.papers).filter(([k]) => all.some((it) => it.paper === k)), [meta, all]);
  const units = course.units.filter((u) => all.some((it) => it.unit === u.id));
  const items = all.filter((it) =>
    (unit === 'all' || it.unit === unit)
    && (paper === 'all' || it.paper === paper)
    && (command === 'all' || it.parts.some((x) => x.command === command))
    && (status === 'all' || (status === 'new' ? !p.items[it.id] : status === 'done' ? !!p.items[it.id] : p.items[it.id] && p.items[it.id].best / p.items[it.id].max < 0.6)));

  const attempted = all.filter((it) => p.items[it.id]);
  const avg = attempted.length ? Math.round((attempted.reduce((s, it) => s + p.items[it.id].best / p.items[it.id].max, 0) / attempted.length) * 100) : null;

  return (
    <div className="bank-page">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">Question bank <small className="page-course">{meta.icon} {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}</small></h1>
      <p>Original exam-style questions with full markschemes. Write your answer, then mark yourself the way an examiner would.</p>
      <div className="tiles tiles-2">
        <div className="tile"><span className="tile-label">Attempted</span><span className="tile-value">{attempted.length}/{all.length}</span></div>
        <div className="tile tile-acc"><span className="tile-label">Average best</span><span className="tile-value">{avg == null ? '–' : `${avg}%`}</span></div>
      </div>
      <div className="filters card">
        <label className="field"><span>{meta.unitLabel || 'Unit'}</span>
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="all">All</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.id}: {u.title}</option>)}
          </select>
        </label>
        <label className="field"><span>Paper</span>
          <select className="select" value={paper} onChange={(e) => setPaper(e.target.value)}>
            <option value="all">All papers</option>
            {papers.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field"><span>Command term</span>
          <select className="select" value={command} onChange={(e) => setCommand(e.target.value)}>
            <option value="all">Any</option>
            {commands.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field"><span>Status</span>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option><option value="new">Not attempted</option><option value="done">Attempted</option><option value="weak">Scored under 60%</option>
          </select>
        </label>
      </div>
      <p className="result-count" aria-live="polite">{items.length} question{items.length === 1 ? '' : 's'}</p>
      {items.length === 0 ? (
        <div className="card placeholder"><p>No questions match those filters.</p></div>
      ) : (
        <ul className="list card">
          {items.map((it) => {
            const rec = p.items[it.id];
            const total = itemMarks(it);
            const u = course.unitById.get(it.unit);
            return (
              <li key={it.id} className="list-row">
                <span className={`list-dot theme-dot ${u?.tone}`} aria-hidden="true">{it.unit.length <= 3 ? it.unit : (u?.index ?? 0) + 1}</span>
                <span className="list-main">
                  <a className="list-title list-link" href={`#/question/${it.id}`}>{it.title}</a>
                  <span className="list-sub">
                    {meta.papers[it.paper]} · {total} marks · {it.topics.map((t) => course.topicById.get(t)?.code).filter(Boolean).join(', ')}{it.level === 'HL' ? ' · HL' : ''}
                  </span>
                </span>
                {rec ? <span className={`score-pill ${rec.best / total >= 0.6 ? 'good' : 'low'}`}>{rec.best}/{total}</span> : <span className="score-pill">new</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
