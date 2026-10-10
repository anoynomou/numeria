import { ri, pick, mc, num, text, reduce, round, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g4-multi-digit-mult',
    topic: 'Multiplication',
    skill: 'Multiply multi-digit numbers',
    gen(rng, d) {
      const a = ri(rng, 12, [39, 59, 99, 199, 499][d - 1]);
      const b = ri(rng, 2, [5, 7, 9, 12, 25][d - 1]);
      const ans = a * b;
      const tens = Math.floor(a / 10) * 10;
      const ones = a % 10;
      return num({
        prompt: 'What is ' + a + ' x ' + b + '?',
        answer: ans,
        hints: [
          'Break the bigger number apart by place value.',
          a + ' = ' + tens + ' + ' + ones + ', so work out ' + tens + ' x ' + b + ' and ' + ones + ' x ' + b + '.',
          tens * b + ' + ' + ones * b + ' = ' + ans + '.',
        ],
        explanation: a + ' x ' + b + ' = ' + ans + ' (using ' + tens + ' x ' + b + ' = ' + tens * b + ' plus ' + ones + ' x ' + b + ' = ' + ones * b + ').',
      });
    },
  },
  {
    id: 'g4-division-remainder',
    topic: 'Division',
    skill: 'Divide with remainders',
    gen(rng, d) {
      const b = ri(rng, 3, [6, 8, 9, 12, 12][d - 1]);
      const q = ri(rng, 4, [12, 20, 40, 80, 150][d - 1]);
      const r = ri(rng, 0, b - 1);
      const a = b * q + r;
      const askRemainder = r > 0 && rng() < 0.4;
      return num({
        prompt: askRemainder
          ? 'What is the remainder when ' + a + ' is divided by ' + b + '?'
          : 'What is ' + a + ' divided by ' + b + '? Give the whole-number quotient (ignore any remainder).',
        answer: askRemainder ? r : q,
        hints: [
          'Ask how many whole groups of ' + b + ' fit inside ' + a + '.',
          b + ' x ' + q + ' = ' + b * q + ', which is the closest you can get without passing ' + a + '.',
          a + ' = ' + b + ' x ' + q + ' + ' + r + ', so the quotient is ' + q + ' and the remainder is ' + r + '.',
        ],
        explanation: a + ' / ' + b + ' = ' + q + ' remainder ' + r + '.',
      });
    },
  },
  {
    id: 'g4-fraction-add-like',
    topic: 'Fractions',
    skill: 'Add and subtract fractions with like denominators',
    gen(rng, d) {
      const den = pick(rng, [4, 5, 6, 8, 10, 12]);
      const isAdd = rng() < 0.5;
      let n1 = ri(rng, 1, den - 1);
      let n2 = ri(rng, 1, den - 1);
      if (isAdd && n1 + n2 > den) n2 = den - n1;
      if (!isAdd && n2 >= n1) { const t = n1; n1 = Math.max(n2, t); n2 = Math.min(n2, t); }
      if (n2 < 1) n2 = 1;
      const rawNum = isAdd ? n1 + n2 : n1 - n2;
      const [rn, rd] = reduce(rawNum, den);
      return text({
        prompt: 'What is ' + n1 + '/' + den + ' ' + (isAdd ? '+' : '-') + ' ' + n2 + '/' + den + '? Give your answer in simplest form.',
        answer: rd === 1 ? String(rn) : rn + '/' + rd,
        accept: [rawNum + '/' + den],
        placeholder: 'e.g. 3/4',
        visual: { kind: 'fraction-bar', num: n1, den },
        hints: [
          'The pieces are already the same size, so the denominator stays the same.',
          (isAdd ? 'Add' : 'Subtract') + ' only the top numbers: ' + n1 + ' ' + (isAdd ? '+' : '-') + ' ' + n2 + ' = ' + rawNum + '.',
          rawNum + '/' + den + (rd === 1 || rawNum === rn ? '' : ' simplifies to ' + rn + '/' + rd) + '.',
        ],
        explanation: n1 + '/' + den + ' ' + (isAdd ? '+' : '-') + ' ' + n2 + '/' + den + ' = ' + rawNum + '/' + den +
          (rawNum + '/' + den === (rd === 1 ? String(rn) : rn + '/' + rd) ? '' : ' = ' + (rd === 1 ? rn : rn + '/' + rd)) + '.',
      });
    },
  },
  {
    id: 'g4-decimal-place',
    topic: 'Decimals',
    skill: 'Tenths and hundredths',
    gen(rng, d) {
      const hundredths = ri(rng, 1, 99);
      const value = round(hundredths / 100, 2);
      const asFraction = hundredths % 10 === 0 ? (hundredths / 10) + '/10' : hundredths + '/100';
      if (rng() < 0.5) {
        return text({
          prompt: 'Write ' + asFraction + ' as a decimal.',
          answer: String(value),
          accept: [String(value).replace(/^0/, '')],
          placeholder: 'e.g. 0.45',
          hints: [
            'The first place after the decimal point is tenths, the second is hundredths.',
            asFraction.endsWith('/10') ? 'Tenths go in the first decimal place.' : 'Hundredths go in the second decimal place.',
            asFraction + ' = ' + value + '.',
          ],
          explanation: asFraction + ' written as a decimal is ' + value + '.',
        });
      }
      return mc(rng, {
        prompt: 'Which decimal is the largest?',
        answer: value,
        distractors: [round(value / 10, 3), round(value + 0.01, 2), round(Math.max(0.01, value - 0.1), 2)],
        hints: [
          'Line the numbers up at the decimal point.',
          'Compare the tenths digit first, then the hundredths digit.',
          'The largest value here is ' + value + '.',
        ],
        explanation: 'Comparing place by place, ' + value + ' is the largest.',
      });
    },
  },
  {
    id: 'g4-factors-multiples',
    topic: 'Number sense',
    skill: 'Factors, multiples, primes',
    gen(rng, d) {
      const mode = pick(rng, ['factor', 'multiple', 'prime']);
      if (mode === 'prime') {
        const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
        const composites = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 25, 27];
        const isPrime = rng() < 0.5;
        const n = isPrime ? pick(rng, primes) : pick(rng, composites);
        return mc(rng, {
          prompt: 'Is ' + n + ' prime or composite?',
          answer: isPrime ? 'prime' : 'composite',
          distractors: [isPrime ? 'composite' : 'prime'],
          hints: [
            'A prime number has exactly two factors: 1 and itself.',
            'Try dividing ' + n + ' by 2, 3, 5, and 7.',
            isPrime ? 'Nothing divides ' + n + ' evenly except 1 and ' + n + ', so it is prime.' : n + ' can be divided evenly by more than just 1 and itself, so it is composite.',
          ],
          explanation: n + ' is ' + (isPrime ? 'prime' : 'composite') + '.',
        });
      }
      if (mode === 'multiple') {
        const b = ri(rng, 3, 9);
        const k = ri(rng, 4, [6, 8, 10, 12, 15][d - 1]);
        const ans = b * k;
        return mc(rng, {
          prompt: 'Which of these is a multiple of ' + b + '?',
          answer: ans,
          distractors: [ans + 1, ans - 1, ans + 2].filter((v) => v % b !== 0),
          hints: [
            'A multiple of ' + b + ' is what you land on when you skip count by ' + b + '.',
            'Try dividing each choice by ' + b + ' and see which one comes out even.',
            ans + ' / ' + b + ' = ' + k + ', so ' + ans + ' is a multiple of ' + b + '.',
          ],
          explanation: ans + ' = ' + b + ' x ' + k + '.',
        });
      }
      const n = pick(rng, [12, 18, 20, 24, 30, 36, 40, 48]);
      const factors = [];
      for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i);
      const ans = pick(rng, factors.filter((f) => f > 1 && f < n));
      const nonFactors = [];
      for (let i = 2; i < n && nonFactors.length < 6; i++) if (n % i !== 0) nonFactors.push(i);
      return mc(rng, {
        prompt: 'Which number is a factor of ' + n + '?',
        answer: ans,
        distractors: shuffle(rng, nonFactors).slice(0, 3),
        hints: [
          'A factor divides evenly with no remainder.',
          'Test each choice: does it divide ' + n + ' with nothing left over?',
          n + ' / ' + ans + ' = ' + n / ans + ', so ' + ans + ' is a factor.',
        ],
        explanation: ans + ' x ' + n / ans + ' = ' + n + '.',
      });
    },
  },
  {
    id: 'g4-angles',
    topic: 'Geometry',
    skill: 'Classify and measure angles',
    gen(rng, d) {
      if (rng() < 0.5) {
        const deg = ri(rng, 10, 170);
        const kind = deg < 90 ? 'acute' : deg > 90 ? 'obtuse' : 'right';
        return mc(rng, {
          prompt: 'An angle measures ' + deg + ' degrees. What kind of angle is it?',
          answer: kind,
          distractors: ['acute', 'right', 'obtuse', 'straight'].filter((k) => k !== kind),
          visual: { kind: 'angle', degrees: deg },
          hints: [
            'A right angle is exactly 90 degrees, like the corner of a page.',
            'Less than 90 is acute, more than 90 is obtuse.',
            deg + ' is ' + (deg < 90 ? 'less' : 'more') + ' than 90, so it is ' + kind + '.',
          ],
          explanation: deg + ' degrees is ' + kind + '.',
        });
      }
      const whole = pick(rng, [90, 180]);
      const part = ri(rng, 20, whole - 20);
      return num({
        prompt: 'Two angles together form a ' + (whole === 90 ? 'right angle (90 degrees)' : 'straight line (180 degrees)') +
          '. One angle is ' + part + ' degrees. What is the other angle?',
        answer: whole - part,
        unit: 'degrees',
        visual: { kind: 'angle', degrees: part },
        hints: [
          'The two angles add up to ' + whole + ' degrees.',
          'Subtract the angle you know from ' + whole + '.',
          whole + ' - ' + part + ' = ' + (whole - part) + ' degrees.',
        ],
        explanation: whole + ' - ' + part + ' = ' + (whole - part) + ' degrees.',
      });
    },
  },
  {
    id: 'g4-area-perimeter',
    topic: 'Geometry',
    skill: 'Area and perimeter problems',
    gen(rng, d) {
      const w = ri(rng, 3, [8, 10, 14, 18, 24][d - 1]);
      const h = ri(rng, 3, [8, 10, 14, 18, 24][d - 1]);
      const findSide = rng() < 0.35;
      if (findSide) {
        const area = w * h;
        return num({
          prompt: 'A rectangular platform has an area of ' + area + ' square meters. It is ' + w + ' meters wide. How tall is it?',
          answer: h,
          unit: 'meters',
          hints: [
            'Area = width x height.',
            'To undo multiplication, divide: ' + area + ' / ' + w + '.',
            area + ' / ' + w + ' = ' + h + ' meters.',
          ],
          explanation: w + ' x ' + h + ' = ' + area + ', so the height is ' + h + ' meters.',
        });
      }
      const wantArea = rng() < 0.5;
      return num({
        prompt: 'A repair panel is ' + w + ' m by ' + h + ' m. What is its ' + (wantArea ? 'area' : 'perimeter') + '?',
        answer: wantArea ? w * h : 2 * (w + h),
        unit: wantArea ? 'square meters' : 'meters',
        visual: { kind: 'rect', w, h },
        hints: [
          wantArea ? 'Area covers the inside of the shape.' : 'Perimeter is the fence around the outside.',
          wantArea ? 'Multiply ' + w + ' by ' + h + '.' : 'Add all four sides, or use 2 x (w + h).',
          wantArea ? w + ' x ' + h + ' = ' + w * h + '.' : '2 x (' + w + ' + ' + h + ') = ' + 2 * (w + h) + '.',
        ],
        explanation: wantArea ? 'Area = ' + w * h + ' square meters.' : 'Perimeter = ' + 2 * (w + h) + ' meters.',
      });
    },
  },
  {
    id: 'g4-multi-step-word',
    topic: 'Word problems',
    skill: 'Multi-step word problems',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const crates = ri(rng, 3, [5, 7, 9, 12, 15][d - 1]);
      const perCrate = ri(rng, 6, [10, 12, 15, 20, 25][d - 1]);
      const used = ri(rng, 5, Math.max(6, Math.floor((crates * perCrate) / 2)));
      const ans = crates * perCrate - used;
      return num({
        prompt: name + ' loads ' + crates + ' crates with ' + perCrate + ' bolts in each crate, then uses ' + used + ' bolts on repairs. How many bolts are left?',
        answer: ans,
        hints: [
          'First find the total number of bolts, then take away the ones used.',
          'Step 1: ' + crates + ' x ' + perCrate + ' = ' + crates * perCrate + '.',
          'Step 2: ' + crates * perCrate + ' - ' + used + ' = ' + ans + '.',
        ],
        explanation: crates + ' x ' + perCrate + ' - ' + used + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g4-compare-fractions-decimals',
    topic: 'Decimals',
    skill: 'Relate fractions and decimals',
    gen(rng, d) {
      const pairs = [[1, 2, 0.5], [1, 4, 0.25], [3, 4, 0.75], [1, 10, 0.1], [3, 10, 0.3], [7, 10, 0.7], [1, 5, 0.2], [2, 5, 0.4], [1, 100, 0.01], [25, 100, 0.25]];
      const p = pick(rng, pairs);
      return text({
        prompt: 'Write ' + p[0] + '/' + p[1] + ' as a decimal.',
        answer: String(p[2]),
        accept: [String(p[2]).replace(/^0/, '')],
        placeholder: 'e.g. 0.5',
        visual: { kind: 'fraction-bar', num: p[0], den: p[1] > 20 ? 10 : p[1] },
        hints: [
          'Think of the fraction as a part out of 10 or out of 100.',
          p[1] === 10 || p[1] === 100 ? 'It is already out of ' + p[1] + '.' : 'Rewrite ' + p[0] + '/' + p[1] + ' with a denominator of 10 or 100.',
          p[0] + '/' + p[1] + ' = ' + p[2] + '.',
        ],
        explanation: p[0] + '/' + p[1] + ' = ' + p[2] + '.',
      });
    },
  },
  {
    id: 'g4-symmetry',
    topic: 'Geometry',
    skill: 'Lines of symmetry',
    gen(rng, d) {
      const shapes = [
        { name: 'square', lines: 4 },
        { name: 'rectangle', lines: 2 },
        { name: 'equilateral triangle', lines: 3 },
        { name: 'regular hexagon', lines: 6 },
        { name: 'regular pentagon', lines: 5 },
        { name: 'circle', lines: 'infinite' },
      ];
      const s = pick(rng, shapes.filter((x) => x.lines !== 'infinite'));
      return num({
        prompt: 'How many lines of symmetry does a ' + s.name + ' have?',
        answer: s.lines,
        hints: [
          'A line of symmetry folds the shape so both halves match exactly.',
          'Try folding it side to side, top to bottom, and corner to corner.',
          'A ' + s.name + ' has ' + s.lines + ' lines of symmetry.',
        ],
        explanation: 'A ' + s.name + ' has ' + s.lines + ' lines of symmetry.',
      });
    },
  },
];
