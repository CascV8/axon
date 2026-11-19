import { topicById, THEMES } from '../content/index.js';
import { useProgress } from '../lib/store.js';
import { termStrength } from '../lib/core.js';
import { Mastery } from '../components/Mastery.jsx';

export function Topic({ id }) {
  const p = useProgress();
  const topic = topicById.get(id);
  if (!topic) {
    return <section className="card placeholder"><h1>Topic not found</h1><p><a href="#/learn">Back to the course</a></p></section>;
  }
  const sl = p.profile.track === 'SL';
  const lessons = topic.lessons.filter((l) => !(sl && l.hl));
  const terms = topic.keyterms.filter((k) => !(sl && k.hl));
  const theme = THEMES.find((t) => t.id === topic.theme);
  const done = lessons.filter((l) => p.lessons[l.id]).length;
  const mastery = terms.length ? terms.reduce((s, k) => s + termStrength(p.terms[k.id]), 0) / terms.length : 0;

  return (
    <div className="topic-page">
      <a className="back-link" href="#/learn">‹ Course</a>
      <header className={`theme-banner theme-${topic.theme}`}>
        <div>
          <p className="theme-kicker">Theme {topic.theme} · {theme?.title}</p>
          <h1>{topic.id} {topic.title} {topic.level === 'HL' && <span className="badge-hl">HL</span>}</h1>
          <p className="theme-blurb">{topic.summary}</p>
        </div>
      </header>

      {sl && topic.level === 'HL' && (
        <p className="notice">This topic is Higher Level only. Switch to HL in your profile to study it on the course path.</p>
      )}

      <div className="tiles tiles-2">
        <div className="tile"><span className="tile-label">Lessons done</span><span className="tile-value">{done}/{lessons.length}</span></div>
        <div className="tile"><span className="tile-label">Keyterm mastery</span><span className="tile-value">{Math.round(mastery * 100)}%</span></div>
      </div>

      <section className="card">
        <h2>Lessons</h2>
        <ul className="list">
          {lessons.map((l, i) => {
            const rec = p.lessons[l.id];
            return (
              <li key={l.id} className="list-row">
                <span className={`list-dot ${rec ? 'is-done' : ''}`} aria-hidden="true">{rec ? '✓' : i + 1}</span>
                <span className="list-main">
                  <span className="list-title">{l.title} {l.hl && <span className="badge-hl">HL</span>}</span>
                  <span className="list-sub">{l.questions.length} questions{rec ? ` · best ${Math.round(rec.best * 100)}%` : ''}</span>
                </span>
                <a className="btn btn-small btn-primary" href={`#/lesson/${l.id}`}>{rec ? 'Redo' : 'Start'}</a>
              </li>
            );
          })}
        </ul>
        <a className="btn btn-secondary btn-wide" href={`#/practice/topic/${topic.id}`}>Quick-fire 10 mixed questions</a>
      </section>

      <section className="card">
        <h2>Keyterms ({terms.length})</h2>
        <dl className="terms">
          {terms.map((k) => (
            <div key={k.id} className="term-row">
              <dt>{k.term} {k.hl && <span className="badge-hl">HL</span>} <Mastery s={p.terms[k.id]} /></dt>
              <dd>{k.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
