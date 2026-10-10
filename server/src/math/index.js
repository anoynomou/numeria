import { mulberry32, hashSeed, pick } from './helpers.js';
import gradeK from './gradeK.js';
import grade1 from './grade1.js';
import grade2 from './grade2.js';
import grade3 from './grade3.js';
import grade4 from './grade4.js';
import grade5 from './grade5.js';
import grade6 from './grade6.js';
import grade7 from './grade7.js';
import grade8 from './grade8.js';

/** Grade keys in curriculum order. 'K' is kindergarten. */
export const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];

export const GRADE_LABELS = {
  K: 'Kindergarten',
  1: 'Grade 1',
  2: 'Grade 2',
  3: 'Grade 3',
  4: 'Grade 4',
  5: 'Grade 5',
  6: 'Grade 6',
  7: 'Grade 7',
  8: 'Grade 8',
};

const BANKS = {
  K: gradeK,
  1: grade1,
  2: grade2,
  3: grade3,
  4: grade4,
  5: grade5,
  6: grade6,
  7: grade7,
  8: grade8,
};

export function isGrade(g) {
  return Object.prototype.hasOwnProperty.call(BANKS, String(g));
}

export function generatorsFor(grade) {
  return BANKS[String(grade)] || BANKS.K;
}

/** Distinct topic names taught at a grade, in bank order. */
export function topicsForGrade(grade) {
  const seen = [];
  for (const g of generatorsFor(grade)) if (!seen.includes(g.topic)) seen.push(g.topic);
  return seen;
}

/** Every skill descriptor at a grade, for dashboards and admin tooling. */
export function skillsForGrade(grade) {
  return generatorsFor(grade).map((g) => ({ id: g.id, topic: g.topic, skill: g.skill }));
}

/**
 * Produce one question. `seed` makes generation reproducible so the same
 * challenge slot always yields the same question for a given student.
 */
export function generateQuestion({ grade, difficulty = 2, seed, topic, generatorId, puzzle }) {
  const rng = mulberry32(hashSeed(String(seed ?? Math.random())));
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));
  let pool = generatorsFor(grade);
  if (generatorId) {
    const exact = pool.filter((g) => g.id === generatorId);
    if (exact.length) pool = exact;
  } else if (topic) {
    const byTopic = pool.filter((g) => g.topic === topic);
    if (byTopic.length) pool = byTopic;
  }
  const generator = pick(rng, pool);
  const q = generator.gen(rng, d, { puzzle });
  return {
    generatorId: generator.id,
    topic: generator.topic,
    skill: generator.skill,
    difficulty: d,
    grade: String(grade),
    type: q.type,
    prompt: q.prompt,
    choices: q.choices || null,
    items: q.items || null,
    left: q.left || null,
    right: q.right || null,
    min: q.min ?? null,
    max: q.max ?? null,
    step: q.step ?? null,
    unit: q.unit || null,
    placeholder: q.placeholder || null,
    visual: q.visual || null,
    hints: q.hints || [],
    explanation: q.explanation || '',
    answer: q.answer,
    accept: q.accept || [],
  };
}

