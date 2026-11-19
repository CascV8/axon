// Accounts (Supabase Auth) + cloud sync of the progress object.
// localStorage stays the source the app reads from; the cloud row is a merged copy.
import { useSyncExternalStore } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, accountsEnabled } from '../config.js';
import { getState, subscribe, actions, DEFAULT_STATE } from './store.js';
import { mergeStates } from './merge.js';

export const supabase = accountsEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'axon:auth' },
  })
  : null;

/* ---------- tiny observable for auth/sync status ---------- */
let status = { user: null, sync: accountsEnabled ? 'idle' : 'disabled', error: null, lastSynced: null, recovery: false, ready: !accountsEnabled };
const subs = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  subs.forEach((f) => f());
}
export function useAccount() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => status, () => status);
}

/* ---------- push / pull ---------- */
const TABLE = 'axon_progress';
let pushTimer = null;
let applyingRemote = false;

async function pull(userId) {
  const { data, error } = await supabase.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function push() {
  const user = status.user;
  if (!user) return;
  setStatus({ sync: 'syncing' });
  const { error } = await supabase.from(TABLE).upsert({ user_id: user.id, data: getState(), updated_at: new Date().toISOString() });
  if (error) setStatus({ sync: 'error', error: friendly(error) });
  else setStatus({ sync: 'synced', error: null, lastSynced: Date.now() });
}

function schedulePush(delay = 2500) {
  if (!status.user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { push().catch((e) => setStatus({ sync: 'error', error: friendly(e) })); }, delay);
}

async function syncNow(user) {
  setStatus({ sync: 'syncing' });
  try {
    const remote = await pull(user.id);
    const merged = mergeStates(getState(), remote);
    applyingRemote = true;
    actions.replace(merged);
    applyingRemote = false;
    await push();
  } catch (e) {
    applyingRemote = false;
    setStatus({ sync: 'error', error: friendly(e) });
  }
}

function friendly(e) {
  const msg = e?.message || String(e);
  if (/relation .*axon_progress.* does not exist|Could not find the table/i.test(msg)) return 'Cloud storage is not set up yet (run supabase/schema.sql).';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Offline. Changes will sync when you reconnect.';
  return msg;
}

/* ---------- boot ---------- */
export function initAccounts() {
  if (!supabase) return;
  subscribe(() => { if (!applyingRemote) schedulePush(); });
  window.addEventListener('online', () => status.user && syncNow(status.user));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && status.user) { clearTimeout(pushTimer); push().catch(() => {}); }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    const was = status.user?.id;
    setStatus({ user, ready: true, recovery: event === 'PASSWORD_RECOVERY' ? true : status.recovery });
    if (user && user.id !== was) {
      // Name from sign-up metadata, if the profile has none yet.
      const metaName = user.user_metadata?.name;
      if (metaName && !getState().profile.name) actions.setProfile({ name: metaName });
      setTimeout(() => syncNow(user), 0);
    }
    // Clean ?code=… left by email links.
    if (/[?&](code|error_description)=/.test(window.location.search)) {
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  });
  supabase.auth.getSession().then(({ data }) => { if (!data.session) setStatus({ ready: true }); });
}

/* ---------- auth actions ---------- */
const redirectTo = () => `${window.location.origin}${window.location.pathname}`;

export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: redirectTo() } });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}
export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function sendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw error;
}
export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  setStatus({ recovery: false });
}
export async function signOut({ skipPush = false } = {}) {
  clearTimeout(pushTimer);
  if (status.user && !skipPush) await push().catch(() => {});
  await supabase.auth.signOut();
  setStatus({ user: null, sync: 'idle', lastSynced: null });
  // Don't leave this student's progress on a shared device.
  actions.replace(structuredClone(DEFAULT_STATE));
}
export async function deleteCloudData() {
  if (!status.user) return;
  const { error } = await supabase.from(TABLE).delete().eq('user_id', status.user.id);
  if (error) throw error;
  await signOut({ skipPush: true });
}
