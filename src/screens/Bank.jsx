// Question bank: filterable list of structured exam-style items.
import { useMemo, useState } from 'react';
import { EXAM_ITEMS, PAPER_LABEL, itemMarks } from '../content/exam.js';
import { THEMES, topicById } from '../content/index.js';
import { useProgress } from '../lib/store.js';

export function Bank() {
  const p = useProgress();
  const [theme, setTheme] = useState('all');
  const [paper, setPaper] = useState('all');
  const [status, setStatus] = useState('all');
  const [command, setCommand] = useState('all');
  const sl = p.profile.track === 'SL';

  const commands = useMemo(() => [...new Set(EXAM_ITEMS.flatMap((it) => it.parts.map((x) => x.command)))].sort(), []);
  const items = EXAM_ITEMS.filter((it) =>
    (!sl || it.level === 'SL')
    && (theme === 'all' || it.theme === theme)
    && (paper === 'all' || it.paper === paper)
    && (command === 'all' || it.parts.some((x) => x.command === command))
    && (status === 'all' || (status === 'new' ? !p.items[it.id] : status === 'done' ? !!p.items[it.id] : p.items[it.id] && p.items[it.id].best / p.items[it.id].max < 0.6)));

  const attempted = EXAM_ITEMS.filter((it) => p.items[it.id]);
  const avg = attempted.length ? Math.round((attempted.reduce((s, it) => s + p.items[it.id].best / p.items[it.id].max, 0) / attempted.length) * 100) : null;

  return (
    <div className="bank-page">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">Question bank</h1>
      <p>Original Paper 1B and Paper 2 style questions with full markschemes. Write your answer, then mark yourself the way an examiner would.</p>
      <div className="tiles tiles-2">
        <div className="tile"><span className="tile-label">Attempted</span><span className="tile-value">{attempted.length}/{EXAM_ITEMS.length}</span></div>
        <div className="tile tile-acc"><span className="tile-label">Average best</span><span className="tile-value">{avg == null ? '–' : `${avg}%`}</span></div>
      </div>
      <div className="filters card">
        <label className="field"><span>Theme</span>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="all">All themes</option>
            {THEMES.map((t) => <option key={t.id} value={t.id}>{t.id}: {t.title}</option>)}
          </select>
        </label>
        <label className="field"><span>Paper</span>
          <select className="select" value={paper} onChange={(e) => setPaper(e.target.value)}>
            <option value="all">All papers</option>
            {Object.entries(PAPER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
      <p className="result-count" aria-live="polite">{items.length} question{items.length === 1 ? '' : 's'}{sl ? ' (SL only — switch to HL in Profile to see HL items)' : ''}</p>
      {EXAM_ITEMS.length === 0 && <div className="card placeholder"><p>Exam-style questions are being added.</p></div>}
      <ul className="list card">
        {items.map((it) => {
          const rec = p.items[it.id];
          const total = itemMarks(it);
          return (
            <li key={it.id} className="list-row">
              <span className={`list-dot theme-dot theme-${it.theme}`} aria-hidden="true">{it.theme}</span>
              <span className="list-main">
                <a className="list-title list-link" href={`#/question/${it.id}`}>{it.title}</a>
                <span className="list-sub">
                  {PAPER_LABEL[it.paper]} · {total} marks · {it.topics.map((t) => `${t}${topicById.get(t) ? '' : ''}`).join(', ')}{it.level === 'HL' ? ' · HL' : ''}
                </span>
              </span>
              {rec ? <span className={`score-pill ${rec.best / total >= 0.6 ? 'good' : 'low'}`}>{rec.best}/{total}</span> : <span className="score-pill">new</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
