import express from 'express';
import { q, parseJson } from '../db.js';
import { requireRole } from '../auth.js';
import { GRADES, GRADE_LABELS, isGrade, topicsForGrade, skillsForGrade, generateQuestion, checkAnswer } from '../math/index.js';
import { WORLDS } from '../content/worlds.js';
import { PUZZLE_TYPES, generatePuzzle } from '../content/puzzles.js';
import { levelSummaries, levelPlan, LEVELS_PER_GRADE, CHALLENGES_PER_LEVEL } from '../content/levels.js';
import { ACHIEVEMENTS } from '../content/achievements.js';

const router = express.Router();
router.use(requireRole('admin'));

/* ------------------------------------------------------------------ */
/* Usage statistics                                                    */
/* ------------------------------------------------------------------ */

router.get('/stats', (req, res) => {
  const users = q.get("SELECT COUNT(*) AS n FROM users WHERE role = 'student'") || {};
  const guardians = q.get("SELECT COUNT(*) AS n FROM users WHERE role = 'guardian'") || {};
  const answers = q.get('SELECT COUNT(*) AS n, SUM(correct) AS c FROM answers') || {};
  const puzzles = q.get('SELECT COUNT(*) AS n FROM puzzle_results') || {};
  const levels = q.get('SELECT COUNT(*) AS n FROM level_results') || {};
  const activeToday = q.get(
    "SELECT COUNT(DISTINCT user_id) AS n FROM daily_activity WHERE day = date('now')"
  ) || {};
  const activeWeek = q.get(
    "SELECT COUNT(DISTINCT user_id) AS n FROM daily_activity WHERE day >= date('now', '-7 days')"
  ) || {};

  const byGrade = q.all(
    `SELECT u.current_grade AS grade, COUNT(DISTINCT u.id) AS students,
            (SELECT COUNT(*) FROM answers a WHERE a.grade = u.current_grade) AS answers
     FROM users u WHERE u.role = 'student' GROUP BY u.current_grade`
  );

  const hardestTopics = q.all(
    `SELECT topic, grade, COUNT(*) AS attempted, SUM(correct) AS correct
     FROM answers GROUP BY topic, grade HAVING attempted >= 5
     ORDER BY (CAST(SUM(correct) AS REAL) / COUNT(*)) ASC LIMIT 12`
  ).map((r) => ({ ...r, accuracy: r.attempted ? Number(r.correct || 0) / r.attempted : 0 }));

  const dailyTrend = q.all(
    `SELECT day, SUM(questions) AS questions, SUM(correct) AS correct,
            SUM(seconds) AS seconds, COUNT(DISTINCT user_id) AS students
     FROM daily_activity WHERE day >= date('now', '-30 days')
     GROUP BY day ORDER BY day ASC`
  );

  res.json({
    totals: {
      students: Number(users.n || 0),
      guardians: Number(guardians.n || 0),
      questionsAnswered: Number(answers.n || 0),
      questionsCorrect: Number(answers.c || 0),
      accuracy: answers.n ? Number(answers.c || 0) / Number(answers.n) : 0,
      puzzlesCompleted: Number(puzzles.n || 0),
      levelsCompleted: Number(levels.n || 0),
      activeToday: Number(activeToday.n || 0),
      activeThisWeek: Number(activeWeek.n || 0),
    },
    byGrade,
    hardestTopics,
    dailyTrend,
  });
});

/* ------------------------------------------------------------------ */
/* Curriculum inspection                                               */
/* ------------------------------------------------------------------ */

router.get('/curriculum', (req, res) => {
  res.json({
    grades: GRADES.map((g) => ({
      id: g,
      label: GRADE_LABELS[g],
      topics: topicsForGrade(g),
      skills: skillsForGrade(g),
    })),
    worlds: WORLDS.map((w) => ({
      id: w.id, name: w.name, emoji: w.emoji, levels: w.levels,
      tagline: w.tagline, stationCount: w.stations.length,
      stations: w.stations.map((s) => ({ id: s.id, name: s.name, kind: s.kind })),
    })),
    puzzleTypes: PUZZLE_TYPES.map((p) => ({ id: p.id, name: p.name, kind: p.kind, summary: p.summary })),
    levels: levelSummaries(),
    achievements: ACHIEVEMENTS,
    structure: { levelsPerGrade: LEVELS_PER_GRADE, challengesPerLevel: CHALLENGES_PER_LEVEL },
  });
});

