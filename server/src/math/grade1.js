import { ri, pick, mc, num, text, order, shuffle, numberLine, NAMES } from './helpers.js';

const THINGS = ['acorns', 'stars', 'shells', 'bolts', 'gems', 'seeds', 'coins', 'bricks'];

export default [
  {
    id: 'g1-add-20',
    topic: 'Addition',
    skill: 'Add within 20',
    gen(rng, d) {
      const max = [10, 12, 15, 18, 20][d - 1];
      const a = ri(rng, 2, max - 2);
      const b = ri(rng, 2, Math.max(2, max - a));
      const ans = a + b;
      const makeTen = a + b > 10 ? 10 - a : 0;
      return num({
        prompt: 'What is ' + a + ' + ' + b + '?',
        answer: ans,
        hints: [
          'You can count on from the larger number.',
          makeTen > 0
            ? 'Try making a ten: ' + a + ' + ' + makeTen + ' = 10, and ' + b + ' - ' + makeTen + ' = ' + (b - makeTen) + ' is left over.'
            : 'Start at ' + Math.max(a, b) + ' and count on ' + Math.min(a, b) + '.',
          makeTen > 0
            ? '10 + ' + (b - makeTen) + ' = ' + ans + '.'
            : a + ' + ' + b + ' = ' + ans + '.',
        ],
        explanation: a + ' + ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g1-sub-20',
    topic: 'Subtraction',
    skill: 'Subtract within 20',
    gen(rng, d) {
      const max = [10, 12, 15, 18, 20][d - 1];
      const a = ri(rng, 5, max);
      const b = ri(rng, 1, a - 1);
      const ans = a - b;
      return num({
        prompt: 'What is ' + a + ' - ' + b + '?',
        answer: ans,
        hints: [
          'Subtraction means taking away, or finding the difference.',
          'Start at ' + a + ' on a number line and hop back ' + b + ' times.',
          'Another way: ' + b + ' + ' + ans + ' = ' + a + ', so ' + a + ' - ' + b + ' = ' + ans + '.',
        ],
        explanation: a + ' - ' + b + ' = ' + ans + '.',
      });
    },
  },
  {
    id: 'g1-missing-addend',
    topic: 'Addition',
    skill: 'Find the missing addend',
    gen(rng, d) {
      const total = ri(rng, [8, 10, 14, 17, 20][d - 1] - 4, [8, 10, 14, 17, 20][d - 1]);
      const a = ri(rng, 1, total - 1);
      const ans = total - a;
      return num({
        prompt: a + ' + ___ = ' + total + '\n\nWhat number goes in the blank?',
        answer: ans,
        hints: [
          'How many more do you need to get from ' + a + ' to ' + total + '?',
          'Count up from ' + a + ' until you reach ' + total + '.',
          'You can subtract: ' + total + ' - ' + a + ' = ' + ans + '.',
        ],
        explanation: a + ' + ' + ans + ' = ' + total + '.',
      });
    },
  },
  {
    id: 'g1-place-value',
    topic: 'Place value',
    skill: 'Tens and ones',
    gen(rng, d) {
      const n = ri(rng, 11, [39, 59, 79, 99, 99][d - 1]);
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      const askTens = rng() < 0.5;
      if (rng() < 0.5) {
        return num({
          prompt: 'How many ' + (askTens ? 'tens' : 'ones') + ' are in the number ' + n + '?',
          answer: askTens ? tens : ones,
          visual: { kind: 'base-ten', tens, ones },
          hints: [
            'The left digit counts the tens. The right digit counts the ones.',
            'In ' + n + ', the tens digit is ' + tens + ' and the ones digit is ' + ones + '.',
            'So there are ' + (askTens ? tens + ' tens' : ones + ' ones') + '.',
          ],
          explanation: n + ' = ' + tens + ' ten' + (tens === 1 ? '' : 's') + ' and ' + ones + ' one' + (ones === 1 ? '' : 's') + '.',
        });
      }
      return num({
        prompt: 'What number is made of ' + tens + ' ten' + (tens === 1 ? '' : 's') + ' and ' + ones + ' one' + (ones === 1 ? '' : 's') + '?',
        answer: n,
        visual: { kind: 'base-ten', tens, ones },
        hints: [
          'Each ten is a bundle of 10.',
          tens + ' tens is ' + tens * 10 + '.',
          tens * 10 + ' + ' + ones + ' = ' + n + '.',
        ],
        explanation: tens + ' tens and ' + ones + ' ones make ' + n + '.',
      });
    },
  },
  {
    id: 'g1-compare-symbols',
    topic: 'Comparing numbers',
    skill: 'Use >, <, and =',
    gen(rng, d) {
      const max = [20, 40, 60, 99, 120][d - 1];
      const a = ri(rng, 1, max);
      const b = rng() < 0.15 ? a : ri(rng, 1, max);
      const ans = a > b ? '>' : a < b ? '<' : '=';
      return mc(rng, {
        prompt: 'Which symbol makes this true?\n\n' + a + '  ___  ' + b,
        answer: ans,
        distractors: ['>', '<', '='].filter((s) => s !== ans),
        hints: [
          'The open mouth of the symbol always points at the bigger number.',
          a === b ? 'Both numbers are the same.' : Math.max(a, b) + ' is the bigger number.',
          'The answer is ' + a + ' ' + ans + ' ' + b + '.',
        ],
        explanation: a + ' ' + ans + ' ' + b + '.',
      });
    },
  },
  {
    id: 'g1-skip-count',
    topic: 'Counting',
    skill: 'Skip count by 2s, 5s, and 10s',
    gen(rng, d) {
      const step = pick(rng, d <= 2 ? [10, 5] : [2, 5, 10]);
      const start = step * ri(rng, 1, 5);
      const seq = [start, start + step, start + 2 * step, start + 3 * step];
      return num({
        prompt: 'Keep skip counting by ' + step + '.\n\n' + seq.slice(0, 3).join(',   ') + ',   ___',
        answer: seq[3],
        hints: [
          'Look at how much the numbers jump each time.',
          'Each number is ' + step + ' more than the one before it.',
          seq[2] + ' + ' + step + ' = ' + seq[3] + '.',
        ],
        explanation: 'Counting by ' + step + ': ' + seq.join(', ') + '.',
      });
    },
  },
  {
    id: 'g1-time',
    topic: 'Measurement',
    skill: 'Tell time to the hour and half hour',
    gen(rng, d) {
      const hour = ri(rng, 1, 12);
      const minute = d <= 2 ? 0 : pick(rng, [0, 30]);
      const label = hour + ':' + String(minute).padStart(2, '0');
      const wrongHour = hour === 12 ? 11 : hour + 1;
      return mc(rng, {
        prompt: 'What time does the clock show?',
        answer: label,
        distractors: [
          wrongHour + ':' + String(minute).padStart(2, '0'),
          hour + ':' + (minute === 0 ? '30' : '00'),
          wrongHour + ':' + (minute === 0 ? '30' : '00'),
        ],
        visual: { kind: 'clock', hour, minute },
        hints: [
          'The short hand is the hour. The long hand is the minutes.',
          minute === 0
            ? 'The long hand points straight up at 12, so it is exactly on the hour.'
            : 'The long hand points straight down at 6, which means 30 minutes past.',
          'The time is ' + label + '.',
        ],
        explanation: 'The hour hand is at ' + hour + ' and the minute hand shows ' + minute + ' minutes, so it is ' + label + '.',
      });
    },
  },
  {
    id: 'g1-number-line',
    topic: 'Place value',
    skill: 'Locate a number on a number line',
    gen(rng, d) {
      const max = [10, 20, 20, 50, 100][d - 1];
      const step = max <= 20 ? 1 : max === 50 ? 5 : 10;
      const answer = step * ri(rng, 1, Math.floor(max / step) - 1);
      return numberLine({
        prompt: 'Drag the marker to ' + answer + ' on the number line.',
        min: 0,
        max,
        step,
        answer,
        hints: [
          'Find 0 on the left and ' + max + ' on the right.',
          'Each tick mark is worth ' + step + '.',
          answer + ' is ' + (answer / step) + ' tick' + (answer / step === 1 ? '' : 's') + ' from 0.',
        ],
        explanation: answer + ' sits ' + (answer / step) + ' steps of ' + step + ' after 0.',
      });
    },
  },
  {
    id: 'g1-word-problem',
    topic: 'Addition',
    skill: 'Solve word problems within 20',
    gen(rng, d) {
      const name = pick(rng, NAMES);
      const thing = pick(rng, THINGS);
      const max = [8, 10, 14, 17, 20][d - 1];
      const a = ri(rng, 3, max - 2);
      const b = ri(rng, 1, Math.min(a - 1, max - a));
      const isAdd = rng() < 0.5;
      const ans = isAdd ? a + b : a - b;
      return num({
        prompt: isAdd
          ? name + ' found ' + a + ' ' + thing + ' in the forest and ' + b + ' more near the river. How many ' + thing + ' in all?'
          : name + ' had ' + a + ' ' + thing + ' and traded away ' + b + '. How many ' + thing + ' are left?',
        answer: ans,
        hints: [
          isAdd ? 'The word "in all" tells you to put the groups together.' : 'Trading away means some are gone, so take away.',
          'The number sentence is ' + a + (isAdd ? ' + ' : ' - ') + b + ' = ___.',
          a + (isAdd ? ' + ' : ' - ') + b + ' = ' + ans + '.',
        ],
        explanation: a + (isAdd ? ' + ' : ' - ') + b + ' = ' + ans + ' ' + thing + '.',
      });
    },
  },
  {
    id: 'g1-shape-sort',
    topic: 'Shapes',
    skill: 'Shape attributes',
    gen(rng, d) {
      const solids = [
        { name: 'cube', faces: 6, note: 'a box with 6 square faces' },
        { name: 'sphere', faces: 0, note: 'a ball with no flat faces' },
        { name: 'cylinder', faces: 2, note: 'a can with 2 flat circle faces' },
        { name: 'cone', faces: 1, note: 'an ice cream cone with 1 flat face' },
      ];
      const s = pick(rng, solids);
      return mc(rng, {
        prompt: 'Which 3D shape is ' + s.note + '?',
        answer: s.name,
        distractors: shuffle(rng, solids.filter((x) => x.name !== s.name)).map((x) => x.name),
        hints: [
          'A face is a flat surface you could set on a table.',
          'This shape has ' + s.faces + ' flat face' + (s.faces === 1 ? '' : 's') + '.',
          'The answer is the ' + s.name + '.',
        ],
        explanation: 'A ' + s.name + ' is ' + s.note + '.',
      });
    },
  },
];
