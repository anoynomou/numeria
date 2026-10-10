/**
 * Creative and spatial puzzle definitions.
 *
 * These come before the math question. Most of them are open ended on purpose:
 * completion is judged against basic requirements (a bridge must span the gap,
 * a vehicle must have an engine and enough wheels) rather than against one
 * exact arrangement, so two students can both succeed with different builds.
 *
 * Difficulty bands follow the brief: easy uses 2-4 objects, medium 5-8 with
 * multiple steps, hard adds more pieces and tighter constraints.
 */

import { mulberry32, hashSeed, ri, pick, shuffle } from '../math/helpers.js';

const BAND = (d) => (d <= 2 ? 'easy' : d <= 4 ? 'medium' : 'hard');

/* ------------------------------------------------------------------ */
/* Maze generation: recursive backtracker on an odd-sized grid.        */
/* ------------------------------------------------------------------ */
function generateMaze(rng, cols, rows) {
  // grid[r][c] = 1 wall, 0 open
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  const inBounds = (r, c) => r > 0 && c > 0 && r < rows - 1 && c < cols - 1;
  const stack = [[1, 1]];
  grid[1][1] = 0;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const dirs = shuffle(rng, [[0, 2], [0, -2], [2, 0], [-2, 0]]);
    let carved = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && grid[nr][nc] === 1) {
        grid[r + dr / 2][c + dc / 2] = 0;
        grid[nr][nc] = 0;
        stack.push([nr, nc]);
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }
  const start = [1, 1];
  const end = [rows - 2, cols - 2];
  grid[end[0]][end[1]] = 0;
  return { grid, start, end };
}

/* ------------------------------------------------------------------ */
/* Spatial fit: cut the target outline into rotatable pieces.          */
/* ------------------------------------------------------------------ */

/** Shift a set of cells so its top-left corner sits at the origin. */
function normalizeCells(cells) {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Rotate cells 90 degrees clockwise, `times` times, re-anchored at the origin. */
function rotateCells(cells, times) {
  let out = cells.map((c) => [c[0], c[1]]);
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
    const maxR = Math.max(...out.map((c) => c[0]));
    out = out.map(([r, c]) => [c, maxR - r]);
  }
  return normalizeCells(out);
}

/**
 * Cut the target outline into `pieceCount` connected pieces.
 *
 * Generating the pieces *from* the target guarantees they can always tile it
 * completely, so the coverage requirement is always reachable. Picking random
 * tetromino-like shapes instead would regularly produce puzzles that cannot be
 * solved at all.
 */
function partitionTarget(rng, cells, pieceCount) {
  const key = (r, c) => r + ':' + c;
  const available = new Set(cells.map(([r, c]) => key(r, c)));
  const count = Math.max(1, Math.min(pieceCount, cells.length));

  const owner = new Map();
  const regionCells = [];
  for (const seed of shuffle(rng, cells).slice(0, count)) {
    owner.set(key(seed[0], seed[1]), regionCells.length);
    regionCells.push([seed]);
  }

  // A cell this region could still grow into, or null if it is boxed in.
  const freeNeighbourOf = (region) => {
    for (const [r, c] of shuffle(rng, region)) {
      const options = shuffle(rng, [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]);
      const free = options.find(([nr, nc]) => available.has(key(nr, nc)) && !owner.has(key(nr, nc)));
      if (free) return free;
    }
    return null;
  };

  // A soft cap keeps the pieces roughly even so no single piece is most of the
  // shape. It lifts once every region under the cap is boxed in.
  const cap = Math.ceil(cells.length / regionCells.length) + 1;
  let assigned = regionCells.length;

  while (assigned < cells.length) {
    let grewAny = false;
    for (const enforceCap of [true, false]) {
      for (let i = 0; i < regionCells.length && assigned < cells.length; i++) {
        if (enforceCap && regionCells[i].length >= cap) continue;
        const free = freeNeighbourOf(regionCells[i]);
        if (!free) continue;
        owner.set(key(free[0], free[1]), i);
        regionCells[i].push(free);
        assigned++;
        grewAny = true;
      }
      if (grewAny) break;
    }
    if (!grewAny) break;
  }

  // Any cell the growth could not reach joins a neighbouring piece.
  for (const [r, c] of cells) {
    if (owner.has(key(r, c))) continue;
    const neighbour = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]
      .map(([nr, nc]) => owner.get(key(nr, nc)))
      .find((v) => v !== undefined);
    owner.set(key(r, c), neighbour ?? 0);
  }

  const regions = Array.from({ length: regionCells.length }, () => []);
  for (const [r, c] of cells) regions[owner.get(key(r, c))].push([r, c]);
  return regions.filter((region) => region.length > 0).map(normalizeCells);
}

