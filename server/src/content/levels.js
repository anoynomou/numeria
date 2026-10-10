/**
 * Level structure.
 *
 * Every grade has 10 levels of 25 challenges, which is 250 learning
 * interactions per grade. Difficulty ramps across the 10 levels and again,
 * more gently, within each level. Roughly every other challenge opens with a
 * creative puzzle before the math question, so the loop stays
 * explore -> interact -> create -> solve -> reward without becoming 25
 * drag-and-drop builds in a row.
 */

import { mulberry32, hashSeed } from '../math/helpers.js';
import { worldForLevel } from './worlds.js';
import { puzzleTypeForStation } from './puzzles.js';

export const LEVELS_PER_GRADE = 10;
export const CHALLENGES_PER_LEVEL = 25;

const LEVEL_NAMES = [
  'First Steps',
  'Finding the Path',
  'Higher Ground',
  'The Narrow Pass',
  'Into the Circuits',
  'Neon Depths',
  'Docking Sequence',
  'Outer Ring',
  'Crystal Approach',
  'The Final Trial',
];

const LEVEL_INTROS = [
  'A gentle start. Meet the locals and learn how the world works.',
  'The trail opens up. More to explore, and more to solve.',
  'The ground rises and so does the challenge.',
  'Narrow ledges and tricky puzzles. Take your time.',
  'Machines everywhere, and every one of them needs a hand.',
  'Deep in the city, the problems get sharper.',
  'Systems are failing. Bring them back online one at a time.',
  'The outer ring is unforgiving. Precision matters here.',
  'Strange spires hum with mathematics you almost recognise.',
  'Everything you have learned, one final mission.',
];

/** Planned math difficulty (1-5) for a challenge slot, before adaptation. */
export function plannedDifficulty(level, challengeIndex) {
  const lv = Math.min(LEVELS_PER_GRADE, Math.max(1, level));
  const base = 1 + ((lv - 1) * 4) / (LEVELS_PER_GRADE - 1); // 1.0 at L1, 5.0 at L10
  const within = ((challengeIndex - 1) / (CHALLENGES_PER_LEVEL - 1)) * 0.6; // gentle ramp
  const milestone = challengeIndex === CHALLENGES_PER_LEVEL ? 0.4 : 0;
  return Math.min(5, Math.max(1, Math.round((base + within + milestone) * 2) / 2));
}

/**
 * The full plan for a level: which station hosts each challenge, whether a
 * puzzle comes first, and how hard each part should be.
 */
export function levelPlan(level) {
  const lv = Math.min(LEVELS_PER_GRADE, Math.max(1, Number(level) || 1));
  const world = worldForLevel(lv);
  const rng = mulberry32(hashSeed('level:' + lv));
  const stations = world.stations;

  const challenges = [];
  for (let i = 1; i <= CHALLENGES_PER_LEVEL; i++) {
    const station = stations[(i - 1) % stations.length];
    const hasPuzzle = i % 2 === 1 || i === CHALLENGES_PER_LEVEL;
    const mathDifficulty = plannedDifficulty(lv, i);
    const puzzleDifficulty = Math.min(5, Math.max(1, Math.round(mathDifficulty)));
    challenges.push({
      index: i,
      stationId: station.id,
      stationName: station.name,
      stationKind: station.kind,
      hasPuzzle,
      puzzleId: hasPuzzle ? puzzleTypeForStation(rng, station.kind) : null,
      puzzleDifficulty: hasPuzzle ? puzzleDifficulty : null,
      mathDifficulty,
      isMilestone: i === CHALLENGES_PER_LEVEL,
    });
  }

  return {
    level: lv,
    name: LEVEL_NAMES[lv - 1],
    intro: LEVEL_INTROS[lv - 1],
    worldId: world.id,
    worldName: world.name,
    isFinal: lv === LEVELS_PER_GRADE,
    challengeCount: CHALLENGES_PER_LEVEL,
    challenges,
  };
}

/** Compact level list for menus and the world map. */
export function levelSummaries() {
  return Array.from({ length: LEVELS_PER_GRADE }, (_, i) => {
    const plan = levelPlan(i + 1);
    return {
      level: plan.level,
      name: plan.name,
      intro: plan.intro,
      worldId: plan.worldId,
      worldName: plan.worldName,
      isFinal: plan.isFinal,
      challengeCount: plan.challengeCount,
    };
  });
}

/** Stars awarded for a level, from accuracy. */
export function starsForAccuracy(accuracy) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}

/**
 * Reward for one correct answer. Harder questions and puzzle-backed challenges
 * pay more; each hint used trims the reward a little, but never below a floor,
 * so asking for help is never punishing.
 */
export function rewardFor({ difficulty, hintsUsed = 0, hadPuzzle = false, attempts = 1, isMilestone = false }) {
  const baseXp = 20 + Math.round(difficulty * 8);
  const puzzleBonus = hadPuzzle ? 12 : 0;
  const milestoneBonus = isMilestone ? 40 : 0;
  const hintPenalty = Math.min(0.45, hintsUsed * 0.15);
  const attemptPenalty = Math.min(0.3, Math.max(0, attempts - 1) * 0.15);
  const multiplier = Math.max(0.4, 1 - hintPenalty - attemptPenalty);
  const xp = Math.max(6, Math.round((baseXp + puzzleBonus + milestoneBonus) * multiplier));
  const coins = Math.max(2, Math.round(xp / 5));
  return { xp, coins };
}
