import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';
import { usePieceDrag, clampPiece, allConnected, nextUid, type PlacedPiece } from './dragUtils';

/**
 * The open-canvas builder used by the shape, design and vehicle challenges.
 *
 * These are deliberately open ended: the check is against basic requirements
 * ("at least 3 kinds of shape", "an engine and 4 wheels, all joined up"), so
 * two students can both succeed with completely different creations.
 */
export function FreeCanvas({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const bounds = {
    width: puzzle.canvas?.width || 600,
    height: puzzle.canvas?.height || 380,
  };
  const stageRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<PlacedPiece[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [trayPick, setTrayPick] = useState<string | null>(null);

  const req = puzzle.requirements || {};
  const tray = puzzle.tray || [];

  const usedByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of pieces) m[p.type] = (m[p.type] || 0) + 1;
    return m;
  }, [pieces]);

  function defaultSize(t: any): { w: number; h: number } {
    if (t.w && t.h) return { w: t.w, h: t.h };
    switch (t.type) {
      case 'rectangle': return { w: 104, h: 56 };
      case 'triangle': return { w: 78, h: 70 };
      case 'circle': return { w: 72, h: 72 };
      case 'trapezoid': return { w: 100, h: 62 };
      default: return { w: 72, h: 72 };
    }
  }

  function addPiece(t: any, x?: number, y?: number) {
    const limit = t.count;
    if (limit && (usedByType[t.type] || 0) >= limit) return;
    const size = defaultSize(t);
    // Lay new pieces out in a loose grid rather than stacking them all in the
    // middle, so a student can see every piece they have added.
    const slot = pieces.length;
    const perRow = Math.max(1, Math.floor(bounds.width / (size.w + 18)));
    const spawnX = 12 + (slot % perRow) * (size.w + 18);
    const spawnY = 12 + Math.floor(slot / perRow) * (size.h + 18);
    const placed: PlacedPiece = {
      uid: nextUid(),
      type: t.type,
      label: t.label,
      color: t.color,
      shape: t.shape,
      w: size.w,
      h: size.h,
      rotation: 0,
      ...clampPiece(x ?? spawnX, y ?? spawnY, size.w, size.h, bounds),
    };
    audio.click();
    setPieces((prev) => [...prev, placed]);
    setSelected(placed.uid);
  }

  const drag = usePieceDrag(stageRef, (uid, x, y) => {
    setPieces((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, ...clampPiece(x, y, p.w, p.h, bounds) } : p))
    );
  }, bounds);

  function mutate(uid: string, fn: (p: PlacedPiece) => PlacedPiece) {
    setPieces((prev) => prev.map((p) => (p.uid === uid ? fn(p) : p)));
  }

  function removePiece(uid: string) {
    audio.click();
    setPieces((prev) => prev.filter((p) => p.uid !== uid));
    setSelected(null);
  }

  /* Requirement checking -------------------------------------------- */
  const { valid, report } = useMemo(() => {
    const lines: string[] = [];
    let ok = true;

    if (req.kind === 'vehicle') {
      const wheels = pieces.filter((p) => p.type === 'wheel').length;
      const engines = pieces.filter((p) => p.type === 'engine').length;
      const connected = allConnected(pieces, 16);
      const hasEngine = engines >= 1;
      const enoughWheels = wheels >= (req.minWheels || 4);
      lines.push((hasEngine ? '✓' : '○') + ' 1 engine fitted');
      lines.push((enoughWheels ? '✓' : '○') + ' ' + wheels + ' of ' + (req.minWheels || 4) + ' wheels attached');
      lines.push((pieces.length >= 2 && connected ? '✓' : '○') + ' every part connected to the build');
      ok = hasEngine && enoughWheels && pieces.length >= 2 && connected;
    } else {
      const distinct = new Set(pieces.map((p) => p.type)).size;
      const minPieces = req.minPieces || 4;
      const minDistinct = req.minDistinct || 2;
      lines.push((pieces.length >= minPieces ? '✓' : '○') + ' ' + pieces.length + ' of ' + minPieces + ' pieces used');
      lines.push((distinct >= minDistinct ? '✓' : '○') + ' ' + distinct + ' of ' + minDistinct + ' different kinds');
      ok = pieces.length >= minPieces && distinct >= minDistinct;
    }
    return { valid: ok, report: lines };
  }, [pieces, req]);

  useEffect(() => {
    onValidityChange(valid, pieces.length, report);
  }, [valid, pieces.length, report, onValidityChange]);

  /* Keyboard nudging for the selected piece -------------------------- */
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const step = e.shiftKey ? 20 : 6;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        mutate(selected, (p) => ({ ...p, ...clampPiece(p.x + dx, p.y + dy, p.w, p.h, bounds) }));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removePiece(selected);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        mutate(selected, (p) => ({ ...p, rotation: ((p.rotation || 0) + 45) % 360 }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, bounds.width, bounds.height]);

  const selectedPiece = pieces.find((p) => p.uid === selected) || null;

  return (
    <div className="col">
      {/* Tray */}
      <div className="puzzle-tray" role="group" aria-label="Pieces you can use">
        {tray.map((t: any) => {
          const used = usedByType[t.type] || 0;
          const depleted = t.count ? used >= t.count : false;
          return (
            <button
              key={t.type}
              className={'tray-item' + (depleted ? ' depleted' : '') + (trayPick === t.type ? ' selected' : '')}
              style={{ background: t.color }}
              disabled={depleted}
              onClick={() => {
                setTrayPick(t.type);
                addPiece(t);
              }}
              aria-label={'Add a ' + t.label + (t.count ? '. ' + (t.count - used) + ' left' : '')}
            >
              <ShapeGlyph type={t.type} shape={t.shape} />
              {t.label}{t.count ? ' (' + (t.count - used) + ')' : ''}
            </button>
          );
        })}
        {pieces.length ? (
          <Btn size="sm" variant="ghost" onClick={() => { audio.click(); setPieces([]); setSelected(null); }}>
            Clear all
          </Btn>
        ) : null}
      </div>

      {/* Canvas */}
      <div
        ref={stageRef}
        className="puzzle-stage"
        style={{
          aspectRatio: `${bounds.width} / ${bounds.height}`,
          width: '100%',
          // Cap the height so the requirement list and submit button stay on
          // screen without scrolling, on laptops and tablets alike.
          maxWidth: `calc(44vh * ${bounds.width / bounds.height})`,
          margin: '0 auto',
        }}
        onPointerMove={drag.move}
        onPointerUp={drag.end}
        onPointerCancel={drag.end}
        onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
      >
        {/* Faint grid so students can line things up. */}
        <svg
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.16, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {Array.from({ length: Math.floor(bounds.width / 40) }, (_, i) => (
            <line key={'v' + i} x1={(i + 1) * 40} y1={0} x2={(i + 1) * 40} y2={bounds.height} stroke="#fff" strokeWidth="1" />
          ))}
          {Array.from({ length: Math.floor(bounds.height / 40) }, (_, i) => (
            <line key={'h' + i} x1={0} y1={(i + 1) * 40} x2={bounds.width} y2={(i + 1) * 40} stroke="#fff" strokeWidth="1" />
          ))}
        </svg>

        {pieces.map((p) => (
          <div
            key={p.uid}
            className={'placed' + (selected === p.uid ? ' selected' : '')}
            style={{
              left: (p.x / bounds.width) * 100 + '%',
              top: (p.y / bounds.height) * 100 + '%',
              width: (p.w / bounds.width) * 100 + '%',
              height: (p.h / bounds.height) * 100 + '%',
              background: 'transparent',
              border: 'none',
              transform: `rotate(${p.rotation || 0}deg)`,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelected(p.uid);
              drag.start(e, p);
            }}
            onPointerMove={drag.move}
            onPointerUp={drag.end}
            role="button"
            tabIndex={0}
            aria-label={p.label + ' piece. Use arrow keys to move, R to rotate, Delete to remove.'}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p.uid); } }}
            onFocus={() => setSelected(p.uid)}
          >
            <PieceShape piece={p} />
          </div>
        ))}
      </div>

      {/* Selected piece controls */}
      {selectedPiece ? (
        <div className="row-wrap">
          <span className="chip">{selectedPiece.label} selected</span>
          <Btn size="sm" onClick={() => mutate(selectedPiece.uid, (p) => ({ ...p, rotation: ((p.rotation || 0) + 45) % 360 }))}>
            ↻ Rotate
          </Btn>
          <Btn size="sm" onClick={() => mutate(selectedPiece.uid, (p) => {
            const w = Math.min(bounds.width * 0.8, p.w * 1.2);
            const h = Math.min(bounds.height * 0.8, p.h * 1.2);
            return { ...p, w, h, ...clampPiece(p.x, p.y, w, h, bounds) };
          })}>＋ Bigger</Btn>
          <Btn size="sm" onClick={() => mutate(selectedPiece.uid, (p) => ({
            ...p, w: Math.max(22, p.w * 0.84), h: Math.max(22, p.h * 0.84),
          }))}>－ Smaller</Btn>
          <Btn size="sm" variant="danger" onClick={() => removePiece(selectedPiece.uid)}>Remove</Btn>
          <span className="faint tiny">Arrow keys move it, R rotates, Delete removes.</span>
        </div>
      ) : (
        <div className="faint tiny">Tap a piece above to add it, then drag it where you want.</div>
      )}

      {/* Requirement checklist */}
      <div className="card-soft">
        <div className="bold tiny" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What this build needs
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

