// Flip-card review of keyterms, scheduled by the same Leitner SRS as Review.
import { useEffect, useMemo, useState } from 'react';
import { getState, actions } from '../lib/store.js';
import { visibleTopics } from '../content/index.js';
import { useActive } from '../lib/active.js';
import { shuffle, reviewPriority } from '../lib/core.js';
import { Mastery } from '../components/Mastery.jsx';
import { play } from '../lib/sound.js';

function buildDeck(scope, course, level) {
  const s = getState();
  const now = Date.now();
  const topics = visibleTopics(course, level);
  if (scope === 'due') {
    const terms = topics.flatMap((t) => t.keyterms).filter((k) => s.terms[k.id] && s.terms[k.id].due <= now);
    return terms.sort((a, b) => reviewPriority(s.terms[a.id], now) - reviewPriority(s.terms[b.id], now)).slice(0, 30);
  }
  const topic = topics.find((t) => t.id === scope);
  if (topic) return shuffle(topic.keyterms);
  const unitId = scope.startsWith('unit:') ? scope.slice(5) : null;
  return shuffle(topics.filter((t) => t.unit === unitId).flatMap((t) => t.keyterms)).slice(0, 30);
}

function Picker() {
  const { p, course, meta, level } = useActive();
  const topics = visibleTopics(course, level);
  const now = Date.now();
  const due = topics.flatMap((t) => t.keyterms).filter((k) => p.terms[k.id]?.due <= now).length;
  return (
    <div className="flash-picker">
      <a className="back-link" href="#/practice">‹ Practice</a>
      <h1 className="page-title">Flashcards <small className="page-course">{meta.icon} {meta.name}</small></h1>
      <p>Flip, recall, and rate yourself honestly. Cards you know come back less often; cards you miss come back soon.</p>
      <a className={`card action-card ${due ? '' : 'is-empty'}`} href={due ? '#/flashcards/due' : undefined}>
        <span className="action-icon" aria-hidden="true">⏰</span>
        <span className="action-main"><span className="action-title">Due cards</span><span className="action-sub">{due ? `${due} ready to review` : 'Nothing due right now'}</span></span>
        {due > 0 && <span className="count-badge">{due}</span>}
      </a>
      {course.units.filter((u) => topics.some((t) => t.unit === u.id)).map((u) => (
        <section key={u.id} className="card">
          <div className="row-between">
            <h2>{u.id}: {u.title}</h2>
            <a className="btn btn-small btn-secondary" href={`#/flashcards/unit:${u.id}`}>Mix</a>
          </div>
          <ul className="chip-row">
            {topics.filter((t) => t.unit === u.id).map((t) => (
              <li key={t.id}><a className="chip chip-link" href={`#/flashcards/${t.id}`}>{t.code} {t.title} <small>({t.keyterms.length})</small></a></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Flashcards({ scope }) {
  const { p, course, level } = useActive();
  const deck = useMemo(() => (scope ? buildDeck(scope, course, level) : []), [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [tally, setTally] = useState({ know: 0, learning: 0 });

  const card = deck[i];
  const rate = (know) => {
    if (!card || !flipped) return;
    actions.recordCard(card.id, know);
    play(know ? 'correct' : 'tap');
    setTally((t) => ({ ...t, [know ? 'know' : 'learning']: t[know ? 'know' : 'learning'] + 1 }));
    setFlipped(false);
    setI(i + 1);
    if (i + 1 >= deck.length) actions.addXp(Math.max(2, Math.round(deck.length / 2)));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === '1') rate(false);
      if (e.key === '2') rate(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!scope) return <Picker />;

  if (!deck.length) {
    return <div className="card placeholder"><h1>No cards here</h1><p>Nothing is due. Pick a topic instead.</p><a className="btn btn-primary" href="#/flashcards">Choose a deck</a></div>;
  }
  if (!card) {
    return (
      <div className="card placeholder">
        <div className="big-emoji" aria-hidden="true">🃏</div>
        <h1>Deck finished!</h1>
        <p>{tally.know} known · {tally.learning} still learning</p>
        <div className="stack">
          <a className="btn btn-primary" href="#/flashcards">Another deck</a>
          <a className="btn btn-ghost" href="#/practice">Back to practice</a>
        </div>
      </div>
    );
  }

  const topic = course.topicById.get(card.topicId);
  const front = reverse ? card.definition : card.term;
  const back = reverse ? card.term : card.definition;
  return (
    <div className="flash">
      <div className="row-between">
        <a className="back-link" href="#/flashcards">‹ Decks</a>
        <label className="switch-row small"><input type="checkbox" checked={reverse} onChange={(e) => { setReverse(e.target.checked); setFlipped(false); }} /> Definition first</label>
      </div>
      <div className="progress progress-thin" role="progressbar" aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={i} aria-label="Deck progress">
        <div className="progress-fill" style={{ width: `${Math.max(3, (i / deck.length) * 100)}%` }} />
      </div>
      <p className="muted-small flash-count">Card {i + 1} of {deck.length}</p>
      <button className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? `Answer: ${back}. Press to flip back.` : `${front}. Press to reveal.`}>
        <span className="flash-inner">
          <span className="flash-face flash-front">
            <span className={`topic-code small ${topic?.tone}`}>{topic?.code}</span>
            <span className={reverse ? 'flash-def' : 'flash-term'}>{front}</span>
            <span className="flash-hint">Tap or press space to flip</span>
          </span>
          <span className="flash-face flash-back">
            <span className={reverse ? 'flash-term' : 'flash-def'}>{back}</span>
            <Mastery s={p.terms[card.id]} />
          </span>
        </span>
      </button>
      <div className="flash-actions">
        <button className="btn btn-danger" disabled={!flipped} onClick={() => rate(false)}>Still learning <kbd>1</kbd></button>
        <button className="btn btn-success" disabled={!flipped} onClick={() => rate(true)}>Know it <kbd>2</kbd></button>
      </div>
    </div>
  );
}
