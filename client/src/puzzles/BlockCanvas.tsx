import React, { useState, useMemo, useEffect } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';

interface Placed {
  uid: string;
  type: string;
  label: string;
  color: string;
  row: number;
  col: number;
  w: number;
  h: number;
}

/**
 * Grid bridge builder.
 *
 * Pieces are placed by picking one from the tray and tapping a cell, which
 * works identically with a mouse, a finger and the keyboard. The bridge counts
 * as finished when a connected run of blocks joins the left ledge to the right
 * one, so there are many valid bridges rather than one intended answer.
 */
export function BlockCanvas({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const cols = puzzle.canvas?.cols || 8;
  const rows = puzzle.canvas?.rows || 6;
  const gap = puzzle.gap || { from: 2, to: cols - 3 };
  const req = puzzle.requirements || {};
  const tray = puzzle.tray || [];

  const [placed, setPlaced] = useState<Placed[]>([]);
  const [pick, setPick] = useState<string>(tray[0]?.type || 'block');
  const [message, setMessage] = useState('');
  const [cursor, setCursor] = useState<{ row: number; col: number }>({ row: rows - 2, col: gap.from });

  /** Cells occupied by the fixed ledges on each side of the gap. */
  const ledgeCells = useMemo(() => {
    const set = new Set<string>();
    for (let c = 0; c < cols; c++) {
      if (c < gap.from || c > gap.to) {
        set.add((rows - 1) + ':' + c);
      }
    }
    return set;
  }, [cols, rows, gap.from, gap.to]);

  const occupied = useMemo(() => {
    const map = new Map<string, Placed>();
    for (const p of placed) {
      for (let r = 0; r < p.h; r++) {
        for (let c = 0; c < p.w; c++) {
          map.set((p.row + r) + ':' + (p.col + c), p);
        }
      }
    }
    return map;
  }, [placed]);

  const usedByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of placed) m[p.type] = (m[p.type] || 0) + 1;
    return m;
  }, [placed]);

  /** Types that still have pieces left in the tray. */
  const available = useMemo(
    () => tray.filter((t: any) => !t.count || (usedByType[t.type] || 0) < t.count),
    [tray, usedByType]
  );

  // If the selected block runs out, move the selection to one that is left.
  // Without this a student clicks the grid and nothing happens, with no clue why.
  useEffect(() => {
    if (available.length && !available.some((t: any) => t.type === pick)) {
      setPick(available[0].type);
      setMessage('You have used all the ' + (tray.find((t: any) => t.type === pick)?.label || 'blocks') +
        ' pieces, so ' + available[0].label + ' is selected now.');
    }
  }, [available, pick, tray]);

  function tryPlace(row: number, col: number) {
    const existing = occupied.get(row + ':' + col);
    if (existing) {
      audio.click();
      setMessage('');
      setPlaced((prev) => prev.filter((p) => p.uid !== existing.uid));
      return;
    }
    if (ledgeCells.has(row + ':' + col)) {
      setMessage('The grey ledges are fixed. Build in the gap between them.');
      return;
    }

    const t = tray.find((x: any) => x.type === pick);
    if (!t) return;
    if (t.count && (usedByType[t.type] || 0) >= t.count) {
      setMessage('No ' + t.label + ' pieces left. Pick a different block above.');
      audio.encourage();
      return;
    }

    const w = t.w || 1;
    const h = t.h || 1;
    // The whole footprint must be inside the grid and clear.
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) {
          setMessage('A ' + t.label + ' is ' + w + ' by ' + h + ' and will not fit there. Try another spot.');
          return;
        }
        if (occupied.has(rr + ':' + cc) || ledgeCells.has(rr + ':' + cc)) {
          setMessage('Something is already in the way there.');
          return;
        }
      }
    }
    audio.click();
    setMessage('');
    setPlaced((prev) => [
      ...prev,
      { uid: 'b' + Date.now() + Math.random(), type: t.type, label: t.label, color: t.color, row, col, w, h },
    ]);
  }

  /** Is there a connected run of solid cells from the left ledge to the right? */
  const { valid, report } = useMemo(() => {
    const solid = new Set<string>([...ledgeCells, ...occupied.keys()]);
    const leftStarts: string[] = [];
    for (const key of solid) {
      const [r, c] = key.split(':').map(Number);
      if (c === gap.from - 1) leftStarts.push(r + ':' + c);
    }

    const seen = new Set(leftStarts);
    const queue = [...leftStarts];
    let reachedRight = false;
    while (queue.length) {
      const key = queue.shift()!;
      const [r, c] = key.split(':').map(Number);
      if (c >= gap.to + 1) { reachedRight = true; break; }
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nk = (r + dr) + ':' + (c + dc);
        if (!seen.has(nk) && solid.has(nk)) {
          seen.add(nk);
          queue.push(nk);
        }
      }
    }

    const minPieces = req.minPieces || 3;
    const lines = [
      (placed.length >= minPieces ? '✓' : '○') + ' ' + placed.length + ' of ' + minPieces + ' blocks used',
      (reachedRight ? '✓' : '○') + ' the two ledges are joined',
    ];
    return { valid: reachedRight && placed.length >= minPieces, report: lines };
  }, [occupied, ledgeCells, gap.from, gap.to, placed.length, req.minPieces]);

  useEffect(() => {
    onValidityChange(valid, placed.length, report);
  }, [valid, placed.length, report, onValidityChange]);

  return (
    <div className="col">
      <div className="puzzle-tray" role="group" aria-label="Choose a block">
        {tray.map((t: any) => {
          const left = t.count ? t.count - (usedByType[t.type] || 0) : null;
          return (
            <button
              key={t.type}
              className={'tray-item' + (pick === t.type ? ' selected' : '') + (left === 0 ? ' depleted' : '')}
              style={{ background: t.color }}
              disabled={left === 0}
              onClick={() => { audio.click(); setPick(t.type); }}
              aria-pressed={pick === t.type}
              aria-label={t.label + ' block, ' + (t.w || 1) + ' by ' + (t.h || 1) + (left !== null ? ', ' + left + ' left' : '')}
            >
              {t.label} {left !== null ? '(' + left + ')' : ''}
            </button>
          );
        })}
        {placed.length ? (
          <Btn size="sm" variant="ghost" onClick={() => { audio.click(); setPlaced([]); }}>Clear all</Btn>
        ) : null}
      </div>

      <div
        className="puzzle-stage"
        style={{ padding: 10 }}
        role="grid"
        aria-label="Bridge building grid. Move with arrow keys and press Enter to place or remove a block."
        tabIndex={0}
        onKeyDown={(e) => {
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0],
          };
          if (moves[e.key]) {
            e.preventDefault();
            const [dr, dc] = moves[e.key];
            setCursor((c) => ({
              row: Math.max(0, Math.min(rows - 1, c.row + dr)),
              col: Math.max(0, Math.min(cols - 1, c.col + dc)),
            }));
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tryPlace(cursor.row, cursor.col);
          }
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: 3,
            aspectRatio: `${cols} / ${rows}`,
            width: '100%',
            // Keep the grid short enough that the check list below stays visible.
            maxWidth: `calc(40vh * ${cols / rows})`,
            margin: '0 auto',
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const key = row + ':' + col;
            const block = occupied.get(key);
            const isLedge = ledgeCells.has(key);
            const isGapColumn = col >= gap.from && col <= gap.to;
            const isCursor = cursor.row === row && cursor.col === col;
            return (
              <button
                key={key}
                onClick={() => tryPlace(row, col)}
                onMouseEnter={() => setCursor({ row, col })}
                aria-label={
                  'Row ' + (row + 1) + ' column ' + (col + 1) +
                  (block ? ', has a ' + block.label : isLedge ? ', ledge' : ', empty')
                }
                style={{
                  background: block ? block.color : isLedge ? '#57534e' : isGapColumn ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                  border: isCursor ? '2px solid var(--brand)' : '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 5,
                  cursor: isLedge ? 'not-allowed' : 'pointer',
                  padding: 0,
                  minHeight: 0,
                  transition: 'background 140ms',
                }}
              />
            );
          })}
        </div>
      </div>

      {message ? (
        <div className="hint-box" role="status">{message}</div>
      ) : (
        <div className="faint tiny">
          Pick a block above, then tap a square to place it. Tap a placed block to take it back.
          The grey ledges on each side are fixed.
        </div>
      )}

      <div className="card-soft">
        <div className="bold tiny" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Bridge check
        </div>
        {report.map((line, i) => (
          <div key={i} className={line.startsWith('✓') ? 'chip chip-good' : 'chip'} style={{ margin: '3px 6px 3px 0' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