function ShapeGlyph({ type, shape }: { type: string; shape?: string }) {
  const s = 14;
  if (type === 'circle' || shape === 'circle') {
    return <svg width={s} height={s} aria-hidden="true"><circle cx={s / 2} cy={s / 2} r={s / 2 - 1} fill="rgba(0,0,0,0.55)" /></svg>;
  }
  if (type === 'triangle') {
    return <svg width={s} height={s} aria-hidden="true"><polygon points={`${s / 2},1 ${s - 1},${s - 1} 1,${s - 1}`} fill="rgba(0,0,0,0.55)" /></svg>;
  }
  if (type === 'trapezoid') {
    return <svg width={s} height={s} aria-hidden="true"><polygon points={`3,${s - 2} ${s - 3},${s - 2} ${s - 5},3 5,3`} fill="rgba(0,0,0,0.55)" /></svg>;
  }
  if (type === 'rectangle') {
    return <svg width={s} height={s} aria-hidden="true"><rect x={0} y={3} width={s} height={s - 6} fill="rgba(0,0,0,0.55)" /></svg>;
  }
  return <svg width={s} height={s} aria-hidden="true"><rect x={1} y={1} width={s - 2} height={s - 2} fill="rgba(0,0,0,0.55)" /></svg>;
}

function PieceShape({ piece }: { piece: PlacedPiece }) {
  const common = { width: '100%', height: '100%', display: 'block' } as React.CSSProperties;
  const stroke = 'rgba(255,255,255,0.65)';

  if (piece.type === 'circle' || piece.shape === 'circle' || piece.type === 'wheel') {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={common} aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill={piece.color} stroke={stroke} strokeWidth="3" />
        {piece.type === 'wheel' ? <circle cx="50" cy="50" r="17" fill="rgba(255,255,255,0.45)" /> : null}
      </svg>
    );
  }
  if (piece.type === 'triangle') {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={common} aria-hidden="true">
        <polygon points="50,3 97,97 3,97" fill={piece.color} stroke={stroke} strokeWidth="3" />
      </svg>
    );
  }
  if (piece.type === 'trapezoid') {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={common} aria-hidden="true">
        <polygon points="3,97 97,97 80,3 20,3" fill={piece.color} stroke={stroke} strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={common} aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx={piece.type === 'engine' ? 8 : 4} fill={piece.color} stroke={stroke} strokeWidth="3" />
      {piece.type === 'engine' ? (
        <>
          <rect x="22" y="22" width="56" height="18" fill="rgba(0,0,0,0.3)" rx="3" />
          <rect x="22" y="52" width="56" height="18" fill="rgba(0,0,0,0.3)" rx="3" />
        </>
      ) : null}
    </svg>
  );
}
