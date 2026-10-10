import { ri, pick, mc, num, text, reduce, round, lcm, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g5-fraction-add-unlike',
    topic: 'Fractions',
    skill: 'Add and subtract fractions with unlike denominators',
    gen(rng, d) {
      const dens = [[2, 3], [3, 4], [2, 5], [4, 6], [3, 8], [5, 10], [6, 8], [4, 10]];
      const [d1, d2] = pick(rng, dens);
      const n1 = ri(rng, 1, d1 - 1);
      const n2 = ri(rng, 1, d2 - 1);
      const L = lcm(d1, d2);
      const a = n1 * (L / d1);
      const b = n2 * (L / d2);
      const isAdd = rng() < 0.6 || a <= b;
      const rawNum = isAdd ? a + b : a - b;
      const [rn, rd] = reduce(rawNum, L);
      return text({
        prompt: 'What is ' + n1 + '/' + d1 + ' ' + (isAdd ? '+' : '-') + ' ' + n2 + '/' + d2 + '? Give your answer in simplest form.',
        answer: rd === 1 ? String(rn) : rn + '/' + rd,
        accept: [rawNum + '/' + L],
        placeholder: 'e.g. 5/6',
        visual: { kind: 'fraction-compare', a: [n1, d1], b: [n2, d2] },
        hints: [
          'The pieces are different sizes, so you need a common denominator first.',
          'The least common denominator of ' + d1 + ' and ' + d2 + ' is ' + L + '.',
          n1 + '/' + d1 + ' = ' + a + '/' + L + ' and ' + n2 + '/' + d2 + ' = ' + b + '/' + L + ', so the answer is ' + rawNum + '/' + L + '.',
        ],
        explanation: a + '/' + L + ' ' + (isAdd ? '+' : '-') + ' ' + b + '/' + L + ' = ' + rawNum + '/' + L +
          (rawNum === rn && L === rd ? '' : ' = ' + (rd === 1 ? rn : rn + '/' + rd)) + '.',
      });
    },
  },
  {
    id: 'g5-fraction-multiply',
    topic: 'Fractions',
    skill: 'Multiply fractions',
    gen(rng, d) {
      const n1 = ri(rng, 1, 5);
      const d1 = ri(rng, n1 + 1, 8);
      if (d <= 2 && rng() < 0.5) {
        const whole = ri(rng, 2, 12);
        const [rn, rd] = reduce(n1 * whole, d1);
        return text({
          prompt: 'What is ' + n1 + '/' + d1 + ' of ' + whole + '? Give your answer in simplest form.',
          answer: rd === 1 ? String(rn) : rn + '/' + rd,
          placeholder: 'e.g. 6 or 3/2',
          hints: [
            'The word "of" means multiply.',
            'Multiply the whole number by the top, then divide by the bottom: (' + whole + ' x ' + n1 + ') / ' + d1 + '.',
            whole * n1 + ' / ' + d1 + ' = ' + (rd === 1 ? rn : rn + '/' + rd) + '.',
          ],
          explanation: n1 + '/' + d1 + ' x ' + whole + ' = ' + (rd === 1 ? rn : rn + '/' + rd) + '.',
        });
      }
      const n2 = ri(rng, 1, 5);
      const d2 = ri(rng, n2 + 1, 8);
      const [rn, rd] = reduce(n1 * n2, d1 * d2);
      return text({
        prompt: 'What is ' + n1 + '/' + d1 + ' x ' + n2 + '/' + d2 + '? Give your answer in simplest form.',
        answer: rd === 1 ? String(rn) : rn + '/' + rd,
        accept: [n1 * n2 + '/' + d1 * d2],
        placeholder: 'e.g. 3/8',
        hints: [
          'To multiply fractions, multiply straight across.',
          'Tops: ' + n1 + ' x ' + n2 + ' = ' + n1 * n2 + '. Bottoms: ' + d1 + ' x ' + d2 + ' = ' + d1 * d2 + '.',
          n1 * n2 + '/' + d1 * d2 + (n1 * n2 === rn ? '' : ' simplifies to ' + rn + '/' + rd) + '.',
        ],
        explanation: n1 + '/' + d1 + ' x ' + n2 + '/' + d2 + ' = ' + n1 * n2 + '/' + d1 * d2 +
          (n1 * n2 === rn && d1 * d2 === rd ? '' : ' = ' + rn + '/' + rd) + '.',
      });
    },
  },
  {
    id: 'g5-decimal-ops',
    topic: 'Decimals',
    skill: 'Add, subtract, and multiply decimals',
    gen(rng, d) {
      const op = pick(rng, d <= 2 ? ['+', '-'] : ['+', '-', 'x']);
      if (op === 'x') {
        const a = round(ri(rng, 11, 99) / 10, 1);
        const b = ri(rng, 2, 9);
        return num({
          prompt: 'What is ' + a + ' x ' + b + '?',
          answer: round(a * b, 2),
          hints: [
            'Ignore the decimal point and multiply the whole numbers first.',
            Math.round(a * 10) + ' x ' + b + ' = ' + Math.round(a * 10) * b + '.',
            'There is 1 decimal place in the question, so put 1 decimal place in the answer: ' + round(a * b, 2) + '.',
          ],
          explanation: a + ' x ' + b + ' = ' + round(a * b, 2) + '.',
        });
      }
      const a = round(ri(rng, 100, [500, 900, 2000, 5000, 9000][d - 1]) / 100, 2);
      const b = round(ri(rng, 50, Math.max(60, Math.floor(a * 100) - 10)) / 100, 2);
      const ans = round(op === '+' ? a + b : a - b, 2);
      return num({
        prompt: 'What is ' + a + ' ' + op + ' ' + b + '?',
        answer: ans,
        hints: [
          'Line the numbers up at the decimal point.',
          'Add a zero as a placeholder if one number has fewer decimal places.',
          a + ' ' + op + ' ' + b + ' = ' + ans + '.',
        ],
        explanation: a + ' ' + op + ' ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g5-volume',
    topic: 'Volume',
    skill: 'Volume of rectangular prisms',
    gen(rng, d) {
      const l = ri(rng, 2, [5, 7, 9, 12, 15][d - 1]);
      const w = ri(rng, 2, [5, 7, 9, 12, 15][d - 1]);
      const h = ri(rng, 2, [5, 7, 9, 12, 15][d - 1]);
      if (d >= 4 && rng() < 0.35) {
        const vol = l * w * h;
        return num({
          prompt: 'A storage pod has a volume of ' + vol + ' cubic meters. Its base is ' + l + ' m by ' + w + ' m. How tall is it?',
          answer: h,
          unit: 'meters',
          visual: { kind: 'prism', l, w, h },
          hints: [
            'Volume = length x width x height.',
            'The base area is ' + l + ' x ' + w + ' = ' + l * w + ' square meters.',
            vol + ' / ' + l * w + ' = ' + h + ' meters.',
          ],
          explanation: l + ' x ' + w + ' x ' + h + ' = ' + vol + ', so the height is ' + h + ' m.',
        });
      }
      return num({
        prompt: 'A rectangular crate is ' + l + ' m long, ' + w + ' m wide, and ' + h + ' m tall. What is its volume?',
        answer: l * w * h,
        unit: 'cubic meters',
        visual: { kind: 'prism', l, w, h },
        hints: [
          'Volume counts how many unit cubes fill the solid.',
          'Volume = length x width x height.',
          l + ' x ' + w + ' x ' + h + ' = ' + l * w * h + ' cubic meters.',
        ],
        explanation: 'Volume = ' + l + ' x ' + w + ' x ' + h + ' = ' + l * w * h + ' cubic meters.',
      });
    },
  },
  {
    id: 'g5-order-of-operations',
    topic: 'Expressions',
    skill: 'Order of operations',
    gen(rng, d) {
      const a = ri(rng, 2, 9);
      const b = ri(rng, 2, 9);
      const c = ri(rng, 2, 9);
      const form = d <= 2 ? pick(rng, [0, 1]) : pick(rng, [0, 1, 2]);
      if (form === 0) {
        const ans = a + b * c;
        return num({
          prompt: 'What is ' + a + ' + ' + b + ' x ' + c + '?',
          answer: ans,
          hints: [
            'Multiplication and division happen before addition and subtraction.',
            'Do ' + b + ' x ' + c + ' first.',
            b + ' x ' + c + ' = ' + b * c + ', then ' + a + ' + ' + b * c + ' = ' + ans + '.',
          ],
          explanation: 'Multiply first: ' + b + ' x ' + c + ' = ' + b * c + ', then add ' + a + ' to get ' + ans + '.',
        });
      }
      if (form === 1) {
        const ans = (a + b) * c;
        return num({
          prompt: 'What is (' + a + ' + ' + b + ') x ' + c + '?',
          answer: ans,
          hints: [
            'Parentheses always go first.',
            a + ' + ' + b + ' = ' + (a + b) + '.',
            (a + b) + ' x ' + c + ' = ' + ans + '.',
          ],
          explanation: '(' + a + ' + ' + b + ') x ' + c + ' = ' + (a + b) + ' x ' + c + ' = ' + ans + '.',
        });
      }
      const sq = ri(rng, 2, 6);
      const ans = sq * sq + a * b;
      return num({
        prompt: 'What is ' + sq + '^2 + ' + a + ' x ' + b + '?',
        answer: ans,
        hints: [
          'Exponents come before multiplication, which comes before addition.',
          sq + '^2 = ' + sq * sq + ' and ' + a + ' x ' + b + ' = ' + a * b + '.',
          sq * sq + ' + ' + a * b + ' = ' + ans + '.',
        ],
        explanation: sq + '^2 + ' + a + ' x ' + b + ' = ' + sq * sq + ' + ' + a * b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g5-coordinate-plane',
    topic: 'Geometry',
    skill: 'Plot and read coordinates',
    gen(rng, d) {
      const x = ri(rng, 0, [6, 8, 10, 10, 10][d - 1]);
      const y = ri(rng, 0, [6, 8, 10, 10, 10][d - 1]);
      if (rng() < 0.5) {
        return text({
          prompt: 'What are the coordinates of the marked point? Write them as (x, y).',
          answer: '(' + x + ',' + y + ')',
          accept: [x + ',' + y, '(' + x + ', ' + y + ')'],
          placeholder: 'e.g. (3, 5)',
          visual: { kind: 'grid-point', x, y, max: 10 },
          hints: [
            'The first number is how far right, the second is how far up.',
            'Start at the origin (0, 0) and count across first.',
            'The point is ' + x + ' right and ' + y + ' up, so it is (' + x + ', ' + y + ').',
          ],
          explanation: 'Move ' + x + ' along the x-axis and ' + y + ' up the y-axis: (' + x + ', ' + y + ').',
        });
      }
      return mc(rng, {
        prompt: 'Starting at (' + x + ', ' + y + '), you move 3 units right and 2 units up. Where do you land?',
        answer: '(' + (x + 3) + ', ' + (y + 2) + ')',
        distractors: ['(' + (x + 2) + ', ' + (y + 3) + ')', '(' + (x - 3) + ', ' + (y + 2) + ')', '(' + (x + 3) + ', ' + (y - 2) + ')'],
        visual: { kind: 'grid-point', x, y, max: 14 },
        hints: [
          'Moving right changes the x-coordinate. Moving up changes the y-coordinate.',
          'Right 3 means ' + x + ' + 3 = ' + (x + 3) + '.',
          'Up 2 means ' + y + ' + 2 = ' + (y + 2) + ', so you land at (' + (x + 3) + ', ' + (y + 2) + ').',
        ],
        explanation: '(' + x + ', ' + y + ') moves to (' + (x + 3) + ', ' + (y + 2) + ').',
      });
    },
  },
  {
    id: 'g5-powers-of-ten',
    topic: 'Place value',
    skill: 'Multiply and divide by powers of 10',
    gen(rng, d) {
      const base = round(ri(rng, 15, 985) / 10, 1);
      const power = ri(rng, 1, [1, 2, 2, 3, 3][d - 1]);
      const mult = rng() < 0.5;
      const factor = Math.pow(10, power);
      const ans = round(mult ? base * factor : base / factor, 4);
      return num({
        prompt: 'What is ' + base + ' ' + (mult ? 'x' : '/') + ' ' + factor + '?',
        answer: ans,
        hints: [
          'Multiplying by 10 shifts every digit one place to the left. Dividing shifts it right.',
          factor + ' = 10^' + power + ', so the digits shift ' + power + ' place' + (power === 1 ? '' : 's') + ' to the ' + (mult ? 'left' : 'right') + '.',
          base + ' ' + (mult ? 'x' : '/') + ' ' + factor + ' = ' + ans + '.',
        ],
        explanation: 'Shifting ' + power + ' place' + (power === 1 ? '' : 's') + ' gives ' + ans + '.',
      });
    },
  },
  {
    id: 'g5-rate-word',
    topic: 'Word problems',
    skill: 'Multi-step rate problems',
    gen(rng, d, ctx) {
      const rate = ri(rng, 6, [12, 15, 20, 30, 45][d - 1]);
      const time = ri(rng, 3, [8, 10, 12, 15, 20][d - 1]);
      const vehicle = (ctx && ctx.puzzle && ctx.puzzle.label) || 'robot';
      return num({
        prompt: 'A ' + vehicle + ' travels ' + rate + ' meters every minute. How far will it travel in ' + time + ' minutes?',
        answer: rate * time,
        unit: 'meters',
        hints: [
          'The same distance is covered each minute, so this is equal groups.',
          'Multiply the distance per minute by the number of minutes.',
          rate + ' x ' + time + ' = ' + rate * time + ' meters.',
        ],
        explanation: rate + ' m/min x ' + time + ' min = ' + rate * time + ' meters.',
      });
    },
  },
  {
    id: 'g5-fraction-divide',
    topic: 'Fractions',
    skill: 'Divide unit fractions and whole numbers',
    gen(rng, d) {
      const whole = ri(rng, 2, 9);
      const den = ri(rng, 2, 8);
      if (rng() < 0.5) {
        return num({
          prompt: 'What is ' + whole + ' / (1/' + den + ')?',
          answer: whole * den,
          hints: [
            'Ask how many pieces of size 1/' + den + ' fit inside ' + whole + ' wholes.',
            'Each whole contains ' + den + ' pieces of size 1/' + den + '.',
            whole + ' wholes x ' + den + ' pieces = ' + whole * den + '.',
          ],
          explanation: whole + ' / (1/' + den + ') = ' + whole + ' x ' + den + ' = ' + whole * den + '.',
        });
      }
      const [rn, rd] = reduce(1, den * whole);
      return text({
        prompt: 'What is (1/' + den + ') / ' + whole + '? Give your answer in simplest form.',
        answer: rn + '/' + rd,
        placeholder: 'e.g. 1/12',
        hints: [
          'You are splitting one small piece into ' + whole + ' equal parts.',
          'Each part gets smaller, so the denominator grows.',
          '1/' + den + ' split ' + whole + ' ways is 1/' + den * whole + '.',
        ],
        explanation: '(1/' + den + ') / ' + whole + ' = 1/' + den * whole + '.',
      });
    },
  },
  {
    id: 'g5-line-plot',
    topic: 'Statistics',
    skill: 'Read data and find totals',
    gen(rng, d) {
      const counts = Array.from({ length: 4 }, () => ri(rng, 1, [4, 5, 6, 8, 9][d - 1]));
      const labels = ['1/4', '1/2', '3/4', '1'];
      const values = [0.25, 0.5, 0.75, 1];
      const total = round(counts.reduce((s, c, i) => s + c * values[i], 0), 2);
      const mode = pick(rng, ['total', 'most']);
      if (mode === 'most') {
        const maxIdx = counts.indexOf(Math.max(...counts));
        return mc(rng, {
          prompt: 'The line plot shows crystal lengths in meters. Which length appears most often?',
          answer: labels[maxIdx],
          distractors: labels.filter((_, i) => i !== maxIdx),
          visual: { kind: 'line-plot', labels, counts },
          hints: [
            'Look for the tallest stack of dots.',
            'Count the dots above each label.',
            labels[maxIdx] + ' has ' + counts[maxIdx] + ' dots, the most of any length.',
          ],
          explanation: labels[maxIdx] + ' appears ' + counts[maxIdx] + ' times.',
        });
      }
      return num({
        prompt: 'The line plot shows crystal lengths in meters. What is the total length of all the crystals?',
        answer: total,
        unit: 'meters',
        visual: { kind: 'line-plot', labels, counts },
        hints: [
          'Multiply each length by how many crystals have that length.',
          counts.map((c, i) => c + ' x ' + labels[i]).join(' , '),
          'Adding every group gives ' + total + ' meters.',
        ],
        explanation: counts.map((c, i) => c + ' x ' + labels[i]).join(' + ') + ' = ' + total + ' meters.',
      });
    },
  },
];
