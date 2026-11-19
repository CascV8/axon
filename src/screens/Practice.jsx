import { useMemo, useState } from 'react';
import { useActive } from '../lib/active.js';
import { dueCount, mistakeQuestions, dailyKey } from '../lib/sessions.js';
import { visibleTopics } from '../content/index.js';
import { termStrength, dayKey } from '../lib/core.js';

export function Practice() {
  const { p, course, meta, level } = useActive();
  const due = dueCount(p, course, level);
  const mistakes = mistakeQuestions(p, course, level, 9999).length;
  const topics = useMemo(() => visibleTopics(course, level), [course, level]);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const daily = p.daily[dailyKey(dayKey(), course.id)];

  const weakest = useMemo(() => topics
    .map((t) => {
      if (!t.keyterms.some((k) => p.terms[k.id])) return null;
      const m = t.keyterms.reduce((s, k) => s + termStrength(p.terms[k.id]), 0) / t.keyterms.length;
      return { t, m };
    })
    .filter(Boolean)
    .sort((a, b) => a.m - b.m)
    .slice(0, 3), [topics, p.terms]);

  return (
    <div className="practice">
      <h1 className="page-title">Practice <small className="page-course">{meta.icon} {meta.name}</small></h1>

      <a className={`card action-card action-daily ${daily ? 'is-done' : ''}`} href="#/practice/daily">
        <span className="action-icon" aria-hidden="true">☀️</span>
        <span className="action-main">
          <span className="action-title">Daily challenge</span>
          <span className="action-sub">{daily ? `Done today: ${daily.score}/${daily.total}. You can replay it, or come back tomorrow for a new one.` : `Today's 10 ${meta.name} questions, the same for every Axon student · +20 bonus XP`}</span>
        </span>
      </a>

      <a className="card action-card action-review" href="#/practice/review">
        <span className="action-icon" aria-hidden="true">🧠</span>
        <span className="action-main">
          <span className="action-title">Smart review</span>
          <span className="action-sub">{due > 0 ? `${due} keyterm${due === 1 ? '' : 's'} due now` : 'Spaced repetition of your weakest keyterms'} · earns ❤️</span>
        </span>
        {due > 0 && <span className="count-badge">{due}</span>}
      </a>

      {mistakes > 0 ? (
        <a className="card action-card action-mistakes" href="#/practice/mistakes">
          <span className="action-icon" aria-hidden="true">🎯</span>
          <span className="action-main">
            <span className="action-title">Mistakes notebook</span>
            <span className="action-sub">{mistakes} question{mistakes === 1 ? '' : 's'} you got wrong. Get them right to clear them.</span>
          </span>
          <span className="count-badge">{mistakes}</span>
        </a>
      ) : (
        <div className="card action-card is-empty" aria-label="Mistakes notebook is empty">
          <span className="action-icon" aria-hidden="true">🎯</span>
          <span className="action-main">
            <span className="action-title">Mistakes notebook</span>
            <span className="action-sub">Empty. Questions you miss in {meta.name} collect here for another go.</span>
          </span>
        </div>
      )}

      <a className="card action-card" href="#/flashcards">
        <span className="action-icon" aria-hidden="true">🃏</span>
        <span className="action-main">
          <span className="action-title">Flashcards</span>
          <span className="action-sub">Flip-card decks for every topic, scheduled by spaced repetition</span>
        </span>
      </a>

      <a className="card action-card action-cmd" href="#/practice/command">
        <span className="action-icon" aria-hidden="true">📝</span>
        <span className="action-main">
          <span className="action-title">Command terms drill</span>
          <span className="action-sub">Know exactly what “outline”, “explain” and “evaluate” are asking for</span>
        </span>
      </a>

      <section className="card">
        <h2>Topic quick-fire</h2>
        <p>Ten mixed questions from one syllabus topic.</p>
        <div className="row">
          <label className="sr-only" htmlFor="qf-topic">Topic</label>
          <select id="qf-topic" className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {course.units.map((u) => {
              const ts = topics.filter((t) => t.unit === u.id);
              if (!ts.length) return null;
              return (
                <optgroup key={u.id} label={`${meta.unitLabel || 'Unit'} ${u.id}: ${u.title}`}>
                  {ts.map((t) => <option key={t.id} value={t.id}>{t.code} {t.title}{t.level === 'HL' ? ' (HL)' : ''}</option>)}
                </optgroup>
              );
            })}
          </select>
          <a className="btn btn-primary" href={`#/practice/topic/${topicId}`}>Go</a>
        </div>
        {weakest.length > 0 && (
          <>
            <h3 className="mini-title">Your weakest topics</h3>
            <ul className="chip-row">
              {weakest.map(({ t, m }) => (
                <li key={t.id}><a className="chip chip-link" href={`#/practice/topic/${t.id}`}>{t.code} {t.title} · {Math.round(m * 100)}%</a></li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
