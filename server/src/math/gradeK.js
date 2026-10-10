import { ri, pick, mc, num, order, shuffle, NAMES } from './helpers.js';

const ICONS = ['🍎', '⭐', '🐟', '🌸', '🚀', '🐢', '🍋', '🔔', '🦋', '🧩'];
const SHAPES = [
  { name: 'circle', sides: 0, hint: 'It is perfectly round with no corners.' },
  { name: 'triangle', sides: 3, hint: 'It has 3 straight sides.' },
  { name: 'square', sides: 4, hint: 'It has 4 sides that are all the same length.' },
  { name: 'rectangle', sides: 4, hint: 'It has 4 sides and looks like a door.' },
  { name: 'hexagon', sides: 6, hint: 'It has 6 straight sides, like a honeycomb cell.' },
];

export default [
  {
    id: 'k-count-objects',
    topic: 'Counting',
    skill: 'Count objects to 20',
    gen(rng, d) {
      const max = [5, 8, 10, 15, 20][d - 1];
      const n = ri(rng, 2, max);
      const icon = pick(rng, ICONS);
      return mc(rng, {
        prompt: 'How many do you count?\n\n' + icon.repeat(n),
        answer: n,
        distractors: [n + 1, n - 1, n + 2].filter((v) => v > 0),
        hints: [
          'Touch each picture one time as you say a number out loud.',
          'Start at 1 and count from left to right. Do not skip any.',
          'Counting slowly from 1 all the way across, every picture is counted. There are ' + n + '.',
        ],
        explanation: 'Counting each picture one at a time gives ' + n + '.',
      });
    },
  },
  {
    id: 'k-add-within-10',
    topic: 'Addition',
    skill: 'Add within 10',
    gen(rng, d, ctx) {
      const max = [3, 5, 6, 8, 10][d - 1];
      let a = ri(rng, 1, max);
      let b = ri(rng, 1, Math.max(1, max - a));
      const icon = pick(rng, ICONS);
      const themed = ctx && ctx.puzzle && ctx.puzzle.count && d <= 3 && rng() < 0.4;
      if (themed) {
        a = Math.max(1, Math.min(ctx.puzzle.count, max));
        b = ri(rng, 1, Math.max(1, max - a));
      }
      const ans = a + b;
      const countOn = [];
      for (let i = 0; i < b; i++) countOn.push(a + i + 1);
      return mc(rng, {
        prompt: themed
          ? 'You placed ' + a + ' pieces. Then you find ' + b + ' more.\n\n' + icon.repeat(a) + '  +  ' + icon.repeat(b) + '\n\nHow many pieces altogether?'
          : icon.repeat(a) + '  +  ' + icon.repeat(b) + '\n\nWhat is ' + a + ' + ' + b + '?',
        answer: ans,
        distractors: [ans + 1, ans - 1, a],
        hints: [
          'Adding means putting the two groups together.',
          'Start at ' + a + ', then count forward ' + b + ' more.',
          'Counting on from ' + a + ': ' + countOn.join(', ') + '. That lands on ' + ans + '.',
        ],
        explanation: a + ' + ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'k-sub-within-10',
    topic: 'Subtraction',
    skill: 'Subtract within 10',
    gen(rng, d) {
      const max = [4, 5, 7, 9, 10][d - 1];
      const a = ri(rng, 2, max);
      const b = ri(rng, 1, a);
      const icon = pick(rng, ICONS);
      const ans = a - b;
      return mc(rng, {
        prompt: 'There are ' + a + ' ' + icon + '. Then ' + b + ' float away.\n\n' + icon.repeat(a) + '\n\nHow many are left?',
        answer: ans,
        distractors: [ans + 1, ans - 1, a],
        hints: [
          'Taking away makes the group smaller.',
          'Cross out ' + b + ' of the ' + a + ' pictures, then count what is left.',
          'Counting back from ' + a + ' by ' + b + ' lands on ' + ans + '.',
        ],
        explanation: a + ' - ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'k-compare',
    topic: 'Comparing numbers',
    skill: 'Compare two numbers to 20',
    gen(rng, d) {
      const max = [5, 10, 12, 16, 20][d - 1];
      let a = ri(rng, 1, max);
      let b = ri(rng, 1, max);
      while (a === b) b = ri(rng, 1, max);
      const bigger = rng() < 0.5;
      const ans = bigger ? Math.max(a, b) : Math.min(a, b);
      return mc(rng, {
        prompt: 'Which number is ' + (bigger ? 'greater' : 'less') + ': ' + a + ' or ' + b + '?',
        answer: ans,
        distractors: [a === ans ? b : a],
        hints: [
          bigger ? 'Greater means the bigger amount.' : 'Less means the smaller amount.',
          'Picture each number as a stack of blocks. Which stack is taller?',
          Math.max(a, b) + ' is greater than ' + Math.min(a, b) + ', so the answer is ' + ans + '.',
        ],
        explanation: Math.max(a, b) + ' is greater than ' + Math.min(a, b) + ', so the ' + (bigger ? 'greater' : 'lesser') + ' number is ' + ans + '.',
      });
    },
  },
  {
    id: 'k-shapes',
    topic: 'Shapes',
    skill: 'Identify 2D shapes',
    gen(rng, d) {
      const s = pick(rng, SHAPES.slice(0, Math.min(5, 2 + d)));
      if (rng() < 0.5 && s.sides > 0) {
        return mc(rng, {
          prompt: 'How many sides does a ' + s.name + ' have?',
          answer: s.sides,
          distractors: [s.sides + 1, s.sides - 1, s.sides + 2],
          hints: ['A side is one straight edge of the shape.', s.hint, 'A ' + s.name + ' has ' + s.sides + ' sides.'],
          explanation: 'A ' + s.name + ' has ' + s.sides + ' sides.',
        });
      }
      const others = SHAPES.filter((x) => x.name !== s.name);
      return mc(rng, {
        prompt: 'Which shape ' + (s.sides === 0 ? 'is perfectly round with no corners' : 'has exactly ' + s.sides + ' straight sides') + '?',
        answer: s.name,
        distractors: shuffle(rng, others).slice(0, 3).map((x) => x.name),
        hints: ['Think about the corners.', s.hint, 'The answer is the ' + s.name + '.'],
        explanation: 'A ' + s.name + ': ' + s.hint.toLowerCase(),
      });
    },
  },
  {
    id: 'k-order',
    topic: 'Counting',
    skill: 'Order numbers',
    gen(rng, d) {
      const max = [6, 10, 12, 16, 20][d - 1];
      const count = d <= 2 ? 3 : 4;
      const set = new Set();
      while (set.size < count) set.add(ri(rng, 1, max));
      const nums = [...set];
      const sorted = [...nums].sort((x, y) => x - y);
      return order({
        prompt: 'Drag the numbers so they go from smallest to largest.',
        items: shuffle(rng, nums).map(String),
        answer: sorted.map(String),
        hints: [
          'Smallest goes first, on the left.',
          'Find the very smallest number first. That is ' + sorted[0] + '.',
          'In order they are ' + sorted.join(', ') + '.',
        ],
        explanation: 'From smallest to largest: ' + sorted.join(', ') + '.',
      });
    },
  },
  {
    id: 'k-missing-number',
    topic: 'Counting',
    skill: 'Counting sequences',
    gen(rng, d) {
      const start = ri(rng, 1, [6, 8, 10, 12, 14][d - 1]);
      const seq = [start, start + 1, start + 2, start + 3];
      const hideAt = ri(rng, 1, 2);
      const shown = seq.map((v, i) => (i === hideAt ? '__' : v));
      return num({
        prompt: 'Fill in the missing number:\n\n' + shown.join(',   '),
        answer: seq[hideAt],
        hints: [
          'These numbers are counting up by 1 each time.',
          'The number before the blank is ' + seq[hideAt - 1] + '. What comes next?',
          'One more than ' + seq[hideAt - 1] + ' is ' + seq[hideAt] + '.',
        ],
        explanation: 'Counting by ones: ' + seq.join(', ') + '.',
      });
    },
  },
  {
    id: 'k-story',
    topic: 'Addition',
    skill: 'Addition and subtraction stories',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const a = ri(rng, 2, [4, 5, 6, 8, 9][d - 1]);
      const b = ri(rng, 1, Math.max(1, 10 - a));
      const addStory = rng() < 0.5;
      if (addStory) {
        const ans = a + b;
        return mc(rng, {
          prompt: name + ' collects ' + a + ' shiny stones. A friend gives ' + name + ' ' + b + ' more. How many stones does ' + name + ' have now?',
          answer: ans,
          distractors: [ans + 1, ans - 1, b],
          hints: [
            'Getting more means we add.',
            'Start with ' + a + ' and count on ' + b + ' more.',
            a + ' + ' + b + ' = ' + ans + '.',
          ],
          explanation: a + ' + ' + b + ' = ' + ans + '.',
        });
      }
      const left = Math.max(1, a - b);
      const start = left + b;
      return mc(rng, {
        prompt: name + ' has some stones, gives away ' + b + ', and has ' + left + ' left. How many stones did ' + name + ' start with?',
        answer: start,
        distractors: [start + 1, left, b],
        hints: [
          'To find the starting amount, put the groups back together.',
          'The ' + left + ' left over plus the ' + b + ' given away is the start.',
          left + ' + ' + b + ' = ' + start + '.',
        ],
        explanation: left + ' + ' + b + ' = ' + start + '.',
      });
    },
  },
];
