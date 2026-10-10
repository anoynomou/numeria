import { ri, pick, mc, num, text, reduce, round, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g8-linear-equations',
    topic: 'Linear equations',
    skill: 'Solve multi-step linear equations',
    gen(rng, d) {
      const x = ri(rng, 2, [8, 10, 12, 15, 20][d - 1]) * (d >= 4 && rng() < 0.3 ? -1 : 1);
      const a = ri(rng, 2, 9);
      const b = ri(rng, 1, 15);
      const c = ri(rng, 1, 8);
      // a*x + b = c*x + (a*x + b - c*x)
      const rhsConst = a * x + b - c * x;
      const eq = a + 'x + ' + b + ' = ' + c + 'x ' + (rhsConst < 0 ? '- ' + Math.abs(rhsConst) : '+ ' + rhsConst);
      return num({
        prompt: 'Solve for x:\n\n' + eq,
        answer: x,
        hints: [
          'Get all the x terms on one side and all the numbers on the other.',
          'Subtract ' + c + 'x from both sides: ' + (a - c) + 'x + ' + b + ' = ' + rhsConst + '.',
          'Then ' + (a - c) + 'x = ' + (rhsConst - b) + ', so x = ' + x + '.',
        ],
        explanation: eq + ' solves to x = ' + x + '.',
      });
    },
  },
  {
    id: 'g8-slope',
    topic: 'Slope',
    skill: 'Find slope from two points',
    gen(rng, d) {
      const x1 = ri(rng, -8, 8);
      let x2 = ri(rng, -8, 8);
      while (x2 === x1) x2 = ri(rng, -8, 8);
      const y1 = ri(rng, -8, 8);
      const y2 = ri(rng, -8, 8);
      const dy = y2 - y1;
      const dx = x2 - x1;
      const [rn, rd] = reduce(dy, dx);
      const ansStr = rd === 1 ? String(rn) : rn + '/' + rd;
      return text({
        prompt: 'What is the slope of the line through (' + x1 + ', ' + y1 + ') and (' + x2 + ', ' + y2 + ')? Give your answer in simplest form.',
        answer: ansStr,
        accept: [dy + '/' + dx, String(round(dy / dx, 4))],
        placeholder: 'e.g. 2 or -3/4',
        visual: { kind: 'line-two-points', x1, y1, x2, y2 },
        hints: [
          'Slope = rise / run = change in y over change in x.',
          'Rise = ' + y2 + ' - (' + y1 + ') = ' + dy + '. Run = ' + x2 + ' - (' + x1 + ') = ' + dx + '.',
          dy + '/' + dx + (dy === rn && dx === rd ? '' : ' simplifies to ' + ansStr) + '.',
        ],
        explanation: 'Slope = (' + y2 + ' - ' + y1 + ') / (' + x2 + ' - ' + x1 + ') = ' + ansStr + '.',
      });
    },
  },
  {
    id: 'g8-functions',
    topic: 'Functions',
    skill: 'Evaluate and interpret functions',
    gen(rng, d) {
      const m = ri(rng, 2, 9) * (rng() < 0.3 ? -1 : 1);
      const b = ri(rng, -10, 15);
      const x = ri(rng, -5, 10);
      const ans = m * x + b;
      if (rng() < 0.5) {
        return num({
          prompt: 'For the function f(x) = ' + m + 'x ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ', what is f(' + x + ')?',
          answer: ans,
          hints: [
            'f(' + x + ') means substitute ' + x + ' everywhere you see x.',
            m + ' x (' + x + ') = ' + m * x + '.',
            m * x + ' ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ' = ' + ans + '.',
          ],
          explanation: 'f(' + x + ') = ' + ans + '.',
        });
      }
      return mc(rng, {
        prompt: 'In the function f(x) = ' + m + 'x ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ', what does ' + b + ' represent?',
        answer: 'the y-intercept',
        distractors: ['the slope', 'the x-intercept', 'the rate of change'],
        hints: [
          'The form y = mx + b has two named parts.',
          'The number multiplied by x is the slope. The number added on its own is the starting value.',
          b + ' is the value of f(x) when x = 0, which is the y-intercept.',
        ],
        explanation: 'In y = mx + b, b is the y-intercept, the value when x = 0.',
      });
    },
  },
  {
    id: 'g8-exponents',
    topic: 'Exponents',
    skill: 'Exponent rules',
    gen(rng, d) {
      const base = ri(rng, 2, 6);
      const e1 = ri(rng, 2, 6);
      const e2 = ri(rng, 1, Math.min(e1 - 1, 5)) || 1;
      const mode = pick(rng, d <= 2 ? ['mult'] : ['mult', 'div', 'power', 'negative']);
      if (mode === 'mult') {
        return text({
          prompt: 'Simplify and write as a single power: ' + base + '^' + e1 + ' x ' + base + '^' + e2,
          answer: base + '^' + (e1 + e2),
          accept: [String(Math.pow(base, e1 + e2))],
          placeholder: 'e.g. 2^7',
          hints: ['Same base, so think about what multiplying repeated factors does.', 'When multiplying powers with the same base, add the exponents.', base + '^' + e1 + ' x ' + base + '^' + e2 + ' = ' + base + '^' + (e1 + e2) + '.'],
          explanation: 'Add exponents: ' + base + '^(' + e1 + ' + ' + e2 + ') = ' + base + '^' + (e1 + e2) + '.',
        });
      }
      if (mode === 'div') {
        return text({
          prompt: 'Simplify and write as a single power: ' + base + '^' + e1 + ' / ' + base + '^' + e2,
          answer: base + '^' + (e1 - e2),
          accept: [String(Math.pow(base, e1 - e2))],
          placeholder: 'e.g. 2^3',
          hints: ['Same base again.', 'When dividing powers with the same base, subtract the exponents.', base + '^' + e1 + ' / ' + base + '^' + e2 + ' = ' + base + '^' + (e1 - e2) + '.'],
          explanation: 'Subtract exponents: ' + base + '^(' + e1 + ' - ' + e2 + ') = ' + base + '^' + (e1 - e2) + '.',
        });
      }
      if (mode === 'power') {
        const small = ri(rng, 2, 4);
        return text({
          prompt: 'Simplify and write as a single power: (' + base + '^' + small + ')^' + e2,
          answer: base + '^' + small * e2,
          accept: [String(Math.pow(base, small * e2))],
          placeholder: 'e.g. 3^6',
          hints: ['A power raised to a power repeats the multiplication.', 'Multiply the exponents.', small + ' x ' + e2 + ' = ' + small * e2 + ', so the answer is ' + base + '^' + small * e2 + '.'],
          explanation: 'Multiply exponents: ' + base + '^(' + small + ' x ' + e2 + ') = ' + base + '^' + small * e2 + '.',
        });
      }
      const n = ri(rng, 2, 4);
      const val = Math.pow(base, n);
      return text({
        prompt: 'Write ' + base + '^-' + n + ' as a fraction.',
        answer: '1/' + val,
        placeholder: 'e.g. 1/8',
        hints: ['A negative exponent means take the reciprocal.', base + '^-' + n + ' = 1 / ' + base + '^' + n + '.', base + '^' + n + ' = ' + val + ', so the answer is 1/' + val + '.'],
        explanation: base + '^-' + n + ' = 1/' + base + '^' + n + ' = 1/' + val + '.',
      });
    },
  },
  {
    id: 'g8-scientific-notation',
    topic: 'Exponents',
    skill: 'Scientific notation',
    gen(rng, d) {
      const mantissa = round(ri(rng, 10, 99) / 10, 1);
      const exp = ri(rng, 2, [4, 5, 6, 7, 8][d - 1]);
      const value = mantissa * Math.pow(10, exp);
      if (rng() < 0.5) {
        return text({
          prompt: 'Write ' + value.toLocaleString('en-US') + ' in scientific notation. Use the form 3.2x10^5.',
          answer: mantissa + 'x10^' + exp,
          accept: [mantissa + ' x 10^' + exp, mantissa + 'e' + exp, mantissa + 'E' + exp],
          placeholder: 'e.g. 3.2x10^5',
          hints: [
            'Scientific notation is a number from 1 up to 10, times a power of 10.',
            'Move the decimal point until only one digit is in front of it. That gives ' + mantissa + '.',
            'You moved it ' + exp + ' places, so the answer is ' + mantissa + 'x10^' + exp + '.',
          ],
          explanation: value.toLocaleString('en-US') + ' = ' + mantissa + ' x 10^' + exp + '.',
        });
      }
      return num({
        prompt: 'Write ' + mantissa + ' x 10^' + exp + ' as a standard number.',
        answer: value,
        hints: [
          'A positive exponent makes the number bigger.',
          'Move the decimal point ' + exp + ' places to the right.',
          'That gives ' + value + '.',
        ],
        explanation: mantissa + ' x 10^' + exp + ' = ' + value + '.',
      });
    },
  },
  {
    id: 'g8-pythagorean',
    topic: 'Geometry',
    skill: 'Pythagorean theorem',
    gen(rng, d) {
      const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [7, 24, 25], [12, 16, 20], [10, 24, 26]];
      const t = pick(rng, triples.slice(0, [3, 4, 6, 8, 8][d - 1]));
      const findHyp = rng() < 0.6;
      return num({
        prompt: findHyp
          ? 'A right triangle has legs of ' + t[0] + ' and ' + t[1] + '. How long is the hypotenuse?'
          : 'A right triangle has a hypotenuse of ' + t[2] + ' and one leg of ' + t[0] + '. How long is the other leg?',
        answer: findHyp ? t[2] : t[1],
        visual: { kind: 'right-triangle', a: t[0], b: t[1], c: t[2], unknown: findHyp ? 'c' : 'b' },
        hints: [
          'The Pythagorean theorem says a^2 + b^2 = c^2, where c is the hypotenuse.',
          findHyp
            ? t[0] + '^2 + ' + t[1] + '^2 = ' + t[0] * t[0] + ' + ' + t[1] * t[1] + ' = ' + t[2] * t[2] + '.'
            : t[2] + '^2 - ' + t[0] + '^2 = ' + t[2] * t[2] + ' - ' + t[0] * t[0] + ' = ' + t[1] * t[1] + '.',
          'The square root of ' + (findHyp ? t[2] * t[2] : t[1] * t[1]) + ' is ' + (findHyp ? t[2] : t[1]) + '.',
        ],
        explanation: t[0] + '^2 + ' + t[1] + '^2 = ' + t[2] + '^2, so the missing side is ' + (findHyp ? t[2] : t[1]) + '.',
      });
    },
  },
  {
    id: 'g8-volume-curved',
    topic: 'Geometry',
    skill: 'Volume of cylinders, cones, and spheres',
    gen(rng, d) {
      const r = ri(rng, 2, [5, 6, 8, 10, 12][d - 1]);
      const h = ri(rng, 3, [8, 10, 12, 15, 20][d - 1]);
      const shape = pick(rng, d <= 2 ? ['cylinder'] : ['cylinder', 'cone', 'sphere']);
      let ans, formula, work;
      if (shape === 'cylinder') {
        ans = round(3.14 * r * r * h, 2);
        formula = 'V = pi x r^2 x h';
        work = '3.14 x ' + r * r + ' x ' + h + ' = ' + ans;
      } else if (shape === 'cone') {
        ans = round((1 / 3) * 3.14 * r * r * h, 2);
        formula = 'V = (1/3) x pi x r^2 x h';
        work = '(1/3) x 3.14 x ' + r * r + ' x ' + h + ' = ' + ans;
      } else {
        ans = round((4 / 3) * 3.14 * r * r * r, 2);
        formula = 'V = (4/3) x pi x r^3';
        work = '(4/3) x 3.14 x ' + r * r * r + ' = ' + ans;
      }
      return num({
        prompt: 'A ' + shape + ' has a radius of ' + r + ' cm' + (shape === 'sphere' ? '' : ' and a height of ' + h + ' cm') +
          '. What is its volume? Use 3.14 for pi and round to 2 decimal places.',
        answer: ans,
        unit: 'cubic cm',
        visual: { kind: shape, r, h },
        hints: [
          'The formula is ' + formula + '.',
          shape === 'sphere' ? 'r^3 = ' + r * r * r + '.' : 'r^2 = ' + r * r + '.',
          work + '.',
        ],
        explanation: formula + ' gives ' + ans + ' cubic cm.',
      });
    },
  },
  {
    id: 'g8-transformations',
    topic: 'Geometry',
    skill: 'Transformations on the coordinate plane',
    gen(rng, d) {
      const x = ri(rng, -6, 6);
      const y = ri(rng, -6, 6);
      const kind = pick(rng, d <= 2 ? ['translate', 'reflect-x'] : ['translate', 'reflect-x', 'reflect-y', 'rotate180']);
      let ans, desc, why;
      if (kind === 'translate') {
        const dx = ri(rng, -5, 5);
        const dy = ri(rng, -5, 5);
        ans = '(' + (x + dx) + ', ' + (y + dy) + ')';
        desc = 'translated ' + Math.abs(dx) + ' units ' + (dx >= 0 ? 'right' : 'left') + ' and ' + Math.abs(dy) + ' units ' + (dy >= 0 ? 'up' : 'down');
        why = 'Add the shift to each coordinate: (' + x + ' + ' + dx + ', ' + y + ' + ' + dy + ').';
      } else if (kind === 'reflect-x') {
        ans = '(' + x + ', ' + -y + ')';
        desc = 'reflected across the x-axis';
        why = 'Reflecting across the x-axis flips the sign of y.';
      } else if (kind === 'reflect-y') {
        ans = '(' + -x + ', ' + y + ')';
        desc = 'reflected across the y-axis';
        why = 'Reflecting across the y-axis flips the sign of x.';
      } else {
        ans = '(' + -x + ', ' + -y + ')';
        desc = 'rotated 180 degrees about the origin';
        why = 'A 180 degree rotation flips the sign of both coordinates.';
      }
      return text({
        prompt: 'The point (' + x + ', ' + y + ') is ' + desc + '. What are the new coordinates? Write them as (x, y).',
        answer: ans.replace(/\s/g, ''),
        accept: [ans],
        placeholder: 'e.g. (3, -5)',
        visual: { kind: 'grid-point', x, y, max: 12, signed: true },
        hints: ['Think about what this transformation does to each coordinate.', why, 'The image is ' + ans + '.'],
        explanation: why + ' The image is ' + ans + '.',
      });
    },
  },
  {
    id: 'g8-systems',
    topic: 'Linear equations',
    skill: 'Solve systems of equations',
    gen(rng, d) {
      const x = ri(rng, 1, 8);
      const y = ri(rng, 1, 8);
      const a1 = ri(rng, 1, 4);
      const b1 = ri(rng, 1, 4);
      const a2 = ri(rng, 1, 4);
      let b2 = ri(rng, 1, 4);
      while (a1 * b2 - a2 * b1 === 0) b2 = ri(rng, 1, 5);
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      return text({
        prompt: 'Solve the system. Write your answer as (x, y).\n\n' +
          a1 + 'x + ' + b1 + 'y = ' + c1 + '\n' + a2 + 'x + ' + b2 + 'y = ' + c2,
        answer: '(' + x + ',' + y + ')',
        accept: [x + ',' + y, '(' + x + ', ' + y + ')'],
        placeholder: 'e.g. (2, 3)',
        hints: [
          'You can use substitution or elimination.',
          'Try multiplying one equation so that the x terms or y terms cancel when you add or subtract.',
          'The solution is x = ' + x + ' and y = ' + y + '.',
        ],
        explanation: 'Both equations are true when x = ' + x + ' and y = ' + y + '.',
      });
    },
  },
  {
    id: 'g8-statistics',
    topic: 'Statistics',
    skill: 'Scatter plots and two-way tables',
    gen(rng, d) {
      const mode = pick(rng, d <= 2 ? ['association', 'mean'] : ['association', 'mean', 'two-way', 'outlier']);
      if (mode === 'association') {
        const positive = rng() < 0.5;
        const pts = [];
        for (let i = 1; i <= 8; i++) {
          const x = i * 2;
          const base = positive ? x * 1.5 + 3 : 24 - x * 1.2;
          pts.push([x, round(base + ri(rng, -2, 2), 1)]);
        }
        return mc(rng, {
          prompt: 'The scatter plot shows study minutes against quiz score. What kind of association does it show?',
          answer: positive ? 'positive association' : 'negative association',
          distractors: ['no association', positive ? 'negative association' : 'positive association', 'nonlinear association'],
          visual: { kind: 'scatter', points: pts },
          hints: [
            'Look at the overall direction of the cloud of points.',
            positive ? 'As x gets bigger, y also tends to get bigger.' : 'As x gets bigger, y tends to get smaller.',
            'Points trending ' + (positive ? 'upward' : 'downward') + ' from left to right show a ' + (positive ? 'positive' : 'negative') + ' association.',
          ],
          explanation: 'The points trend ' + (positive ? 'up' : 'down') + ' to the right, which is a ' + (positive ? 'positive' : 'negative') + ' association.',
        });
      }
      if (mode === 'two-way') {
        const a = ri(rng, 8, 30), b = ri(rng, 8, 30), c = ri(rng, 8, 30), e = ri(rng, 8, 30);
        const total = a + b + c + e;
        return num({
          prompt: 'A two-way table records students by club and grade:\n\n' +
            '                Robotics   Art\n' +
            'Grade 7 :        ' + a + '         ' + b + '\n' +
            'Grade 8 :        ' + c + '         ' + e + '\n\n' +
            'How many students are in Robotics altogether?',
          answer: a + c,
          hints: [
            'A two-way table splits the same students two different ways.',
            'Add down the Robotics column.',
            a + ' + ' + c + ' = ' + (a + c) + ' students (out of ' + total + ' total).',
          ],
          explanation: a + ' + ' + c + ' = ' + (a + c) + ' students are in Robotics.',
        });
      }
      if (mode === 'outlier') {
        const core = Array.from({ length: 5 }, () => ri(rng, 20, 35));
        const outlier = ri(rng, 90, 130);
        const data = shuffle(rng, [...core, outlier]);
        return num({
          prompt: 'Which value in this data set is the outlier?\n\n' + data.join(',  '),
          answer: outlier,
          visual: { kind: 'bar-data', values: data },
          hints: [
            'An outlier sits far away from the rest of the data.',
            'Most values here are clustered fairly close together.',
            outlier + ' is far above every other value, so it is the outlier.',
          ],
          explanation: outlier + ' is the outlier because it lies far outside the cluster of the other values.',
        });
      }
      const size = ri(rng, 5, 7);
      const target = ri(rng, 10, 40);
      const data = Array.from({ length: size - 1 }, () => ri(rng, 5, 60));
      const sum = data.reduce((s, v) => s + v, 0);
      let last = target * size - sum;
      if (last < 1) last = ri(rng, 1, 30);
      data.push(last);
      const mean = round(data.reduce((s, v) => s + v, 0) / data.length, 2);
      return num({
        prompt: 'Find the mean of this data set. Round to 2 decimal places if needed.\n\n' + data.join(',  '),
        answer: mean,
        visual: { kind: 'bar-data', values: data },
        hints: [
          'The mean is the average value.',
          'Add all ' + data.length + ' values: the sum is ' + data.reduce((s, v) => s + v, 0) + '.',
          data.reduce((s, v) => s + v, 0) + ' / ' + data.length + ' = ' + mean + '.',
        ],
        explanation: 'The mean is ' + mean + '.',
      });
    },
  },
  {
    id: 'g8-irrational',
    topic: 'Number sense',
    skill: 'Rational and irrational numbers',
    gen(rng, d) {
      const perfect = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
      if (rng() < 0.5) {
        const p = pick(rng, perfect);
        return num({
          prompt: 'What is the square root of ' + p + '?',
          answer: Math.sqrt(p),
          hints: [
            'Ask what number times itself gives ' + p + '.',
            'Try squaring whole numbers until you reach ' + p + '.',
            Math.sqrt(p) + ' x ' + Math.sqrt(p) + ' = ' + p + '.',
          ],
          explanation: 'The square root of ' + p + ' is ' + Math.sqrt(p) + '.',
        });
      }
      const irrational = ['the square root of 2', 'the square root of 7', 'pi', 'the square root of 15'];
      const rational = ['0.25', '3/4', 'the square root of 49', '-8', '0.333... (repeating)'];
      const askIrrational = rng() < 0.5;
      const ans = askIrrational ? pick(rng, irrational) : pick(rng, rational);
      const others = askIrrational ? shuffle(rng, rational).slice(0, 3) : shuffle(rng, irrational).slice(0, 3);
      return mc(rng, {
        prompt: 'Which of these is ' + (askIrrational ? 'irrational' : 'rational') + '?',
        answer: ans,
        distractors: others,
        hints: [
          'A rational number can be written as a fraction of two integers.',
          'Decimals that end or repeat are rational. Decimals that go forever without repeating are irrational.',
          ans + ' is ' + (askIrrational ? 'irrational' : 'rational') + '.',
        ],
        explanation: ans + ' is ' + (askIrrational ? 'irrational because its decimal never ends or repeats' : 'rational because it can be written as a fraction of integers') + '.',
      });
    },
  },
];
