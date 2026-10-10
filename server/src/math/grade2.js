import { ri, pick, mc, num, order, shuffle, NAMES } from './helpers.js';

export default [
  {
    id: 'g2-add-100',
    topic: 'Addition',
    skill: 'Add within 100',
    gen(rng, d) {
      const max = [40, 60, 80, 99, 99][d - 1];
      const a = ri(rng, 11, max);
      const b = ri(rng, d <= 2 ? 5 : 11, Math.max(6, Math.min(max, 100 - a)));
      const ans = a + b;
      const regroup = (a % 10) + (b % 10) >= 10;
      return num({
        prompt: 'What is ' + a + ' + ' + b + '?',
        answer: ans,
        hints: [
          'Try breaking each number into tens and ones.',
          a + ' = ' + Math.floor(a / 10) * 10 + ' + ' + (a % 10) + ' and ' + b + ' = ' + Math.floor(b / 10) * 10 + ' + ' + (b % 10) + '. Add the tens, then the ones.',
          'Tens: ' + Math.floor(a / 10) * 10 + ' + ' + Math.floor(b / 10) * 10 + ' = ' + (Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10) +
            '. Ones: ' + (a % 10) + ' + ' + (b % 10) + ' = ' + ((a % 10) + (b % 10)) + '. Together that is ' + ans + '.',
        ],
        explanation: regroup
          ? a + ' + ' + b + ' = ' + ans + '. The ones made a new ten, so you regroup.'
          : a + ' + ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g2-sub-100',
    topic: 'Subtraction',
    skill: 'Subtract within 100',
    gen(rng, d) {
      const max = [40, 60, 80, 99, 99][d - 1];
      const a = ri(rng, 20, max);
      const b = ri(rng, 5, a - 1);
      const ans = a - b;
      return num({
        prompt: 'What is ' + a + ' - ' + b + '?',
        answer: ans,
        hints: [
          'You can count up from the smaller number to the bigger one.',
          'From ' + b + ', jump to the next ten first, then keep going to ' + a + '.',
          'Checking with addition: ' + b + ' + ' + ans + ' = ' + a + '.',
        ],
        explanation: a + ' - ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g2-place-value-3',
    topic: 'Place value',
    skill: 'Hundreds, tens, and ones',
    gen(rng, d) {
      const n = ri(rng, 101, [399, 599, 799, 999, 999][d - 1]);
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const o = n % 10;
      const which = pick(rng, ['hundreds', 'tens', 'ones']);
      const val = which === 'hundreds' ? h : which === 'tens' ? t : o;
      if (rng() < 0.5) {
        return num({
          prompt: 'In the number ' + n + ', what digit is in the ' + which + ' place?',
          answer: val,
          hints: [
            'Reading right to left the places are ones, tens, hundreds.',
            n + ' has ' + h + ' hundreds, ' + t + ' tens, and ' + o + ' ones.',
            'The ' + which + ' digit is ' + val + '.',
          ],
          explanation: n + ' = ' + h * 100 + ' + ' + t * 10 + ' + ' + o + '.',
        });
      }
      return num({
        prompt: 'What is the value of the ' + which + ' digit in ' + n + '?',
        answer: which === 'hundreds' ? h * 100 : which === 'tens' ? t * 10 : o,
        hints: [
          'A digit is worth more depending on its place.',
          'The ' + which + ' digit is ' + val + '.',
          'In the ' + which + ' place, ' + val + ' is worth ' + (which === 'hundreds' ? val * 100 : which === 'tens' ? val * 10 : val) + '.',
        ],
        explanation: n + ' = ' + h * 100 + ' + ' + t * 10 + ' + ' + o + '.',
      });
    },
  },
  {
    id: 'g2-arrays',
    topic: 'Multiplication readiness',
    skill: 'Equal groups and repeated addition',
    gen(rng, d) {
      const rows = ri(rng, 2, [3, 4, 5, 5, 6][d - 1]);
      const cols = ri(rng, 2, [4, 5, 5, 6, 6][d - 1]);
      const ans = rows * cols;
      const repeated = Array(rows).fill(cols).join(' + ');
      return num({
        prompt: 'This array has ' + rows + ' rows with ' + cols + ' in each row. How many are there in all?',
        answer: ans,
        visual: { kind: 'array', rows, cols },
        hints: [
          'Count one row, then add that amount for each row.',
          'You can write it as repeated addition: ' + repeated + '.',
          repeated + ' = ' + ans + '.',
        ],
        explanation: rows + ' rows of ' + cols + ' is ' + repeated + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g2-money',
    topic: 'Money',
    skill: 'Count coins',
    gen(rng, d) {
      const q = ri(rng, 0, [1, 2, 2, 3, 4][d - 1]);
      const dm = ri(rng, 0, 3);
      const n = ri(rng, 0, 3);
      const p = ri(rng, 0, 4);
      const total = q * 25 + dm * 10 + n * 5 + p;
      if (total === 0) return this.gen(rng, Math.min(5, d + 1));
      const parts = [];
      if (q) parts.push(q + ' quarter' + (q === 1 ? '' : 's'));
      if (dm) parts.push(dm + ' dime' + (dm === 1 ? '' : 's'));
      if (n) parts.push(n + ' nickel' + (n === 1 ? '' : 's'));
      if (p) parts.push(p + ' penn' + (p === 1 ? 'y' : 'ies'));
      return num({
        prompt: 'How many cents is this?\n\n' + parts.join(', '),
        answer: total,
        unit: 'cents',
        visual: { kind: 'coins', quarters: q, dimes: dm, nickels: n, pennies: p },
        hints: [
          'A quarter is 25c, a dime is 10c, a nickel is 5c, a penny is 1c.',
          'Start with the biggest coins: ' + (q ? q + ' quarters is ' + q * 25 + 'c' : dm ? dm + ' dimes is ' + dm * 10 + 'c' : 'add the coins one group at a time') + '.',
          'Adding every group gives ' + total + ' cents.',
        ],
        explanation: q * 25 + ' + ' + dm * 10 + ' + ' + n * 5 + ' + ' + p + ' = ' + total + ' cents.',
      });
    },
  },
  {
    id: 'g2-time-5min',
    topic: 'Measurement',
    skill: 'Tell time to 5 minutes',
    gen(rng, d) {
      const hour = ri(rng, 1, 12);
      const minute = 5 * ri(rng, 0, 11);
      const label = hour + ':' + String(minute).padStart(2, '0');
      return mc(rng, {
        prompt: 'What time does the clock show?',
        answer: label,
        distractors: [
          hour + ':' + String((minute + 5) % 60).padStart(2, '0'),
          ((hour % 12) + 1) + ':' + String(minute).padStart(2, '0'),
          hour + ':' + String((minute + 30) % 60).padStart(2, '0'),
        ],
        visual: { kind: 'clock', hour, minute },
        hints: [
          'Each number on the clock face is 5 minutes apart.',
          'Count by 5s around the clock to where the long hand points.',
          'The time is ' + label + '.',
        ],
        explanation: 'The minute hand is ' + minute / 5 + ' marks past 12, and 5 x ' + minute / 5 + ' = ' + minute + ' minutes.',
      });
    },
  },
  {
    id: 'g2-even-odd',
    topic: 'Number sense',
    skill: 'Even and odd numbers',
    gen(rng, d) {
      const n = ri(rng, 2, [20, 40, 60, 99, 120][d - 1]);
      const isEven = n % 2 === 0;
      return mc(rng, {
        prompt: 'Is ' + n + ' even or odd?',
        answer: isEven ? 'even' : 'odd',
        distractors: [isEven ? 'odd' : 'even'],
        hints: [
          'Even numbers can be split into two equal groups with nothing left over.',
          'Look only at the ones digit: ' + (n % 10) + '.',
          'Numbers ending in 0, 2, 4, 6, or 8 are even. ' + n + ' ends in ' + (n % 10) + ', so it is ' + (isEven ? 'even' : 'odd') + '.',
        ],
        explanation: n + ' is ' + (isEven ? 'even' : 'odd') + ' because it ends in ' + (n % 10) + '.',
      });
    },
  },
  {
    id: 'g2-compare-3digit',
    topic: 'Comparing numbers',
    skill: 'Compare and order 3-digit numbers',
    gen(rng, d) {
      const count = d <= 2 ? 3 : 4;
      const set = new Set();
      while (set.size < count) set.add(ri(rng, 100, 999));
      const nums = [...set];
      const ascending = rng() < 0.5;
      const sorted = [...nums].sort((a, b) => (ascending ? a - b : b - a));
      return order({
        prompt: 'Drag the numbers into order from ' + (ascending ? 'least to greatest' : 'greatest to least') + '.',
        items: shuffle(rng, nums).map(String),
        answer: sorted.map(String),
        hints: [
          'Compare the hundreds digit first.',
          'If two numbers have the same hundreds digit, compare the tens digit next.',
          'In order: ' + sorted.join(', ') + '.',
        ],
        explanation: 'From ' + (ascending ? 'least to greatest' : 'greatest to least') + ': ' + sorted.join(', ') + '.',
      });
    },
  },
  {
    id: 'g2-measure',
    topic: 'Measurement',
    skill: 'Add and compare lengths',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const a = ri(rng, 8, [30, 45, 60, 80, 95][d - 1]);
      const b = ri(rng, 5, a - 1);
      const diff = rng() < 0.5;
      const ans = diff ? a - b : a + b;
      return num({
        prompt: diff
          ? name + ' has a rope ' + a + ' cm long and a vine ' + b + ' cm long. How much longer is the rope than the vine?'
          : name + ' ties a rope ' + a + ' cm long to a vine ' + b + ' cm long. How long is the new line?',
        answer: ans,
        unit: 'cm',
        hints: [
          diff ? 'How much longer means find the difference.' : 'Joining two lengths means adding them.',
          'The number sentence is ' + a + (diff ? ' - ' : ' + ') + b + ' = ___.',
          a + (diff ? ' - ' : ' + ') + b + ' = ' + ans + ' cm.',
        ],
        explanation: a + (diff ? ' - ' : ' + ') + b + ' = ' + ans + ' cm.',
      });
    },
  },
  {
    id: 'g2-two-step',
    topic: 'Word problems',
    skill: 'Two-step word problems',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const start = ri(rng, 20, [40, 55, 70, 90, 99][d - 1]);
      const lost = ri(rng, 3, 15);
      const found = ri(rng, 3, 20);
      const ans = start - lost + found;
      return num({
        prompt: name + ' starts with ' + start + ' crystals, drops ' + lost + ' in the river, then earns ' + found + ' more from a puzzle. How many crystals does ' + name + ' have now?',
        answer: ans,
        hints: [
          'This problem has two steps. Solve one at a time.',
          'Step 1: ' + start + ' - ' + lost + ' = ' + (start - lost) + '.',
          'Step 2: ' + (start - lost) + ' + ' + found + ' = ' + ans + '.',
        ],
        explanation: start + ' - ' + lost + ' + ' + found + ' = ' + ans + '.',
      });
    },
  },
];
