import express from 'express';
import { q, parseJson } from '../db.js';
import {
  hashPassword, verifyPassword, passwordProblem, emailProblem, normalizeEmail,
  createSession, destroySession, destroyAllSessions, COOKIE_NAME, cookieOptions,
  createResetToken, consumeResetToken, requireAuth, touchStreak, rateLimit,
} from '../auth.js';
import { isGrade, GRADES, GRADE_LABELS } from '../math/index.js';
import { fullState, getProgress, DEFAULT_SETTINGS } from '../gameService.js';
import { DEFAULT_AVATAR, sanitizeAvatar } from '../content/avatars.js';

const router = express.Router();

router.post('/register', (req, res) => {
  const limit = rateLimit({ key: 'register:' + req.ip, max: 12, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return res.status(429).json({ error: 'Too many sign-up attempts. Please try again later.' });

  const { email, password, displayName, grade, role } = req.body || {};
  const emailErr = emailProblem(email);
  if (emailErr) return res.status(400).json({ error: emailErr });
  const pwErr = passwordProblem(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const normalized = normalizeEmail(email);
  const existing = q.get('SELECT id FROM users WHERE email = ?', normalized);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const name = String(displayName || '').trim().slice(0, 30);
  const chosenGrade = isGrade(grade) ? String(grade) : 'K';
  // Only student and guardian accounts can be self-created. Admins are seeded.
  const chosenRole = role === 'guardian' ? 'guardian' : 'student';

  const { hash, salt } = hashPassword(password);
  const info = q.run(
    `INSERT INTO users (email, password_hash, password_salt, role, display_name, current_grade, avatar_json, settings_json, onboarded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    normalized, hash, salt, chosenRole, name, chosenGrade,
    JSON.stringify(DEFAULT_AVATAR), JSON.stringify(DEFAULT_SETTINGS),
    name && chosenRole === 'student' ? 0 : 1
  );
  const userId = Number(info.lastInsertRowid);
  getProgress(userId, chosenGrade);

  const { token, expires } = createSession(userId);
  res.cookie(COOKIE_NAME, token, cookieOptions(expires));
  const user = q.get('SELECT * FROM users WHERE id = ?', userId);
  q.run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", userId);
  res.json({ ok: true, state: fullState(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const normalized = normalizeEmail(email);
  const limit = rateLimit({ key: 'login:' + normalized + ':' + req.ip, max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  }

  const user = q.get('SELECT * FROM users WHERE email = ?', normalized);
  // Same message either way so an attacker cannot discover which emails exist.
  const invalid = () => res.status(401).json({ error: 'Email or password is incorrect.' });
  if (!user) return invalid();
  if (!verifyPassword(String(password || ''), user.password_hash, user.password_salt)) return invalid();

  const { token, expires } = createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions(expires));
  q.run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", user.id);
  touchStreak(user.id);
  const fresh = q.get('SELECT * FROM users WHERE id = ?', user.id);
  res.json({ ok: true, state: fullState(fresh) });
});

router.post('/logout', (req, res) => {
  destroySession(req.sessionToken);
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  touchStreak(req.user.id);
  const fresh = q.get('SELECT * FROM users WHERE id = ?', req.user.id);
  res.json({ state: fullState(fresh) });
});

/**
 * Request a password reset.
 *
 * No email service is wired up in this build, so the token comes back in the
 * response and is logged. In production this endpoint should send the link by
 * email and return only the generic acknowledgement.
 */
router.post('/reset/request', (req, res) => {
  const limit = rateLimit({ key: 'reset:' + req.ip, max: 8, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return res.status(429).json({ error: 'Too many reset requests. Please try again later.' });

  const normalized = normalizeEmail(req.body && req.body.email);
  const user = q.get('SELECT id FROM users WHERE email = ?', normalized);
  const generic = { ok: true, message: 'If that email is registered, a reset link is on its way.' };
  if (!user) return res.json(generic);

  const token = createResetToken(user.id);
  const deliverInline = process.env.NODE_ENV !== 'production';
  if (deliverInline) {
    console.log('[numeria] password reset token for ' + normalized + ': ' + token);
    return res.json({ ...generic, devToken: token });
  }
  return res.json(generic);
});

router.post('/reset/confirm', (req, res) => {
  const { token, password } = req.body || {};
  const pwErr = passwordProblem(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const userId = consumeResetToken(String(token || ''));
  if (!userId) return res.status(400).json({ error: 'That reset link is invalid or has expired.' });

  const { hash, salt } = hashPassword(password);
  q.run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', hash, salt, userId);
  destroyAllSessions(userId);
  res.json({ ok: true, message: 'Password updated. You can sign in now.' });
});

router.post('/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = q.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!verifyPassword(String(currentPassword || ''), user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Your current password is not correct.' });
  }
  const pwErr = passwordProblem(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });
  const { hash, salt } = hashPassword(newPassword);
  q.run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', hash, salt, user.id);
  res.json({ ok: true, message: 'Password updated.' });
});

router.get('/grades', (req, res) => {
  res.json({ grades: GRADES.map((g) => ({ id: g, label: GRADE_LABELS[g] })) });
});

export default router;