/** Inspect the exact plan for one level, useful when tuning difficulty. */
router.get('/levels/:level', (req, res) => {
  const level = Number(req.params.level);
  if (!(level >= 1 && level <= LEVELS_PER_GRADE)) return res.status(400).json({ error: 'Unknown level.' });
  res.json({ plan: levelPlan(level) });
});

/** Preview a generated question exactly as a student would receive it. */
router.post('/preview/question', (req, res) => {
  const { grade, difficulty, generatorId, topic } = req.body || {};
  if (!isGrade(grade)) return res.status(400).json({ error: 'Unknown grade.' });
  const question = generateQuestion({
    grade: String(grade),
    difficulty: Number(difficulty) || 2,
    seed: 'preview:' + Date.now() + ':' + Math.random(),
    generatorId: generatorId || undefined,
    topic: topic || undefined,
  });
  res.json({ question });
});

router.post('/preview/puzzle', (req, res) => {
  const { puzzleId, difficulty } = req.body || {};
  res.json({
    puzzle: generatePuzzle({
      puzzleId: String(puzzleId || 'build-bridge'),
      difficulty: Number(difficulty) || 2,
      seed: 'preview:' + Date.now() + ':' + Math.random(),
    }),
  });
});

/* ------------------------------------------------------------------ */
/* Custom question bank                                                */
/* ------------------------------------------------------------------ */

