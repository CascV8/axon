import { useEffect, useMemo, useRef, useState } from 'react';
import { liveStreak, dayKey } from '../lib/core.js';
import { useProgress } from '../lib/store.js';

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 48 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.6 + Math.random() * 1.2,
      color: ['#6d4cff', '#1a9e52', '#ff8a1f', '#f5b800', '#2f9bff', '#e5484d'][i % 6],
      rot: Math.random() * 360,
    })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(to); return; }
    let raf; const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return n;
}

export function Complete({ result, mode, title, onContinue }) {
  const p = useProgress();
  const streak = liveStreak(p.streak, dayKey());
  const [showLevel, setShowLevel] = useState(result.levelAfter > result.levelBefore);
  const btn = useRef(null);
  const mins = Math.floor(result.seconds / 60);
  const secs = String(result.seconds % 60).padStart(2, '0');
  const today = p.xpByDay[dayKey()] ?? 0;
  const goalMet = today >= p.profile.dailyGoal;

  useEffect(() => { if (!showLevel) btn.current?.focus(); }, [showLevel]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); showLevel ? setShowLevel(false) : onContinue(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLevel, onContinue]);

  if (showLevel) {
    return (
      <div className="session session-center levelup" role="dialog" aria-labelledby="lvl-title">
        <Confetti />
        <div className="level-badge pop" aria-hidden="true">{result.levelAfter}</div>
        <h1 id="lvl-title">Level up!</h1>
        <p>You reached <strong>level {result.levelAfter}</strong>. Your biology brain is getting bigger.</p>
        <button className="btn btn-primary" autoFocus onClick={() => setShowLevel(false)}>Awesome</button>
      </div>
    );
  }

  return (
    <div className="session session-center complete">
      <Confetti />
      <div className="trophy pop" aria-hidden="true">{result.perfect ? '🏆' : mode === 'review' ? '🧠' : '🎉'}</div>
      <h1>{result.perfect ? 'Flawless!' : mode === 'lesson' ? 'Lesson complete!' : 'Session complete!'}</h1>
      {title && <p className="complete-sub">{title}</p>}
      <div className="tiles">
        <div className="tile tile-xp"><span className="tile-label">Total XP</span><span className="tile-value">+<CountUp to={result.xp} /></span></div>
        <div className="tile tile-acc"><span className="tile-label">Accuracy</span><span className="tile-value"><CountUp to={Math.round(result.accuracy * 100)} />%</span></div>
        <div className="tile tile-time"><span className="tile-label">Time</span><span className="tile-value">{mins}:{secs}</span></div>
      </div>
      <p className="complete-note">
        🔥 {streak} day streak{goalMet ? ' · daily goal reached!' : ` · ${Math.max(0, p.profile.dailyGoal - today)} XP to today's goal`}
        {result.heartGained && ' · +1 ❤️'}
      </p>
      <button ref={btn} className="btn btn-primary btn-wide" onClick={onContinue}>Continue</button>
    </div>
  );
}
