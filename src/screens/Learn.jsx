import { useEffect, useMemo, useRef, useState } from 'react';
import { THEMES, visibleTopics, TOPICS } from '../content/index.js';
import { useProgress } from '../lib/store.js';
import { dayKey } from '../lib/core.js';
import { dueCount } from '../lib/sessions.js';
import { navigate } from '../lib/router.js';

const OFFSETS = [0, 1, 1.5, 1, 0, -1, -1.5, -1];

function GoalCard({ p }) {
  const today = p.xpByDay[dayKey()] ?? 0;
  const goal = p.profile.dailyGoal;
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const due = dueCount(p, p.profile.track);
  return (
    <section className="card goal-card" aria-label="Daily goal">
      <div className="goal-row">
        <div>
          <h2 className="goal-title">{pct >= 100 ? 'Daily goal complete 🎯' : 'Daily goal'}</h2>
          <p className="goal-sub">{today} / {goal} XP today</p>
        </div>
        {due > 0 && (
          <a className="btn btn-small btn-secondary" href="#/practice/review">Review {due} due</a>
        )}
      </div>
      <div className="progress progress-thin" role="progressbar" aria-label="Daily goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-fill progress-xp" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </section>
  );
}

export function Learn() {
  const p = useProgress();
  const topics = useMemo(() => visibleTopics(p.profile.track), [p.profile.track]);
  const [open, setOpen] = useState(null); // lessonId whose popover is open
  const currentRef = useRef(null);

  const nextLesson = useMemo(() => {
    for (const t of topics) for (const l of t.lessons) if (!p.lessons[l.id]) return l.id;
    return null;
  }, [topics, p.lessons]);

  useEffect(() => {
    // Bring the next lesson into view on first load (once the student has made progress).
    if (Object.keys(p.lessons).some((k) => !k.startsWith('__'))) currentRef.current?.scrollIntoView({ block: 'center' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  if (!TOPICS.length) {
    return <section className="card placeholder"><h1>Content is loading…</h1><p>No topics were found in this build.</p></section>;
  }

  let nodeIndex = 0;
  return (
    <div className="learn">
      <GoalCard p={p} />
      <nav className="theme-jump" aria-label="Jump to theme">
        {THEMES.map((th) => (
          <a key={th.id} href={`#theme-${th.id}`} className={`theme-chip theme-${th.id}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(`theme-${th.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
            {th.id}
          </a>
        ))}
      </nav>

      {THEMES.map((th) => {
        const tts = topics.filter((t) => t.theme === th.id);
        if (!tts.length) return null;
        const lessonsAll = tts.flatMap((t) => t.lessons);
        const done = lessonsAll.filter((l) => p.lessons[l.id]).length;
        return (
          <section key={th.id} className="theme-section" aria-labelledby={`theme-${th.id}`}>
            <header className={`theme-banner theme-${th.id}`} id={`theme-${th.id}`}>
              <div>
                <p className="theme-kicker">Theme {th.id}</p>
                <h2>{th.title}</h2>
                <p className="theme-blurb">{th.blurb}</p>
              </div>
              <div className="theme-count" aria-label={`${done} of ${lessonsAll.length} lessons complete`}>
                {done}/{lessonsAll.length}
              </div>
            </header>

            {tts.map((t) => (
              <div key={t.id} className="topic-block">
                <a className="topic-head" href={`#/topic/${t.id}`}>
                  <span className={`topic-code theme-${t.theme}`}>{t.id}</span>
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
                    const label = `${t.id} lesson ${li + 1}: ${l.title}${l.hl ? ' (HL)' : ''}. ${rec ? `Completed, best ${Math.round(rec.best * 100)}%` : isNext ? 'Up next' : 'Not started'}`;
                    return (
                      <li key={l.id} className="path-row" style={{ '--off': off }}>
                        <div className="node-wrap" ref={isNext ? currentRef : undefined}>
                          {isNext && open !== l.id && <span className="node-start" aria-hidden="true">START</span>}
                          <button
                            className={`node node-${status} theme-${t.theme}`}
                            aria-label={label}
                            aria-expanded={open === l.id}
                            onClick={() => setOpen(open === l.id ? null : l.id)}
                          >
                            <span aria-hidden="true">{rec ? (rec.best >= 1 ? '★' : '✓') : l.hl ? 'HL' : li + 1}</span>
                          </button>
                          {open === l.id && (
                            <div className={`node-pop theme-${t.theme}`} role="dialog" aria-label={l.title}>
                              <p className="pop-kicker">{t.id} · Lesson {li + 1}{l.hl ? ' · HL' : ''}</p>
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
      <p className="path-end">🎓 That's the whole IB Biology course. Keep your streak alive with daily review!</p>
    </div>
  );
}
