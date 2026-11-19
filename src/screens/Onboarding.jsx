import { useState } from 'react';
import { actions } from '../lib/store.js';
import { TOTALS } from '../content/index.js';

const GOALS = [
  { xp: 10, label: 'Casual', sub: '~5 min a day' },
  { xp: 30, label: 'Regular', sub: '~10 min a day' },
  { xp: 50, label: 'Serious', sub: '~15 min a day' },
  { xp: 80, label: 'Intense', sub: '~25 min a day' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState('HL');
  const [goal, setGoal] = useState(30);
  const [name, setName] = useState('');

  const finish = () => {
    actions.setProfile({ track, dailyGoal: goal, name: name.trim(), onboarded: true });
    window.location.hash = '#/learn';
  };

  return (
    <div className="onboarding">
      <div className="onb-card">
        <div className="onb-steps" aria-hidden="true">{[0, 1, 2].map((s) => <span key={s} className={s <= step ? 'on' : ''} />)}</div>
        {step === 0 && (
          <>
            <div className="onb-logo" aria-hidden="true"><span className="brand-mark big" /></div>
            <h1>Welcome to Axon</h1>
            <p>Bite-sized IB Biology. {TOTALS.questions} questions and {TOTALS.terms} keyterms across all {TOTALS.topics} syllabus topics, with spaced repetition that remembers what you forget.</p>
            <label className="field">
              <span>What should we call you? (optional)</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Your name" />
            </label>
            <button className="btn btn-primary btn-wide" onClick={() => setStep(1)}>Get started</button>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Which course are you taking?</h1>
            <p>SL hides Higher Level-only content. You can change this any time.</p>
            <div className="stack" role="radiogroup" aria-label="Course level">
              {[
                { id: 'SL', title: 'Standard Level', sub: 'Core syllabus' },
                { id: 'HL', title: 'Higher Level', sub: 'Core + additional higher level' },
              ].map((o) => (
                <button key={o.id} role="radio" aria-checked={track === o.id} className={`choice big-choice ${track === o.id ? 'selected' : ''}`} onClick={() => setTrack(o.id)}>
                  <span className="choice-key" aria-hidden="true">{o.id}</span>
                  <span><strong>{o.title}</strong><small>{o.sub}</small></span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-wide" onClick={() => setStep(2)}>Continue</button>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Pick a daily goal</h1>
            <p>Small daily sessions beat last-minute cramming.</p>
            <div className="stack" role="radiogroup" aria-label="Daily goal">
              {GOALS.map((g) => (
                <button key={g.xp} role="radio" aria-checked={goal === g.xp} className={`choice big-choice ${goal === g.xp ? 'selected' : ''}`} onClick={() => setGoal(g.xp)}>
                  <span className="choice-key" aria-hidden="true">{g.xp}</span>
                  <span><strong>{g.label}</strong><small>{g.sub}</small></span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-wide" onClick={finish}>Start learning</button>
          </>
        )}
        {step > 0 && <button className="link-btn" onClick={() => setStep(step - 1)}>Back</button>}
      </div>
    </div>
  );
}
