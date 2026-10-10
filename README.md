# Numeria — a 3D math adventure for K–8

Students explore a 3D world, meet characters, solve a creative building puzzle,
and then answer a math question pitched at their grade. Rewards unlock more of
the world.

**Explore → Interact → Create → Solve → Learn → Reward → Progress**

---

## Running it

Requires **Node.js 22.5 or newer** (it uses Node's built-in SQLite, so there is
nothing to install for the database).

```bash
npm run install:all     # installs root, server and client dependencies
npm run dev             # starts the API on :4000 and the client on :5173
```

Then open the URL Vite prints (usually http://localhost:5173).

For a production-style run on a single port:

```bash
npm run build           # builds the client
npm start               # serves the API and the built client on :4000
```

### The admin account

On first start the server creates an admin account and prints the password
**once**:

```
Email:    admin@numeria.local
Password: <generated>
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first start to choose your own.
Sign in with it to reach the admin dashboard from the home screen.

### Tests

```bash
node server/test/math.test.mjs    # generates 17,800 questions and checks them
node server/test/api.test.mjs     # end-to-end API run (needs the server up)
```

---

## How it is put together

```
server/              Node + Express API, SQLite via node:sqlite
  src/math/          question generators, one file per grade (K–8)
  src/content/       worlds, levels, puzzles, achievements, avatars
  src/routes/        auth, game, dashboard, admin
  src/gameService.js the learning loop: challenges, grading, rewards, levels
client/              React + TypeScript + React Three Fiber
  src/world/         the 3D scene, avatar, scenery, stations, controls
  src/puzzles/       the creative challenges
  src/math/          the question screen
  src/screens/       auth, onboarding, hub, map, profile, settings, dashboards
```

**No art or audio assets.** Characters, scenery and props are built from
geometric primitives, and all sound is synthesised with the Web Audio API. The
whole app is about 1 MB gzipped, and the 3D engine only loads when a student
presses Play. That is deliberate: it has to start quickly on school Chromebooks.

### The learning loop

A grade has **10 levels × 25 challenges = 250 interactions**. Roughly every
other challenge opens with a creative puzzle before the math question.

1. A golden beacon marks the next objective in the world.
2. The student walks over, interacts, and a character sets up the task.
3. A creative puzzle appears (build a bridge, assemble a vehicle, continue a
   pattern, sort objects, fit shapes, run a maze, design something).
4. A grade-level math question follows — sometimes referring back to what was
   just built ("you used 12 blocks...").
5. Correct answers pay XP and coins; coins buy avatar items.

### Math questions

Questions are **generated**, not a fixed list, so students do not memorise a
bank. There are 89 generators across the nine grades, each producing questions
at five difficulty levels with three escalating hints and a worked explanation.
Many render a real diagram: clock faces, base-ten blocks, arrays, fraction bars,
coordinate grids, scatter plots, solids.

Answers are graded **on the server**. The correct answer is never sent to the
browser until the question is resolved. Grading accepts equivalent forms —
`0.5` and `1/2`, `(3, 5)` and `3,5`, `3x + 10` and `3x+10` — and units typed
alongside a number.

### Difficulty adapts

Each level plans a difficulty curve. On top of that, the student's recent
results shift an offset of ±1.5: a run of correct answers stretches them, a run
of misses eases off. A wrong answer is never a dead end — the first miss gives a
hint and another try, and the second shows the worked explanation before moving
on.

### Puzzles are open-ended on purpose

Completion is judged against basic requirements, not one exact solution. A
vehicle needs an engine, four wheels and every part connected; a design needs
enough pieces across enough shape types. Two students can both succeed with
completely different builds. The spatial-fit pieces are cut from the target
shape, so a complete solution always exists.

---

## Accounts and privacy

- Passwords are hashed with **scrypt** and a per-user salt; sessions are random
  tokens stored hashed, in httpOnly cookies. Plain passwords are never stored.
- Login is rate limited, and a wrong email and a wrong password give the same
  message so accounts cannot be enumerated.
- Student profiles are **not public**. Teachers and parents see only students
  who connected themselves with a 6-letter code, and that view contains progress
  data only — no email address or contact details.
- Changing grade never deletes progress: each grade keeps its own row.
- Coins are in-game only. There is nothing to buy with real money and no
  randomised rewards.

**Password reset has no mail service wired up.** In development the reset token
comes back in the response and is logged to the console. Before real use, send
it by email instead and return only the generic acknowledgement — see
`server/src/routes/auth.js`.

---

## Accessibility

Keyboard navigation throughout; puzzles are playable with arrow keys and Enter.
Settings offer larger text, high contrast, a colour-blind-safe palette, reduced
motion, and read-aloud for questions and hints. Every meaningful control has a
label, and the interface works down to a 390px-wide phone screen.

---

## Dashboards

**Teacher / parent** — connect students with a generated code, then see
progress, accuracy, time spent, topics practised, topics they are struggling
with, strengths, daily activity and recent answers.

**Admin** — usage statistics, the hardest topics across all students, the full
curriculum (every skill in every grade), level plans, a question preview tool, a
custom question bank that mixes authored questions into the generated pool, user
management and reported bugs.

---

## Known gaps

- Password reset needs an email service (above).
- Five worlds are built, covering the ten levels of a grade two levels each.
- Social sign-in (Google, Microsoft, school accounts) is not implemented; the
  auth layer is structured so it can be added alongside email.
