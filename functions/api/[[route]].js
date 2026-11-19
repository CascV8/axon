// Axon API (Cloudflare Pages Functions). Routes:
//   POST /api/auth/signup | login | logout | verify | resend-verification | forgot | reset
//   GET  /api/auth/me
//   GET|PUT /api/progress
//   DELETE /api/account
// Bindings: DB (D1). Vars: APP_URL, EMAIL_FROM. Secret: RESEND_API_KEY.
import { hashPassword, verifyPassword, randomToken, sha256 } from '../../server/crypto.js';
import { verifyEmail, resetEmail } from '../../server/email.js';
import { ensureSchema } from '../../server/schema.js';

const COOKIE = 'axon_session';
const SESSION_DAYS = 60;
const DAY = 86400000;
const MAX_PROGRESS_BYTES = 1_500_000;

/* ---------- helpers ---------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const fail = (status, error) => json({ error }, status);

function cookieHeader(token, maxAgeSec) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
function readCookie(request) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}
const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 200;
const appUrl = (env, request) => (env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, emailVerified: !!u.email_verified });

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

/** Fixed-window limiter. Returns true when the action is allowed. */
async function allow(env, key, limit, windowMs) {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first();
  if (!row || now - row.window_start > windowMs) {
    await env.DB.prepare('INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start').bind(key, now).run();
    return true;
  }
  if (row.count >= limit) return false;
  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return true;
}

async function createSession(env, userId) {
  const token = randomToken(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_DAYS * DAY).run();
  return cookieHeader(token, SESSION_DAYS * 86400);
}

async function currentUser(env, request) {
  const token = readCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT u.*, s.id AS sid FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?',
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}

async function issueEmailToken(env, userId, kind, ttlMs) {
  const token = randomToken(32);
  await env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ? AND kind = ?').bind(userId, kind).run();
  await env.DB.prepare('INSERT INTO email_tokens (id, user_id, kind, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, kind, Date.now() + ttlMs).run();
  return token;
}
async function consumeEmailToken(env, token, kind) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const id = await sha256(token);
  const row = await env.DB.prepare('SELECT user_id, expires_at FROM email_tokens WHERE id = ? AND kind = ?').bind(id, kind).first();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM email_tokens WHERE id = ?').bind(id).run();
  return row.expires_at > Date.now() ? row.user_id : null;
}

