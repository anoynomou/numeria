// Deterministic RNG + question-construction helpers shared by every grade generator.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Random integer in [min, max] inclusive. */
export const ri = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** Pick one element. */
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/** Pick n distinct elements. */
export function pickN(rng, arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/** Reduce a fraction to lowest terms. */
export function reduce(n, d) {
  const g = gcd(n, d) || 1;
  let rn = n / g, rd = d / g;
  if (rd < 0) { rn = -rn; rd = -rd; }
  return [rn, rd];
}

/** Round to at most `places` decimals, dropping trailing zeros. */
export function round(x, places = 2) {
  const f = Math.pow(10, places);
  return Math.round((x + Number.EPSILON) * f) / f;
}

export const NAMES = [
  'Mira', 'Theo', 'Ava', 'Kian', 'Nia', 'Owen', 'Zuri', 'Leo', 'Ivy', 'Rafi',
  'Sana', 'Jonas', 'Lila', 'Ravi', 'Noor', 'Eli', 'Tess', 'Mateo', 'Anya', 'Dev',
];

/**
 * Build a multiple-choice question. Distractors are deduped against the answer
 * and padded with nearby values so a choice list is never short.
 */
export function mc(rng, { prompt, answer, distractors = [], hints, explanation, visual, format = (v) => String(v) }) {
  const seen = new Set([String(answer)]);
  const opts = [];
  for (const d of distractors) {
    const key = String(d);
    if (!seen.has(key) && d !== null && d !== undefined && Number.isFinite(Number(d)) === Number.isFinite(Number(answer))) {
      seen.add(key);
      opts.push(d);
    }
  }
  // Pad with near-misses if the generator did not supply enough distractors.
  let guard = 0;
  while (opts.length < 3 && guard++ < 40) {
    const n = Number(answer);
    if (!Number.isFinite(n)) break;
    const delta = ri(rng, 1, Math.max(2, Math.round(Math.abs(n) * 0.25) || 3));
    const cand = rng() < 0.5 ? n + delta : n - delta;
    if (cand < 0 && n >= 0) continue;
    if (!seen.has(String(cand))) { seen.add(String(cand)); opts.push(cand); }
  }
  const choices = shuffle(rng, [answer, ...opts.slice(0, 3)]).map(format);
  return {
    type: 'multiple-choice',
    prompt,
    choices,
    answer: format(answer),
    hints,
    explanation,
    visual,
  };
}

/** Build a numeric-entry question. */
export function num({ prompt, answer, hints, explanation, unit, visual, accept = [] }) {
  return { type: 'numeric', prompt, answer: String(answer), accept, hints, explanation, unit, visual };
}

/** Build a short free-text question (fractions, coordinates, expressions). */
export function text({ prompt, answer, hints, explanation, placeholder, visual, accept = [] }) {
  return { type: 'text', prompt, answer: String(answer), accept, hints, explanation, placeholder, visual };
}

/**
 * Drag the numbers into order. Used for comparing/ordering skills where the
 * act of arranging is the mathematics.
 */
export function order({ prompt, items, answer, hints, explanation }) {
  return { type: 'order', prompt, items, answer: answer.join(','), hints, explanation };
}

/** Match pairs: left column items to right column items. */
export function match({ prompt, pairs, hints, explanation }) {
  return {
    type: 'match',
    prompt,
    left: pairs.map((p) => p[0]),
    right: pairs.map((p) => p[1]),
    answer: pairs.map((p) => `${p[0]}=${p[1]}`).join('|'),
    hints,
    explanation,
  };
}

/** Place a value on a number line. */
export function numberLine({ prompt, min, max, step, answer, hints, explanation }) {
  return { type: 'number-line', prompt, min, max, step, answer: String(answer), hints, explanation };
}