function questionRowView(r) {
  return {
    id: r.id,
    grade: r.grade,
    topic: r.topic,
    skill: r.skill,
    difficulty: r.difficulty,
    type: r.type,
    prompt: r.prompt,
    choices: parseJson(r.choices_json, []),
    answer: r.answer,
    accept: parseJson(r.accept_json, []),
    hints: parseJson(r.hints_json, []),
    explanation: r.explanation,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

router.get('/questions', (req, res) => {
  const grade = req.query.grade;
  const rows = grade && isGrade(grade)
    ? q.all('SELECT * FROM custom_questions WHERE grade = ? ORDER BY id DESC', String(grade))
    : q.all('SELECT * FROM custom_questions ORDER BY id DESC LIMIT 500');
  res.json({ questions: rows.map(questionRowView) });
});

function validateQuestionBody(body) {
  const { grade, topic, prompt, answer, type } = body || {};
  if (!isGrade(grade)) return 'Choose a valid grade.';
  if (!String(topic || '').trim()) return 'Topic is required.';
  if (!String(prompt || '').trim()) return 'Question text is required.';
  if (!String(answer || '').trim()) return 'An answer is required.';
  const allowed = ['numeric', 'text', 'multiple-choice'];
  if (type && !allowed.includes(type)) return 'Type must be one of: ' + allowed.join(', ');
  if (type === 'multiple-choice') {
    const choices = Array.isArray(body.choices) ? body.choices.filter((c) => String(c).trim()) : [];
    if (choices.length < 2) return 'Multiple choice needs at least 2 options.';
    if (!choices.map(String).includes(String(answer))) return 'The answer must be one of the options.';
  }
  return null;
}

router.post('/questions', (req, res) => {
  const problem = validateQuestionBody(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const b = req.body;
  const info = q.run(
    `INSERT INTO custom_questions
       (grade, topic, skill, difficulty, type, prompt, choices_json, answer, accept_json, hints_json, explanation, active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    String(b.grade), String(b.topic).trim(), String(b.skill || b.topic).trim(),
    Math.min(5, Math.max(1, Number(b.difficulty) || 2)),
    b.type || 'numeric', String(b.prompt).trim(),
    JSON.stringify(Array.isArray(b.choices) ? b.choices.map(String) : []),
    String(b.answer).trim(),
    JSON.stringify(Array.isArray(b.accept) ? b.accept.map(String) : []),
    JSON.stringify(Array.isArray(b.hints) ? b.hints.map(String).slice(0, 3) : []),
    String(b.explanation || '').trim(),
    b.active === false ? 0 : 1,
    req.user.id
  );
  const row = q.get('SELECT * FROM custom_questions WHERE id = ?', Number(info.lastInsertRowid));
  res.json({ ok: true, question: questionRowView(row) });
});

router.put('/questions/:id', (req, res) => {
  const row = q.get('SELECT * FROM custom_questions WHERE id = ?', Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Question not found.' });
  const merged = { ...questionRowView(row), ...req.body };
  const problem = validateQuestionBody(merged);
  if (problem) return res.status(400).json({ error: problem });
  q.run(
    `UPDATE custom_questions SET grade=?, topic=?, skill=?, difficulty=?, type=?, prompt=?,
       choices_json=?, answer=?, accept_json=?, hints_json=?, explanation=?, active=? WHERE id=?`,
    String(merged.grade), String(merged.topic).trim(), String(merged.skill || merged.topic).trim(),
    Math.min(5, Math.max(1, Number(merged.difficulty) || 2)),
    merged.type || 'numeric', String(merged.prompt).trim(),
    JSON.stringify(Array.isArray(merged.choices) ? merged.choices.map(String) : []),
    String(merged.answer).trim(),
    JSON.stringify(Array.isArray(merged.accept) ? merged.accept.map(String) : []),
    JSON.stringify(Array.isArray(merged.hints) ? merged.hints.map(String).slice(0, 3) : []),
    String(merged.explanation || '').trim(),
    merged.active === false ? 0 : 1,
    row.id
  );
  res.json({ ok: true, question: questionRowView(q.get('SELECT * FROM custom_questions WHERE id = ?', row.id)) });
});

router.delete('/questions/:id', (req, res) => {
  q.run('DELETE FROM custom_questions WHERE id = ?', Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* User management                                                     */
/* ------------------------------------------------------------------ */

router.get('/users', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const rows = search
    ? q.all(
        `SELECT id, email, role, display_name, current_grade, coins, created_at, last_login_at
         FROM users WHERE lower(email) LIKE ? OR lower(display_name) LIKE ? ORDER BY id DESC LIMIT 200`,
        '%' + search + '%', '%' + search + '%'
      )
    : q.all(
        `SELECT id, email, role, display_name, current_grade, coins, created_at, last_login_at
         FROM users ORDER BY id DESC LIMIT 200`
      );
  res.json({
    users: rows.map((r) => ({
      id: r.id, email: r.email, role: r.role,
      displayName: r.display_name, grade: r.current_grade,
      coins: r.coins, createdAt: r.created_at, lastLogin: r.last_login_at,
    })),
  });
});

router.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = q.get('SELECT * FROM users WHERE id = ?', id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { role, grade } = req.body || {};
  if (role) {
    if (!['student', 'guardian', 'admin'].includes(role)) return res.status(400).json({ error: 'Unknown role.' });
    if (user.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin access.' });
    }
    q.run('UPDATE users SET role = ? WHERE id = ?', role, id);
  }
  if (grade !== undefined) {
    if (!isGrade(grade)) return res.status(400).json({ error: 'Unknown grade.' });
    q.run('UPDATE users SET current_grade = ? WHERE id = ?', String(grade), id);
  }
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account here.' });
  q.run('DELETE FROM users WHERE id = ?', id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Bug reports                                                         */
/* ------------------------------------------------------------------ */

router.get('/bugs', (req, res) => {
  const rows = q.all(
    `SELECT b.*, u.display_name FROM bug_reports b
     LEFT JOIN users u ON u.id = b.user_id
     ORDER BY b.id DESC LIMIT 200`
  );
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      from: r.display_name || 'Anonymous',
      message: r.message,
      context: parseJson(r.context_json, {}),
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

router.patch('/bugs/:id', (req, res) => {
  const status = String((req.body || {}).status || '').trim();
  if (!['open', 'investigating', 'resolved', 'wontfix'].includes(status)) {
    return res.status(400).json({ error: 'Unknown status.' });
  }
  q.run('UPDATE bug_reports SET status = ? WHERE id = ?', status, Number(req.params.id));
  res.json({ ok: true });
});

export default router;
