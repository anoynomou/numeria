import { GRADES, generateQuestion, checkAnswer, generatorsFor, topicsForGrade } from '../src/math/index.js';

let total = 0, fails = 0, selfFails = 0;
const problems = [];

for (const grade of GRADES) {
  for (const g of generatorsFor(grade)) {
    for (let d = 1; d <= 5; d++) {
      for (let i = 0; i < 40; i++) {
        total++;
        let q;
        try {
          q = generateQuestion({ grade, difficulty: d, seed: `${grade}:${g.id}:${d}:${i}`, generatorId: g.id, puzzle: { count: 12, label: 'bridge' } });
        } catch (e) {
          fails++;
          problems.push(`CRASH ${grade}/${g.id}/d${d}: ${e.message}`);
          continue;
        }
        // Structural checks
        const issues = [];
        if (!q.prompt || typeof q.prompt !== 'string') issues.push('no prompt');
        if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '') issues.push('no answer');
        if (!Array.isArray(q.hints) || q.hints.length !== 3) issues.push(`hints=${q.hints && q.hints.length}`);
        if (q.hints && q.hints.some((h) => !h || typeof h !== 'string')) issues.push('bad hint');
        if (!q.explanation) issues.push('no explanation');
        if (q.type === 'multiple-choice') {
          if (!q.choices || q.choices.length < 2) issues.push(`choices=${q.choices && q.choices.length}`);
          else {
            if (new Set(q.choices).size !== q.choices.length) issues.push('dup choices');
            if (!q.choices.includes(String(q.answer))) issues.push('answer not in choices');
          }
        }
        if (q.type === 'order' && (!q.items || !q.items.length)) issues.push('no items');
        if (/undefined|NaN|\[object/.test(q.prompt + ' ' + q.hints.join(' ') + ' ' + q.explanation + ' ' + q.answer)) issues.push('undefined/NaN in text');
        if (issues.length) {
          fails++;
          if (problems.length < 60) problems.push(`STRUCT ${grade}/${g.id}/d${d}: ${issues.join(', ')} | ans=${q.answer} | ${JSON.stringify(q.prompt).slice(0, 90)}`);
        }
        // Self-consistency: the canonical answer must grade as correct.
        if (!checkAnswer(q, q.answer)) {
          selfFails++;
          if (problems.length < 60) problems.push(`SELF ${grade}/${g.id}/d${d}: answer "${q.answer}" not accepted (type=${q.type})`);
        }
        // A clearly wrong answer must not grade as correct.
        const wrong = q.type === 'multiple-choice'
          ? q.choices.find((c) => c !== String(q.answer))
          : String(q.answer) === '0' ? '99999' : '0';
        if (wrong !== undefined && checkAnswer(q, wrong)) {
          fails++;
          if (problems.length < 60) problems.push(`FALSEPOS ${grade}/${g.id}/d${d}: wrong "${wrong}" accepted vs "${q.answer}"`);
        }
      }
    }
  }
}

console.log(`Generated ${total} questions across ${GRADES.length} grades.`);
console.log(`Structural/logic failures: ${fails}`);
console.log(`Self-grading failures: ${selfFails}`);
if (problems.length) {
  console.log('\n--- problems ---');
  problems.forEach((p) => console.log(p));
} else {
  console.log('All checks passed.');
}
for (const g of GRADES) {
  console.log(`Grade ${g}: ${generatorsFor(g).length} generators, topics: ${topicsForGrade(g).join(', ')}`);
}