function spatialTarget(rng, d) {
  const w = [3, 4, 4, 5, 6][d - 1];
  const h = [3, 3, 4, 5, 5][d - 1];
  const cells = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells.push([r, c]);
  // Nibble a couple of corners at higher difficulty so the outline is not a plain box.
  if (d >= 3) {
    const corners = shuffle(rng, [[0, 0], [0, w - 1], [h - 1, 0], [h - 1, w - 1]]);
    const remove = d >= 5 ? 2 : 1;
    for (let i = 0; i < remove; i++) {
      const [rr, cc] = corners[i];
      const idx = cells.findIndex(([r, c]) => r === rr && c === cc);
      if (idx >= 0) cells.splice(idx, 1);
    }
  }
  return { w, h, cells };
}

/* ------------------------------------------------------------------ */
/* Puzzle catalogue                                                    */
/* ------------------------------------------------------------------ */

export const PUZZLE_TYPES = [
  {
    id: 'build-bridge',
    name: 'Bridge Builder',
    kind: 'block-canvas',
    verb: 'Build',
    summary: 'Span a gap using building blocks.',
    build(rng, d) {
      const band = BAND(d);
      const blocks = { easy: 4, medium: 7, hard: 11 }[band];
      const gapWidth = { easy: 3, medium: 5, hard: 7 }[band];
      return {
        instruction: 'Build a bridge that connects both sides of the gap.',
        detail: 'Drag blocks into the gap. They must touch each other and reach from the left ledge to the right ledge.',
        canvas: { cols: gapWidth + 4, rows: 6 },
        gap: { from: 2, to: gapWidth + 1 },
        tray: [
          { type: 'plank', label: 'Plank', w: 2, h: 1, count: Math.ceil(blocks / 2), color: '#c08552' },
          { type: 'block', label: 'Block', w: 1, h: 1, count: blocks, color: '#8d6e52' },
          { type: 'pillar', label: 'Pillar', w: 1, h: 2, count: Math.max(2, Math.floor(blocks / 3)), color: '#6b7280' },
        ],
        requirements: {
          kind: 'span',
          description: 'Connect the left ledge to the right ledge with touching blocks.',
          minPieces: { easy: 3, medium: 5, hard: 7 }[band],
        },
      };
    },
  },
  {
    id: 'shape-house',
    name: 'Shape Architect',
    kind: 'shape-canvas',
    verb: 'Create',
    summary: 'Compose a structure from different shapes.',
    build(rng, d) {
      const band = BAND(d);
      const distinct = { easy: 3, medium: 4, hard: 4 }[band];
      const minShapes = { easy: 4, medium: 7, hard: 10 }[band];
      const subject = pick(rng, ['house', 'watchtower', 'workshop', 'observatory', 'market stall']);
      return {
        instruction: 'Create a ' + subject + ' using at least ' + distinct + ' different kinds of shapes.',
        detail: 'Drag shapes onto the canvas. Resize and arrange them however you like. There is no single right answer.',
        canvas: { width: 560, height: 380 },
        tray: [
          { type: 'square', label: 'Square', color: '#f4a261' },
          { type: 'rectangle', label: 'Rectangle', color: '#e76f51' },
          { type: 'triangle', label: 'Triangle', color: '#2a9d8f' },
          { type: 'circle', label: 'Circle', color: '#457b9d' },
          { type: 'trapezoid', label: 'Trapezoid', color: '#9d4edd' },
        ],
        requirements: {
          kind: 'composition',
          description: 'Use at least ' + minShapes + ' shapes, covering at least ' + distinct + ' different kinds.',
          minPieces: minShapes,
          minDistinct: distinct,
        },
      };
    },
  },
  {
    id: 'pattern',
    name: 'Pattern Puzzle',
    kind: 'pattern',
    verb: 'Continue',
    summary: 'Work out the rule and continue the pattern.',
    build(rng, d) {
      const band = BAND(d);
      const palette = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'];
      const shapes = ['circle', 'square', 'triangle', 'diamond', 'star'];
      const ruleKind = pick(rng, band === 'easy' ? ['color', 'shape'] : ['color', 'shape', 'both', 'size']);
      const period = band === 'easy' ? 2 : band === 'medium' ? 3 : pick(rng, [3, 4]);
      const show = band === 'easy' ? 6 : band === 'medium' ? 8 : 9;
      const ask = band === 'easy' ? 1 : band === 'medium' ? 2 : 3;

      const colorCycle = shuffle(rng, palette).slice(0, period);
      const shapeCycle = shuffle(rng, shapes).slice(0, period);
      const sizeCycle = [1, 0.72, 1.24, 0.9].slice(0, period);

      const at = (i) => ({
        color: ruleKind === 'shape' || ruleKind === 'size' ? colorCycle[0] : colorCycle[i % period],
        shape: ruleKind === 'color' || ruleKind === 'size' ? shapeCycle[0] : shapeCycle[i % period],
        size: ruleKind === 'size' ? sizeCycle[i % period] : 1,
      });

      const sequence = Array.from({ length: show }, (_, i) => at(i));
      const answer = Array.from({ length: ask }, (_, i) => at(show + i));
      // Tray holds the right answers plus believable decoys.
      const decoys = [];
      for (let i = 0; i < 4; i++) {
        decoys.push({
          color: pick(rng, colorCycle),
          shape: pick(rng, shapeCycle),
          size: ruleKind === 'size' ? pick(rng, sizeCycle) : 1,
        });
      }
      const key = (t) => t.shape + '|' + t.color + '|' + t.size;
      const seen = new Set(answer.map(key));
      const tray = shuffle(rng, [...answer, ...decoys.filter((t) => !seen.has(key(t)))]).slice(0, ask + 4);
      return {
        instruction: 'Continue the pattern. Drag the next ' + ask + ' item' + (ask === 1 ? '' : 's') + ' into the empty slots.',
        detail: 'Look carefully at what changes from one item to the next.',
        sequence,
        blanks: ask,
        tray,
        answer: answer.map(key),
        requirements: { kind: 'sequence', description: 'Place the correct items in order.' },
      };
    },
  },
  {
    id: 'sorting',
    name: 'Sorting Station',
    kind: 'sorting',
    verb: 'Sort',
    summary: 'Drag each object into the right category.',
    build(rng, d) {
      const band = BAND(d);
      const sets = [
        {
          title: 'Sort the supplies',
          bins: [
            { id: 'round', label: 'Round things', items: ['barrel', 'wheel', 'ball', 'ring', 'coin'] },
            { id: 'flat', label: 'Flat things', items: ['plank', 'panel', 'sheet', 'tile', 'card'] },
            { id: 'tall', label: 'Tall things', items: ['pillar', 'mast', 'ladder', 'pole', 'tower'] },
          ],
        },
        {
          title: 'Sort by number type',
          bins: [
            { id: 'even', label: 'Even numbers', items: ['2', '8', '14', '26', '40'] },
            { id: 'odd', label: 'Odd numbers', items: ['3', '7', '15', '29', '41'] },
          ],
        },
        {
          title: 'Sort the shapes',
          bins: [
            { id: 'three', label: '3 sides', items: ['triangle', 'pyramid face', 'wedge'] },
            { id: 'four', label: '4 sides', items: ['square', 'rectangle', 'rhombus', 'trapezoid'] },
            { id: 'curved', label: 'Curved', items: ['circle', 'oval', 'crescent'] },
          ],
        },
        {
          title: 'Sort by size',
          bins: [
            { id: 'small', label: 'Small', items: ['bolt', 'gem', 'seed', 'chip'] },
            { id: 'large', label: 'Large', items: ['crate', 'boulder', 'engine', 'gate'] },
          ],
        },
      ];
      const set = pick(rng, sets);
      const perBin = { easy: 2, medium: 3, hard: 4 }[band];
      const bins = set.bins.slice(0, band === 'easy' ? Math.min(2, set.bins.length) : set.bins.length);
      const items = [];
      for (const bin of bins) {
        for (const label of shuffle(rng, bin.items).slice(0, perBin)) {
          items.push({ id: bin.id + ':' + label, label, bin: bin.id });
        }
      }
      return {
        instruction: set.title + '. Drag every object into the correct bin.',
        detail: 'Every object belongs in exactly one bin.',
        bins: bins.map((b) => ({ id: b.id, label: b.label })),
        items: shuffle(rng, items),
        requirements: { kind: 'classification', description: 'Place all ' + items.length + ' objects correctly.' },
      };
    },
  },
  {
    id: 'maze',
    name: 'Maze Runner',
    kind: 'maze',
    verb: 'Navigate',
    summary: 'Guide the character from start to finish.',
    build(rng, d) {
      const size = [7, 9, 11, 13, 15][d - 1];
      const { grid, start, end } = generateMaze(rng, size, size);
      return {
        instruction: 'Guide the explorer through the maze to the glowing exit.',
        detail: 'Use the arrow keys, swipe, or tap the on-screen pad to move.',
        grid,
        start,
        end,
        requirements: { kind: 'reach-exit', description: 'Reach the exit tile.' },
      };
    },
  },
  {
    id: 'spatial-fit',
    name: 'Spatial Fit',
    kind: 'spatial',
    verb: 'Fit',
    summary: 'Rotate pieces until they fill the target shape.',
    build(rng, d) {
      const target = spatialTarget(rng, d);
      const pieceCount = { easy: 3, medium: 4, hard: 5 }[BAND(d)];
      const regions = partitionTarget(rng, target.cells, pieceCount);
      // Hand the pieces over pre-rotated so there is something to work out.
      const tray = shuffle(rng, regions).map((cells, i) => ({
        id: 'p' + i,
        name: String.fromCharCode(65 + i),
        cells: rotateCells(cells, ri(rng, 0, 3)),
        color: ['#f97316', '#0ea5e9', '#22c55e', '#e11d48', '#a855f7', '#f59e0b'][i % 6],
        rotation: 0,
      }));
      return {
        instruction: 'Fit the pieces inside the target outline without overlapping.',
        detail: 'Click or tap a piece to rotate it, then drag it into the outline. Cover as much of the outline as you can.',
        target,
        tray,
        requirements: {
          kind: 'coverage',
          description: 'Cover at least ' + (d <= 2 ? 60 : d <= 4 ? 70 : 75) + '% of the outline with no overlaps.',
          minCoverage: d <= 2 ? 0.6 : d <= 4 ? 0.7 : 0.75,
        },
      };
    },
  },
  {
    id: 'vehicle',
    name: 'Vehicle Workshop',
    kind: 'parts-canvas',
    verb: 'Assemble',
    summary: 'Assemble a working vehicle from parts.',
    build(rng, d) {
      const band = BAND(d);
      const wheels = { easy: 4, medium: 4, hard: 6 }[band];
      const blocks = { easy: 4, medium: 6, hard: 8 }[band];
      return {
        instruction: 'Build a vehicle that can carry cargo.',
        detail: 'It needs an engine, at least ' + wheels + ' wheels, and every part must be connected to the body.',
        canvas: { width: 600, height: 380 },
        tray: [
          { type: 'wheel', label: 'Wheel', count: wheels + 2, color: '#374151', shape: 'circle', w: 46, h: 46 },
          { type: 'body', label: 'Body block', count: blocks, color: '#0ea5e9', shape: 'rect', w: 76, h: 44 },
          { type: 'connector', label: 'Connector', count: Math.max(2, Math.floor(blocks / 2)), color: '#94a3b8', shape: 'rect', w: 40, h: 16 },
          { type: 'engine', label: 'Engine', count: 1, color: '#ef4444', shape: 'rect', w: 64, h: 52 },
        ],
        requirements: {
          kind: 'vehicle',
          description: 'Include 1 engine, at least ' + wheels + ' wheels, and keep every part connected.',
          needEngine: true,
          minWheels: wheels,
          requireConnected: true,
        },
      };
    },
  },
  {
    id: 'free-design',
    name: 'Design Studio',
    kind: 'shape-canvas',
    verb: 'Design',
    summary: 'Open canvas design challenge.',
    build(rng, d) {
      const band = BAND(d);
      const subject = pick(rng, ['robot', 'playground', 'spaceship', 'bridge', 'house', 'vehicle', 'garden']);
      const minShapes = { easy: 5, medium: 8, hard: 12 }[band];
      const distinct = { easy: 2, medium: 3, hard: 4 }[band];
      return {
        instruction: 'Design your own ' + subject + '.',
        detail: 'There is no single right answer. Use at least ' + minShapes + ' pieces and at least ' + distinct +
          ' different kinds, then submit your design.',
        canvas: { width: 600, height: 400 },
        freeform: true,
        tray: [
          { type: 'square', label: 'Square', color: '#f4a261' },
          { type: 'rectangle', label: 'Rectangle', color: '#e76f51' },
          { type: 'triangle', label: 'Triangle', color: '#2a9d8f' },
          { type: 'circle', label: 'Circle', color: '#457b9d' },
          { type: 'trapezoid', label: 'Trapezoid', color: '#9d4edd' },
        ],
        requirements: {
          kind: 'composition',
          description: 'Use at least ' + minShapes + ' pieces across at least ' + distinct + ' different kinds.',
          minPieces: minShapes,
          minDistinct: distinct,
        },
      };
    },
  },
];

