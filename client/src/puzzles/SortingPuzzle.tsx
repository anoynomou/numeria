import React, { useState, useMemo, useEffect } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';

/**
 * Drag every object into the bin it belongs to.
 *
 * Works by tapping an object and then tapping a bin, which is far more
 * reliable on a touchscreen than dragging and is keyboard friendly too.
 * HTML drag-and-drop is wired up as well for students using a mouse.
 */
export function SortingPuzzle({
  puzzle, onValidityChange,
}: {
  puzzle: PuzzleData;
  onValidityChange: (valid: boolean, pieces: number, report: string[]) => void;
}) {
  const bins = puzzle.bins || [];
  const items = puzzle.items || [];

  const [assignment, setAssignment] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const it of items) init[it.id] = null;
    return init;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [overBin, setOverBin] = useState<string | null>(null);

  function assign(itemId: string, binId: string | null) {
    audio.click();
    setAssignment((prev) => ({ ...prev, [itemId]: binId }));
    setSelected(null);
  }

  const unplaced = items.filter((it) => !assignment[it.id]);

  const { valid, report } = useMemo(() => {
    const placedCount = items.length - unplaced.length;
    const correct = items.filter((it) => assignment[it.id] === it.bin).length;
    const allPlaced = placedCount === items.length;
    return {
      valid: allPlaced && correct === items.length,
      report: [
        (allPlaced ? '✓' : '○') + ' ' + placedCount + ' of ' + items.length + ' objects sorted',
        allPlaced
          ? (correct === items.length ? '✓ every object is in the right bin' : '○ ' + (items.length - correct) + ' are in the wrong bin')
          : '○ sort them all to finish',
      ],
    };
  }, [assignment, items, unplaced.length]);

  useEffect(() => {
    onValidityChange(valid, items.length, report);
  }, [valid, items.length, report, onValidityChange]);

  return (
    <div className="col">
      <div className="puzzle-tray" role="group" aria-label="Objects left to sort">
        {unplaced.length === 0 ? (
          <span className="muted">Everything is sorted. Check your work below.</span>
        ) : (
          unplaced.map((it) => (
            <button
              key={it.id}
              className={'sort-chip' + (selected === it.id ? ' selected' : '')}
              draggable
              onDragStart={(e) => { setSelected(it.id); e.dataTransfer.setData('text/plain', it.id); }}
              onClick={() => { audio.click(); setSelected(selected === it.id ? null : it.id); }}
              aria-pressed={selected === it.id}
              aria-label={it.label + (selected === it.id ? ', selected. Now choose a bin.' : '. Select it, then choose a bin.')}
            >
              {it.label}
            </button>
          ))
        )}
        {items.some((it) => assignment[it.id]) ? (
          <Btn size="sm" variant="ghost" onClick={() => {
            audio.click();
            const reset: Record<string, string | null> = {};
            for (const it of items) reset[it.id] = null;
            setAssignment(reset);
          }}>Start over</Btn>
        ) : null}
      </div>

      <div className="sort-bins">
        {bins.map((bin) => {
          const contents = items.filter((it) => assignment[it.id] === bin.id);
          return (
            <div
              key={bin.id}
              className={'sort-bin' + (overBin === bin.id ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setOverBin(bin.id); }}
              onDragLeave={() => setOverBin(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverBin(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) assign(id, bin.id);
              }}
              onClick={() => { if (selected) assign(selected, bin.id); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && selected) {
                  e.preventDefault();
                  assign(selected, bin.id);
                }
              }}
              aria-label={bin.label + ' bin, holding ' + contents.length + ' objects' + (selected ? '. Activate to drop the selected object here.' : '')}
            >
              <h4>{bin.label}</h4>
              {contents.map((it) => (
                <button
                  key={it.id}
                  className="sort-chip"
                  onClick={(e) => { e.stopPropagation(); assign(it.id, null); }}
                  aria-label={it.label + ', in ' + bin.label + '. Activate to take it back out.'}
                >
                  {it.label}
                </button>
              ))}
              {contents.length === 0 ? <div className="faint tiny">Empty</div> : null}
            </div>
          );
        })}
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
