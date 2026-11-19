// Runs a sequence of questions: lessons, spaced-repetition review and mistake practice.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QuestionView, isReady } from '../questions/Questions.jsx';
import { grade, correctAnswerText, lessonXp, levelForXp, MAX_HEARTS, msToNextHeart } from '../lib/core.js';
import { actions, getState, heartsNow, useProgress } from '../lib/store.js';
import { play } from '../lib/sound.js';
import { Icon } from '../components/Icon.jsx';
import { Complete } from './Complete.jsx';

const PRAISE = ['Nice!', 'Correct!', 'Great job!', 'Spot on!', 'Excellent!', 'You got it!'];
const MAX_REPEATS = 2;

export function Session({ questions, mode = 'lesson', lessonId, title, onExit, onFinish }) {
  const progress = useProgress();
  const started = useRef(Date.now());
  const xpBefore = useRef(getState().xp);
  const [queue, setQueue] = useState(() => questions.map((q) => ({ q, attempt: 0 })));
  const [i, setI] = useState(0);
  const [value, setValue] = useState(null);
  const [checked, setChecked] = useState(null); // null | { correct }
  const [solved, setSolved] = useState(() => new Set());
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(() => mode === 'lesson' && heartsNow(getState()) <= 0);
  const continueRef = useRef(null);
  const checkRef = useRef(null);

  const usesHearts = mode === 'lesson';
  const hearts = heartsNow(progress);
  const item = queue[i];
  const q = item?.q;
  const total = questions.length;
  const pct = Math.round((solved.size / total) * 100);

  const onChange = useCallback((v) => setValue(v), []);

  const check = useCallback(() => {
    if (!q || checked || !isReady(q, value)) return;
    const correct = grade(q, value);
    const isFirst = item.attempt === 0;
    setChecked({ correct });
    play(correct ? 'correct' : 'wrong');
    if (!q.synthetic) actions.recordAnswer(q, correct, { lessonId: q.lessonId, firstTry: isFirst });
    else q.terms?.forEach((t) => isFirst && actions.recordTerm(t, correct));
    if (correct) {
      setSolved((s) => new Set(s).add(q.id));
      if (isFirst) setFirstTry((n) => n + 1);
      if (mode === 'mistakes' && !q.synthetic) actions.clearMistake(q.id);
    } else {
      setMissed((s) => new Set(s).add(q.id));
      if (usesHearts) actions.loseHeart();
      if (item.attempt < MAX_REPEATS) setQueue((qu) => [...qu, { q, attempt: item.attempt + 1 }]);
      else setSolved((s) => new Set(s).add(q.id)); // give up on it after repeated misses
    }
  }, [q, item, checked, value, mode, usesHearts]);

  const finish = useCallback(() => {
    const seconds = Math.round((Date.now() - started.current) / 1000);
    const accuracy = total ? firstTry / total : 0;
    const perfect = missed.size === 0;
    let xp;
    if (mode === 'lesson') xp = lessonXp({ firstTryCorrect: firstTry, total, perfect });
    else xp = Math.max(5, firstTry + (perfect ? 5 : 0));
    xp += onFinish?.({ firstTry, total, perfect }) ?? 0;
    actions.addXp(xp);
    if (mode === 'lesson' && lessonId) actions.completeLesson(lessonId, { accuracy, seconds });
    else actions.completeLesson(`__${mode}`, { accuracy, seconds });
    let heartGained = false;
    if (mode !== 'lesson' && !getState().profile.relaxed && heartsNow(getState()) < MAX_HEARTS) {
      actions.gainHeart(1);
      heartGained = true;
    }
    const levelBefore = levelForXp(xpBefore.current);
    const levelAfter = levelForXp(getState().xp);
    play(levelAfter > levelBefore ? 'levelup' : 'complete');
    setResult({ xp, accuracy, seconds, perfect, total, firstTry, levelBefore, levelAfter, heartGained });
  }, [total, firstTry, missed, mode, lessonId]);

  const next = useCallback(() => {
    if (!checked) return;
    if (usesHearts && heartsNow(getState()) <= 0) { setOutOfHearts(true); return; }
    setChecked(null);
    setValue(null);
    if (i + 1 >= queue.length) finish();
    else setI(i + 1);
  }, [checked, i, queue.length, finish, usesHearts]);

  // Keyboard: Enter checks / continues, Escape asks to quit.
  useEffect(() => {
    const onKey = (e) => {
      if (result || outOfHearts) return;
      if (e.key === 'Escape') { setConfirmQuit((v) => !v); return; }
      if (confirmQuit) return;
      if (e.key === 'Enter' && !e.repeat) {
        const onOtherButton = e.target?.tagName === 'BUTTON' && e.target !== checkRef.current && e.target !== continueRef.current;
        if (onOtherButton && !(checked || (q && (q.type === 'mcq' || q.type === 'tf') && isReady(q, value)))) return;
        e.preventDefault();
        checked ? next() : check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checked, check, next, result, confirmQuit, outOfHearts, q, value]);

  useEffect(() => { if (checked) continueRef.current?.focus(); }, [checked]);

  const feedback = useMemo(() => {
    if (!checked || !q) return null;
    const answer = correctAnswerText(q);
    return {
      title: checked.correct ? PRAISE[(q.id.length + i) % PRAISE.length] : 'Not quite',
      answer: !checked.correct && answer ? answer : null,
      explanation: !checked.correct || q.type === 'tf' ? q.explanation : null,
    };
  }, [checked, q, i]);

  if (result) {
    return <Complete result={result} mode={mode} title={title} onContinue={onExit} />;
  }

  if (outOfHearts) {
    const mins = Math.ceil(msToNextHeart(getState().hearts) / 60000);
    return (
      <div className="session session-center">
        <div className="big-emoji" aria-hidden="true">💔</div>
        <h1>You're out of hearts</h1>
        <p>Practise your review queue to earn a heart back, or wait {mins} min for the next one to refill.</p>
        <div className="stack">
          <a className="btn btn-primary" href="#/practice/review">Practise to earn hearts</a>
          <button className="btn btn-ghost" onClick={() => actions.setProfile({ relaxed: true })}>Turn on unlimited hearts</button>
          <button className="btn btn-ghost" onClick={onExit}>Quit lesson</button>
        </div>
      </div>
    );
  }

  const ready = q && isReady(q, value);

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn close-btn" onClick={() => setConfirmQuit(true)} aria-label="Quit">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="progress-fill" style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
        {usesHearts ? (
          <span className="stat stat--hearts" aria-label={progress.profile.relaxed ? 'Unlimited hearts' : `${hearts} hearts`}>
            <Icon name="heart" /> <span aria-hidden="true">{progress.profile.relaxed ? '∞' : hearts}</span>
          </span>
        ) : (
          <span className="session-mode">{{ review: 'Review', mistakes: 'Mistakes', daily: 'Daily' }[mode] ?? 'Practice'}</span>
        )}
      </div>

      <main className="session-body" id="main">
        {item?.attempt > 0 && <p className="repeat-tag">↻ Previously missed</p>}
        {q && <QuestionView key={`${q.id}-${i}`} q={q} value={value} onChange={onChange} locked={!!checked} />}
      </main>

      <footer className={`session-foot ${checked ? (checked.correct ? 'is-correct' : 'is-wrong') : ''}`}>
        <div className="foot-inner">
          {feedback ? (
            <div className="feedback" role="status" aria-live="assertive">
              <div className="feedback-title">
                <span className="feedback-icon" aria-hidden="true">{checked.correct ? '✓' : '✕'}</span>
                {feedback.title}
              </div>
              {feedback.answer && <p className="feedback-answer"><strong>Answer:</strong> {feedback.answer}</p>}
              {feedback.explanation && <p className="feedback-expl">{feedback.explanation}</p>}
            </div>
          ) : (
            <div className="foot-hint" aria-hidden="true">Press Enter to check</div>
          )}
          {checked ? (
            <button ref={continueRef} className={`btn ${checked.correct ? 'btn-success' : 'btn-danger'}`} onClick={next}>
              Continue
            </button>
          ) : (
            <button ref={checkRef} className="btn btn-primary" onClick={check} disabled={!ready}>
              Check
            </button>
          )}
        </div>
      </footer>

      {confirmQuit && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmQuit(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="quit-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="quit-title">Quit this {mode === 'lesson' ? 'lesson' : 'session'}?</h2>
            <p>Your answers so far still count towards review, but you won't get XP for an unfinished session.</p>
            <div className="stack">
              <button className="btn btn-primary" autoFocus onClick={() => setConfirmQuit(false)}>Keep going</button>
              <button className="btn btn-ghost danger-text" onClick={onExit}>Quit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
