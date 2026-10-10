import { ri, pick, mc, num, text, reduce, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g3-mult-facts',
    topic: 'Multiplication',
    skill: 'Multiplication facts to 10 x 10',
    gen(rng, d, ctx) {
      const max = [5, 6, 8, 10, 12][d - 1];
      let a = ri(rng, 2, max);
      let b = ri(rng, 2, max);
      if (ctx && ctx.puzzle && ctx.puzzle.count && rng() < 0.35) {
        const c = ctx.puzzle.count;
        const factors = [];
        for (let i = 2; i <= Math.min(12, c); i++) if (c % i === 0 && c / i <= 12) factors.push(i);
        if (factors.length) {
          a = pick(rng, factors);
          b = c / a;
        }
      }
      const ans = a * b;
      return num({
        prompt: 'What is ' + a + ' x ' + b + '?',
        answer: ans,
        visual: { kind: 'array', rows: Math.min(a, 12), cols: Math.min(b, 12) },
        hints: [
          'Multiplication means ' + a + ' equal groups of ' + b + '.',
          'Skip count by ' + b + ', ' + a + ' times.',
          Array(a).fill(b).join(' + ') + ' = ' + ans + '.',
        ],
        explanation: a + ' x ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g3-division',
    topic: 'Division',
    skill: 'Divide within 100',
    gen(rng, d, ctx) {
      const max = [5, 6, 8, 10, 12][d - 1];
      let b = ri(rng, 2, max);
      let ans = ri(rng, 2, max);
      if (ctx && ctx.puzzle && ctx.puzzle.count && rng() < 0.35) {
        const c = ctx.puzzle.count;
        const divs = [];
        for (let i = 2; i <= Math.min(12, c); i++) if (c % i === 0) divs.push(i);
        if (divs.length) {
          b = pick(rng, divs);
          ans = c / b;
        }
      }
      const a = b * ans;
      const puzzleTie = ctx && ctx.puzzle && ctx.puzzle.count === a && ctx.puzzle.label;
      return num({
        prompt: puzzleTie
          ? 'You used ' + a + ' pieces building the ' + ctx.puzzle.label + '. If each section needs ' + b + ' pieces, how many sections can you make?'
          : 'What is ' + a + ' divided by ' + b + '?',
        answer: ans,
        hints: [
          'Division asks how many equal groups of ' + b + ' fit inside ' + a + '.',
          'Think of the matching multiplication: ' + b + ' x ___ = ' + a + '.',
          b + ' x ' + ans + ' = ' + a + ', so ' + a + ' / ' + b + ' = ' + ans + '.',
        ],
        explanation: a + ' / ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g3-fractions-identify',
    topic: 'Fractions',
    skill: 'Name a fraction from a picture',
    gen(rng, d) {
      const den = pick(rng, d <= 2 ? [2, 3, 4] : [2, 3, 4, 5, 6, 8]);
      const numr = ri(rng, 1, den - 1);
      return text({
        prompt: 'What fraction of the bar is shaded? Write it like 3/4.',
        answer: numr + '/' + den,
        placeholder: 'e.g. 3/4',
        visual: { kind: 'fraction-bar', num: numr, den },
        hints: [
          'The bottom number tells how many equal parts the whole is cut into.',
          'The bar is cut into ' + den + ' equal parts.',
          numr + ' of the ' + den + ' parts are shaded, so the fraction is ' + numr + '/' + den + '.',
        ],
        explanation: numr + ' shaded parts out of ' + den + ' equal parts is ' + numr + '/' + den + '.',
      });
    },
  },
  {
    id: 'g3-fractions-compare',
    topic: 'Fractions',
    skill: 'Compare fractions with the same numerator or denominator',
    gen(rng, d) {
      const sameDen = rng() < 0.5;
      let f1, f2;
      if (sameDen) {
        const den = pick(rng, [3, 4, 5, 6, 8]);
        const n1 = ri(rng, 1, den - 1);
        let n2 = ri(rng, 1, den - 1);
        while (n2 === n1) n2 = ri(rng, 1, den - 1);
        f1 = [n1, den];
        f2 = [n2, den];
      } else {
        const numr = ri(rng, 1, 3);
        const d1 = pick(rng, [4, 6, 8]);
        let d2 = pick(rng, [3, 5, 10, 12]);
        while (d2 === d1) d2 = pick(rng, [3, 5, 10, 12]);
        f1 = [numr, d1];
        f2 = [numr, d2];
      }
      const v1 = f1[0] / f1[1];
      const v2 = f2[0] / f2[1];
      const ans = v1 > v2 ? '>' : v1 < v2 ? '<' : '=';
      const s1 = f1[0] + '/' + f1[1];
      const s2 = f2[0] + '/' + f2[1];
      return mc(rng, {
        prompt: 'Which symbol makes this true?\n\n' + s1 + '  ___  ' + s2,
        answer: ans,
        distractors: ['>', '<', '='].filter((s) => s !== ans),
        visual: { kind: 'fraction-compare', a: f1, b: f2 },
        hints: [
          sameDen
            ? 'The pieces are the same size, so just compare how many pieces.'
            : 'The number of pieces is the same, so compare how big each piece is.',
          sameDen
            ? f1[0] + ' pieces versus ' + f2[0] + ' pieces of the same size.'
            : 'Cutting a whole into more parts makes each part smaller, so ' + (f1[1] > f2[1] ? s1 + ' has smaller pieces' : s2 + ' has smaller pieces') + '.',
          s1 + ' ' + ans + ' ' + s2 + '.',
        ],
        explanation: s1 + ' ' + ans + ' ' + s2 + '.',
      });
    },
  },
  {
    id: 'g3-rounding',
    topic: 'Place value',
    skill: 'Round to the nearest 10 or 100',
    gen(rng, d) {
      const to = d <= 2 ? 10 : pick(rng, [10, 100]);
      const n = ri(rng, to === 10 ? 11 : 101, to === 10 ? 99 : 999);
      const ans = Math.round(n / to) * to;
      const lower = Math.floor(n / to) * to;
      const upper = lower + to;
      const mid = lower + to / 2;
      return num({
        prompt: 'Round ' + n + ' to the nearest ' + to + '.',
        answer: ans,
        hints: [
          n + ' sits between ' + lower + ' and ' + upper + '.',
          'The halfway point is ' + mid + '. Is ' + n + ' above or below it?',
          n + ' is ' + (n >= mid ? 'at or above' : 'below') + ' ' + mid + ', so round to ' + ans + '.',
        ],
        explanation: n + ' rounds to ' + ans + ' because it is closer to ' + ans + ' than to ' + (ans === lower ? upper : lower) + '.',
      });
    },
  },
  {
    id: 'g3-area-perimeter',
    topic: 'Geometry',
    skill: 'Area and perimeter of rectangles',
    gen(rng, d) {
      const w = ri(rng, 2, [5, 7, 9, 11, 13][d - 1]);
      const h = ri(rng, 2, [5, 7, 9, 11, 13][d - 1]);
      const wantArea = rng() < 0.5;
      const ans = wantArea ? w * h : 2 * (w + h);
      return num({
        prompt: 'A rectangle is ' + w + ' units wide and ' + h + ' units tall.\n\nWhat is its ' + (wantArea ? 'area' : 'perimeter') + '?',
        answer: ans,
        unit: wantArea ? 'square units' : 'units',
        visual: { kind: 'rect', w, h },
        hints: [
          wantArea ? 'Area is the number of unit squares that fill the shape.' : 'Perimeter is the distance all the way around the outside.',
          wantArea ? 'Multiply the width by the height.' : 'Add all four sides: ' + w + ' + ' + h + ' + ' + w + ' + ' + h + '.',
          wantArea ? w + ' x ' + h + ' = ' + ans + ' square units.' : '2 x (' + w + ' + ' + h + ') = ' + ans + ' units.',
        ],
        explanation: wantArea
          ? 'Area = width x height = ' + w + ' x ' + h + ' = ' + ans + ' square units.'
          : 'Perimeter = 2 x (' + w + ' + ' + h + ') = ' + ans + ' units.',
      });
    },
  },
  {
    id: 'g3-elapsed-time',
    topic: 'Measurement',
    skill: 'Elapsed time',
    gen(rng, d) {
      const startH = ri(rng, 1, 11);
      const startM = 5 * ri(rng, 0, 11);
      const durMin = 5 * ri(rng, 2, [6, 9, 12, 16, 20][d - 1]);
      const total = startH * 60 + startM + durMin;
      const endH = Math.floor(total / 60) % 12 || 12;
      const endM = total % 60;
      const label = endH + ':' + String(endM).padStart(2, '0');
      const startLabel = startH + ':' + String(startM).padStart(2, '0');
      return mc(rng, {
        prompt: 'A mission starts at ' + startLabel + ' and lasts ' + durMin + ' minutes. What time does it end?',
        answer: label,
        distractors: [
          endH + ':' + String((endM + 5) % 60).padStart(2, '0'),
          ((endH % 12) + 1) + ':' + String(endM).padStart(2, '0'),
          endH + ':' + String((endM + 30) % 60).padStart(2, '0'),
        ],
        visual: { kind: 'clock', hour: startH, minute: startM },
        hints: [
          'Count forward from the start time.',
          durMin >= 60
            ? 'First add ' + Math.floor(durMin / 60) + ' whole hour' + (Math.floor(durMin / 60) === 1 ? '' : 's') + ', then the extra ' + (durMin % 60) + ' minutes.'
            : 'Add ' + durMin + ' minutes to ' + startM + ' minutes past the hour.',
          'The mission ends at ' + label + '.',
        ],
        explanation: startLabel + ' plus ' + durMin + ' minutes is ' + label + '.',
      });
    },
  },
  {
    id: 'g3-mult-word',
    topic: 'Word problems',
    skill: 'Multiplication and division word problems',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const groups = ri(rng, 3, [5, 6, 8, 9, 12][d - 1]);
      const each = ri(rng, 3, [5, 6, 8, 9, 12][d - 1]);
      const isMult = rng() < 0.5;
      const total = groups * each;
      return num({
        prompt: isMult
          ? name + ' packs ' + groups + ' crates with ' + each + ' power cells in each crate. How many power cells in total?'
          : name + ' has ' + total + ' power cells to share equally among ' + groups + ' crates. How many go in each crate?',
        answer: isMult ? total : each,
        hints: [
          isMult ? 'Equal groups means multiply.' : 'Sharing equally means divide.',
          isMult ? 'The number sentence is ' + groups + ' x ' + each + ' = ___.' : 'The number sentence is ' + total + ' / ' + groups + ' = ___.',
          groups + ' x ' + each + ' = ' + total + ', so the answer is ' + (isMult ? total : each) + '.',
        ],
        explanation: isMult ? groups + ' x ' + each + ' = ' + total + '.' : total + ' / ' + groups + ' = ' + each + '.',
      });
    },
  },
  {
    id: 'g3-equivalent-fractions',
    topic: 'Fractions',
    skill: 'Equivalent fractions',
    gen(rng, d) {
      const base = pick(rng, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]);
      const mult = ri(rng, 2, [2, 3, 3, 4, 5][d - 1]);
      const target = [base[0] * mult, base[1] * mult];
      const hideNum = rng() < 0.5;
      const shown = hideNum ? '___/' + target[1] : target[0] + '/___';
      const ans = hideNum ? target[0] : target[1];
      return num({
        prompt: 'Fill in the blank to make these fractions equal:\n\n' + base[0] + '/' + base[1] + '  =  ' + shown,
        answer: ans,
        visual: { kind: 'fraction-compare', a: base, b: target },
        hints: [
          'Equivalent fractions name the same amount using different sized pieces.',
          'Whatever you multiply the bottom by, multiply the top by the same number.',
          base[1] + ' x ' + mult + ' = ' + target[1] + ', so ' + base[0] + ' x ' + mult + ' = ' + target[0] + '.',
        ],
        explanation: base[0] + '/' + base[1] + ' = ' + target[0] + '/' + target[1] + ' because both parts were multiplied by ' + mult + '.',
      });
    },
  },
  {
    id: 'g3-mass-volume',
    topic: 'Measurement',
    skill: 'Mass and liquid volume',
    gen(rng, d) {
      const unit = pick(rng, ['grams', 'liters', 'kilograms', 'milliliters']);
      const each = ri(rng, 2, [6, 8, 10, 12, 15][d - 1]);
      const count = ri(rng, 3, [5, 6, 8, 9, 12][d - 1]);
      return num({
        prompt: 'Each container holds ' + each + ' ' + unit + '. How much do ' + count + ' containers hold altogether?',
        answer: each * count,
        unit,
        hints: [
          'Every container holds the same amount, so this is equal groups.',
          'Multiply ' + each + ' by ' + count + '.',
          each + ' x ' + count + ' = ' + each * count + ' ' + unit + '.',
        ],
        explanation: each + ' x ' + count + ' = ' + each * count + ' ' + unit + '.',
      });
    },
  },
];
