import { useMemo, useState } from 'react';
import { useProgress } from '../lib/store.js';
import { dueCount, mistakeQuestions } from '../lib/sessions.js';
import { visibleTopics, THEMES } from '../content/index.js';
import { termStrength, dayKey } from '../lib/core.js';

export function Practice() {
  const p = useProgress();
  const track = p.profile.track;
  const due = dueCount(p, track);
  const mistakes = mistakeQuestions(p, track, 999).length;
  const topics = useMemo(() => visibleTopics(track), [track]);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');

  // Weakest topics by keyterm mastery among those started.
  const weakest = useMemo(() => topics
    .map((t) => {
      const seen = t.keyterms.filter((k) => p.terms[k.id]);
      if (!seen.length) return null;
      const m = t.keyterms.reduce((s, k) => s + termStrength(p.terms[k.id]), 0) / t.keyterms.length;
      return { t, m };
    })
    .filter(Boolean)
    .sort((a, b) => a.m - b.m)
    .slice(0, 3), [topics, p.terms]);

  return (
    <div className="practice">
      <h1 className="page-title">Practice</h1>

      <a className={`card action-card action-daily ${p.daily[dayKey()] ? 'is-done' : ''}`} href="#/practice/daily">
        <span className="action-icon" aria-hidden="true">☀️</span>
        <span className="action-main">
          <span className="action-title">Daily challenge</span>
          <span className="action-sub">{p.daily[dayKey()] ? `Done today: ${p.daily[dayKey()].score}/${p.daily[dayKey()].total}. Come back tomorrow!` : 'The same 10 questions for every Axon student today · +20 bonus XP'}</span>
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

      <a className={`card action-card action-mistakes ${mistakes ? '' : 'is-empty'}`} href={mistakes ? '#/practice/mistakes' : undefined} aria-disabled={!mistakes}>
        <span className="action-icon" aria-hidden="true">🎯</span>
        <span className="action-main">
          <span className="action-title">Mistakes notebook</span>
          <span className="action-sub">{mistakes ? `${mistakes} question${mistakes === 1 ? '' : 's'} you got wrong. Get them right to clear them.` : 'Nothing here yet. Questions you miss land here.'}</span>
        </span>
        {mistakes > 0 && <span className="count-badge">{mistakes}</span>}
      </a>

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
            {THEMES.map((th) => (
              <optgroup key={th.id} label={`Theme ${th.id}: ${th.title}`}>
                {topics.filter((t) => t.theme === th.id).map((t) => (
                  <option key={t.id} value={t.id}>{t.id} {t.title}{t.level === 'HL' ? ' (HL)' : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <a className="btn btn-primary" href={`#/practice/topic/${topicId}`}>Go</a>
        </div>
        {weakest.length > 0 && (
          <>
            <h3 className="mini-title">Your weakest topics</h3>
            <ul className="chip-row">
              {weakest.map(({ t, m }) => (
                <li key={t.id}><a className="chip chip-link" href={`#/practice/topic/${t.id}`}>{t.id} {t.title} · {Math.round(m * 100)}%</a></li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
