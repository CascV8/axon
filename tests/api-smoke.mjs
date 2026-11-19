// End-to-end check of the accounts API. Creates a throwaway account and deletes it at the end.
// Usage: node tests/api-smoke.mjs http://127.0.0.1:8788
import assert from 'node:assert/strict';

const BASE = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
let cookie = '';

async function call(method, path, body, { withCookie = true, origin = ORIGIN } = {}) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(withCookie && cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) {
    const m = set.match(/axon_session=([^;]*)/);
    if (m) cookie = m[1] ? `axon_session=${m[1]}` : '';
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, set };
}

const email = `smoke-${Date.now()}@example.com`;
const password = 'correct horse battery';
const step = (name) => console.log(`✓ ${name}`);

let r = await call('GET', 'auth/config');
assert.equal(r.status, 200); assert.equal(r.data.accounts, true);
step(`config (email sending ${r.data.email ? 'on' : 'off'})`);

r = await call('GET', 'auth/me');
assert.equal(r.status, 401); step('me without session → 401');

r = await call('POST', 'auth/signup', { email, password: 'short', name: 'T' });
assert.equal(r.status, 400); step('weak password rejected');

r = await call('POST', 'auth/signup', { email, password, name: 'Smoke' });
assert.equal(r.status, 201, JSON.stringify(r.data));
assert.match(r.set, /HttpOnly/); assert.match(r.set, /Secure/); assert.match(r.set, /SameSite=Lax/);
assert.equal(r.data.user.email, email); step('signup → session cookie (HttpOnly, Secure, SameSite)');

r = await call('POST', 'auth/signup', { email, password, name: 'Dup' }, { withCookie: false });
assert.equal(r.status, 409); step('duplicate email rejected');

r = await call('GET', 'auth/me');
assert.equal(r.status, 200); assert.equal(r.data.user.name, 'Smoke'); step('me with session');

r = await call('GET', 'progress');
assert.equal(r.status, 200); assert.equal(r.data.data, null); step('empty progress');

const data = { xp: 42, profile: { onboarded: true }, lessons: { 'A1.1-1': { done: 1, best: 1, last: 1 } } };
r = await call('PUT', 'progress', { data });
assert.equal(r.status, 200); step('save progress');

r = await call('GET', 'progress');
assert.deepEqual(r.data.data, data); step('load progress round-trips');

r = await call('PUT', 'progress', { data }, { origin: 'https://evil.example' });
assert.equal(r.status, 403); step('cross-site write blocked');

r = await call('POST', 'auth/logout', {});
assert.equal(r.status, 200);
r = await call('GET', 'progress');
assert.equal(r.status, 401); step('logout ends session');

r = await call('POST', 'auth/login', { email, password: 'wrong password!' });
assert.equal(r.status, 401); step('wrong password rejected');

r = await call('POST', 'auth/login', { email: email.toUpperCase(), password });
assert.equal(r.status, 200); step('login (email is case-insensitive)');

r = await call('GET', 'progress');
assert.equal(r.data.data.xp, 42); step('progress available after login');

r = await call('POST', 'auth/forgot', { email: 'nobody-here@example.com' });
assert.equal(r.status, 200); step('forgot password gives the same answer for unknown emails');

r = await call('POST', 'auth/reset', { token: 'a'.repeat(64), password: 'another password' });
assert.equal(r.status, 400); step('bogus reset token rejected');

r = await call('POST', 'auth/verify', { token: 'b'.repeat(64) });
assert.equal(r.status, 400); step('bogus verify token rejected');

r = await call('DELETE', 'account');
assert.equal(r.status, 200);
r = await call('POST', 'auth/login', { email, password }, { withCookie: false });
assert.equal(r.status, 401); step('account deleted (login no longer works)');

console.log(`\nAll API checks passed against ${BASE}`);
