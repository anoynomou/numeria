import crypto from 'node:crypto';
import { q, today, daysBetween } from './db.js';

const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

/**
 * Hash a password with scrypt and a per-user random salt. Plain text passwords
 * are never stored or logged.
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex');
  return { hash, salt };
}

/** Constant-time password check. */
export function verifyPassword(password, hash, salt) {
  let derived;
  try {
    derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  } catch {
    return false;
  }
  const stored = Buffer.from(hash, 'hex');
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(stored, derived);
}

/** Basic strength rules, kept friendly for a school setting. */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 200) return 'Password is too long.';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function emailProblem(email) {
  const e = normalizeEmail(email);
  if (!e) return 'Email is required.';
  if (e.length > 254) return 'Email is too long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Please enter a valid email address.';
  return null;
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  q.run(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    sha256(token),
    userId,
    expires.toISOString()
  );
  return { token, expires };
}

export function destroySession(token) {
  if (!token) return;
  q.run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
}

export function destroyAllSessions(userId) {
  q.run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export function userForToken(token) {
  if (!token) return null;
  const row = q.get(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    sha256(token)
  );
  return row || null;
}

export function purgeExpiredSessions() {
  q.run("DELETE FROM sessions WHERE expires_at <= datetime('now')");
  q.run("DELETE FROM password_resets WHERE expires_at <= datetime('now')");
  q.run("DELETE FROM link_codes WHERE expires_at <= datetime('now')");
}

export const COOKIE_NAME = 'numeria_session';

export function cookieOptions(expires) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  };
}

/* ------------------------------------------------------------------ */
/* Password reset tokens                                               */
/* ------------------------------------------------------------------ */

export function createResetToken(userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  q.run(
    'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    sha256(token),
    userId,
    expires.toISOString()
  );
  return token;
}

export function consumeResetToken(token) {
  if (!token) return null;
  const row = q.get(
    "SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')",
    sha256(token)
  );
  if (!row) return null;
  q.run('UPDATE password_resets SET used = 1 WHERE token_hash = ?', row.token_hash);
  return row.user_id;
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

export function attachUser(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  req.sessionToken = token || null;
  req.user = userForToken(token);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have access to this area.' });
    next();
  };
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

/**
 * Record that the student played today and update their learning streak.
 * Returns the updated streak values.
 */
export function touchStreak(userId) {
  const user = q.get('SELECT last_play_date, streak_days, best_streak FROM users WHERE id = ?', userId);
  if (!user) return { streak: 0, best: 0 };
  const day = today();
  if (user.last_play_date === day) {
    return { streak: user.streak_days, best: user.best_streak };
  }
  const gap = daysBetween(user.last_play_date, day);
  const streak = gap === 1 ? user.streak_days + 1 : 1;
  const best = Math.max(streak, user.best_streak || 0);
  q.run('UPDATE users SET last_play_date = ?, streak_days = ?, best_streak = ? WHERE id = ?', day, streak, best, userId);
  return { streak, best };
}

/* ------------------------------------------------------------------ */
/* Rate limiting for auth endpoints                                    */
/* ------------------------------------------------------------------ */

const attempts = new Map();

/** Simple in-memory throttle so login cannot be brute forced in a loop. */
export function rateLimit({ key, max = 10, windowMs = 15 * 60 * 1000 }) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: max - entry.count };
}

// Keep the throttle map from growing without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (now > entry.resetAt) attempts.delete(key);
}, 10 * 60 * 1000).unref();