/** Strip a student's answer down to a comparable core. */
function normalize(raw) {
  let s = String(raw ?? '').trim().toLowerCase();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[.!?]+$/, '');
  // Drop common unit words a student might type alongside the number.
  s = s.replace(
    /\b(square |cubic )?(meters?|metres?|m|centimeters?|cm|kilometers?|km|millimeters?|mm|inches|inch|in|feet|foot|ft|yards?|units?|degrees?|cents?|credits?|dollars?|grams?|g|kilograms?|kg|liters?|litres?|l|milliliters?|ml|minutes?|min|hours?|hrs?|seconds?|secs?|percent|%)\b/g,
    ''
  );
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Numeric view of an answer, understanding fractions and thousands separators. */
function toNumber(raw) {
  let s = normalize(raw).replace(/\s/g, '');
  if (s.includes(',')) {
    // Only strip commas that are genuine thousands separators. Otherwise the
    // string is a coordinate pair or a list, which is not a single number.
    if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return null;
    s = s.replace(/,/g, '');
  }
  if (!s) return null;
  const frac = s.match(/^(-?\d+)\/(-?\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  const mixed = s.match(/^(-?\d+)_(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const v = Number(mixed[2]) / Number(mixed[3]);
    return whole < 0 ? whole - v : whole + v;
  }
  if (/^-?\d*\.?\d+$/.test(s)) return Number(s);
  return null;
}

/** Compare coordinate-pair style answers: "(3, 5)" equals "3,5". */
function coordKey(raw) {
  const s = normalize(raw).replace(/[()\s]/g, '');
  return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s) ? s : null;
}

/** Compare algebraic expressions ignoring spacing: "3x + 10" equals "3x+10". */
function exprKey(raw) {
  return normalize(raw).replace(/\s|\*/g, '');
}

/**
 * Grade a submitted answer. Accepts the canonical answer, any explicitly
 * listed alternates, and equivalent numeric / coordinate / expression forms.
 */
export function checkAnswer(question, submitted) {
  const expectedList = [question.answer, ...(question.accept || [])];
  const sub = String(submitted ?? '');
  if (!sub.trim()) return false;

  if (question.type === 'multiple-choice') {
    return normalize(sub) === normalize(question.answer);
  }

  if (question.type === 'order' || question.type === 'match') {
    const norm = (v) => String(v).split(question.type === 'order' ? ',' : '|').map((p) => p.trim()).join(question.type === 'order' ? ',' : '|');
    if (question.type === 'match') {
      const a = new Set(String(question.answer).split('|').map((p) => p.replace(/\s/g, '')));
      const b = String(sub).split('|').map((p) => p.replace(/\s/g, ''));
      return b.length === a.size && b.every((p) => a.has(p));
    }
    return norm(sub) === norm(question.answer);
  }

  for (const expected of expectedList) {
    if (normalize(sub) === normalize(expected)) return true;
    const ck = coordKey(expected);
    if (ck && coordKey(sub) === ck) return true;
    const en = toNumber(expected);
    const sn = toNumber(sub);
    if (en !== null && sn !== null) {
      // Answers of size 1 or more may have been rounded to 2 decimal places, so
      // allow half a hundredth. Small answers (like 1/625) need a tight relative
      // tolerance, otherwise 0 would be graded as correct.
      const mag = Math.abs(en);
      const tol = mag >= 1 ? Math.max(0.005, mag * 1e-6) : Math.max(mag * 1e-3, 1e-9);
      if (Math.abs(en - sn) <= tol) return true;
    }
    if (/[a-z]/i.test(String(expected)) && exprKey(sub) === exprKey(expected)) return true;
  }
  return false;
}

/**
 * Adaptive difficulty, expressed as an offset applied to the difficulty the
 * level plan already asked for. Recent correctness moves the dial gently: a
 * streak of right answers stretches the student, a run of wrong ones eases
 * off. The offset is capped so a level never drifts far from its design.
 */
export const MAX_DIFFICULTY_OFFSET = 1.5;

export function adaptOffset(currentOffset, recent) {
  const window = recent.slice(-5);
  if (window.length < 3) return currentOffset;
  const ratio = window.filter(Boolean).length / window.length;
  let next = currentOffset;
  if (ratio >= 0.8) next = currentOffset + 0.5;
  else if (ratio <= 0.4) next = currentOffset - 0.5;
  return Math.min(MAX_DIFFICULTY_OFFSET, Math.max(-MAX_DIFFICULTY_OFFSET, next));
}

/** Combine a level's planned difficulty with the student's adaptive offset. */
export function effectiveDifficulty(planned, offset) {
  return Math.min(5, Math.max(1, Math.round(planned + offset)));
}
