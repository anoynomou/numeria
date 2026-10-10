import { useRef, useCallback } from 'react';

export interface PlacedPiece {
  uid: string;
  type: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: string;
  rotation?: number;
}

let uidCounter = 0;
export const nextUid = () => 'p' + (++uidCounter) + '-' + Math.random().toString(36).slice(2, 6);

/**
 * Pointer dragging for absolutely positioned pieces on a canvas.
 *
 * Pieces can also be moved with the arrow keys once selected, so the puzzles
 * are usable without a mouse or a steady hand.
 */
export function usePieceDrag(
  stageRef: React.RefObject<HTMLDivElement>,
  onMove: (uid: string, x: number, y: number) => void,
  bounds: { width: number; height: number }
) {
  const drag = useRef<{ uid: string; dx: number; dy: number; pointerId: number } | null>(null);

  const start = useCallback((e: React.PointerEvent, piece: PlacedPiece) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const scaleX = bounds.width / rect.width;
    const scaleY = bounds.height / rect.height;
    const pointerX = (e.clientX - rect.left) * scaleX;
    const pointerY = (e.clientY - rect.top) * scaleY;
    drag.current = {
      uid: piece.uid,
      dx: pointerX - piece.x,
      dy: pointerY - piece.y,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [stageRef, bounds.width, bounds.height]);

  const move = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage || e.pointerId !== d.pointerId) return;
    const rect = stage.getBoundingClientRect();
    const scaleX = bounds.width / rect.width;
    const scaleY = bounds.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX - d.dx;
    const y = (e.clientY - rect.top) * scaleY - d.dy;
    onMove(d.uid, x, y);
  }, [stageRef, onMove, bounds.width, bounds.height]);

  const end = useCallback(() => {
    drag.current = null;
  }, []);

  return { start, move, end, isDragging: () => drag.current !== null };
}

/** Keep a piece inside the canvas. */
export function clampPiece(x: number, y: number, w: number, h: number, bounds: { width: number; height: number }) {
  return {
    x: Math.max(0, Math.min(bounds.width - w, x)),
    y: Math.max(0, Math.min(bounds.height - h, y)),
  };
}

/** Do two rectangles touch or overlap, allowing a small tolerance? */
export function rectsTouch(a: PlacedPiece, b: PlacedPiece, tolerance = 14) {
  return (
    a.x < b.x + b.w + tolerance &&
    a.x + a.w + tolerance > b.x &&
    a.y < b.y + b.h + tolerance &&
    a.y + a.h + tolerance > b.y
  );
}

/**
 * Are all the pieces joined into a single connected group?
 * Used by the vehicle and design challenges, where "the parts must be
 * connected" is the requirement rather than an exact layout.
 */
export function allConnected(pieces: PlacedPiece[], tolerance = 14): boolean {
  if (pieces.length <= 1) return true;
  const seen = new Set<string>([pieces[0].uid]);
  const queue = [pieces[0]];
  while (queue.length) {
    const current = queue.shift()!;
    for (const other of pieces) {
      if (seen.has(other.uid)) continue;
      if (rectsTouch(current, other, tolerance)) {
        seen.add(other.uid);
        queue.push(other);
      }
    }
  }
  return seen.size === pieces.length;
}
