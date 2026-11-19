// Account & sync (#/account), course management (#/courses), password reset, notices.
import { useEffect, useState } from 'react';
import { useAccount, signOut, deleteAccount, setNewPassword, cancelRecovery, resendVerification, clearNotice } from '../lib/sync.js';
import { AuthForm } from '../components/AuthForm.jsx';
import { CoursePicker } from '../components/CoursePicker.jsx';
import { actions, useProgress } from '../lib/store.js';
import { courseById } from '../content/index.js';
import { activeCourseId } from '../lib/active.js';

const SYNC_LABEL = { idle: 'Waiting', syncing: 'Saving…', synced: 'All changes saved', error: 'Not saved yet' };

export function SyncBadge() {
  const a = useAccount();
  if (!a.available) return null;
  if (!a.user) return <a className="sync-badge guest" href="#/account">Guest · save progress</a>;
  const label = a.sync === 'synced' ? '☁️ Saved' : a.sync === 'syncing' ? '☁️ Saving…' : a.sync === 'error' ? '⚠️ Not synced' : '☁️';
  return <a className={`sync-badge ${a.sync}`} href="#/account" title={a.error || SYNC_LABEL[a.sync]}>{label}</a>;
}

function VerifyBanner() {
  const a = useAccount();
  const [state, setState] = useState('');
  if (!a.user || a.user.emailVerified || !a.emailEnabled) return null;
  return (
    <div className="notice">
      Confirm your email ({a.user.email}) so you can always recover your account.{' '}
      {state === 'sent' ? <strong>Link sent. Check your inbox and spam folder.</strong> : (
        <button className="link-btn" onClick={async () => {
          try { await resendVerification(); setState('sent'); } catch (e) { setState(e.message); }
        }}>Resend link</button>
      )}
      {state && state !== 'sent' && <span className="danger-text"> {state}</span>}
    </div>
  );
}

export function AccountCard() {
  const a = useAccount();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');
  if (!a.ready || !a.available) {
    return a.ready ? (
      <section className="card">
        <h2>Account</h2>
        <p>Accounts aren't reachable right now, so progress is saved in this browser. Use “Download backup” below to keep a copy.</p>
      </section>
    ) : null;
  }
  if (!a.user) {
    return (
      <section className="card">
        <h2>Save your progress</h2>
        <p>You're using Axon as a guest, so progress only lives in this browser. Create a free account to back it up and use it on any device. Everything you've done so far comes with you.</p>
        <AuthForm initialMode="signup" />
      </section>
    );
  }
  return (
    <section className="card">
      <h2>Account</h2>
      <p className="account-line"><strong>{a.user.email}</strong></p>
      <p className="muted-small">
        Cloud sync: {SYNC_LABEL[a.sync] ?? a.sync}
        {a.lastSynced ? ` · last saved ${new Date(a.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
      {a.error && <p className="form-error" role="alert">{a.error}</p>}
      <VerifyBanner />
      <div className="row wrap">
        <button className="btn btn-secondary" onClick={() => signOut()}>Log out</button>
      </div>
      {msg && <p className="form-error" role="alert">{msg}</p>}
      {confirmDelete ? (
        <div className="stack" style={{ marginTop: 12 }}>
          <p>This permanently deletes your account and the progress saved in the cloud. It can't be undone.</p>
          <div className="row wrap">
            <button className="btn btn-danger" onClick={async () => { try { await deleteAccount(); } catch (e) { setMsg(e.message); } }}>Delete my account</button>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="link-btn danger-text" onClick={() => setConfirmDelete(true)}>Delete account…</button>
      )}
    </section>
  );
}

export function AccountPage() {
  return (
    <div>
      <a className="back-link" href="#/profile">‹ Profile</a>
      <h1 className="page-title">Account</h1>
      <AccountCard />
    </div>
  );
}

export function CoursesPage() {
  const p = useProgress();
  const courses = (p.profile.courses ?? []).filter((c) => courseById.has(c.id));
  const active = activeCourseId(p.profile);
  const open = (id) => { actions.setActiveCourse(id); window.location.hash = '#/learn'; };
  return (
    <div>
      <a className="back-link" href="#/learn">‹ Learn</a>
      <h1 className="page-title">My courses</h1>
      <section className="card">
        <h2>Studying</h2>
        <ul className="list">
          {courses.map((c) => {
            const course = courseById.get(c.id);
            const isActive = c.id === active;
            return (
              <li key={c.id} className="list-row">
                <span className="course-icon big" aria-hidden="true">{course.icon}</span>
                <span className="list-main">
                  <span className="list-title">{course.name}{course.levels.length > 1 ? ` ${c.level}` : ''}</span>
                  <span className="list-sub">{isActive ? 'Open now' : course.blurb}</span>
                </span>
                {isActive
                  ? <a className="btn btn-small btn-secondary" href="#/learn">Continue</a>
                  : <button className="btn btn-small btn-primary" onClick={() => open(c.id)}>Switch</button>}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card">
        <h2>Add or remove courses</h2>
        <p>Pick every IB course you take and its level. Progress is kept per course, and you can switch any time.</p>
        <CoursePicker keepOne value={courses} onChange={(v) => { if (v.length) actions.setProfile({ courses: v }); }} />
      </section>
    </div>
  );
}

export function PasswordRecovery() {
  const a = useAccount();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!a.recoveryToken) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="pw-title"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
          setBusy(true);
          try { await setNewPassword(pw); } catch (x) { setErr(x.message); } finally { setBusy(false); }
        }}>
        <h2 id="pw-title">Choose a new password</h2>
        <label className="field"><span>New password</span>
          <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="stack">
          <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
          <button className="btn btn-ghost btn-wide" type="button" onClick={cancelRecovery}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

/** Short-lived banner for account events (email confirmed, password changed…). */
export function AccountNotice() {
  const a = useAccount();
  useEffect(() => {
    if (!a.notice) return undefined;
    const t = setTimeout(clearNotice, 6000);
    return () => clearTimeout(t);
  }, [a.notice]);
  if (!a.notice) return null;
  return (
    <div className="toast" role="status">
      {a.notice}
      <button className="icon-btn" onClick={clearNotice} aria-label="Dismiss">✕</button>
    </div>
  );
}
