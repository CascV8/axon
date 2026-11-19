// First run: account (or guest) → course & level → daily goal.
import { useEffect, useState } from 'react';
import { actions, getState } from '../lib/store.js';
import { COURSES } from '../content/index.js';
import { useAccount } from '../lib/sync.js';
import { AuthForm } from '../components/AuthForm.jsx';
import { CoursePicker } from '../components/CoursePicker.jsx';

const GOALS = [
  { xp: 10, label: 'Casual', sub: '~5 min a day' },
  { xp: 30, label: 'Regular', sub: '~10 min a day' },
  { xp: 50, label: 'Serious', sub: '~15 min a day' },
  { xp: 80, label: 'Intense', sub: '~25 min a day' },
];

export function Onboarding() {
  const account = useAccount();
  const [step, setStep] = useState('welcome');
  const [authMode, setAuthMode] = useState('signup');
  const [courses, setCourses] = useState(() => getState().profile.courses ?? []);
  const [goal, setGoal] = useState(30);
  const [name, setName] = useState('');

  const steps = account.available ? ['welcome', 'account', 'courses', 'goal'] : ['welcome', 'courses', 'goal'];
  const idx = Math.max(0, steps.indexOf(step));
  const back = () => setStep(steps[Math.max(0, idx - 1)]);

  // Signed in from the account step → move on automatically.
  useEffect(() => {
    if (step === 'account' && account.user && account.sync !== 'syncing') setStep('courses');
  }, [step, account.user, account.sync]);

  const finish = () => {
    actions.setProfile({ courses, activeCourse: courses[0].id, dailyGoal: goal, name: name || getState().profile.name, onboarded: true });
    window.location.hash = '#/learn';
  };

  return (
    <div className="onboarding">
      <div className={`onb-card ${step === 'courses' ? 'wide' : ''}`}>
        <div className="onb-steps" aria-hidden="true">{steps.map((s, i) => <span key={s} className={i <= idx ? 'on' : ''} />)}</div>

        {step === 'welcome' && (
          <>
            <div className="onb-logo" aria-hidden="true"><span className="brand-mark big" /></div>
            <h1>Welcome to Axon</h1>
            <p>Bite-sized, gamified revision for {COURSES.length} IB Diploma courses: lessons for every syllabus topic, spaced repetition that remembers what you forget, exam-style questions and grade tools.</p>
            {!account.ready ? (
              <p className="muted-small" role="status">Loading…</p>
            ) : account.available ? (
              <div className="stack">
                <button className="btn btn-primary btn-wide" onClick={() => { setAuthMode('signup'); setStep('account'); }}>Create a free account</button>
                <button className="btn btn-secondary btn-wide" onClick={() => { setAuthMode('login'); setStep('account'); }}>I already have an account</button>
                <button className="link-btn" onClick={() => setStep('courses')}>Continue without an account</button>
                <p className="muted-small">With an account your streak and progress are saved and follow you to any device.</p>
              </div>
            ) : (
              <button className="btn btn-primary btn-wide" onClick={() => setStep('courses')}>Get started</button>
            )}
          </>
        )}

        {step === 'account' && (
          <>
            <h1>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            {account.user ? (
              <p className="notice" role="status">Signed in as <strong>{account.user.email}</strong>. Loading your progress…</p>
            ) : (
              <>
                <AuthForm key={authMode} initialMode={authMode} onDone={(r) => { if (r?.name) setName(r.name); }} />
                <button className="link-btn" onClick={() => setStep('courses')}>Skip for now</button>
              </>
            )}
          </>
        )}

        {step === 'courses' && (
          <>
            <h1>Pick your IB courses</h1>
            <p>Choose every subject you take and its level. SL hides Higher Level-only content. You can change this any time.</p>
            <CoursePicker value={courses} onChange={setCourses} />
            <button className="btn btn-primary btn-wide sticky-cta" onClick={() => setStep('goal')} disabled={!courses.length}>
              {courses.length ? `Continue with ${courses.length} course${courses.length > 1 ? 's' : ''}` : 'Pick at least one course'}
            </button>
          </>
        )}

        {step === 'goal' && (
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

        {idx > 0 && !(step === 'courses' && account.user) && <button className="link-btn" onClick={back}>Back</button>}
      </div>
    </div>
  );
}
