import { useEffect, useMemo, useRef, useState } from 'react';
import { visibleTopics } from '../content/index.js';
import { useActive } from '../lib/active.js';
import { dayKey } from '../lib/core.js';
import { dueCount } from '../lib/sessions.js';
import { navigate } from '../lib/router.js';

const OFFSETS = [0, 1, 1.5, 1, 0, -1, -1.5, -1];

function GoalCard({ p, due }) {
  const today = p.xpByDay[dayKey()] ?? 0;
  const goal = p.profile.dailyGoal;
  const pct = Math.min(100, Math.round((today / goal) * 100));
  return (
    <section className="card goal-card" aria-label="Daily goal">
      <div className="goal-row">
        <div>
          <h2 className="goal-title">{pct >= 100 ? 'Daily goal complete 🎯' : 'Daily goal'}</h2>
          <p className="goal-sub">{today} / {goal} XP today</p>
        </div>
        {due > 0 && <a className="btn btn-small btn-secondary" href="#/practice/review">Review {due} due</a>}
      </div>
      <div className="progress progress-thin" role="progressbar" aria-label="Daily goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-fill progress-xp" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </section>
  );
}

export function Learn() {
  const { p, course, meta, level } = useActive();
  const topics = useMemo(() => visibleTopics(course, level), [course, level]);
  const [open, setOpen] = useState(null);
  const currentRef = useRef(null);
  const unitLabel = meta.unitLabel || 'Unit';

  const nextLesson = useMemo(() => {
    for (const t of topics) for (const l of t.lessons) if (!p.lessons[l.id]) return l.id;
    return null;
  }, [topics, p.lessons]);

  useEffect(() => {
    if (topics.some((t) => t.lessons.some((l) => p.lessons[l.id]))) currentRef.current?.scrollIntoView({ block: 'center' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  let nodeIndex = 0;
  const units = course.units.filter((u) => topics.some((t) => t.unit === u.id));
  return (
    <div className="learn">
      <GoalCard p={p} due={dueCount(p, course, level)} />
      {units.length > 1 && (
        <nav className="theme-jump" aria-label={`Jump to ${unitLabel.toLowerCase()}`}>
          {units.map((u) => (
            <a key={u.id} href={`#unit-${u.id}`} className={`theme-chip ${u.tone}`} title={u.title}
              onClick={(e) => { e.preventDefault(); document.getElementById(`unit-${u.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
              {u.id.length <= 3 ? u.id : u.index + 1}
            </a>
          ))}
        </nav>
      )}

      {units.map((u) => {
        const tts = topics.filter((t) => t.unit === u.id);
        const lessonsAll = tts.flatMap((t) => t.lessons);
        const done = lessonsAll.filter((l) => p.lessons[l.id]).length;
        return (
          <section key={u.id} className="theme-section" aria-labelledby={`unit-${u.id}`}>
            <header className={`theme-banner ${u.tone}`} id={`unit-${u.id}`}>
              <div>
                <p className="theme-kicker">{unitLabel} {u.id}</p>
                <h2>{u.title}</h2>
                {u.blurb && <p className="theme-blurb">{u.blurb}</p>}
              </div>
              <div className="theme-count" aria-label={`${done} of ${lessonsAll.length} lessons complete`}>{done}/{lessonsAll.length}</div>
            </header>

            {tts.map((t) => (
              <div key={t.id} className="topic-block">
                <a className="topic-head" href={`#/topic/${t.id}`}>
                  <span className={`topic-code ${t.tone}`}>{t.code}</span>
                  <span className="topic-title">{t.title}</span>
                  {t.level === 'HL' && <span className="badge-hl" title="Higher level only">HL</span>}
                  <span className="topic-arrow" aria-hidden="true">›</span>
                </a>
                <ol className="path" aria-label={`${t.title} lessons`}>
                  {t.lessons.map((l, li) => {
                    const off = OFFSETS[nodeIndex++ % OFFSETS.length];
                    const rec = p.lessons[l.id];
                    const isNext = l.id === nextLesson;
                    const status = rec ? 'done' : isNext ? 'current' : 'open';
                    const label = `${t.code} lesson ${li + 1}: ${l.title}${l.hl ? ' (HL)' : ''}. ${rec ? `Completed, best ${Math.round(rec.best * 100)}%` : isNext ? 'Up next' : 'Not started'}`;
                    return (
                      <li key={l.id} className={`path-row ${open === l.id ? 'is-open' : ''}`} style={{ '--off': off }}>
                        <div className="node-wrap" ref={isNext ? currentRef : undefined}>
                          {isNext && open !== l.id && <span className="node-start" aria-hidden="true">START</span>}
                          <button className={`node node-${status} ${t.tone}`} aria-label={label} aria-expanded={open === l.id}
                            onClick={() => setOpen(open === l.id ? null : l.id)}>
                            <span aria-hidden="true">{rec ? (rec.best >= 1 ? '★' : '✓') : l.hl ? 'HL' : li + 1}</span>
                          </button>
                          {open === l.id && (
                            <div className={`node-pop ${t.tone}`} role="dialog" aria-label={l.title}>
                              <p className="pop-kicker">{t.code} · Lesson {li + 1}{l.hl ? ' · HL' : ''}</p>
                              <h3>{l.title}</h3>
                              <p className="pop-meta">{l.questions.length} questions · ~{Math.max(4, Math.round(l.questions.length * 0.6))} min{rec ? ` · best ${Math.round(rec.best * 100)}%` : ''}</p>
                              <button className="btn btn-light btn-wide" autoFocus onClick={() => navigate(`lesson/${l.id}`)}>
                                {rec ? 'Practise again' : 'Start lesson'}
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        );
      })}
      <p className="path-end">🎓 That's the whole of IB {meta.name}{meta.levels.length > 1 ? ` ${level}` : ''}. Keep your streak alive with daily review, or <a href="#/courses">switch course</a>.</p>
    </div>
  );
}
