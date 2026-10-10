import React, { useState, useMemo, useEffect } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';

type Cell = [number, number];

interface TrayPiece {
  id: string;
  name: string;
  cells: Cell[];
  color: string;
}

/** Rotate a set of cells 90 degrees clockwise and re-anchor at the origin. */
function rotate(cells: Cell[], times: number): Cell[] {
  let out = cells.map((c) => [c[0], c[1]] as Cell);
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
    const maxR = Math.max(...out.map((c) => c[0]));
    out = out.map(([r, c]) => [c, maxR - r] as Cell);
  }
  const minR = Math.min(...out.map((c) => c[0]));
  const minC = Math.min(...out.map((c) => c[1]));
  return out.map(([r, c]) => [r - minR, c - minC] as Cell);
}

/**
 * Fit rotatable pieces inside a target outline.
 *
 * Pieces are placed by selecting one, rotating it, then tapping a square inside
 * the outline. The pieces are cut from the target, so a complete tiling always
 * exists, but partial solutions count: the requirement is a coverage threshold
 * rather than one exact arrangement.
 */
export function SpatialPuzzle({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const target = puzzle.target || { w: 4, h: 4, cells: [] };
  const tray: TrayPiece[] = (puzzle.tray as TrayPiece[]) || [];
  const req = puzzle.requirements || {};
  const minCoverage = req.minCoverage ?? 0.7;

  const targetSet = useMemo(
    () => new Set(target.cells.map((c) => c[0] + ':' + c[1])),
    [target.cells]
  );

  const [placements, setPlacements] = useState<Record<string, { cells: Cell[]; color: string; name: string }>>({});
  const [selected, setSelected] = useState<string | null>(tray[0]?.id ?? null);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');

  const occupied = useMemo(() => {
    const m = new Map<string, string>();
    for (const [pid, p] of Object.entries(placements)) {
      for (const [r, c] of p.cells) m.set(r + ':' + c, pid);
    }
    return m;
  }, [placements]);

  function tryPlace(row: number, col: number) {
    const existing = occupied.get(row + ':' + col);
    if (existing) {
      audio.click();
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[existing];
        return next;
      });
      setMessage('');
      return;
    }
    if (!selected) return;
    const piece = tray.find((p) => p.id === selected);
    if (!piece) return;

    const shape = rotate(piece.cells, rotation);

    // Try laying the piece so that each of its squares in turn sits under the
    // square that was clicked. Anchoring only by the bounding-box corner would
    // make some perfectly good placements impossible, because that corner is
    // not always part of the piece or even inside the outline.
    let fitted: Cell[] | null = null;
    let sawOverlap = false;
    for (const [ar, ac] of shape) {
      const candidate: Cell[] = shape.map(([r, c]) => [row + r - ar, col + c - ac] as Cell);
      const outside = candidate.some(([r, c]) => !targetSet.has(r + ':' + c));
      const overlaps = candidate.some(([r, c]) => occupied.has(r + ':' + c));
      if (!outside && !overlaps) { fitted = candidate; break; }
      if (!outside && overlaps) sawOverlap = true;
    }

    if (!fitted) {
      setMessage(
        sawOverlap
          ? 'Pieces cannot overlap. Try a clear part of the outline.'
          : 'That piece will not fit there. Try rotating it, or pick a different square.'
      );
      return;
    }

    audio.click();
    setMessage('');
    setPlacements((prev) => ({ ...prev, [selected]: { cells: fitted, color: piece.color, name: piece.name } }));
    // Move on to the next piece that is still in the tray.
    const remaining = tray.filter((p) => p.id !== selected && !placements[p.id]);
    setSelected(remaining[0]?.id ?? null);
    setRotation(0);
  }

  // `report` holds requirements only, each prefixed with a tick or a circle.
  // Anything purely informational goes in `info`, so a plain chip is never
  // mistaken for a requirement that has not been met yet.
  const { valid, report, info } = useMemo(() => {
    const covered = occupied.size;
    const total = target.cells.length || 1;
    const cov = covered / total;
    const placedCount = Object.keys(placements).length;
    return {
      valid: cov >= minCoverage,
      report: [
        (cov >= minCoverage ? '✓' : '○') + ' ' + Math.round(cov * 100) + '% of the outline covered (need ' + Math.round(minCoverage * 100) + '%)',
      ],
      info: placedCount + ' of ' + tray.length + ' pieces placed',
    };
  }, [occupied, target.cells.length, placements, minCoverage, tray.length]);

  useEffect(() => {
    onValidityChange(valid, Object.keys(placements).length, report);
  }, [valid, placements, report, onValidityChange]);

  const cellSize = Math.max(26, Math.min(52, Math.floor(340 / Math.max(target.w, target.h))));
  const preview = selected ? rotate((tray.find((p) => p.id === selected) || { cells: [] as Cell[] }).cells, rotation) : [];
  const previewW = preview.length ? Math.max(...preview.map((c) => c[1])) + 1 : 0;
  const previewH = preview.length ? Math.max(...preview.map((c) => c[0])) + 1 : 0;

  return (
    <div className="col">
      <div className="row-wrap">
        <div className="puzzle-tray grow" role="group" aria-label="Pieces to place">
          {tray.map((p) => {
            const placed = !!placements[p.id];
            return (
              <button
                key={p.id}
                className={'tray-item' + (selected === p.id ? ' selected' : '') + (placed ? ' depleted' : '')}
                style={{ background: p.color }}
                disabled={placed}
                onClick={() => { audio.click(); setSelected(p.id); setRotation(0); setMessage(''); }}
                aria-pressed={selected === p.id}
                aria-label={'Piece ' + p.name + (placed ? ', already placed' : '')}
              >
                {p.name}{placed ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
        <Btn onClick={() => { audio.click(); setRotation((r) => r + 1); }} disabled={!selected}>
          ↻ Rotate
        </Btn>
        {Object.keys(placements).length ? (
          <Btn size="sm" variant="ghost" onClick={() => { audio.click(); setPlacements({}); setMessage(''); }}>Clear</Btn>
        ) : null}
      </div>

      {selected && preview.length ? (
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="faint tiny">Selected piece:</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${previewW}, 14px)`,
              gridTemplateRows: `repeat(${previewH}, 14px)`,
              gap: 2,
            }}
            aria-hidden="true"
          >
            {Array.from({ length: previewW * previewH }, (_, i) => {
              const r = Math.floor(i / previewW);
              const c = i % previewW;
              const on = preview.some(([pr, pc]) => pr === r && pc === c);
              return (
                <div
                  key={i}
                  style={{
                    background: on ? (tray.find((p) => p.id === selected)?.color || '#fff') : 'transparent',
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="puzzle-stage" style={{ padding: 14, display: 'grid', placeItems: 'center' }}>
        <div
          className="spatial-grid"
          style={{ gridTemplateColumns: `repeat(${target.w}, ${cellSize}px)` }}
          role="grid"
          aria-label={'Target outline, ' + target.h + ' rows by ' + target.w + ' columns'}
        >
          {Array.from({ length: target.w * target.h }, (_, i) => {
            const r = Math.floor(i / target.w);
            const c = i % target.w;
            const inTarget = targetSet.has(r + ':' + c);
            const pid = occupied.get(r + ':' + c);
            const fill = pid ? placements[pid].color : inTarget ? 'rgba(255,255,255,0.13)' : 'transparent';
            return (
              <button
                key={i}
                className="spatial-cell"
                onClick={() => inTarget && tryPlace(r, c)}
                disabled={!inTarget}
                style={{
                  width: cellSize, height: cellSize,
                  background: fill,
                  borderStyle: inTarget ? 'dashed' : 'none',
                  borderColor: 'rgba(255,255,255,0.28)',
                  cursor: inTarget ? 'pointer' : 'default',
                  padding: 0,
                }}
                aria-label={
                  inTarget
                    ? 'Row ' + (r + 1) + ' column ' + (c + 1) + (pid ? ', filled by ' + placements[pid].name + '. Activate to remove.' : ', empty. Activate to place the selected piece here.')
                    : 'Outside the outline'
                }
              />
            );
          })}
        </div>
      </div>

      {message ? <div className="hint-box">{message}</div> : (
        <div className="faint tiny">
          Pick a piece, rotate it if you need to, then tap a square inside the outline to drop it there.
        </div>
      )}

      <div className="card-soft">
        {report.map((line, i) => (
          <div key={i} className={line.startsWith('✓') ? 'chip chip-good' : 'chip'} style={{ margin: '3px 6px 3px 0' }}>
            {line}
          </div>
        ))}
        <div className="faint tiny" style={{ marginTop: 6 }}>{info}</div>
      </div>
    </div>
  );
}
