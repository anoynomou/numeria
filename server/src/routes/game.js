import express from 'express';
import { q, parseJson } from '../db.js';
import { requireAuth, touchStreak } from '../auth.js';
import { isGrade } from '../math/index.js';
import {
  fullState, currentChallenge, completePuzzle, useHint, submitAnswer, skipChallenge,
  getProgress, progressView, worldsView, levelPlan, statsFor, purchase, DEFAULT_SETTINGS,
} from '../gameService.js';
import { WORLD_BY_ID, worldForLevel } from '../content/worlds.js';
import { sanitizeAvatar, DEFAULT_AVATAR } from '../content/avatars.js';
import { evaluateAchievements } from '../content/achievements.js';

const router = express.Router();
router.use(requireAuth);

const freshUser = (req) => q.get('SELECT * FROM users WHERE id = ?', req.user.id);

/** Everything the client needs to render the hub. */
router.get('/state', (req, res) => {
  touchStreak(req.user.id);
  res.json({ state: fullState(freshUser(req)) });
});

/** Scene description for the world the student is currently in. */
router.get('/world', (req, res) => {
  const user = freshUser(req);
  const progress = getProgress(user.id, user.current_grade);
  const requested = req.query.level ? Number(req.query.level) : progress.current_level;
  const level = Math.min(10, Math.max(1, requested || 1));

  // A student may only enter levels they have reached.
  const completed = parseJson(progress.completed_json, []);
  const allowed = level <= progress.current_level || completed.includes(level);
  if (!allowed) return res.status(403).json({ error: 'That level is still locked. Keep exploring!' });

  const world = worldForLevel(level);
  const plan = levelPlan(level);
  res.json({
    world: {
      id: world.id,
      name: world.name,
      tagline: world.tagline,
      emoji: world.emoji,
      palette: world.palette,
      ambience: world.ambience,
      props: world.props,
      stations: world.stations,
    },
    level: {
      level: plan.level,
      name: plan.name,
      intro: plan.intro,
      isFinal: plan.isFinal,
      challengeCount: plan.challengeCount,
    },
    activeStationId: (plan.challenges[progress.current_challenge - 1] || {}).stationId || plan.challenges[0].stationId,
    progress: progressView(progress),
  });
});

/**
 * Claim a gem found while exploring.
 *
 * The reward is granted server side and each gem can only be claimed once per
 * level, so wandering the world pays off without becoming a coin tap.
 */
const GEMS_PER_LEVEL = 14;
const GEM_COINS = 3;

router.post('/collect', (req, res) => {
  const user = freshUser(req);
  const idx = Number((req.body || {}).index);
  const level = Number((req.body || {}).level);
  if (!Number.isInteger(idx) || idx < 0 || idx >= GEMS_PER_LEVEL) {
    return res.status(400).json({ error: 'Unknown collectible.' });
  }
  if (!Number.isInteger(level) || level < 1 || level > 10) {
    return res.status(400).json({ error: 'Unknown level.' });
  }
  const already = q.get(
    'SELECT 1 AS x FROM collectibles WHERE user_id = ? AND grade = ? AND level = ? AND idx = ?',
    user.id, user.current_grade, level, idx
  );
  if (already) return res.json({ ok: true, alreadyClaimed: true, coins: user.coins });

  q.run(
    'INSERT INTO collectibles (user_id, grade, level, idx) VALUES (?, ?, ?, ?)',
    user.id, user.current_grade, level, idx
  );
  q.run(
    'UPDATE users SET coins = coins + ?, lifetime_coins = lifetime_coins + ? WHERE id = ?',
    GEM_COINS, GEM_COINS, user.id
  );
  const updated = q.get('SELECT coins FROM users WHERE id = ?', user.id);
  const found = q.get(
    'SELECT COUNT(*) AS n FROM collectibles WHERE user_id = ? AND grade = ? AND level = ?',
    user.id, user.current_grade, level
  );
  res.json({
    ok: true,
    reward: GEM_COINS,
    coins: updated.coins,
    found: Number(found.n || 0),
    total: GEMS_PER_LEVEL,
  });
});

/** Which gems the student has already picked up in this level. */
router.get('/collect', (req, res) => {
  const user = freshUser(req);
  const level = Number(req.query.level) || getProgress(user.id, user.current_grade).current_level;
  const rows = q.all(
    'SELECT idx FROM collectibles WHERE user_id = ? AND grade = ? AND level = ?',
    user.id, user.current_grade, level
  );
  res.json({ claimed: rows.map((r) => r.idx), total: GEMS_PER_LEVEL });
});

/** Fetch (or create) the challenge the student is on right now. */
router.get('/challenge', (req, res) => {
  const challenge = currentChallenge(freshUser(req));
  if (!challenge) return res.status(404).json({ error: 'No challenge available.' });
  res.json({ challenge });
});

