import express from 'express';
import crypto from 'node:crypto';
import { q, parseJson } from '../db.js';
import { requireAuth } from '../auth.js';
import { statsFor, getProgress, progressView } from '../gameService.js';
import { GRADE_LABELS } from '../math/index.js';
import { WORLDS } from '../content/worlds.js';

const router = express.Router();
router.use(requireAuth);

/**
 * Teacher and parent dashboard.
 *
 * A guardian only ever sees students who have explicitly connected to them
 * with a one-time code, and the payload deliberately leaves out email
 * addresses and any other contact detail: progress data only.
 */

const isGuardian = (req) => req.user.role === 'guardian' || req.user.role === 'admin';

function linkedStudentIds(guardianId) {
  return q.all('SELECT student_id FROM guardian_links WHERE guardian_id = ?', guardianId).map((r) => r.student_id);
}

function assertLinked(req, studentId) {
  if (req.user.role === 'admin') return true;
  return linkedStudentIds(req.user.id).includes(Number(studentId));
}

/** Guardian creates a short code for a student to enter. */
router.post('/link-code', (req, res) => {
  if (!isGuardian(req)) return res.status(403).json({ error: 'Only teacher or parent accounts can create link codes.' });
  const label = String((req.body || {}).label || '').trim().slice(0, 60);
  // Ambiguous characters left out so codes are easy to read aloud in class.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  q.run('INSERT INTO link_codes (code, guardian_id, label, expires_at) VALUES (?, ?, ?, ?)', code, req.user.id, label, expires);
  res.json({ ok: true, code, expiresAt: expires });
});

/** Student enters the code to connect. */
router.post('/redeem', (req, res) => {
  const code = String((req.body || {}).code || '').trim().toUpperCase();
  const row = q.get("SELECT * FROM link_codes WHERE code = ? AND expires_at > datetime('now')", code);
  if (!row) return res.status(404).json({ error: 'That code is not valid or has expired.' });
  if (row.guardian_id === req.user.id) return res.status(400).json({ error: 'You cannot link to your own account.' });
  q.run(
    'INSERT OR IGNORE INTO guardian_links (guardian_id, student_id, label) VALUES (?, ?, ?)',
    row.guardian_id, req.user.id, row.label
  );
  const guardian = q.get('SELECT display_name, role FROM users WHERE id = ?', row.guardian_id);
  res.json({ ok: true, connectedTo: guardian ? guardian.display_name || 'your teacher' : 'your teacher' });
});

router.get('/students', (req, res) => {
  if (!isGuardian(req)) return res.status(403).json({ error: 'This area is for teacher and parent accounts.' });
  const ids = req.user.role === 'admin' && req.query.all === '1'
    ? q.all("SELECT id FROM users WHERE role = 'student'").map((r) => r.id)
    : linkedStudentIds(req.user.id);

  const students = ids.map((id) => {
    const user = q.get('SELECT id, display_name, current_grade, streak_days, last_play_date FROM users WHERE id = ?', id);
    if (!user) return null;
    const stats = statsFor(id);
    const progress = getProgress(id, user.current_grade);
    const minutes = q.get('SELECT COALESCE(SUM(seconds),0) AS s FROM daily_activity WHERE user_id = ?', id);
    return {
      id: user.id,
      displayName: user.display_name || 'Student ' + user.id,
      grade: user.current_grade,
      gradeLabel: GRADE_LABELS[user.current_grade] || user.current_grade,
      currentLevel: progress.current_level,
      currentChallenge: progress.current_challenge,
      questionsAnswered: stats.totalAnswered,
      correct: stats.totalCorrect,
      accuracy: stats.accuracy,
      puzzlesCompleted: stats.puzzlesCompleted,
      levelsCompleted: stats.levelsCompleted,
      streak: user.streak_days,
      lastPlayed: user.last_play_date,
      minutesPlayed: Math.round(Number(minutes.s || 0) / 60),
    };
  }).filter(Boolean);

  students.sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''));
  res.json({ students });
});

