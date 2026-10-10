import React, { useState, useMemo, useEffect } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';

interface PatternItem {
  shape: string;
  color: string;
  size: number;
}

const key = (t: PatternItem) => t.shape + '|' + t.color + '|' + t.size;

/** Continue a visual pattern by filling the empty slots at the end. */
export function PatternPuzzle({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const sequence: PatternItem[] = puzzle.sequence || [];
  const blanks = puzzle.blanks || 1;
  const tray: PatternItem[] = puzzle.tray || [];
  const answer: string[] = puzzle.answer || [];

  const [filled, setFilled] = useState<(PatternItem | null)[]>(() => Array(blanks).fill(null));
  const [activeSlot, setActiveSlot] = useState(0);

  function place(item: PatternItem) {
    audio.click();
    setFilled((prev) => {
      const next = [...prev];
      const slot = next[activeSlot] === null ? activeSlot : next.findIndex((v) => v === null);
      const target = slot === -1 ? activeSlot : slot;
      next[target] = item;
      return next;
    });
    setActiveSlot((s) => Math.min(blanks - 1, s + 1));
  }

  function clearSlot(i: number) {
    audio.click();
    setFilled((prev) => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
    setActiveSlot(i);
  }

  const { valid, report } = useMemo(() => {
    const done = filled.filter(Boolean).length;
    const correct = filled.every((f, i) => f !== null && key(f) === answer[i]);
    return {
      valid: done === blanks && correct,
      report: [
        (done === blanks ? '✓' : '○') + ' ' + done + ' of ' + blanks + ' slots filled',
        (done === blanks ? (correct ? '✓ the pattern continues correctly' : '○ that is not the pattern yet') : '○ finish filling the slots'),
      ],
    };
  }, [filled, answer, blanks]);

  useEffect(() => {
    onValidityChange(valid, sequence.length + blanks, report);
  }, [valid, report, sequence.length, blanks, onValidityChange]);

  return (
    <div className="col">
      <div className="puzzle-stage" style={{ padding: 16 }}>
        <div className="pattern-row">
          {sequence.map((item, i) => (
            <div className="pattern-cell" key={'s' + i}>
              <Glyph item={item} />
            </div>
          ))}
          {filled.map((item, i) => (
            <button
              key={'b' + i}
              className={'pattern-cell blank' + (item ? ' filled' : '')}
              onClick={() => (item ? clearSlot(i) : setActiveSlot(i))}
              aria-label={
                item
                  ? 'Slot ' + (i + 1) + ' holds a ' + item.color + ' ' + item.shape + '. Activate to clear it.'
                  : 'Empty slot ' + (i + 1)
              }
              style={activeSlot === i && !item ? { boxShadow: '0 0 0 3px rgba(255,209,102,0.45)' } : undefined}
            >
              {item ? <Glyph item={item} /> : <span style={{ color: 'var(--brand)', fontSize: '1.4rem' }}>?</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="puzzle-tray" role="group" aria-label="Pieces to choose from">
        {tray.map((item, i) => (
          <button
            key={i}
            className="tray-item"
            style={{ background: 'rgba(255,255,255,0.1)', padding: 6 }}
            onClick={() => place(item)}
            aria-label={'Place a ' + item.color + ' ' + item.shape}
          >
            <Glyph item={item} />
          </button>
        ))}
        {filled.some(Boolean) ? (
          <Btn size="sm" variant="ghost" onClick={() => { audio.click(); setFilled(Array(blanks).fill(null)); setActiveSlot(0); }}>
            Clear
          </Btn>
        ) : null}
      </div>

      <div className="card-soft">
        {report.map((line, i) => (
          <div key={i} className={line.startsWith('✓') ? 'chip chip-good' : 'chip'} style={{ margin: '3px 6px 3px 0' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function Glyph({ item }: { item: PatternItem }) {
  const s = 40 * (item.size || 1);
  const c = item.color;
  const half = s / 2;
  switch (item.shape) {
    case 'square':
      return <svg width={s} height={s} aria-hidden="true"><rect x="1" y="1" width={s - 2} height={s - 2} rx="4" fill={c} /></svg>;
    case 'triangle':
      return <svg width={s} height={s} aria-hidden="true"><polygon points={`${half},2 ${s - 2},${s - 2} 2,${s - 2}`} fill={c} /></svg>;
    case 'diamond':
      return <svg width={s} height={s} aria-hidden="true"><polygon points={`${half},1 ${s - 1},${half} ${half},${s - 1} 1,${half}`} fill={c} /></svg>;
    case 'star':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,1 15,9 23,9 16.5,14 19,22 12,17 5,22 7.5,14 1,9 9,9" fill={c} />
        </svg>
      );
    default:
      return <svg width={s} height={s} aria-hidden="true"><circle cx={half} cy={half} r={half - 1} fill={c} /></svg>;
  }
}
