// Create account / log in / forgot password.
import { useState } from 'react';
import { signIn, signUp, sendReset, useAccount } from '../lib/sync.js';

export function AuthForm({ initialMode = 'signup', onDone }) {
  const account = useAccount();
  const [mode, setMode] = useState(initialMode); // signup | login | reset
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode !== 'reset' && password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp({ email: email.trim(), password, name: name.trim() });
        onDone?.({ name: name.trim() });
      } else if (mode === 'login') {
        await signIn({ email: email.trim(), password });
        onDone?.({});
      } else {
        await sendReset(email.trim());
        setInfo('If that email has an Axon account, a reset link is on its way. Check your spam folder too.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="seg seg-tabs" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={`seg-item ${mode === 'signup' ? 'selected' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
        <button type="button" role="tab" aria-selected={mode !== 'signup'} className={`seg-item ${mode !== 'signup' ? 'selected' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
      </div>
      {mode === 'signup' && (
        <label className="field">
          <span>First name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} />
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
      </label>
      {mode !== 'reset' && (
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          {mode === 'signup' && <small className="muted-small">At least 8 characters.</small>}
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {info && <p className="notice" role="status">{info}</p>}
      <button className="btn btn-primary btn-wide" type="submit" disabled={busy || !email.trim()}>
        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send reset link'}
      </button>
      {mode === 'login' && account.emailEnabled && <button type="button" className="link-btn" onClick={() => setMode('reset')}>Forgot your password?</button>}
      {mode === 'reset' && <button type="button" className="link-btn" onClick={() => setMode('login')}>Back to log in</button>}
    </form>
  );
}