router.get('/students/:id', (req, res) => {
  if (!isGuardian(req)) return res.status(403).json({ error: 'This area is for teacher and parent accounts.' });
  const id = Number(req.params.id);
  if (!assertLinked(req, id)) return res.status(403).json({ error: 'You are not connected to that student.' });

  const user = q.get('SELECT id, display_name, current_grade, streak_days, best_streak, last_play_date, created_at FROM users WHERE id = ?', id);
  if (!user) return res.status(404).json({ error: 'Student not found.' });

  const stats = statsFor(id);
  const progress = getProgress(id, user.current_grade);

  const byTopic = q.all(
    `SELECT topic, skill, COUNT(*) AS attempted, SUM(correct) AS correct, AVG(difficulty) AS avg_difficulty
     FROM answers WHERE user_id = ?
     GROUP BY topic, skill ORDER BY attempted DESC`,
    id
  ).map((r) => ({
    topic: r.topic,
    skill: r.skill,
    attempted: r.attempted,
    correct: Number(r.correct || 0),
    accuracy: r.attempted ? Number(r.correct || 0) / r.attempted : 0,
    avgDifficulty: Number(r.avg_difficulty || 0),
  }));

  const struggling = byTopic
    .filter((t) => t.attempted >= 3 && t.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 6);

  const strengths = byTopic
    .filter((t) => t.attempted >= 3 && t.accuracy >= 0.85)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 6);

  const activity = q.all(
    'SELECT day, seconds, questions, correct, puzzles FROM daily_activity WHERE user_id = ? ORDER BY day DESC LIMIT 30',
    id
  ).reverse();

  const levels = q.all(
    `SELECT grade, level, correct, total, stars, xp, coins, seconds, completed_at
     FROM level_results WHERE user_id = ? ORDER BY id DESC LIMIT 20`,
    id
  );

  const recent = q.all(
    `SELECT topic, skill, difficulty, correct, hints_used, attempts, answered_at
     FROM answers WHERE user_id = ? ORDER BY id DESC LIMIT 25`,
    id
  );

  const perGrade = q.all(
    'SELECT grade, current_level, xp, completed_json FROM grade_progress WHERE user_id = ?',
    id
  ).map((r) => ({
    grade: r.grade,
    gradeLabel: GRADE_LABELS[r.grade] || r.grade,
    currentLevel: r.current_level,
    xp: r.xp,
    levelsCompleted: parseJson(r.completed_json, []).length,
  }));

  const completed = parseJson(progress.completed_json, []);
  const worlds = WORLDS.map((w) => ({
    id: w.id,
    name: w.name,
    emoji: w.emoji,
    complete: w.levels.every((l) => completed.includes(l)),
    levels: w.levels,
  }));

  res.json({
    student: {
      id: user.id,
      displayName: user.display_name || 'Student ' + user.id,
      grade: user.current_grade,
      gradeLabel: GRADE_LABELS[user.current_grade] || user.current_grade,
      streak: user.streak_days,
      bestStreak: user.best_streak,
      lastPlayed: user.last_play_date,
      joined: user.created_at,
    },
    stats,
    progress: progressView(progress),
    byTopic,
    struggling,
    strengths,
    activity,
    levels,
    recent,
    perGrade,
    worlds,
  });
});

router.delete('/students/:id', (req, res) => {
  if (!isGuardian(req)) return res.status(403).json({ error: 'This area is for teacher and parent accounts.' });
  q.run('DELETE FROM guardian_links WHERE guardian_id = ? AND student_id = ?', req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

/** Which guardians a student is connected to, so they can disconnect. */
router.get('/my-guardians', (req, res) => {
  const rows = q.all(
    `SELECT u.id, u.display_name, u.role, g.label, g.created_at
     FROM guardian_links g JOIN users u ON u.id = g.guardian_id
     WHERE g.student_id = ?`,
    req.user.id
  );
  res.json({ guardians: rows.map((r) => ({ id: r.id, name: r.display_name || 'Teacher', role: r.role, label: r.label, since: r.created_at })) });
});

router.delete('/my-guardians/:id', (req, res) => {
  q.run('DELETE FROM guardian_links WHERE guardian_id = ? AND student_id = ?', Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

export default router;
