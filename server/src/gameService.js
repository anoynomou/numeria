import crypto from 'node:crypto';
import { q, parseJson, today } from './db.js';
import {
  GRADES, GRADE_LABELS, isGrade, generateQuestion, checkAnswer,
  adaptOffset, effectiveDifficulty, topicsForGrade, skillsForGrade,
} from './math/index.js';
import { WORLDS, WORLD_BY_ID, worldForLevel } from './content/worlds.js';
import { generatePuzzle, PUZZLE_BY_ID } from './content/puzzles.js';
import { levelPlan, levelSummaries, LEVELS_PER_GRADE, CHALLENGES_PER_LEVEL, starsForAccuracy, rewardFor } from './content/levels.js';
import { evaluateAchievements, newlyEarned } from './content/achievements.js';
import { AVATAR_CATALOG, DEFAULT_AVATAR, sanitizeAvatar, findItem, shopItems } from './content/avatars.js';

export const DEFAULT_SETTINGS = {
  musicVolume: 0.35,
  soundVolume: 0.7,
  graphicsQuality: 'medium',
  reducedMotion: false,
  largeText: false,
  highContrast: false,
  colorBlindSafe: false,
  readAloud: false,
  showCaptions: true,
  invertY: false,
  cameraSensitivity: 1,
};

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function getProgress(userId, grade) {
  const g = isGrade(grade) ? String(grade) : 'K';
  let row = q.get('SELECT * FROM grade_progress WHERE user_id = ? AND grade = ?', userId, g);
  if (!row) {
    q.run('INSERT INTO grade_progress (user_id, grade) VALUES (?, ?)', userId, g);
    row = q.get('SELECT * FROM grade_progress WHERE user_id = ? AND grade = ?', userId, g);
  }
  return row;
}

export function progressView(row) {
  return {
    grade: row.grade,
    currentLevel: row.current_level,
    currentChallenge: row.current_challenge,
    xp: row.xp,
    difficultyOffset: row.difficulty,
    stars: parseJson(row.stars_json, {}),
    completedLevels: parseJson(row.completed_json, []),
    levelCorrect: row.level_correct,
    levelAnswered: row.level_answered,
    challengesPerLevel: CHALLENGES_PER_LEVEL,
    levelsPerGrade: LEVELS_PER_GRADE,
  };
}