export const PUZZLE_BY_ID = Object.fromEntries(PUZZLE_TYPES.map((p) => [p.id, p]));

/** Puzzle types that suit a given station kind, so a sign never asks for a vehicle. */
const STATION_AFFINITY = {
  npc: ['vehicle', 'sorting', 'free-design', 'maze', 'shape-house', 'build-bridge'],
  object: ['build-bridge', 'spatial-fit', 'shape-house', 'sorting', 'vehicle'],
  sign: ['pattern', 'sorting'],
  door: ['spatial-fit', 'pattern', 'maze'],
};

export function puzzleTypeForStation(rng, stationKind) {
  const pool = STATION_AFFINITY[stationKind] || PUZZLE_TYPES.map((p) => p.id);
  return pick(rng, pool);
}

/**
 * Build a concrete puzzle instance. Deterministic for a given seed so a student
 * who reloads mid-challenge sees the same puzzle.
 */
export function generatePuzzle({ puzzleId, difficulty = 2, seed }) {
  const rng = mulberry32(hashSeed(String(seed ?? Math.random())));
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));
  const def = PUZZLE_BY_ID[puzzleId] || PUZZLE_TYPES[0];
  const data = def.build(rng, d);
  return {
    puzzleId: def.id,
    name: def.name,
    kind: def.kind,
    difficulty: d,
    band: BAND(d),
    ...data,
  };
}
