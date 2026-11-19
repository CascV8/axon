// First run: account (or guest) → courses → daily goal.
import { useState } from 'react';
import { actions, getState } from '../lib/store.js';
import { TOTALS } from '../content/index.js';
import { courseById } from '../content/courses.js';
import { accountsEnabled } from '../config.js';
import { useAccount } from '../lib/sync.js';
import { AuthForm } from '../components/AuthForm.jsx';
import { CoursePicker } from '../components/CoursePicker.jsx';

const GOALS = [
  { xp: 10, label: 'Casual', sub: '~5 min a day' },
  { xp: 30, label: 'Regular', sub: '~10 min a day' },
  { xp: 50, label: 'Serious', sub: '~15 min a day' },
  { xp: 80, label: 'Intense', sub: '~25 min a day' },
];
const STEPS = ['welcome', 'account', 'courses', 'goal'];

export function Onboarding() {
  const account = useAccount();
  const [step, setStep] = useState('welcome');
  const [authMode, setAuthMode] = useState('signup');
  const [courses, setCourses] = useState(() => getState().profile.courses ?? []);
  const [goal, setGoal] = useState(30);
  const [name, setName] = useState('');
  const [courseError, setCourseError] = useState('');

  const visibleSteps = accountsEnabled ? STEPS : STEPS.filter((s) => s !== 'account');
  const idx = visibleSteps.indexOf(step);
  const back = () => setStep(visibleSteps[Math.max(0, idx - 1)]);

  const finish = () => {
    actions.setProfile({ courses, activeCourse: 'biology', dailyGoal: goal, name: name || getState().profile.name, onboarded: true });
    window.location.hash = '#/learn';
  };

  const nextFromCourses = () => {
    if (!courses.some((c) => courseById.get(c.id)?.available)) {
      setCourseError('Axon has Biology ready today. Add it to start learning; we\'ll save your other courses for when they launch.');
      return;
    }
    setStep('goal');
  };

  return (
    <div className="onboarding">
      <div className={`onb-card ${step === 'courses' ? 'wide' : ''}`}>
        <div className="onb-steps" aria-hidden="true">{visibleSteps.map((s, i) => <span key={s} className={i <= idx ? 'on' : ''} />)}</div>

        {step === 'welcome' && (
          <>
            <div className="onb-logo" aria-hidden="true"><span className="brand-mark big" /></div>
            <h1>Welcome to Axon</h1>
            <p>Bite-sized, gamified IB revision. Biology is live now, with {TOTALS.questions.toLocaleString()} questions across all {TOTALS.topics} syllabus topics, and more subjects are on the way.</p>
            {accountsEnabled ? (
              <div className="stack">
                <button className="btn btn-primary btn-wide" onClick={() => { setAuthMode('signup'); setStep('account'); }}>Create a free account</button>
                <button className="btn btn-secondary btn-wide" onClick={() => { setAuthMode('login'); setStep('account'); }}>I already have an account</button>
                <button className="link-btn" onClick={() => setStep('courses')}>Continue without an account</button>
                <p className="muted-small">With an account your streak and progress are saved to the cloud and follow you to any device.</p>
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
              <>
                <p className="notice">Signed in as <strong>{account.user.email}</strong>. {account.sync === 'syncing' ? 'Loading your progress…' : ''}</p>
                <button className="btn btn-primary btn-wide" onClick={() => setStep('courses')}>Continue</button>
              </>
            ) : (
              <AuthForm key={authMode} initialMode={authMode} onDone={(r) => { if (r?.name) setName(r.name); if (!r?.pending) setStep('courses'); }} />
            )}
            {!account.user && <button className="link-btn" onClick={() => setStep('courses')}>Skip for now</button>}
          </>
        )}

        {step === 'courses' && (
          <>
            <h1>Pick your IB courses</h1>
            <p>Choose your subjects and level. Biology is ready today; the rest unlock as they launch.</p>
            <CoursePicker value={courses} onChange={(v) => { setCourses(v); setCourseError(''); }} />
            {courseError && <p className="form-error" role="alert">{courseError}</p>}
            <button className="btn btn-primary btn-wide sticky-cta" onClick={nextFromCourses} disabled={!courses.length}>
              Continue{courses.length ? ` with ${courses.length} course${courses.length > 1 ? 's' : ''}` : ''}
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

        {idx > 0 && <button className="link-btn" onClick={back}>Back</button>}
      </div>
    </div>
  );
}
