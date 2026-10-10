import { ri, pick, mc, num, text, reduce, round, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g7-proportions',
    topic: 'Proportions',
    skill: 'Solve proportions',
    gen(rng, d) {
      const a = ri(rng, 2, 9);
      const b = ri(rng, 2, 9);
      const k = ri(rng, 2, [4, 5, 7, 9, 12][d - 1]);
      const c = a * k;
      const ans = b * k;
      return num({
        prompt: 'Solve for x:\n\n' + a + '/' + b + ' = ' + c + '/x',
        answer: ans,
        hints: [
          'Equal ratios stay equal when you scale both parts by the same factor.',
          a + ' was multiplied by ' + k + ' to get ' + c + '.',
          'So ' + b + ' x ' + k + ' = ' + ans + '.',
        ],
        explanation: 'Cross multiply: ' + a + 'x = ' + b + ' x ' + c + ', so x = ' + ans + '.',
      });
    },
  },
  {
    id: 'g7-percent-change',
    topic: 'Percentages',
    skill: 'Percent increase and decrease',
    gen(rng, d) {
      const original = 10 * ri(rng, 3, [10, 16, 25, 40, 60][d - 1]);
      const pct = pick(rng, [10, 20, 25, 40, 50]);
      const increase = rng() < 0.5;
      const newVal = round(increase ? original * (1 + pct / 100) : original * (1 - pct / 100), 2);
      if (rng() < 0.5) {
        return num({
          prompt: 'A price of ' + original + ' credits ' + (increase ? 'increases' : 'decreases') + ' by ' + pct + '%. What is the new price?',
          answer: newVal,
          unit: 'credits',
          hints: [
            'A percent change is always taken from the original amount.',
            pct + '% of ' + original + ' is ' + round((pct / 100) * original, 2) + '.',
            original + (increase ? ' + ' : ' - ') + round((pct / 100) * original, 2) + ' = ' + newVal + '.',
          ],
          explanation: 'The new price is ' + newVal + ' credits.',
        });
      }
      return num({
        prompt: 'A price changed from ' + original + ' credits to ' + newVal + ' credits. What was the percent ' + (increase ? 'increase' : 'decrease') + '?',
        answer: pct,
        unit: '%',
        hints: [
          'Percent change = (change / original) x 100.',
          'The change is ' + round(Math.abs(newVal - original), 2) + ' and the original is ' + original + '.',
          round(Math.abs(newVal - original), 2) + ' / ' + original + ' = ' + round(Math.abs(newVal - original) / original, 4) + ', which is ' + pct + '%.',
        ],
        explanation: 'The percent ' + (increase ? 'increase' : 'decrease') + ' is ' + pct + '%.',
      });
    },
  },
  {
    id: 'g7-integer-ops',
    topic: 'Integers',
    skill: 'Multiply and divide integers',
    gen(rng, d) {
      const a = ri(rng, 2, [9, 12, 15, 20, 25][d - 1]) * (rng() < 0.5 ? -1 : 1);
      const b = ri(rng, 2, [9, 12, 12, 15, 15][d - 1]) * (rng() < 0.5 ? -1 : 1);
      const isMult = rng() < 0.5;
      const ans = isMult ? a * b : (a * b) / b;
      const expr = isMult ? '(' + a + ') x (' + b + ')' : '(' + a * b + ') / (' + b + ')';
      const result = isMult ? a * b : a;
      const negCount = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0);
      return num({
        prompt: 'What is ' + expr + '?',
        answer: result,
        hints: [
          'Work out the size first, then decide the sign.',
          'Two negatives make a positive. One negative makes a negative.',
          'There ' + (negCount === 1 ? 'is 1 negative sign, so the answer is negative' : negCount === 2 ? 'are 2 negative signs, so the answer is positive' : 'are no negative signs, so the answer is positive') + ': ' + result + '.',
        ],
        explanation: expr + ' = ' + result + '.',
      });
    },
  },
  {
    id: 'g7-expressions',
    topic: 'Expressions',
    skill: 'Distribute and combine like terms',
    gen(rng, d) {
      const a = ri(rng, 2, 8);
      const b = ri(rng, 1, 9);
      const c = ri(rng, 1, 9);
      if (rng() < 0.5) {
        const coef = a;
        const constant = a * b;
        const extra = c;
        return text({
          prompt: 'Simplify: ' + a + '(x + ' + b + ') + ' + extra,
          answer: coef + 'x + ' + (constant + extra),
          accept: [coef + 'x+' + (constant + extra), (constant + extra) + ' + ' + coef + 'x'],
          placeholder: 'e.g. 3x + 10',
          hints: [
            'Distribute the ' + a + ' to both terms inside the parentheses.',
            a + ' x x = ' + a + 'x and ' + a + ' x ' + b + ' = ' + constant + '.',
            'Then combine the constants: ' + constant + ' + ' + extra + ' = ' + (constant + extra) + '.',
          ],
          explanation: a + '(x + ' + b + ') + ' + extra + ' = ' + coef + 'x + ' + (constant + extra) + '.',
        });
      }
      const t1 = ri(rng, 2, 9);
      const t2 = ri(rng, 1, 8);
      return text({
        prompt: 'Simplify by combining like terms: ' + t1 + 'x + ' + b + ' + ' + t2 + 'x + ' + c,
        answer: (t1 + t2) + 'x + ' + (b + c),
        accept: [(t1 + t2) + 'x+' + (b + c)],
        placeholder: 'e.g. 7x + 12',
        hints: [
          'Like terms have the same variable part.',
          'Add the x terms: ' + t1 + 'x + ' + t2 + 'x = ' + (t1 + t2) + 'x.',
          'Add the constants: ' + b + ' + ' + c + ' = ' + (b + c) + '.',
        ],
        explanation: 'The simplified expression is ' + (t1 + t2) + 'x + ' + (b + c) + '.',
      });
    },
  },
  {
    id: 'g7-two-step-equations',
    topic: 'Equations',
    skill: 'Solve two-step equations',
    gen(rng, d) {
      const x = ri(rng, 2, [8, 10, 12, 15, 20][d - 1]);
      const a = ri(rng, 2, 9);
      const b = ri(rng, 1, 20);
      const plus = rng() < 0.5;
      const rhs = plus ? a * x + b : a * x - b;
      const eq = a + 'x ' + (plus ? '+' : '-') + ' ' + b + ' = ' + rhs;
      return num({
        prompt: 'Solve for x:\n\n' + eq,
        answer: x,
        hints: [
          'Undo the addition or subtraction first, then undo the multiplication.',
          'Step 1: ' + (plus ? 'subtract ' + b + ' from' : 'add ' + b + ' to') + ' both sides to get ' + a + 'x = ' + a * x + '.',
          'Step 2: divide both sides by ' + a + ' to get x = ' + x + '.',
        ],
        explanation: eq + ' gives ' + a + 'x = ' + a * x + ', so x = ' + x + '.',
      });
    },
  },
  {
    id: 'g7-circles',
    topic: 'Geometry',
    skill: 'Circumference and area of circles',
    gen(rng, d) {
      const r = ri(rng, 2, [7, 9, 12, 15, 20][d - 1]);
      const wantArea = rng() < 0.5;
      const ans = round(wantArea ? Math.PI * r * r : 2 * Math.PI * r, 2);
      return num({
        prompt: 'A circular platform has a radius of ' + r + ' m. What is its ' + (wantArea ? 'area' : 'circumference') +
          '? Use 3.14 for pi and round to 2 decimal places.',
        answer: round(wantArea ? 3.14 * r * r : 2 * 3.14 * r, 2),
        unit: wantArea ? 'square meters' : 'meters',
        accept: [String(ans)],
        visual: { kind: 'circle', r },
        hints: [
          wantArea ? 'Area of a circle = pi x r^2.' : 'Circumference = 2 x pi x r.',
          wantArea ? 'r^2 = ' + r + ' x ' + r + ' = ' + r * r + '.' : '2 x r = ' + 2 * r + '.',
          wantArea ? '3.14 x ' + r * r + ' = ' + round(3.14 * r * r, 2) + '.' : '3.14 x ' + 2 * r + ' = ' + round(2 * 3.14 * r, 2) + '.',
        ],
        explanation: wantArea
          ? 'Area = pi x ' + r + '^2 = ' + round(3.14 * r * r, 2) + ' square meters.'
          : 'Circumference = 2 x pi x ' + r + ' = ' + round(2 * 3.14 * r, 2) + ' meters.',
      });
    },
  },
  {
    id: 'g7-surface-area',
    topic: 'Geometry',
    skill: 'Surface area and volume of prisms',
    gen(rng, d) {
      const l = ri(rng, 2, [5, 7, 9, 11, 14][d - 1]);
      const w = ri(rng, 2, [5, 7, 9, 11, 14][d - 1]);
      const h = ri(rng, 2, [5, 7, 9, 11, 14][d - 1]);
      const wantSA = rng() < 0.5;
      const sa = 2 * (l * w + l * h + w * h);
      return num({
        prompt: 'A rectangular prism is ' + l + ' x ' + w + ' x ' + h + ' cm. What is its ' + (wantSA ? 'surface area' : 'volume') + '?',
        answer: wantSA ? sa : l * w * h,
        unit: wantSA ? 'square cm' : 'cubic cm',
        visual: { kind: 'prism', l, w, h },
        hints: [
          wantSA ? 'Surface area adds up all 6 faces. Opposite faces match.' : 'Volume fills the inside of the solid.',
          wantSA
            ? 'The three different faces are ' + l * w + ', ' + l * h + ', and ' + w * h + ' square cm.'
            : 'Volume = length x width x height.',
          wantSA ? '2 x (' + l * w + ' + ' + l * h + ' + ' + w * h + ') = ' + sa + '.' : l + ' x ' + w + ' x ' + h + ' = ' + l * w * h + '.',
        ],
        explanation: wantSA ? 'Surface area = ' + sa + ' square cm.' : 'Volume = ' + l * w * h + ' cubic cm.',
      });
    },
  },
  {
    id: 'g7-probability',
    topic: 'Probability',
    skill: 'Simple probability',
    gen(rng, d) {
      const colors = ['red', 'blue', 'green', 'yellow'];
      const counts = pickCounts(rng, d);
      const total = counts.reduce((s, v) => s + v, 0);
      const idx = ri(rng, 0, counts.length - 1);
      const [rn, rd] = reduce(counts[idx], total);
      return text({
        prompt: 'A bag holds ' + counts.map((c, i) => c + ' ' + colors[i]).join(', ') + ' crystals. What is the probability of drawing a ' +
          colors[idx] + ' crystal? Give your answer as a fraction in simplest form.',
        answer: rd === 1 ? String(rn) : rn + '/' + rd,
        accept: [counts[idx] + '/' + total],
        placeholder: 'e.g. 1/4',
        hints: [
          'Probability = favorable outcomes / total outcomes.',
          'There are ' + counts[idx] + ' ' + colors[idx] + ' out of ' + total + ' crystals in total.',
          counts[idx] + '/' + total + (counts[idx] === rn && total === rd ? '' : ' simplifies to ' + rn + '/' + rd) + '.',
        ],
        explanation: 'P(' + colors[idx] + ') = ' + counts[idx] + '/' + total + ' = ' + (rd === 1 ? rn : rn + '/' + rd) + '.',
      });

      function pickCounts(r, diff) {
        const n = diff <= 2 ? 2 : diff <= 4 ? 3 : 4;
        return Array.from({ length: n }, () => ri(r, 1, 8));
      }
    },
  },
  {
    id: 'g7-scale',
    topic: 'Proportions',
    skill: 'Scale drawings',
    gen(rng, d) {
      const scale = pick(rng, [2, 3, 4, 5, 10, 20, 50]);
      const drawing = ri(rng, 2, [8, 10, 14, 18, 25][d - 1]);
      const toActual = rng() < 0.5;
      const actual = drawing * scale;
      return num({
        prompt: toActual
          ? 'On a map, 1 cm represents ' + scale + ' m. A path measures ' + drawing + ' cm on the map. How long is the real path?'
          : 'On a map, 1 cm represents ' + scale + ' m. A real path is ' + actual + ' m long. How long is it on the map?',
        answer: toActual ? actual : drawing,
        unit: toActual ? 'meters' : 'cm',
        hints: [
          'The scale tells you how many real meters each map centimeter stands for.',
          toActual ? 'Multiply the map length by ' + scale + '.' : 'Divide the real length by ' + scale + '.',
          toActual ? drawing + ' x ' + scale + ' = ' + actual + ' m.' : actual + ' / ' + scale + ' = ' + drawing + ' cm.',
        ],
        explanation: drawing + ' cm on the map is ' + actual + ' m in real life.',
      });
    },
  },
  {
    id: 'g7-inequalities',
    topic: 'Equations',
    skill: 'Solve one-step inequalities',
    gen(rng, d) {
      const a = ri(rng, 2, 9);
      const x = ri(rng, 2, 12);
      const b = a * x;
      const dir = pick(rng, ['>', '<']);
      return mc(rng, {
        prompt: 'Solve the inequality:\n\n' + a + 'x ' + dir + ' ' + b,
        answer: 'x ' + dir + ' ' + x,
        distractors: ['x ' + (dir === '>' ? '<' : '>') + ' ' + x, 'x ' + dir + ' ' + b, 'x ' + dir + ' ' + (x + a)],
        hints: [
          'Solve it the same way as an equation, keeping the inequality symbol.',
          'Divide both sides by ' + a + '.',
          b + ' / ' + a + ' = ' + x + ', so x ' + dir + ' ' + x + '.',
        ],
        explanation: 'Dividing both sides by the positive number ' + a + ' keeps the symbol: x ' + dir + ' ' + x + '.',
      });
    },
  },
];
