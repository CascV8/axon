// Creates the D1 tables on first use (idempotent). Mirrors migrations/0001_init.sql.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL DEFAULT '', pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, pw_iter INTEGER NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS email_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')), expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS email_tokens_user ON email_tokens(user_id)`,
  `CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL)`,
];

let ready = null;
export function ensureSchema(env) {
  if (!ready) {
    ready = env.DB.batch(STATEMENTS.map((s) => env.DB.prepare(s))).catch((e) => {
      ready = null; // retry on the next request
      throw e;
    });
  }
  return ready;
}
