import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PuzzleData } from '../lib/types';
import { audio } from '../lib/audio';

/** Guide the explorer from the start tile to the glowing exit. */
export function MazePuzzle({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const grid = puzzle.grid || [[0]];
  const start = puzzle.start || [1, 1];
  const end = puzzle.end || [grid.length - 2, (grid[0]?.length || 3) - 2];

  const [pos, setPos] = useState<[number, number]>([start[0], start[1]]);
  const [steps, setSteps] = useState(0);
  const [trail, setTrail] = useState<Set<string>>(() => new Set([start[0] + ':' + start[1]]));
  const boardRef = useRef<HTMLDivElement>(null);

  const rows = grid.length;
  const cols = grid[0]?.length || 1;
  const reached = pos[0] === end[0] && pos[1] === end[1];

  function move(dr: number, dc: number) {
    setPos(([r, c]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return [r, c];
      if (grid[nr][nc] === 1) return [r, c];
      setSteps((s) => s + 1);
      setTrail((t) => new Set(t).add(nr + ':' + nc));
      audio.footstep();
      return [nr, nc];
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      const m = moves[e.key] || moves[e.key.toLowerCase()];
      if (m) {
        e.preventDefault();
        move(m[0], m[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grid, rows, cols]);

  // Swipe support for tablets.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let active = false;
    const down = (e: PointerEvent) => { active = true; sx = e.clientX; sy = e.clientY; };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
      else move(dy > 0 ? 1 : -1, 0);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
    };
  }, [grid, rows, cols]);

  // Requirements only, so a plain chip never looks like an unmet goal.
  // The step count is informational and rendered separately.
  const report = useMemo(
    () => [reached ? '✓ you reached the exit' : '○ find your way to the exit'],
    [reached]
  );

  useEffect(() => {
    onValidityChange(reached, steps, report);
  }, [reached, steps, report, onValidityChange]);

  const cellSize = Math.max(14, Math.min(30, Math.floor(420 / cols)));

  return (
    <div className="col">
      <div className="puzzle-stage" style={{ padding: 14 }} ref={boardRef}>
        <div
          className="maze-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
          role="img"
          aria-label={
            'Maze, ' + rows + ' by ' + cols + '. You are at row ' + (pos[0] + 1) + ', column ' + (pos[1] + 1) +
            '. The exit is at row ' + (end[0] + 1) + ', column ' + (end[1] + 1) + '.'
          }
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = pos[0] === r && pos[1] === c;
              const isEnd = end[0] === r && end[1] === c;
              const isStart = start[0] === r && start[1] === c;
              const visited = trail.has(r + ':' + c);
              let bg = cell === 1 ? '#2b3a68' : 'rgba(255,255,255,0.09)';
              if (visited && cell === 0) bg = 'rgba(255,209,102,0.18)';
              if (isEnd) bg = '#34d399';
              if (isStart && !isPlayer) bg = 'rgba(56,189,248,0.4)';
              return (
                <div
                  key={r + ':' + c}
                  className="maze-cell"
                  style={{
                    width: cellSize, height: cellSize, background: bg,
                    display: 'grid', placeItems: 'center', fontSize: cellSize * 0.62, lineHeight: 1,
                  }}
                >
                  {isPlayer ? <span aria-hidden="true">🙂</span> : isEnd ? <span aria-hidden="true">🚪</span> : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="maze-pad" aria-label="Direction pad">
        <span />
        <button className="btn" onClick={() => move(-1, 0)} aria-label="Move up">▲</button>
        <span />
        <button className="btn" onClick={() => move(0, -1)} aria-label="Move left">◀</button>
        <button className="btn" onClick={() => { audio.click(); setPos([start[0], start[1]]); setSteps(0); setTrail(new Set([start[0] + ':' + start[1]])); }} aria-label="Back to start">⟲</button>
        <button className="btn" onClick={() => move(0, 1)} aria-label="Move right">▶</button>
        <span />
        <button className="btn" onClick={() => move(1, 0)} aria-label="Move down">▼</button>
        <span />
      </div>

      <div className="faint tiny" style={{ textAlign: 'center' }}>
        Use the arrow keys, swipe the maze, or tap the pad.
      </div>

      <div className="card-soft">
        {report.map((line, i) => (
          <div key={i} className={line.startsWith('✓') ? 'chip chip-good' : 'chip'} style={{ margin: '3px 6px 3px 0' }}>
            {line}
          </div>
        ))}
        <div className="faint tiny" style={{ marginTop: 6 }}>
          {steps} step{steps === 1 ? '' : 's'} taken
        </div>
      </div>
    </div>
  );
}
