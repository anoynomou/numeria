import { ri, pick, mc, num, text, reduce, round, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g6-ratios',
    topic: 'Ratios',
    skill: 'Write and simplify ratios',
    gen(rng, d) {
      const k = ri(rng, 2, [3, 4, 5, 6, 8][d - 1]);
      const a = ri(rng, 1, 6);
      const b = ri(rng, 1, 6);
      const [ra, rb] = reduce(a * k, b * k);
      return text({
        prompt: 'A crew has ' + a * k + ' engineers and ' + b * k + ' pilots. Write the ratio of engineers to pilots in simplest form, like 3:4.',
        answer: ra + ':' + rb,
        accept: [ra + '/' + rb, ra + ' to ' + rb],
        placeholder: 'e.g. 3:4',
        hints: [
          'A ratio compares two amounts in order.',
          'Both numbers share a common factor. Divide each by their greatest common factor.',
          a * k + ' and ' + b * k + ' both divide by ' + (a * k) / ra + ', giving ' + ra + ':' + rb + '.',
        ],
        explanation: a * k + ':' + b * k + ' simplifies to ' + ra + ':' + rb + '.',
      });
    },
  },
  {
    id: 'g6-unit-rate',
    topic: 'Ratios',
    skill: 'Unit rates',
    gen(rng, d) {
      const rate = ri(rng, 3, [8, 12, 15, 20, 30][d - 1]);
      const units = ri(rng, 2, [6, 8, 10, 12, 15][d - 1]);
      const total = rate * units;
      const thing = pick(rng, ['credits', 'liters of fuel', 'kilometers', 'energy cells']);
      return num({
        prompt: total + ' ' + thing + ' are used over ' + units + ' hours at a steady rate. How many ' + thing + ' per hour?',
        answer: rate,
        hints: [
          'A unit rate tells you the amount for exactly 1 hour.',
          'Divide the total by the number of hours.',
          total + ' / ' + units + ' = ' + rate + ' per hour.',
        ],
        explanation: total + ' / ' + units + ' = ' + rate + ' ' + thing + ' per hour.',
      });
    },
  },
  {
    id: 'g6-percent',
    topic: 'Percentages',
    skill: 'Find a percent of a number',
    gen(rng, d) {
      const pct = pick(rng, d <= 2 ? [10, 25, 50, 20] : [5, 10, 15, 20, 25, 30, 40, 60, 75, 80]);
      const base = 4 * ri(rng, 5, [15, 25, 40, 60, 90][d - 1]);
      const ans = round((pct / 100) * base, 2);
      return num({
        prompt: 'What is ' + pct + '% of ' + base + '?',
        answer: ans,
        hints: [
          'Percent means "out of 100".',
          pct + '% = ' + pct + '/100 = ' + round(pct / 100, 4) + '.',
          round(pct / 100, 4) + ' x ' + base + ' = ' + ans + '.',
        ],
        explanation: pct + '% of ' + base + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g6-integers',
    topic: 'Integers',
    skill: 'Add and subtract integers',
    gen(rng, d) {
      const a = ri(rng, -[10, 15, 20, 30, 50][d - 1], [10, 15, 20, 30, 50][d - 1]);
      const b = ri(rng, -[10, 15, 20, 30, 50][d - 1], [10, 15, 20, 30, 50][d - 1]);
      const isAdd = rng() < 0.5;
      const ans = isAdd ? a + b : a - b;
      const expr = a + ' ' + (isAdd ? '+' : '-') + ' (' + b + ')';
      return num({
        prompt: 'What is ' + expr + '?',
        answer: ans,
        visual: { kind: 'integer-line', a, b, result: ans },
        hints: [
          'Picture a number line. Positive moves right, negative moves left.',
          isAdd
            ? 'Start at ' + a + ' and move ' + Math.abs(b) + ' to the ' + (b >= 0 ? 'right' : 'left') + '.'
            : 'Subtracting ' + b + ' is the same as adding ' + -b + '.',
          expr + ' = ' + ans + '.',
        ],
        explanation: expr + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g6-expressions',
    topic: 'Expressions',
    skill: 'Evaluate algebraic expressions',
    gen(rng, d) {
      const x = ri(rng, 2, [6, 8, 10, 12, 15][d - 1]);
      const a = ri(rng, 2, 9);
      const b = ri(rng, 1, 15);
      const form = d <= 2 ? 0 : pick(rng, [0, 1, 2]);
      let expr, ans;
      if (form === 0) { expr = a + 'x + ' + b; ans = a * x + b; }
      else if (form === 1) { expr = a + '(x + ' + b + ')'; ans = a * (x + b); }
      else { expr = a + 'x - ' + b; ans = a * x - b; }
      return num({
        prompt: 'Evaluate ' + expr + ' when x = ' + x + '.',
        answer: ans,
        hints: [
          'Replace every x with ' + x + '.',
          form === 1 ? 'Work inside the parentheses first: ' + x + ' + ' + b + ' = ' + (x + b) + '.' : a + 'x means ' + a + ' x ' + x + ' = ' + a * x + '.',
          expr.replace(/x/g, '(' + x + ')') + ' = ' + ans + '.',
        ],
        explanation: 'Substituting x = ' + x + ' gives ' + ans + '.',
      });
    },
  },
  {
    id: 'g6-one-step-equations',
    topic: 'Equations',
    skill: 'Solve one-step equations',
    gen(rng, d) {
      const x = ri(rng, 2, [9, 12, 15, 20, 30][d - 1]);
      const a = ri(rng, 2, 12);
      const op = pick(rng, ['+', '-', 'x', '/']);
      let eq, inverse;
      if (op === '+') { eq = 'x + ' + a + ' = ' + (x + a); inverse = 'subtract ' + a + ' from both sides'; }
      else if (op === '-') { eq = 'x - ' + a + ' = ' + (x - a); inverse = 'add ' + a + ' to both sides'; }
      else if (op === 'x') { eq = a + 'x = ' + a * x; inverse = 'divide both sides by ' + a; }
      else { eq = 'x / ' + a + ' = ' + x; inverse = 'multiply both sides by ' + a; }
      return num({
        prompt: 'Solve for x:\n\n' + eq,
        answer: x,
        hints: [
          'Whatever you do to one side, do to the other side too.',
          'To get x alone, ' + inverse + '.',
          'x = ' + x + '.',
        ],
        explanation: 'To solve ' + eq + ', ' + inverse + '. That gives x = ' + x + '.',
      });
    },
  },
  {
    id: 'g6-triangle-area',
    topic: 'Geometry',
    skill: 'Area of triangles and parallelograms',
    gen(rng, d) {
      const b = 2 * ri(rng, 2, [5, 7, 9, 12, 15][d - 1]);
      const h = ri(rng, 3, [8, 10, 14, 18, 22][d - 1]);
      const isTriangle = rng() < 0.6;
      const ans = isTriangle ? (b * h) / 2 : b * h;
      return num({
        prompt: 'A ' + (isTriangle ? 'triangle' : 'parallelogram') + ' has a base of ' + b + ' cm and a height of ' + h + ' cm. What is its area?',
        answer: ans,
        unit: 'square cm',
        visual: { kind: isTriangle ? 'triangle' : 'parallelogram', b, h },
        hints: [
          isTriangle ? 'A triangle is exactly half of a rectangle with the same base and height.' : 'A parallelogram has the same area as a rectangle with the same base and height.',
          isTriangle ? 'Area = (base x height) / 2.' : 'Area = base x height.',
          isTriangle ? '(' + b + ' x ' + h + ') / 2 = ' + ans + '.' : b + ' x ' + h + ' = ' + ans + '.',
        ],
        explanation: isTriangle ? 'Area = (1/2) x ' + b + ' x ' + h + ' = ' + ans + ' square cm.' : 'Area = ' + b + ' x ' + h + ' = ' + ans + ' square cm.',
      });
    },
  },
  {
    id: 'g6-statistics',
    topic: 'Statistics',
    skill: 'Mean, median, mode, and range',
    gen(rng, d) {
      const count = d <= 2 ? 5 : pick(rng, [5, 6, 7]);
      const stat = pick(rng, d <= 2 ? ['mean', 'range'] : ['mean', 'median', 'mode', 'range']);
      let data;
      if (stat === 'mean') {
        const target = ri(rng, 5, 20);
        data = Array.from({ length: count - 1 }, () => ri(rng, 1, 30));
        const sum = data.reduce((s, v) => s + v, 0);
        let last = target * count - sum;
        if (last < 1) { last = ri(rng, 1, 20); }
        data.push(last);
      } else if (stat === 'mode') {
        const rep = ri(rng, 2, 20);
        data = [rep, rep, ...Array.from({ length: count - 2 }, () => ri(rng, 21, 40))];
        data = shuffle(rng, data);
      } else {
        data = Array.from({ length: count }, () => ri(rng, 1, 40));
      }
      const sorted = [...data].sort((a, b) => a - b);
      const sum = data.reduce((s, v) => s + v, 0);
      let ans, hint2, hint3;
      if (stat === 'mean') {
        ans = round(sum / data.length, 2);
        hint2 = 'Add every value: the sum is ' + sum + '.';
        hint3 = sum + ' / ' + data.length + ' = ' + ans + '.';
      } else if (stat === 'median') {
        ans = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2, 2);
        hint2 = 'In order the values are ' + sorted.join(', ') + '.';
        hint3 = 'The middle value is ' + ans + '.';
      } else if (stat === 'mode') {
        const freq = {};
        data.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
        ans = Number(Object.keys(freq).reduce((best, k) => (freq[k] > freq[best] ? k : best), Object.keys(freq)[0]));
        hint2 = 'Look for the value that shows up more than once.';
        hint3 = ans + ' appears most often.';
      } else {
        ans = sorted[sorted.length - 1] - sorted[0];
        hint2 = 'The largest is ' + sorted[sorted.length - 1] + ' and the smallest is ' + sorted[0] + '.';
        hint3 = sorted[sorted.length - 1] + ' - ' + sorted[0] + ' = ' + ans + '.';
      }
      const defs = {
        mean: 'The mean is the average: add everything, then divide by how many there are.',
        median: 'The median is the middle value once the data is in order.',
        mode: 'The mode is the value that appears most often.',
        range: 'The range is the largest value minus the smallest.',
      };
      return num({
        prompt: 'Find the ' + stat + ' of this data set:\n\n' + data.join(',  '),
        answer: ans,
        visual: { kind: 'bar-data', values: data },
        hints: [defs[stat], hint2, hint3],
        explanation: 'The ' + stat + ' is ' + ans + '.',
      });
    },
  },
  {
    id: 'g6-divide-fractions',
    topic: 'Fractions',
    skill: 'Divide fractions',
    gen(rng, d) {
      const n1 = ri(rng, 1, 5);
      const d1 = ri(rng, n1 + 1, 9);
      const n2 = ri(rng, 1, 5);
      const d2 = ri(rng, n2 + 1, 9);
      const [rn, rd] = reduce(n1 * d2, d1 * n2);
      return text({
        prompt: 'What is ' + n1 + '/' + d1 + ' / ' + n2 + '/' + d2 + '? Give your answer in simplest form.',
        answer: rd === 1 ? String(rn) : rn + '/' + rd,
        accept: [n1 * d2 + '/' + d1 * n2],
        placeholder: 'e.g. 3/4',
        hints: [
          'Dividing by a fraction is the same as multiplying by its reciprocal.',
          'Flip the second fraction: ' + n2 + '/' + d2 + ' becomes ' + d2 + '/' + n2 + '.',
          n1 + '/' + d1 + ' x ' + d2 + '/' + n2 + ' = ' + n1 * d2 + '/' + d1 * n2 +
            (n1 * d2 === rn && d1 * n2 === rd ? '' : ' = ' + rn + '/' + rd) + '.',
        ],
        explanation: 'Multiply by the reciprocal: ' + n1 + '/' + d1 + ' x ' + d2 + '/' + n2 + ' = ' + (rd === 1 ? rn : rn + '/' + rd) + '.',
      });
    },
  },
  {
    id: 'g6-percent-word',
    topic: 'Percentages',
    skill: 'Percent word problems',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const base = 10 * ri(rng, 4, [12, 20, 30, 45, 60][d - 1]);
      const pct = pick(rng, [10, 15, 20, 25, 30, 40, 50]);
      const discount = rng() < 0.5;
      const change = round((pct / 100) * base, 2);
      const ans = discount ? round(base - change, 2) : round(base + change, 2);
      return num({
        prompt: discount
          ? name + ' buys gear priced at ' + base + ' credits with a ' + pct + '% discount. What is the final price?'
          : name + ' has ' + base + ' credits and earns a ' + pct + '% bonus. How many credits now?',
        answer: ans,
        unit: 'credits',
        hints: [
          'First find what ' + pct + '% of ' + base + ' is.',
          pct + '% of ' + base + ' = ' + change + '.',
          discount ? base + ' - ' + change + ' = ' + ans + '.' : base + ' + ' + change + ' = ' + ans + '.',
        ],
        explanation: pct + '% of ' + base + ' is ' + change + ', so the answer is ' + ans + ' credits.',
      });
    },
  },
];
