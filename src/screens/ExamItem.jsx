// Structured exam-style question: write answers, reveal the markscheme, self-mark.
import { useMemo, useState } from 'react';
import { commandDef, itemMarks, pointHit, numericCorrect } from '../lib/marking.js';
import { visibleItems } from '../content/index.js';
import { actions, useProgress } from '../lib/store.js';
import { useActive } from '../lib/active.js';
import { play } from '../lib/sound.js';

function DataTable({ data }) {
  return (
    <figure className="data-fig">
      <div className="table-wrap">
        <table className="table data-table">
          {data.caption && <caption>{data.caption}</caption>}
          <thead><tr>{data.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{data.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
        </table>
      </div>
    </figure>
  );
}

function Part({ item, part, revealed, ticks, setTicks }) {
  const p = useProgress();
  const key = `${item.id}:${part.label}`;
  const answer = p.drafts[key] ?? '';
  const [numState, setNumState] = useState(null);
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const suggested = useMemo(() => (revealed && answer.trim() ? part.markscheme.map((pt) => pointHit(answer, pt)) : []), [revealed, answer, part]);
  const awarded = Math.min(part.marks, ticks.filter(Boolean).length);

  return (
    <section className="part" aria-labelledby={`part-${key}`}>
      <div className="part-head">
        <span className="part-label">({part.label})</span>
        <p id={`part-${key}`} className="part-prompt">
          <abbr className="cmd" title={commandDef.get(part.command) ?? ''}>{part.command}</abbr>
          {part.prompt.startsWith(part.command) ? part.prompt.slice(part.command.length) : ` — ${part.prompt}`}
        </p>
        <span className="part-marks">[{part.marks}]</span>
      </div>
      {part.numeric ? (
        <div className="row wrap">
          <label className="sr-only" htmlFor={`in-${key}`}>Answer</label>
          <input
            id={`in-${key}`} className="input num-input" inputMode="decimal" value={answer} placeholder="Your answer"
            onChange={(e) => { actions.saveDraft(key, e.target.value); setNumState(null); }}
          />
          {part.numeric.unit && <span className="unit">{part.numeric.unit}</span>}
          <button className="btn btn-small btn-secondary" disabled={!answer.trim()} onClick={() => {
            const ok = numericCorrect(answer, part.numeric);
            setNumState(ok);
            play(ok ? 'correct' : 'wrong');
            if (ok) setTicks(part.markscheme.map((_, i) => i < part.marks));
          }}>Check</button>
          {numState != null && (
            <span className={numState ? 'num-ok' : 'num-bad'} role="status">
              {numState ? '✓ Correct' : '✕ Not quite — check your working'}
            </span>
          )}
        </div>
      ) : (
        <>
          <label className="sr-only" htmlFor={`in-${key}`}>Your answer</label>
          <textarea
            id={`in-${key}`} className="textarea" rows={Math.min(10, 2 + part.marks)} value={answer}
            placeholder={`Write your answer (${part.marks} mark${part.marks > 1 ? 's' : ''} ≈ ${part.marks} distinct points)`}
            onChange={(e) => actions.saveDraft(key, e.target.value)}
          />
          <p className="muted-small">{words} word{words === 1 ? '' : 's'} · saved automatically</p>
        </>
      )}
      {revealed && (
        <div className="ms" aria-label={`Markscheme for part ${part.label}`}>
          <p className="ms-title">Markscheme <span>tick each point you made · max {part.marks}</span></p>
          <ul className="ms-list">
            {part.markscheme.map((pt, i) => (
              <li key={i}>
                <label className={`ms-point ${ticks[i] ? 'on' : ''}`}>
                  <input type="checkbox" checked={!!ticks[i]} onChange={(e) => setTicks(ticks.map((t, j) => (j === i ? e.target.checked : t)))} />
                  <span>{pt}</span>
                  {suggested[i] && !ticks[i] && <span className="ms-hint" title="Your answer seems to mention this — check and tick if it does">looks covered?</span>}
                </label>
              </li>
            ))}
          </ul>
          {part.notes && <p className="ms-notes">📝 {part.notes}</p>}
          <p className="ms-score">Part score: <strong>{awarded}/{part.marks}</strong></p>
        </div>
      )}
    </section>
  );
}

export function ExamItem({ id }) {
  const { p, course, meta, level } = useActive();
  const item = course.examItemById.get(id);
  const [revealed, setRevealed] = useState(false);
  const [ticks, setTicksAll] = useState(() => Object.fromEntries((item?.parts ?? []).map((pt) => [pt.label, pt.markscheme.map(() => false)])));
  const [saved, setSaved] = useState(false);

  if (!item) return <section className="card placeholder"><h1>Question not found</h1><p>It isn't part of {meta.name}.</p><a href="#/bank">Back to the question bank</a></section>;

  const total = itemMarks(item);
  const score = item.parts.reduce((s, pt) => s + Math.min(pt.marks, ticks[pt.label].filter(Boolean).length), 0);
  const prev = p.items[item.id];
  const list = visibleItems(course, level);
  const nextItem = list[list.indexOf(item) + 1];

  return (
    <div className="exam-item">
      <a className="back-link" href="#/bank">‹ Question bank</a>
      <div className="item-meta">
        <span className={`topic-code ${course.unitById.get(item.unit)?.tone ?? 'tone-0'}`}>{meta.papers[item.paper]}</span>
        {item.level === 'HL' && <span className="badge-hl">HL</span>}
        {item.topics.filter((t) => course.topicById.has(t)).map((t) => <a key={t} className="chip chip-mini" href={`#/topic/${t}`}>{course.topicById.get(t).code} {course.topicById.get(t).title}</a>)}
      </div>
      <h1 className="item-title">{item.title}</h1>
      <p className="item-total">Total: {total} marks{prev ? ` · your best ${prev.best}/${total}` : ''}</p>
      <div className="card item-card">
        <p className="stem">{item.stem}</p>
        {item.data && <DataTable data={item.data} />}
        {item.parts.map((pt) => (
          <Part key={pt.label} item={item} part={pt} revealed={revealed} ticks={ticks[pt.label]}
            setTicks={(t) => { setTicksAll((all) => ({ ...all, [pt.label]: t })); setSaved(false); }} />
        ))}
      </div>
      {!revealed ? (
        <button className="btn btn-primary btn-wide" onClick={() => setRevealed(true)}>Reveal markscheme &amp; self-mark</button>
      ) : (
        <div className="card item-score" aria-live="polite">
          <div className="row-between">
            <div>
              <h2>{score}/{total} marks</h2>
              <p className="muted-small">Be strict: give a mark only if your answer clearly makes that point. "Looks covered?" hints are a rough keyword match, not marking.</p>
            </div>
            <button className="btn btn-success" disabled={saved} onClick={() => {
              actions.scoreItem(item.id, score, total);
              actions.addXp(Math.max(3, score * 2));
              setSaved(true);
              play('complete');
            }}>{saved ? 'Saved ✓' : 'Save score'}</button>
          </div>
          {nextItem && <a className="btn btn-secondary btn-wide" href={`#/question/${nextItem.id}`}>Next question ›</a>}
        </div>
      )}
      <p className="footnote">Original exam-style question written for Axon. Not an IB past-paper question.</p>
    </div>
  );
}
