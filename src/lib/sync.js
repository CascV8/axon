// Accounts + cloud sync against Axon's own API (Cloudflare Pages Functions + D1).
// localStorage stays what the app reads from; the cloud keeps a merged copy per account.
import { useSyncExternalStore } from 'react';
import { getState, subscribe, actions, DEFAULT_STATE } from './store.js';
import { mergeStates } from './merge.js';

/* ---------- observable status ---------- */
let status = {
  ready: false,          // first /api check finished
  available: false,      // accounts backend reachable
  emailEnabled: false,   // server can send email (verify / reset)
  user: null,            // { id, email, name, emailVerified }
  sync: 'idle',          // idle | syncing | synced | error
  error: null,
  lastSynced: null,
  recoveryToken: null,   // set when opened from a password-reset email
  notice: null,          // one-off message (e.g. "Email confirmed")
};
const subs = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  subs.forEach((f) => f());
}
export function useAccount() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => status, () => status);
}
export function clearNotice() { setStatus({ notice: null }); }

/* ---------- HTTP ---------- */
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
async function api(method, path, data, { keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      keepalive,
      headers: data !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError('You seem to be offline. Check your connection.', 0);
  }
  const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) throw new ApiError(body.error || `Request failed (${res.status}).`, res.status);
  if (!isJson) throw new ApiError('Accounts are not available on this server.', 404);
  return body;
}

/* ---------- sync ---------- */
let pushTimer = null;
let applyingRemote = false;
let dirty = false;

async function push({ keepalive = false } = {}) {
  if (!status.user) return;
  dirty = false;
  setStatus({ sync: 'syncing' });
  try {
    await api('PUT', 'progress', { data: getState() }, { keepalive });
    setStatus({ sync: 'synced', error: null, lastSynced: Date.now() });
  } catch (e) {
    dirty = true;
    if (e.status === 401) { setStatus({ user: null, sync: 'idle' }); return; }
    setStatus({ sync: 'error', error: e.message });
  }
}

function schedulePush(delay = 4000) {
  if (!status.user) return;
  dirty = true;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(), delay);
}

async function syncNow() {
  if (!status.user) return;
  setStatus({ sync: 'syncing' });
  try {
    const { data } = await api('GET', 'progress');
    const merged = mergeStates(getState(), data);
    applyingRemote = true;
    actions.replace(merged);
    applyingRemote = false;
    await push();
  } catch (e) {
    applyingRemote = false;
    setStatus({ sync: 'error', error: e.message });
  }
}

function onSignedIn(user) {
  setStatus({ user });
  if (user.name && !getState().profile.name) actions.setProfile({ name: user.name });
  return syncNow();
}

/* ---------- boot ---------- */
export async function initAccounts() {
  subscribe(() => { if (!applyingRemote) schedulePush(); });
  window.addEventListener('online', () => status.user && syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && status.user && dirty) {
      clearTimeout(pushTimer);
      push({ keepalive: JSON.stringify(getState()).length < 60000 });
    }
  });

  // Links from emails: ?verify=… and ?reset=…
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get('verify');
  const resetToken = params.get('reset');
  if (verifyToken || resetToken) history.replaceState(null, '', window.location.pathname + window.location.hash);

  try {
    const cfg = await api('GET', 'auth/config');
    setStatus({ available: !!cfg.accounts, emailEnabled: !!cfg.email });
  } catch {
    setStatus({ ready: true, available: false });
    return;
  }
  if (resetToken) setStatus({ recoveryToken: resetToken });
  try {
    const { user } = await api('GET', 'auth/me');
    setStatus({ ready: true });
    await onSignedIn(user);
  } catch {
    setStatus({ ready: true });
  }
  if (verifyToken) {
    try {
      await api('POST', 'auth/verify', { token: verifyToken });
      setStatus({ notice: 'Email confirmed. Thanks!', user: status.user ? { ...status.user, emailVerified: true } : null });
    } catch (e) {
      setStatus({ notice: e.message });
    }
  }
}

/* ---------- actions used by the UI ---------- */
export async function signUp({ email, password, name }) {
  const { user } = await api('POST', 'auth/signup', { email, password, name });
  await onSignedIn(user);
  return user;
}
export async function signIn({ email, password }) {
  const { user } = await api('POST', 'auth/login', { email, password });
  await onSignedIn(user);
  return user;
}
export async function sendReset(email) {
  await api('POST', 'auth/forgot', { email });
}
export async function resendVerification() {
  await api('POST', 'auth/resend-verification', {});
}
export async function setNewPassword(password) {
  const { user } = await api('POST', 'auth/reset', { token: status.recoveryToken, password });
  setStatus({ recoveryToken: null, notice: 'Password updated. You\'re signed in.' });
  await onSignedIn(user);
}
export function cancelRecovery() { setStatus({ recoveryToken: null }); }

export async function signOut() {
  clearTimeout(pushTimer);
  if (status.user && dirty) await push();
  await api('POST', 'auth/logout', {}).catch(() => {});
  setStatus({ user: null, sync: 'idle', lastSynced: null, error: null });
  // Don't leave this student's progress on a shared device.
  applyingRemote = true;
  actions.replace(structuredClone(DEFAULT_STATE));
  applyingRemote = false;
  window.location.hash = '#/learn';
}
export async function deleteAccount() {
  clearTimeout(pushTimer);
  await api('DELETE', 'account');
  setStatus({ user: null, sync: 'idle', lastSynced: null, error: null });
  applyingRemote = true;
  actions.replace(structuredClone(DEFAULT_STATE));
  applyingRemote = false;
  window.location.hash = '#/learn';
}
