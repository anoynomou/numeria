/**
 * Achievements. Each one reads the student's aggregate stats and reports
 * whether it is earned, plus progress toward it so the profile can show a bar
 * rather than a locked box.
 */

export const ACHIEVEMENTS = [
  { id: 'first-puzzle', name: 'First Puzzle Completed', icon: '🧩', description: 'Finish your very first creative puzzle.', goal: 1, stat: 'puzzlesCompleted' },
  { id: 'correct-10', name: '10 Correct Answers', icon: '✅', description: 'Answer 10 math questions correctly.', goal: 10, stat: 'totalCorrect' },
  { id: 'correct-50', name: '50 Correct Answers', icon: '🎯', description: 'Answer 50 math questions correctly.', goal: 50, stat: 'totalCorrect' },
  { id: 'correct-100', name: '100 Correct Answers', icon: '💯', description: 'Answer 100 math questions correctly.', goal: 100, stat: 'totalCorrect' },
  { id: 'correct-250', name: 'Math Explorer', icon: '🧭', description: 'Answer 250 math questions correctly.', goal: 250, stat: 'totalCorrect' },
  { id: 'puzzle-master', name: 'Puzzle Master', icon: '🏗️', description: 'Complete 50 creative puzzles.', goal: 50, stat: 'puzzlesCompleted' },
  { id: 'creative-builder', name: 'Creative Builder', icon: '🎨', description: 'Complete 15 open design challenges.', goal: 15, stat: 'designsCompleted' },
  { id: 'perfect-level', name: 'Perfect Level', icon: '⭐', description: 'Finish a level with every answer correct.', goal: 1, stat: 'perfectLevels' },
  { id: 'level-5', name: 'Halfway Hero', icon: '🚩', description: 'Complete 5 levels.', goal: 5, stat: 'levelsCompleted' },
  { id: 'level-10', name: 'Grade Champion', icon: '🏆', description: 'Complete all 10 levels of a grade.', goal: 10, stat: 'levelsCompleted' },
  { id: 'world-explorer', name: 'World Explorer', icon: '🌍', description: 'Complete every level in 3 different worlds.', goal: 3, stat: 'worldsCompleted' },
  { id: 'streak-7', name: '7-Day Learning Streak', icon: '🔥', description: 'Play on 7 different days in a row.', goal: 7, stat: 'bestStreak' },
  { id: 'no-hints-10', name: 'Independent Thinker', icon: '🧠', description: 'Answer 10 questions correctly in a row without hints.', goal: 10, stat: 'bestNoHintStreak' },
  { id: 'coins-500', name: 'Coin Collector', icon: '🪙', description: 'Earn 500 coins in total.', goal: 500, stat: 'lifetimeCoins' },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/**
 * Evaluate every achievement against a stats object.
 * Returns the full list annotated with progress and earned state.
 */
export function evaluateAchievements(stats) {
  return ACHIEVEMENTS.map((a) => {
    const value = Number(stats[a.stat] || 0);
    return {
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
      goal: a.goal,
      progress: Math.min(value, a.goal),
      earned: value >= a.goal,
    };
  });
}

/** Ids newly earned when moving from one stats snapshot to another. */
export function newlyEarned(before, after) {
  const was = new Set(evaluateAchievements(before).filter((a) => a.earned).map((a) => a.id));
  return evaluateAchievements(after).filter((a) => a.earned && !was.has(a.id));
}
