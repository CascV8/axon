// Account & sync (#/account) and course management (#/courses).
import { useState } from 'react';
import { useAccount, signOut, deleteCloudData, setNewPassword } from '../lib/sync.js';
import { accountsEnabled } from '../config.js';
import { AuthForm } from '../components/AuthForm.jsx';
import { CoursePicker } from '../components/CoursePicker.jsx';
import { actions, useProgress } from '../lib/store.js';
import { courseById } from '../content/courses.js';

const SYNC_LABEL = { idle: 'Waiting', syncing: 'Syncing…', synced: 'All changes saved', error: 'Sync problem', disabled: 'Off' };

export function SyncBadge() {
  const a = useAccount();
  if (!accountsEnabled) return null;
  if (!a.user) return <a className="sync-badge guest" href="#/account">Guest · save progress</a>;
  return <span className={`sync-badge ${a.sync}`} title={a.error || ''}>{a.sync === 'synced' ? '☁️ Saved' : a.sync === 'syncing' ? '☁️ Saving…' : a.sync === 'error' ? '⚠️ Not synced' : '☁️'}</span>;
}

export function AccountCard() {
  const a = useAccount();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');
  if (!accountsEnabled) {
    return (
      <section className="card">
        <h2>Account</h2>
        <p>Cloud accounts aren't switched on for this copy of Axon yet, so progress is saved in this browser. Use “Download backup” below to move it between devices.</p>
      </section>
    );
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
        Sync: {SYNC_LABEL[a.sync] ?? a.sync}
        {a.lastSynced ? ` · last saved ${new Date(a.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
      {a.error && <p className="form-error" role="alert">{a.error}</p>}
      <div className="row wrap">
        <button className="btn btn-secondary" onClick={() => signOut()}>Log out</button>
      </div>
      {msg && <p className="notice" role="status">{msg}</p>}
      {confirmDelete ? (
        <div className="row wrap">
          <button className="btn btn-danger" onClick={async () => { try { await deleteCloudData(); } catch (e) { setMsg(e.message); } }}>Yes, delete my cloud data</button>
          <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
        </div>
      ) : (
        <button className="link-btn danger-text" onClick={() => setConfirmDelete(true)}>Delete my cloud data…</button>
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
  const courses = p.profile.courses ?? [];
  const live = courses.filter((c) => courseById.get(c.id)?.available);
  return (
    <div>
      <a className="back-link" href="#/learn">‹ Learn</a>
      <h1 className="page-title">My courses</h1>
      {live.length > 0 && (
        <section className="card">
          <h2>Studying now</h2>
          <ul className="list">
            {live.map((c) => {
              const course = courseById.get(c.id);
              return (
                <li key={c.id} className="list-row">
                  <span className="course-icon big" aria-hidden="true">{course.icon}</span>
                  <span className="list-main"><span className="list-title">{course.name} {c.level}</span><span className="list-sub">Full course available</span></span>
                  <a className="btn btn-small btn-primary" href="#/learn">Open</a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>Edit courses</h2>
        <p>Add or remove subjects and switch SL/HL. Courses marked “coming soon” are saved to your profile and will appear when they launch.</p>
        <CoursePicker value={courses} onChange={(v) => actions.setProfile({ courses: v })} />
      </section>
    </div>
  );
}

export function PasswordRecovery() {
  const a = useAccount();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  if (!a.recovery) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="pw-title"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
          try { await setNewPassword(pw); setDone(true); } catch (x) { setErr(x.message); }
        }}>
        <h2 id="pw-title">Choose a new password</h2>
        {done ? <p className="notice">Password updated. You're signed in.</p> : (
          <>
            <label className="field"><span>New password</span>
              <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            </label>
            {err && <p className="form-error" role="alert">{err}</p>}
            <button className="btn btn-primary btn-wide" type="submit">Save password</button>
          </>
        )}
      </form>
    </div>
  );
}
