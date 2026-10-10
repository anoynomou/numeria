import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PuzzleData } from '../lib/types';
import { Btn } from '../ui/common';
import { audio } from '../lib/audio';
import { FreeCanvas } from './FreeCanvas';
import { BlockCanvas } from './BlockCanvas';
import { PatternPuzzle } from './PatternPuzzle';
import { SortingPuzzle } from './SortingPuzzle';
import { MazePuzzle } from './MazePuzzle';
import { SpatialPuzzle } from './SpatialPuzzle';

const BAND_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/**
 * Wraps whichever creative puzzle this challenge calls for, shows the brief,
 * and reports the finished build back up along with how many pieces the
 * student used. That piece count feeds the math question that comes next.
 */
export function PuzzleHost({
  puzzle, onComplete, onSkip,
}: {
  puzzle: PuzzleData;
  onComplete: (pieces: number, seconds: number) => void;
  onSkip?: () => void;
}) {
  const [valid, setValid] = useState(false);
  const [pieces, setPieces] = useState(0);
  const [report, setReport] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nudge, setNudge] = useState('');
  const startedAt = useRef(Date.now());
  const celebrated = useRef(false);

  const handleValidity = useCallback((v: boolean, p: number, r: string[]) => {
    setValid(v);
    setPieces(p);
    setReport(r);
  }, []);

  useEffect(() => {
    if (valid && !celebrated.current) {
      celebrated.current = true;
      audio.reward();
    }
    if (!valid) celebrated.current = false;
  }, [valid]);

  function submit() {
    if (!valid) {
      setNudge('Not quite there yet. Check the list above to see what is still needed.');
      audio.encourage();
      return;
    }
    setSubmitting(true);
    audio.puzzleDone();
    onComplete(pieces, Math.round((Date.now() - startedAt.current) / 1000));
  }

  let body: React.ReactNode;
  switch (puzzle.kind) {
    case 'block-canvas':
      body = <BlockCanvas puzzle={puzzle} onValidityChange={handleValidity} />;
      break;
    case 'pattern':
      body = <PatternPuzzle puzzle={puzzle} onValidityChange={handleValidity} />;
      break;
    case 'sorting':
      body = <SortingPuzzle puzzle={puzzle} onValidityChange={handleValidity} />;
      break;
    case 'maze':
      body = <MazePuzzle puzzle={puzzle} onValidityChange={handleValidity} />;
      break;
    case 'spatial':
      body = <SpatialPuzzle puzzle={puzzle} onValidityChange={handleValidity} />;
      break;
    default:
      body = <FreeCanvas puzzle={puzzle} onValidityChange={handleValidity} />;
  }

  return (
    <div className="col">
      <div className="between">
        <div>
          <div className="row-wrap" style={{ marginBottom: 6 }}>
            <span className="chip">🧩 {puzzle.name}</span>
            <span className="chip">{BAND_LABEL[puzzle.band] || 'Medium'}</span>
          </div>
          <h2 id="puzzle-title" style={{ marginBottom: 4 }}>{puzzle.instruction}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{puzzle.detail}</p>
        </div>
      </div>

      {body}

      {nudge && !valid ? <div className="hint-box" role="status">{nudge}</div> : null}
      {valid ? (
        <div className="feedback good" role="status">
          <strong>That works.</strong> Submit your build to unlock the math challenge.
        </div>
      ) : null}

      <div className="sticky-actions">
        {onSkip ? (
          <Btn variant="ghost" size="sm" onClick={onSkip}>Leave and come back later</Btn>
        ) : <span />}
        <Btn
          variant={valid ? 'good' : 'primary'}
          size="lg"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? 'Sending...' : valid ? 'Submit my build' : 'Check my build'}
        </Btn>
      </div>
    </div>
  );
}