/** Worlds with unlock state for the world-selection map. */
export function worldsView(progressRow) {
  const completed = parseJson(progressRow.completed_json, []);
  const stars = parseJson(progressRow.stars_json, {});
  const reached = progressRow.current_level;
  return WORLDS.map((w) => {
    const unlocked = reached >= w.levels[0] || w.levels.some((l) => completed.includes(l));
    const levelStars = w.levels.map((l) => stars[l] || 0);
    return {
      id: w.id,
      name: w.name,
      tagline: w.tagline,
      emoji: w.emoji,
      levels: w.levels,
      palette: w.palette,
      unlocked,
      unlockLevel: w.levels[0],
      complete: w.levels.every((l) => completed.includes(l)),
      stars: levelStars.reduce((s, v) => s + v, 0),
      maxStars: w.levels.length * 3,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Aggregate stats (achievements, profile, dashboards)                 */
/* ------------------------------------------------------------------ */

export function statsFor(userId) {
  const answers = q.get(
    'SELECT COUNT(*) AS total, SUM(correct) AS correct FROM answers WHERE user_id = ?',
    userId
  ) || {};
  const puzzles = q.get('SELECT COUNT(*) AS total FROM puzzle_results WHERE user_id = ?', userId) || {};
  const designs = q.get(
    "SELECT COUNT(*) AS total FROM puzzle_results WHERE user_id = ? AND puzzle_id IN ('free-design','shape-house')",
    userId
  ) || {};
  const levels = q.get('SELECT COUNT(*) AS total FROM level_results WHERE user_id = ?', userId) || {};
  const perfect = q.get(
    'SELECT COUNT(*) AS total FROM level_results WHERE user_id = ? AND correct = total AND total > 0',
    userId
  ) || {};
  const user = q.get('SELECT best_streak, streak_days, lifetime_coins, coins FROM users WHERE id = ?', userId) || {};

  // Worlds fully completed across every grade the student has played.
  const completedRows = q.all('SELECT grade, completed_json FROM grade_progress WHERE user_id = ?', userId);
  let worldsCompleted = 0;
  for (const row of completedRows) {
    const done = parseJson(row.completed_json, []);
    for (const w of WORLDS) if (w.levels.every((l) => done.includes(l))) worldsCompleted++;
  }

  // Longest run of correct answers with no hints used.
  const recent = q.all(
    'SELECT correct, hints_used FROM answers WHERE user_id = ? ORDER BY id ASC',
    userId
  );
  let run = 0;
  let bestNoHintStreak = 0;
  for (const a of recent) {
    if (a.correct && a.hints_used === 0) {
      run++;
      bestNoHintStreak = Math.max(bestNoHintStreak, run);
    } else {
      run = 0;
    }
  }

  const total = Number(answers.total || 0);
  const correct = Number(answers.correct || 0);
  return {
    totalAnswered: total,
    totalCorrect: correct,
    accuracy: total ? correct / total : 0,
    puzzlesCompleted: Number(puzzles.total || 0),
    designsCompleted: Number(designs.total || 0),
    levelsCompleted: Number(levels.total || 0),
    perfectLevels: Number(perfect.total || 0),
    worldsCompleted,
    bestStreak: Number(user.best_streak || 0),
    currentStreak: Number(user.streak_days || 0),
    lifetimeCoins: Number(user.lifetime_coins || 0),
    bestNoHintStreak,
  };
}

/** Persist any achievements the student has just crossed the line on. */
function syncAchievements(userId, before, after) {
  const earned = newlyEarned(before, after);
  for (const a of earned) {
    q.run(
      'INSERT OR IGNORE INTO earned_achievements (user_id, achievement_id) VALUES (?, ?)',
      userId,
      a.id
    );
  }
  return earned;
}

/* ------------------------------------------------------------------ */
/* Player state for the client                                         */
/* ------------------------------------------------------------------ */

export function userView(user) {
  const owned = q.all('SELECT item_key FROM owned_items WHERE user_id = ?', user.id).map((r) => r.item_key);
  const settings = { ...DEFAULT_SETTINGS, ...parseJson(user.settings_json, {}) };
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    grade: user.current_grade,
    gradeLabel: GRADE_LABELS[user.current_grade] || user.current_grade,
    avatar: sanitizeAvatar(parseJson(user.avatar_json, DEFAULT_AVATAR), owned),
    settings,
    coins: user.coins,
    lifetimeCoins: user.lifetime_coins,
    onboarded: !!user.onboarded,
    streak: user.streak_days,
    bestStreak: user.best_streak,
    ownedItems: owned,
  };
}

export function fullState(user) {
  const progressRow = getProgress(user.id, user.current_grade);
  const stats = statsFor(user.id);
  const plan = levelPlan(progressRow.current_level);
  return {
    user: userView(user),
    progress: progressView(progressRow),
    worlds: worldsView(progressRow),
    levels: levelSummaries(),
    currentLevel: {
      level: plan.level,
      name: plan.name,
      intro: plan.intro,
      worldId: plan.worldId,
      worldName: plan.worldName,
      isFinal: plan.isFinal,
    },
    stats,
    achievements: evaluateAchievements(stats),
    grades: GRADES.map((g) => ({ id: g, label: GRADE_LABELS[g], topics: topicsForGrade(g) })),
    catalog: AVATAR_CATALOG,
    shop: shopItems(),
  };
}

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

/** Strip the answer before a question is sent to the browser. */
function publicQuestion(question, hintsUsed) {
  const { answer, accept, hints, explanation, ...rest } = question;
  return {
    ...rest,
    hintCount: hints.length,
    hints: hints.slice(0, hintsUsed),
    hintsUsed,
  };
}

function publicChallenge(row) {
  const question = parseJson(row.question_json, {});
  const puzzle = row.puzzle_json ? parseJson(row.puzzle_json, null) : null;
  const plan = levelPlan(row.level);
  const slot = plan.challenges[row.challenge_index - 1];
  const world = worldForLevel(row.level);
  const station = world.stations.find((s) => s.id === row.station_id) || null;
  return {
    id: row.id,
    grade: row.grade,
    level: row.level,
    levelName: plan.name,
    challengeIndex: row.challenge_index,
    challengeCount: CHALLENGES_PER_LEVEL,
    isMilestone: !!(slot && slot.isMilestone),
    station: station
      ? { id: station.id, name: station.name, kind: station.kind, character: station.character, lines: station.lines, pos: station.pos }
      : null,
    puzzle: puzzle && !row.puzzle_done ? puzzle : null,
    puzzleDone: !!row.puzzle_done,
    puzzleSummary: puzzle ? { puzzleId: puzzle.puzzleId, name: puzzle.name, kind: puzzle.kind, difficulty: puzzle.difficulty } : null,
    question: row.puzzle_json && !row.puzzle_done ? null : publicQuestion(question, row.hints_used),
    attempts: row.attempts,
  };
}

/** Pull an admin-authored question if one fits this grade and difficulty. */
function customQuestionFor(grade, difficulty, seed) {
  const rows = q.all(
    'SELECT * FROM custom_questions WHERE grade = ? AND active = 1 AND difficulty = ?',
    String(grade),
    Math.round(difficulty)
  );
  if (!rows.length) return null;
  // Deterministic pick so a reload shows the same question.
  const hash = crypto.createHash('sha256').update(String(seed)).digest();
  const row = rows[hash[0] % rows.length];
  return {
    generatorId: 'custom:' + row.id,
    topic: row.topic,
    skill: row.skill || row.topic,
    difficulty: row.difficulty,
    grade: row.grade,
    type: row.type,
    prompt: row.prompt,
    choices: parseJson(row.choices_json, []).length ? parseJson(row.choices_json, []) : null,
    items: null, left: null, right: null,
    min: null, max: null, step: null,
    unit: null, placeholder: null, visual: null,
    hints: parseJson(row.hints_json, []),
    explanation: row.explanation,
    answer: row.answer,
    accept: parseJson(row.accept_json, []),
  };
}

/**
 * Return the student's in-flight challenge, creating the next one if needed.
 * Regenerating from a stored seed means a browser refresh resumes exactly
 * where the student was rather than skipping the challenge.
 */
export function currentChallenge(user) {
  const grade = user.current_grade;
  const progress = getProgress(user.id, grade);

  const existing = q.get(
    'SELECT * FROM active_challenges WHERE user_id = ? AND grade = ? AND resolved = 0 ORDER BY created_at DESC LIMIT 1',
    user.id,
    grade
  );
  if (existing) return publicChallenge(existing);

  const level = progress.current_level;
  const index = progress.current_challenge;
  const plan = levelPlan(level);
  const slot = plan.challenges[index - 1];
  if (!slot) return null;

  const seed = [user.id, grade, level, index].join(':');
  const difficulty = effectiveDifficulty(slot.mathDifficulty, progress.difficulty);

  let puzzle = null;
  let puzzlePieces = 0;
  if (slot.hasPuzzle) {
    puzzle = generatePuzzle({
      puzzleId: slot.puzzleId,
      difficulty: Math.min(5, Math.max(1, slot.puzzleDifficulty + Math.round(progress.difficulty))),
      seed: seed + ':puzzle',
    });
  }

  const question =
    customQuestionFor(grade, difficulty, seed) ||
    generateQuestion({
      grade,
      difficulty,
      seed: seed + ':q',
      puzzle: puzzle ? { label: puzzle.name.toLowerCase(), count: puzzlePieces || null } : null,
    });

  const id = crypto.randomUUID();
  q.run(
    `INSERT INTO active_challenges
       (id, user_id, grade, level, challenge_index, station_id, puzzle_json, question_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    grade,
    level,
    index,
    slot.stationId,
    puzzle ? JSON.stringify(puzzle) : null,
    JSON.stringify(question)
  );
  const row = q.get('SELECT * FROM active_challenges WHERE id = ?', id);
  return publicChallenge(row);
}

function loadChallenge(user, challengeId) {
  return q.get(
    'SELECT * FROM active_challenges WHERE id = ? AND user_id = ? AND resolved = 0',
    challengeId,
    user.id
  );
}

/**
 * Mark the creative puzzle done. The piece count feeds the math question so a
 * question can refer back to what the student actually built.
 */
export function completePuzzle(user, challengeId, { pieces = 0, seconds = 0 }) {
  const row = loadChallenge(user, challengeId);
  if (!row) return { error: 'That challenge is no longer active.' };
  if (!row.puzzle_json) return { error: 'This challenge has no puzzle.' };
  if (row.puzzle_done) return { ok: true, challenge: publicChallenge(row) };

  const puzzle = parseJson(row.puzzle_json, {});
  const safePieces = Math.max(0, Math.min(200, Math.round(Number(pieces) || 0)));
  const safeSeconds = Math.max(0, Math.min(3600, Math.round(Number(seconds) || 0)));

  q.run(
    `INSERT INTO puzzle_results (user_id, grade, level, challenge_index, puzzle_id, difficulty, pieces_used, seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    row.grade,
    row.level,
    row.challenge_index,
    puzzle.puzzleId || 'unknown',
    puzzle.difficulty || 1,
    safePieces,
    safeSeconds
  );

  // Regenerate the question now that we know what the student built, so
  // questions like "you used 12 blocks..." line up with the real build.
  const progress = getProgress(user.id, row.grade);
  const plan = levelPlan(row.level);
  const slot = plan.challenges[row.challenge_index - 1];
  const seed = [user.id, row.grade, row.level, row.challenge_index].join(':');
  const difficulty = effectiveDifficulty(slot.mathDifficulty, progress.difficulty);
  const question =
    customQuestionFor(row.grade, difficulty, seed) ||
    generateQuestion({
      grade: row.grade,
      difficulty,
      seed: seed + ':q',
      puzzle: { label: (puzzle.name || 'build').toLowerCase(), count: safePieces || null },
    });

  q.run(
    'UPDATE active_challenges SET puzzle_done = 1, puzzle_pieces = ?, question_json = ? WHERE id = ?',
    safePieces,
    JSON.stringify(question),
    row.id
  );
  bumpDaily(user.id, { puzzles: 1, seconds: safeSeconds });

  const before = statsFor(user.id);
  const earned = syncAchievements(user.id, before, statsFor(user.id));
  const updated = q.get('SELECT * FROM active_challenges WHERE id = ?', row.id);
  return { ok: true, challenge: publicChallenge(updated), achievements: earned };
}

/** Reveal the next hint. Hints cost a little reward but are never blocked. */
export function useHint(user, challengeId) {
  const row = loadChallenge(user, challengeId);
  if (!row) return { error: 'That challenge is no longer active.' };
  const question = parseJson(row.question_json, {});
  const maxHints = (question.hints || []).length;
  if (row.hints_used >= maxHints) {
    return { ok: true, hints: question.hints, hintsUsed: row.hints_used, exhausted: true };
  }
  const used = row.hints_used + 1;
  q.run('UPDATE active_challenges SET hints_used = ? WHERE id = ?', used, row.id);
  return { ok: true, hints: question.hints.slice(0, used), hintsUsed: used, exhausted: used >= maxHints };
}

function bumpDaily(userId, { questions = 0, correct = 0, puzzles = 0, seconds = 0 }) {
  const day = today();
  q.run(
    `INSERT INTO daily_activity (user_id, day, seconds, questions, correct, puzzles)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, day) DO UPDATE SET
       seconds = seconds + excluded.seconds,
       questions = questions + excluded.questions,
       correct = correct + excluded.correct,
       puzzles = puzzles + excluded.puzzles`,
    userId, day, seconds, questions, correct, puzzles
  );
}

/**
 * Grade an answer.
 *
 * A wrong answer is not the end of the challenge: the student gets a second
 * try with hints available. Only after the retry does the challenge resolve,
 * and it always resolves forward so nobody gets stuck on one question.
 */
export function submitAnswer(user, challengeId, { answer, seconds = 0 }) {
  const row = loadChallenge(user, challengeId);
  if (!row) return { error: 'That challenge is no longer active.' };
  if (row.puzzle_json && !row.puzzle_done) return { error: 'Finish the puzzle first.' };

  const question = parseJson(row.question_json, {});
  const correct = checkAnswer(question, answer);
  const attempts = row.attempts + 1;
  const safeSeconds = Math.max(0, Math.min(3600, Math.round(Number(seconds) || 0)));

  // First wrong attempt: offer another try with support rather than moving on.
  if (!correct && attempts < 2) {
    q.run('UPDATE active_challenges SET attempts = ? WHERE id = ?', attempts, row.id);
    const hintsUsed = Math.min(row.hints_used + 1, (question.hints || []).length);
    q.run('UPDATE active_challenges SET hints_used = ? WHERE id = ?', hintsUsed, row.id);
    return {
      ok: true,
      correct: false,
      retry: true,
      attempts,
      hints: (question.hints || []).slice(0, hintsUsed),
      hintsUsed,
      message: 'Not quite. Here is a hint, have another go.',
    };
  }

  const progress = getProgress(user.id, row.grade);
  const plan = levelPlan(row.level);
  const slot = plan.challenges[row.challenge_index - 1];
  const statsBefore = statsFor(user.id);

  q.run(
    `INSERT INTO answers
       (user_id, grade, level, challenge_index, generator_id, topic, skill, difficulty, correct, hints_used, attempts, seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, row.grade, row.level, row.challenge_index,
    question.generatorId || 'unknown', question.topic || 'General', question.skill || '',
    question.difficulty || 1, correct ? 1 : 0, row.hints_used, attempts, safeSeconds
  );

  let reward = { xp: 0, coins: 0 };
  if (correct) {
    reward = rewardFor({
      difficulty: question.difficulty || 1,
      hintsUsed: row.hints_used,
      hadPuzzle: !!row.puzzle_json,
      attempts,
      isMilestone: !!(slot && slot.isMilestone),
    });
    q.run(
      'UPDATE users SET coins = coins + ?, lifetime_coins = lifetime_coins + ? WHERE id = ?',
      reward.coins, reward.coins, user.id
    );
  }

  // Update adaptive difficulty from the student's recent run.
  const recent = parseJson(progress.recent_json, []);
  recent.push(correct ? 1 : 0);
  const trimmed = recent.slice(-10);
  const offset = adaptOffset(progress.difficulty, trimmed);

  const levelCorrect = progress.level_correct + (correct ? 1 : 0);
  const levelAnswered = progress.level_answered + 1;
  const nextIndex = row.challenge_index + 1;
  const levelComplete = nextIndex > CHALLENGES_PER_LEVEL;

  q.run('UPDATE active_challenges SET resolved = 1, attempts = ? WHERE id = ?', attempts, row.id);
  bumpDaily(user.id, { questions: 1, correct: correct ? 1 : 0, seconds: safeSeconds });

  let levelSummary = null;
  if (levelComplete) {
    levelSummary = finishLevel(user, progress, {
      levelCorrect, levelAnswered, xpGained: reward.xp, offset,
    });
  } else {
    q.run(
      `UPDATE grade_progress
         SET current_challenge = ?, xp = xp + ?, difficulty = ?, recent_json = ?,
             level_correct = ?, level_answered = ?,
             level_started_at = COALESCE(level_started_at, datetime('now')),
             updated_at = datetime('now')
       WHERE user_id = ? AND grade = ?`,
      nextIndex, reward.xp, offset, JSON.stringify(trimmed),
      levelCorrect, levelAnswered, user.id, row.grade
    );
  }

  const statsAfter = statsFor(user.id);
  const earned = syncAchievements(user.id, statsBefore, statsAfter);
  const fresh = q.get('SELECT * FROM users WHERE id = ?', user.id);

  return {
    ok: true,
    correct,
    retry: false,
    attempts,
    reward,
    explanation: question.explanation,
    correctAnswer: correct ? null : question.answer,
    levelComplete,
    levelSummary,
    achievements: earned,
    progress: progressView(getProgress(user.id, row.grade)),
    coins: fresh.coins,
    stats: statsAfter,
  };
}

/** Wrap up a level, award stars, and unlock the next one. */
function finishLevel(user, progress, { levelCorrect, levelAnswered, xpGained, offset }) {
  const level = progress.current_level;
  const accuracy = levelAnswered ? levelCorrect / levelAnswered : 0;
  const stars = starsForAccuracy(accuracy);
  const totalXp = progress.xp + xpGained;

  const startedAt = progress.level_started_at ? new Date(progress.level_started_at + 'Z').getTime() : null;
  const elapsed = q.get(
    `SELECT COALESCE(SUM(seconds), 0) AS s FROM answers WHERE user_id = ? AND grade = ? AND level = ?`,
    user.id, progress.grade, level
  );
  const puzzleTime = q.get(
    `SELECT COALESCE(SUM(seconds), 0) AS s FROM puzzle_results WHERE user_id = ? AND grade = ? AND level = ?`,
    user.id, progress.grade, level
  );
  const seconds = Number(elapsed.s || 0) + Number(puzzleTime.s || 0);

  const bonusCoins = 20 + stars * 15;
  q.run('UPDATE users SET coins = coins + ?, lifetime_coins = lifetime_coins + ? WHERE id = ?', bonusCoins, bonusCoins, user.id);

  q.run(
    `INSERT INTO level_results (user_id, grade, level, correct, total, xp, coins, stars, seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, progress.grade, level, levelCorrect, levelAnswered, totalXp - progress.xp + xpGained, bonusCoins, stars, seconds
  );

  const starMap = parseJson(progress.stars_json, {});
  starMap[level] = Math.max(starMap[level] || 0, stars);
  const completed = parseJson(progress.completed_json, []);
  if (!completed.includes(level)) completed.push(level);

  const nextLevel = Math.min(LEVELS_PER_GRADE, level + 1);
  const isGradeComplete = level >= LEVELS_PER_GRADE;

  q.run(
    `UPDATE grade_progress
       SET current_level = ?, current_challenge = 1, xp = ?, difficulty = ?,
           stars_json = ?, completed_json = ?, level_correct = 0, level_answered = 0,
           level_started_at = NULL, recent_json = '[]', updated_at = datetime('now')
     WHERE user_id = ? AND grade = ?`,
    isGradeComplete ? level : nextLevel,
    totalXp,
    offset,
    JSON.stringify(starMap),
    JSON.stringify(completed),
    user.id,
    progress.grade
  );

  const topics = q.all(
    `SELECT topic, COUNT(*) AS n, SUM(correct) AS c
     FROM answers WHERE user_id = ? AND grade = ? AND level = ?
     GROUP BY topic ORDER BY n DESC`,
    user.id, progress.grade, level
  );

  const plan = levelPlan(level);
  const nextPlan = levelPlan(nextLevel);
  const unlockedWorld =
    !isGradeComplete && nextPlan.worldId !== plan.worldId ? WORLD_BY_ID[nextPlan.worldId] : null;

  return {
    level,
    levelName: plan.name,
    correct: levelCorrect,
    total: levelAnswered,
    accuracy,
    accuracyPercent: Math.round(accuracy * 100),
    xpEarned: totalXp - progress.xp + xpGained,
    coinsEarned: bonusCoins,
    stars,
    seconds,
    startedAt,
    skills: topics.map((t) => ({ topic: t.topic, attempted: t.n, correct: Number(t.c || 0) })),
    nextLevel: isGradeComplete ? null : nextLevel,
    nextLevelName: isGradeComplete ? null : nextPlan.name,
    gradeComplete: isGradeComplete,
    unlockedWorld: unlockedWorld ? { id: unlockedWorld.id, name: unlockedWorld.name, emoji: unlockedWorld.emoji, tagline: unlockedWorld.tagline } : null,
  };
}

/** Abandon the in-flight challenge so the student can walk away and come back. */
export function skipChallenge(user, challengeId) {
  const row = loadChallenge(user, challengeId);
  if (!row) return { error: 'That challenge is no longer active.' };
  q.run('DELETE FROM active_challenges WHERE id = ?', row.id);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

export function purchase(user, slot, id) {
  const item = findItem(slot, id);
  if (!item) return { error: 'That item does not exist.' };
  const key = slot + ':' + id;
  const owned = q.get('SELECT 1 AS x FROM owned_items WHERE user_id = ? AND item_key = ?', user.id, key);
  if (owned) return { error: 'You already own that.' };

  const progress = getProgress(user.id, user.current_grade);
  const highestLevel = Math.max(progress.current_level, ...parseJson(progress.completed_json, [0]));
  if (item.unlockLevel && highestLevel < item.unlockLevel) {
    return { error: 'Reach level ' + item.unlockLevel + ' to unlock this.' };
  }
  const cost = item.cost || 0;
  if (user.coins < cost) return { error: 'Not enough coins yet. Keep playing!' };

  q.run('UPDATE users SET coins = coins - ? WHERE id = ?', cost, user.id);
  q.run('INSERT OR IGNORE INTO owned_items (user_id, item_key) VALUES (?, ?)', user.id, key);
  const fresh = q.get('SELECT * FROM users WHERE id = ?', user.id);
  return { ok: true, coins: fresh.coins, item: key };
}

export { GRADES, GRADE_LABELS, LEVELS_PER_GRADE, CHALLENGES_PER_LEVEL, levelPlan, levelSummaries, skillsForGrade, topicsForGrade };
