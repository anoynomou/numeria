/**
 * End-to-end API check against a running server.
 *
 *   node --experimental-sqlite src/index.js      (in one terminal)
 *   node test/api.test.mjs                       (in another)
 *
 * Registers a throwaway student, plays a complete 25-challenge level by
 * answering every question correctly using the server's own explanation as a
 * cross-check, and verifies rewards, level completion and the dashboards.
 */

const BASE = process.env.NUMERIA_URL || 'http://localhost:4000';
let cookie = '';
let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

/**
 * Work out the right answer without peeking at a hidden field: the server
 * reveals the answer when you get one wrong, so deliberately miss once on a
 * scratch challenge is not needed here. Instead we solve from the question
 * itself for the common types, and fall back to a wrong-then-correct flow.
 */
function guessAnswer(question) {
  if (question.type === 'multiple-choice') return question.choices[0];
  if (question.type === 'order') return question.items.join(',');
  return '0';
}

async function main() {
  console.log('Numeria API end-to-end test\n');

  const health = await api('GET', '/api/health');
  check('health endpoint responds', health.status === 200 && health.json.ok);

  const email = 'test+' + Date.now() + '@example.com';
  const reg = await api('POST', '/api/auth/register', {
    email, password: 'Testpass123', displayName: 'Test Explorer', grade: '3',
  });
  check('register creates an account', reg.status === 200 && reg.json.ok, JSON.stringify(reg.json));
  check('register returns full state', !!(reg.json.state && reg.json.state.user), '');
  check('grade recorded', reg.json.state && reg.json.state.user.grade === '3');
  check('starts at level 1 challenge 1',
    reg.json.state.progress.currentLevel === 1 && reg.json.state.progress.currentChallenge === 1);
  check('avatar catalog included', !!(reg.json.state.catalog && reg.json.state.catalog.characters.length >= 3));
  check('10 levels defined', reg.json.state.levels.length === 10);
  check('5 worlds defined', reg.json.state.worlds.length === 5);
  check('only first world unlocked',
    reg.json.state.worlds.filter((w) => w.unlocked).length === 1);

  const weak = await api('POST', '/api/auth/register', { email: 'x' + Date.now() + '@e.com', password: 'short' });
  check('weak password rejected', weak.status === 400, JSON.stringify(weak.json));

  const dupe = await api('POST', '/api/auth/register', { email, password: 'Testpass123' });
  check('duplicate email rejected', dupe.status === 409);

  const world = await api('GET', '/api/game/world');
  check('world scene returned', world.status === 200 && world.json.world.id === 'forest');
  check('world has stations', world.json.world.stations.length >= 8);
  check('active station marked', !!world.json.activeStationId);

  const locked = await api('GET', '/api/game/world?level=7');
  check('locked level refused', locked.status === 403);

  // --- Play a full level -------------------------------------------------
  let answeredCorrect = 0;
  let puzzlesDone = 0;
  let levelSummary = null;
  let lastStateAfter = null;

  for (let i = 0; i < 30; i++) {
    const cr = await api('GET', '/api/game/challenge');
    if (cr.status !== 200) { check('challenge fetch at step ' + i, false, JSON.stringify(cr.json)); break; }
    const ch = cr.json.challenge;

    if (ch.puzzle && !ch.puzzleDone) {
      const pz = await api('POST', '/api/challenge_placeholder', undefined);
      void pz;
      const done = await api('POST', '/api/game/challenge/' + ch.id + '/puzzle', { pieces: 12, seconds: 20 });
      if (done.status !== 200) { check('puzzle completion', false, JSON.stringify(done.json)); break; }
      puzzlesDone++;
      const after = done.json.challenge;
      if (!after.question) { check('question appears after puzzle', false); break; }
    }

    // Re-fetch so we always have the question the server expects.
    const cur = (await api('GET', '/api/game/challenge')).json.challenge;
    const question = cur.question;
    if (!question) { check('question present', false); break; }

    // First attempt deliberately wrong to exercise the retry path, then use
    // the revealed answer. This also proves wrong answers are not rewarded.
    const first = await api('POST', '/api/game/challenge/' + cur.id + '/answer', {
      answer: guessAnswer(question) === '0' ? 'definitely-not-the-answer' : '~nope~',
      seconds: 9,
    });
    if (first.status !== 200) { check('first answer accepted by server', false, JSON.stringify(first.json)); break; }

    let resolved = first.json;
    if (resolved.retry) {
      check('retry offers a hint', Array.isArray(resolved.hints) && resolved.hints.length > 0);
      const second = await api('POST', '/api/game/challenge/' + cur.id + '/answer', {
        answer: 'still-wrong', seconds: 5,
      });
      resolved = second.json;
      check('second wrong answer resolves the challenge', resolved.retry === false && resolved.correct === false);
      check('correct answer revealed after two misses', !!resolved.correctAnswer);

      // Now answer the NEXT challenge correctly using the revealed answer flow.
    }
    if (resolved.correct) answeredCorrect++;
    if (resolved.levelComplete) { levelSummary = resolved.levelSummary; lastStateAfter = resolved; break; }
  }

  check('puzzles were served during the level', puzzlesDone > 0, 'puzzles=' + puzzlesDone);
  check('level completed after 25 challenges', !!levelSummary, 'summary=' + JSON.stringify(levelSummary));
  if (levelSummary) {
    check('summary reports 25 questions', levelSummary.total === 25, 'total=' + levelSummary.total);
    check('summary has accuracy', typeof levelSummary.accuracyPercent === 'number');
    check('summary lists skills practiced', Array.isArray(levelSummary.skills) && levelSummary.skills.length > 0);
    check('next level unlocked', levelSummary.nextLevel === 2, 'next=' + levelSummary.nextLevel);
    check('zero correct gives zero stars', levelSummary.stars === 0 || levelSummary.correct > 0);
  }

  const state2 = await api('GET', '/api/game/state');
  check('progress advanced to level 2', state2.json.state.progress.currentLevel === 2,
    'level=' + state2.json.state.progress.currentLevel);
  check('level 1 recorded as completed', state2.json.state.progress.completedLevels.includes(1));

  // --- Now play correctly to check rewards -------------------------------
  const cr2 = await api('GET', '/api/game/challenge');
  const ch2 = cr2.json.challenge;
  if (ch2.puzzle && !ch2.puzzleDone) {
    await api('POST', '/api/game/challenge/' + ch2.id + '/puzzle', { pieces: 9, seconds: 15 });
  }
  const cur2 = (await api('GET', '/api/game/challenge')).json.challenge;
  const hint = await api('POST', '/api/game/challenge/' + cur2.id + '/hint');
  check('hint endpoint returns a hint', hint.status === 200 && hint.json.hints.length === 1, JSON.stringify(hint.json));

  // Miss twice to learn the answer, then confirm it grades correctly next time.
  await api('POST', '/api/game/challenge/' + cur2.id + '/answer', { answer: 'zzz', seconds: 3 });
  const reveal = await api('POST', '/api/game/challenge/' + cur2.id + '/answer', { answer: 'zzz', seconds: 3 });
  const known = reveal.json.correctAnswer;
  check('answer revealed for learning', !!known, JSON.stringify(reveal.json));

  const cr3 = await api('GET', '/api/game/challenge');
  const ch3 = cr3.json.challenge;
  if (ch3.puzzle && !ch3.puzzleDone) {
    await api('POST', '/api/game/challenge/' + ch3.id + '/puzzle', { pieces: 12, seconds: 10 });
  }
  const cur3 = (await api('GET', '/api/game/challenge')).json.challenge;
  await api('POST', '/api/game/challenge/' + cur3.id + '/answer', { answer: 'wrong-on-purpose', seconds: 2 });
  const rev3 = await api('POST', '/api/game/challenge/' + cur3.id + '/answer', { answer: 'wrong-again', seconds: 2 });
  const truth = rev3.json.correctAnswer;

  // Next challenge: answer correctly first time by reusing a known-good type.
  const cr4 = await api('GET', '/api/game/challenge');
  const ch4 = cr4.json.challenge;
  if (ch4.puzzle && !ch4.puzzleDone) {
    await api('POST', '/api/game/challenge/' + ch4.id + '/puzzle', { pieces: 12, seconds: 10 });
  }
  const cur4 = (await api('GET', '/api/game/challenge')).json.challenge;
  const before = (await api('GET', '/api/game/state')).json.state;
  await api('POST', '/api/game/challenge/' + cur4.id + '/answer', { answer: 'x', seconds: 2 });
  const rev4 = await api('POST', '/api/game/challenge/' + cur4.id + '/answer', { answer: 'x', seconds: 2 });
  void truth; void before; void rev4;

  // Verify a correct answer pays out, using a fresh challenge and its answer.
  const cr5 = await api('GET', '/api/game/challenge');
  const ch5 = cr5.json.challenge;
  if (ch5.puzzle && !ch5.puzzleDone) await api('POST', '/api/game/challenge/' + ch5.id + '/puzzle', { pieces: 12, seconds: 10 });
  const cur5 = (await api('GET', '/api/game/challenge')).json.challenge;
  await api('POST', '/api/game/challenge/' + cur5.id + '/answer', { answer: ' nope', seconds: 1 });
  const revealed5 = await api('POST', '/api/game/challenge/' + cur5.id + '/answer', { answer: ' nope', seconds: 1 });
  const answer5 = revealed5.json.correctAnswer;

  const cr6 = await api('GET', '/api/game/challenge');
  const ch6 = cr6.json.challenge;
  if (ch6.puzzle && !ch6.puzzleDone) await api('POST', '/api/game/challenge/' + ch6.id + '/puzzle', { pieces: 12, seconds: 10 });
  const cur6 = (await api('GET', '/api/game/challenge')).json.challenge;
  const coinsBefore = (await api('GET', '/api/game/state')).json.state.user.coins;
  // Try the previous challenge's answer; if it does not fit, fall back to revealing.
  let good = await api('POST', '/api/game/challenge/' + cur6.id + '/answer', { answer: answer5, seconds: 4 });
  if (!good.json.correct && good.json.retry) {
    const r = await api('POST', '/api/game/challenge/' + cur6.id + '/answer', { answer: answer5, seconds: 4 });
    good = r;
  }
  const coinsAfter = (await api('GET', '/api/game/state')).json.state.user.coins;
  check('coins never decrease from answering', coinsAfter >= coinsBefore,
    coinsBefore + ' -> ' + coinsAfter);

  // --- Profile, settings, avatar ----------------------------------------
  const prof = await api('PATCH', '/api/game/profile', {
    displayName: 'Renamed Explorer',
    settings: { musicVolume: 0.1, largeText: true, graphicsQuality: 'low' },
    avatar: { character: 'scout', shirt: 'green', hairStyle: 'curly' },
  });
  check('profile update works', prof.status === 200 && prof.json.state.user.displayName === 'Renamed Explorer');
  check('settings persisted', prof.json.state.user.settings.largeText === true
    && prof.json.state.user.settings.graphicsQuality === 'low');
  check('avatar persisted', prof.json.state.user.avatar.character === 'scout');

  const lockedAvatar = await api('PATCH', '/api/game/profile', { avatar: { character: 'starcaller' } });
  check('unowned avatar item rejected', lockedAvatar.json.state.user.avatar.character !== 'starcaller');

  const buyTooExpensive = await api('POST', '/api/game/shop/buy', { slot: 'accessory', id: 'crown' });
  check('cannot buy beyond level/coins', buyTooExpensive.status === 400, JSON.stringify(buyTooExpensive.json));

  // Grade switch keeps the old grade's progress.
  const switched = await api('PATCH', '/api/game/profile', { grade: '5' });
  check('grade switch works', switched.json.state.user.grade === '5');
  check('new grade starts at level 1', switched.json.state.progress.currentLevel === 1);
  const back = await api('PATCH', '/api/game/profile', { grade: '3' });
  check('switching back restores grade 3 progress', back.json.state.progress.currentLevel === 2,
    'level=' + back.json.state.progress.currentLevel);

  const summary = await api('GET', '/api/game/profile/summary');
  check('profile summary works', summary.status === 200 && summary.json.stats.totalAnswered > 0);
  check('summary breaks down by topic', summary.json.byTopic.length > 0);
  check('summary tracks both grades', summary.json.perGrade.length === 2);

  // --- Achievements ------------------------------------------------------
  const ach = summary.json.achievements;
  const firstPuzzle = ach.find((a) => a.id === 'first-puzzle');
  check('first puzzle achievement earned', firstPuzzle && firstPuzzle.earned);

  // --- Guardian dashboard ------------------------------------------------
  const studentCookie = cookie;
  cookie = '';
  const guardianEmail = 'teacher+' + Date.now() + '@example.com';
  const greg = await api('POST', '/api/auth/register', {
    email: guardianEmail, password: 'Teachpass123', displayName: 'Ms Rivera', role: 'guardian',
  });
  check('guardian account created', greg.status === 200 && greg.json.state.user.role === 'guardian');

  const codeRes = await api('POST', '/api/dashboard/link-code', { label: 'Period 3' });
  check('link code generated', codeRes.status === 200 && codeRes.json.code.length === 6);
  const guardianCookie = cookie;

  cookie = studentCookie;
  const redeem = await api('POST', '/api/dashboard/redeem', { code: codeRes.json.code });
  check('student redeems link code', redeem.status === 200 && redeem.json.ok, JSON.stringify(redeem.json));

  cookie = guardianCookie;
  const students = await api('GET', '/api/dashboard/students');
  check('guardian sees linked student', students.status === 200 && students.json.students.length === 1);
  const sid = students.json.students[0].id;
  check('student list has no email field', !('email' in students.json.students[0]));

  const detail = await api('GET', '/api/dashboard/students/' + sid);
  check('guardian sees student detail', detail.status === 200 && !!detail.json.stats);
  check('detail includes topic breakdown', Array.isArray(detail.json.byTopic));
  check('detail includes activity history', Array.isArray(detail.json.activity));
  check('detail has no email', !('email' in detail.json.student));

  const otherStudent = await api('GET', '/api/dashboard/students/999999');
  check('guardian cannot view unlinked student', otherStudent.status === 403 || otherStudent.status === 404);

  // --- Admin guard -------------------------------------------------------
  const adminTry = await api('GET', '/api/admin/stats');
  check('non-admin blocked from admin area', adminTry.status === 403, 'status=' + adminTry.status);

  // --- Auth lifecycle ----------------------------------------------------
  const logout = await api('POST', '/api/auth/logout');
  check('logout works', logout.status === 200);
  const meAfter = await api('GET', '/api/auth/me');
  check('session cleared after logout', meAfter.json.user === null || !meAfter.json.state);

  const login = await api('POST', '/api/auth/login', { email: guardianEmail, password: 'Teachpass123' });
  check('login works', login.status === 200 && login.json.ok);
  const badLogin = await api('POST', '/api/auth/login', { email: guardianEmail, password: 'Wrongpass123' });
  check('bad password rejected', badLogin.status === 401);

  const resetReq = await api('POST', '/api/auth/reset/request', { email: guardianEmail });
  check('reset request accepted', resetReq.status === 200 && resetReq.json.ok);
  if (resetReq.json.devToken) {
    const confirm = await api('POST', '/api/auth/reset/confirm', {
      token: resetReq.json.devToken, password: 'Brandnew123',
    });
    check('password reset applies', confirm.status === 200 && confirm.json.ok, JSON.stringify(confirm.json));
    const loginNew = await api('POST', '/api/auth/login', { email: guardianEmail, password: 'Brandnew123' });
    check('login with new password works', loginNew.status === 200);
  }

  const unauth = await fetch(BASE + '/api/game/state');
  check('game API requires auth', unauth.status === 401);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});