router.post('/challenge/:id/puzzle', (req, res) => {
  const { pieces, seconds } = req.body || {};
  const result = completePuzzle(freshUser(req), req.params.id, { pieces, seconds });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.post('/challenge/:id/hint', (req, res) => {
  const result = useHint(freshUser(req), req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.post('/challenge/:id/answer', (req, res) => {
  const { answer, seconds } = req.body || {};
  const result = submitAnswer(freshUser(req), req.params.id, { answer, seconds });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.post('/challenge/:id/skip', (req, res) => {
  const result = skipChallenge(freshUser(req), req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

/** Replay a level the student has already finished. */
router.post('/level/select', (req, res) => {
  const user = freshUser(req);
  const level = Number((req.body || {}).level);
  const progress = getProgress(user.id, user.current_grade);
  const completed = parseJson(progress.completed_json, []);
  if (!(level >= 1 && level <= 10)) return res.status(400).json({ error: 'Unknown level.' });
  if (level > progress.current_level && !completed.includes(level)) {
    return res.status(403).json({ error: 'That level is still locked.' });
  }
  q.run('DELETE FROM active_challenges WHERE user_id = ? AND resolved = 0', user.id);
  q.run(
    `UPDATE grade_progress
       SET current_level = ?, current_challenge = 1, level_correct = 0, level_answered = 0,
           level_started_at = NULL, recent_json = '[]', updated_at = datetime('now')
     WHERE user_id = ? AND grade = ?`,
    level, user.id, user.current_grade
  );
  res.json({ ok: true, state: fullState(freshUser(req)) });
});

/* ------------------------------------------------------------------ */
/* Profile, settings, avatar                                           */
/* ------------------------------------------------------------------ */

router.patch('/profile', (req, res) => {
  const user = freshUser(req);
  const { displayName, grade, avatar, settings, onboarded } = req.body || {};
  const updates = [];
  const params = [];

  if (typeof displayName === 'string') {
    const name = displayName.trim().slice(0, 30);
    if (name.length < 2) return res.status(400).json({ error: 'Please choose a display name with at least 2 characters.' });
    updates.push('display_name = ?');
    params.push(name);
  }
  if (grade !== undefined) {
    if (!isGrade(grade)) return res.status(400).json({ error: 'Unknown grade.' });
    updates.push('current_grade = ?');
    params.push(String(grade));
    // Each grade keeps its own progress row, so switching never erases work.
    getProgress(user.id, String(grade));
    q.run('DELETE FROM active_challenges WHERE user_id = ? AND resolved = 0', user.id);
  }
  if (avatar && typeof avatar === 'object') {
    const owned = q.all('SELECT item_key FROM owned_items WHERE user_id = ?', user.id).map((r) => r.item_key);
    updates.push('avatar_json = ?');
    params.push(JSON.stringify(sanitizeAvatar(avatar, owned)));
  }
  if (settings && typeof settings === 'object') {
    const current = { ...DEFAULT_SETTINGS, ...parseJson(user.settings_json, {}) };
    const merged = { ...current };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (settings[key] === undefined) continue;
      const def = DEFAULT_SETTINGS[key];
      if (typeof def === 'number') {
        const n = Number(settings[key]);
        if (Number.isFinite(n)) merged[key] = Math.min(3, Math.max(0, n));
      } else if (typeof def === 'boolean') {
        merged[key] = !!settings[key];
      } else {
        merged[key] = String(settings[key]).slice(0, 20);
      }
    }
    updates.push('settings_json = ?');
    params.push(JSON.stringify(merged));
  }
  if (onboarded !== undefined) {
    updates.push('onboarded = ?');
    params.push(onboarded ? 1 : 0);
  }

  if (updates.length) {
    params.push(user.id);
    q.run('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?', ...params);
  }
  res.json({ ok: true, state: fullState(freshUser(req)) });
});

router.post('/shop/buy', (req, res) => {
  const { slot, id } = req.body || {};
  const result = purchase(freshUser(req), String(slot || ''), String(id || ''));
  if (result.error) return res.status(400).json(result);
  res.json({ ...result, state: fullState(freshUser(req)) });
});

/* ------------------------------------------------------------------ */
/* Profile page data                                                   */
/* ------------------------------------------------------------------ */

router.get('/profile/summary', (req, res) => {
  const user = freshUser(req);
  const stats = statsFor(user.id);
  const progress = getProgress(user.id, user.current_grade);
  const byTopic = q.all(
    `SELECT topic, COUNT(*) AS attempted, SUM(correct) AS correct
     FROM answers WHERE user_id = ? AND grade = ?
     GROUP BY topic ORDER BY attempted DESC`,
    user.id, user.current_grade
  ).map((r) => ({
    topic: r.topic,
    attempted: r.attempted,
    correct: Number(r.correct || 0),
    accuracy: r.attempted ? Number(r.correct || 0) / r.attempted : 0,
  }));
  const perGrade = q.all(
    'SELECT grade, current_level, xp, completed_json FROM grade_progress WHERE user_id = ?',
    user.id
  ).map((r) => ({
    grade: r.grade,
    currentLevel: r.current_level,
    xp: r.xp,
    levelsCompleted: parseJson(r.completed_json, []).length,
  }));
  const recentLevels = q.all(
    `SELECT grade, level, correct, total, stars, xp, coins, completed_at
     FROM level_results WHERE user_id = ? ORDER BY id DESC LIMIT 10`,
    user.id
  );
  res.json({
    stats,
    progress: progressView(progress),
    worlds: worldsView(progress),
    achievements: evaluateAchievements(stats),
    byTopic,
    perGrade,
    recentLevels,
  });
});

router.post('/report-bug', (req, res) => {
  const message = String((req.body || {}).message || '').trim().slice(0, 2000);
  if (message.length < 5) return res.status(400).json({ error: 'Please describe what went wrong.' });
  const context = (req.body || {}).context;
  q.run(
    'INSERT INTO bug_reports (user_id, message, context_json) VALUES (?, ?, ?)',
    req.user.id, message, JSON.stringify(context && typeof context === 'object' ? context : {})
  );
  res.json({ ok: true, message: 'Thanks! Your report has been sent.' });
});

export default router;