/* ---------- handlers ---------- */
const routes = {
  // Tells the app which optional features are switched on, so it never shows ones that can't work.
  'GET auth/config': async ({ env }) => json({ accounts: true, email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM) }),

  'POST auth/signup': async ({ env, request, ip }) => {
    const { email, password, name } = await body(request);
    if (!validEmail(email)) return fail(400, 'Enter a valid email address.');
    if (!validPassword(password)) return fail(400, 'Use at least 8 characters for your password.');
    if (!(await allow(env, `signup:${ip}`, 10, 60 * 60 * 1000))) return fail(429, 'Too many sign-ups from this network. Try again later.');
    const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email.trim()).first();
    if (exists) return fail(409, 'There\'s already an account with that email. Try logging in.');
    const id = crypto.randomUUID();
    const pw = await hashPassword(password);
    await env.DB.prepare('INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_iter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, email.trim().toLowerCase(), String(name || '').trim().slice(0, 40), pw.hash, pw.salt, pw.iterations, Date.now()).run();
    const token = await issueEmailToken(env, id, 'verify', 7 * DAY);
    await verifyEmail(env, email.trim(), `${appUrl(env, request)}/?verify=${token}`);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    return json({ user: publicUser(user) }, 201, { 'Set-Cookie': await createSession(env, id) });
  },

  'POST auth/login': async ({ env, request, ip }) => {
    const { email, password } = await body(request);
    if (!validEmail(email) || typeof password !== 'string') return fail(400, 'Enter your email and password.');
    const key = email.trim().toLowerCase();
    if (!(await allow(env, `login:${ip}`, 30, 15 * 60 * 1000)) || !(await allow(env, `login:${key}`, 10, 15 * 60 * 1000))) {
      return fail(429, 'Too many attempts. Wait 15 minutes and try again.');
    }
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(key).first();
    // Hash even when the user doesn't exist so timing doesn't reveal which emails are registered.
    const ok = user ? await verifyPassword(password, user) : (await hashPassword(password), false);
    if (!ok) return fail(401, 'That email and password don\'t match.');
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': await createSession(env, user.id) });
  },

  'POST auth/logout': async ({ env, request }) => {
    const token = readCookie(request);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
  },

  'GET auth/me': async ({ user }) => (user ? json({ user: publicUser(user) }) : fail(401, 'Not signed in.')),

  'POST auth/verify': async ({ env, request }) => {
    const { token } = await body(request);
    const userId = await consumeEmailToken(env, token, 'verify');
    if (!userId) return fail(400, 'That confirmation link is invalid or has expired.');
    await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
    return json({ ok: true });
  },

  'POST auth/resend-verification': async ({ env, request, user }) => {
    if (!user) return fail(401, 'Not signed in.');
    if (user.email_verified) return json({ ok: true });
    if (!(await allow(env, `verify-mail:${user.id}`, 3, 60 * 60 * 1000))) return fail(429, 'We\'ve sent a few already. Check your spam folder or try later.');
    const token = await issueEmailToken(env, user.id, 'verify', 7 * DAY);
    await verifyEmail(env, user.email, `${appUrl(env, request)}/?verify=${token}`);
    return json({ ok: true });
  },

  'POST auth/forgot': async ({ env, request, ip }) => {
    const { email } = await body(request);
    if (!validEmail(email)) return fail(400, 'Enter a valid email address.');
    const key = email.trim().toLowerCase();
    if ((await allow(env, `forgot:${ip}`, 10, 60 * 60 * 1000)) && (await allow(env, `forgot:${key}`, 3, 60 * 60 * 1000))) {
      const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(key).first();
      if (user) {
        const token = await issueEmailToken(env, user.id, 'reset', 60 * 60 * 1000);
        await resetEmail(env, user.email, `${appUrl(env, request)}/?reset=${token}`);
      }
    }
    // Same answer either way, so this can't be used to discover accounts.
    return json({ ok: true });
  },

  'POST auth/reset': async ({ env, request }) => {
    const { token, password } = await body(request);
    if (!validPassword(password)) return fail(400, 'Use at least 8 characters for your password.');
    const userId = await consumeEmailToken(env, token, 'reset');
    if (!userId) return fail(400, 'That reset link is invalid or has expired. Request a new one.');
    const pw = await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, email_verified = 1 WHERE id = ?').bind(pw.hash, pw.salt, pw.iterations, userId),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    ]);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': await createSession(env, userId) });
  },

  'GET progress': async ({ env, user }) => {
    if (!user) return fail(401, 'Not signed in.');
    const row = await env.DB.prepare('SELECT data, updated_at FROM progress WHERE user_id = ?').bind(user.id).first();
    return json(row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null });
  },

  'PUT progress': async ({ env, request, user }) => {
    if (!user) return fail(401, 'Not signed in.');
    const text = await request.text();
    if (text.length > MAX_PROGRESS_BYTES) return fail(413, 'Progress data is too large.');
    let parsed;
    try { parsed = JSON.parse(text); } catch { return fail(400, 'Invalid JSON.'); }
    if (!parsed || typeof parsed.data !== 'object') return fail(400, 'Expected { data }.');
    const now = Date.now();
    await env.DB.prepare('INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .bind(user.id, JSON.stringify(parsed.data), now).run();
    return json({ ok: true, updatedAt: now });
  },

  'DELETE account': async ({ env, user }) => {
    if (!user) return fail(401, 'Not signed in.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
  },
};

export async function onRequest({ request, env, params }) {
  if (!env.DB) return fail(503, 'Accounts are not configured on this deployment.');
  const path = (params.route || []).join('/');
  const handler = routes[`${request.method} ${path}`];
  if (!handler) return fail(404, 'Not found.');

  // CSRF protection: state-changing requests must come from our own origin.
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return fail(403, 'Cross-site request blocked.');
  }

  try {
    await ensureSchema(env);
    const user = await currentUser(env, request);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    return await handler({ env, request, user, ip });
  } catch (e) {
    console.error(e);
    return fail(500, 'Something went wrong on our side. Please try again.');
  }
}
