import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Question, AnswerResult } from '../lib/types';
import { Btn, Chip } from '../ui/common';
import { MathVisual } from '../ui/MathVisual';
import { audio } from '../lib/audio';

const DIFFICULTY_LABEL = ['', 'Warm up', 'Getting going', 'Steady', 'Tricky', 'Challenge'];

/**
 * Presents one math question.
 *
 * Hints are always available and never blocked; they trim the reward a little
 * rather than gating the answer. A wrong answer earns a hint and a second try
 * before the explanation is shown, so a mistake is a step in the learning
 * rather than a dead end.
 */
export function MathChallenge({
  question, hints, onSubmit, onHint, onDone, readAloud, stationName,
}: {
  question: Question;
  hints: string[];
  onSubmit: (answer: string, seconds: number) => Promise<AnswerResult>;
  onHint: () => Promise<string[]>;
  onDone: (result: AnswerResult) => void;
  readAloud: boolean;
  stationName?: string;
}) {
  const [answer, setAnswer] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => question.items ? [...question.items] : []);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [linePos, setLinePos] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [leftPick, setLeftPick] = useState<string | null>(null);
  const [shownHints, setShownHints] = useState<string[]>(hints);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [retryNote, setRetryNote] = useState('');
  const startedAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShownHints(hints);
  }, [hints]);

  useEffect(() => {
    if (readAloud) audio.speak(question.prompt);
    return () => audio.stopSpeaking();
  }, [question.prompt, readAloud]);

  useEffect(() => {
    if (question.type === 'numeric' || question.type === 'text') {
      inputRef.current?.focus();
    }
  }, [question.type]);

  const answered = result !== null && !result.retry;

  const currentAnswer = useMemo(() => {
    switch (question.type) {
      case 'multiple-choice': return choice ?? '';
      case 'order': return order.join(',');
      case 'number-line': return linePos === null ? '' : String(linePos);
      case 'match': return Object.entries(matches).map(([l, r]) => l + '=' + r).join('|');
      default: return answer;
    }
  }, [question.type, choice, order, linePos, matches, answer]);

  async function submit() {
    if (!currentAnswer.trim() || busy || answered) return;
    setBusy(true);
    setRetryNote('');
    try {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const res = await onSubmit(currentAnswer, seconds);
      if (res.retry) {
        audio.encourage();
        setShownHints(res.hints || shownHints);
        setRetryNote(res.message || 'Not quite. Have another go.');
        setResult(res);
      } else {
        if (res.correct) audio.correct();
        else audio.encourage();
        setResult(res);
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestHint() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await onHint();
      setShownHints(next);
      if (readAloud && next.length) audio.speak(next[next.length - 1]);
    } finally {
      setBusy(false);
    }
  }

  const hintsLeft = question.hintCount - shownHints.length;

  return (
    <div className="col">
      <div className="row-wrap">
        <Chip>📘 {question.topic}</Chip>
        <Chip>{DIFFICULTY_LABEL[question.difficulty] || 'Steady'}</Chip>
        {stationName ? <Chip>{stationName}</Chip> : null}
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => audio.speak(question.prompt)}
          aria-label="Read the question aloud"
        >🔊 Read aloud</button>
      </div>

      <div>
        <div className="question-prompt">{question.prompt}</div>
        <MathVisual visual={question.visual} />
      </div>

      {/* ------------------------------ inputs ------------------------ */}
      {question.type === 'multiple-choice' && question.choices ? (
        <div className="choice-grid">
          {question.choices.map((c) => {
            let cls = 'choice';
            if (answered) {
              const isCorrectOne = result?.correct ? c === choice : c === result?.correctAnswer;
              if (isCorrectOne) cls += ' right';
              else if (c === choice) cls += ' wrong';
            } else if (choice === c) {
              cls += ' picked';
            }
            return (
              <button
                key={c}
                className={cls}
                disabled={answered}
                onClick={() => { audio.click(); setChoice(c); }}
                aria-pressed={choice === c}
              >{c}</button>
            );
          })}
        </div>
      ) : null}

      {question.type === 'numeric' || question.type === 'text' ? (
        <div className="answer-entry">
          <input
            ref={inputRef}
            className="input answer-input"
            inputMode={question.type === 'numeric' ? 'decimal' : 'text'}
            value={answer}
            disabled={answered}
            placeholder={question.placeholder || 'Your answer'}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
            aria-label="Your answer"
          />
          {question.unit ? <span className="muted bold">{question.unit}</span> : null}
        </div>
      ) : null}

      {question.type === 'order' ? (
        <div className="col">
          <div className="order-strip">
            {order.map((token, i) => (
              <button
                key={token + i}
                className={'order-token' + (selectedToken === i ? ' selected' : '')}
                disabled={answered}
                onClick={() => {
                  audio.click();
                  if (selectedToken === null) setSelectedToken(i);
                  else if (selectedToken === i) setSelectedToken(null);
                  else {
                    setOrder((prev) => {
                      const next = [...prev];
                      [next[selectedToken], next[i]] = [next[i], next[selectedToken]];
                      return next;
                    });
                    setSelectedToken(null);
                  }
                }}
                aria-label={token + ', position ' + (i + 1) + (selectedToken === i ? ', selected. Choose another to swap.' : '')}
              >{token}</button>
            ))}
          </div>
          <div className="faint tiny">Tap one number, then tap another to swap them.</div>
        </div>
      ) : null}

      {question.type === 'number-line' ? (
        <NumberLineInput
          min={question.min ?? 0}
          max={question.max ?? 10}
          step={question.step ?? 1}
          value={linePos}
          disabled={answered}
          onChange={(v) => { audio.click(); setLinePos(v); }}
        />
      ) : null}

      {question.type === 'match' && question.left && question.right ? (
        <div className="row-wrap" style={{ alignItems: 'flex-start' }}>
          <div className="col grow">
            {question.left.map((l) => (
              <button
                key={l}
                className={'choice' + (leftPick === l ? ' picked' : '') + (matches[l] ? ' right' : '')}
                disabled={answered}
                onClick={() => { audio.click(); setLeftPick(l); }}
              >{l}{matches[l] ? ' → ' + matches[l] : ''}</button>
            ))}
          </div>
          <div className="col grow">
            {question.right.map((r) => (
              <button
                key={r}
                className="choice"
                disabled={answered || !leftPick}
                onClick={() => {
                  audio.click();
                  if (leftPick) {
                    setMatches((m) => ({ ...m, [leftPick]: r }));
                    setLeftPick(null);
                  }
                }}
              >{r}</button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ------------------------------ hints ------------------------- */}
      {shownHints.map((h, i) => (
        <div className="hint-box" key={i}>
          <div className="label">Hint {i + 1}</div>
          <div>{h}</div>
        </div>
      ))}

      {retryNote && !answered ? (
        <div className="feedback bad" role="status">{retryNote}</div>
      ) : null}

      {/* ------------------------------ feedback ---------------------- */}
      {answered && result ? (
        <div className={'feedback ' + (result.correct ? 'good' : 'bad')} role="status">
          <h3 style={{ marginBottom: 6 }}>
            {result.correct ? '🎉 Correct!' : '💡 Here is how it works'}
          </h3>
          {!result.correct && result.correctAnswer ? (
            <p style={{ marginBottom: 6 }}>
              The answer is <strong>{result.correctAnswer}</strong>.
            </p>
          ) : null}
          {result.explanation ? <p style={{ marginBottom: 6 }}>{result.explanation}</p> : null}
          {result.correct && result.reward ? (
            <div className="row-wrap">
              <Chip tone="xp">+{result.reward.xp} XP</Chip>
              <Chip tone="coin">+{result.reward.coins} coins</Chip>
            </div>
          ) : (
            <p className="muted tiny" style={{ marginBottom: 0 }}>
              Mistakes are part of learning. The next question will adjust to help you.
            </p>
          )}
        </div>
      ) : null}

      {/* ------------------------------ actions ----------------------- */}
      <div className="sticky-actions">
        {!answered ? (
          <Btn onClick={requestHint} disabled={busy || hintsLeft <= 0} variant="ghost">
            {hintsLeft > 0 ? '💡 Hint (' + hintsLeft + ' left)' : 'No more hints'}
          </Btn>
        ) : <span />}

        {answered ? (
          <Btn variant="primary" size="lg" onClick={() => { audio.click(); onDone(result!); }}>
            Continue →
          </Btn>
        ) : (
          <Btn
            variant="good" size="lg"
            onClick={submit}
            disabled={busy || !currentAnswer.trim()}
          >
            {busy ? 'Checking...' : 'Check my answer'}
          </Btn>
        )}
      </div>
    </div>
  );
}

function NumberLineInput({
  min, max, step, value, disabled, onChange,
}: {
  min: number; max: number; step: number;
  value: number | null; disabled: boolean;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(Number(v.toFixed(4)));

  function pick(clientX: number) {
    const el = ref.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Number(Math.max(min, Math.min(max, snapped)).toFixed(4)));
  }

  const pct = value === null ? null : ((value - min) / (max - min)) * 100;

  return (
    <div className="col">
      <div
        ref={ref}
        className="numberline"
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => { if (e.buttons === 1) pick(e.clientX); }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? min}
        aria-label={'Number line from ' + min + ' to ' + max}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(min, (value ?? min) - step));
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(max, (value ?? min) + step));
          }
        }}
      >
        <svg width="100%" height="74" style={{ overflow: 'visible' }} aria-hidden="true">
          <line x1="2%" y1="42" x2="98%" y2="42" stroke="#f2f6ff" strokeWidth="3" />
          {ticks.map((t, i) => {
            const x = 2 + (i / (ticks.length - 1 || 1)) * 96;
            return (
              <g key={t}>
                <line x1={x + '%'} y1="34" x2={x + '%'} y2="50" stroke="#aab6d8" strokeWidth="2" />
                <text x={x + '%'} y="66" fill="#aab6d8" fontSize="12" textAnchor="middle">{t}</text>
              </g>
            );
          })}
          {pct !== null ? (
            <g>
              <line x1={(2 + pct * 0.96) + '%'} y1="18" x2={(2 + pct * 0.96) + '%'} y2="50" stroke="#ffd166" strokeWidth="3" />
              <circle cx={(2 + pct * 0.96) + '%'} cy="16" r="9" fill="#ffd166" stroke="#0b1026" strokeWidth="2" />
            </g>
          ) : null}
        </svg>
      </div>
      <div className="row-wrap">
        <Btn size="sm" disabled={disabled} onClick={() => onChange(Math.max(min, (value ?? min) - step))}>−</Btn>
        <span className="chip">{value === null ? 'Tap the line' : value}</span>
        <Btn size="sm" disabled={disabled} onClick={() => onChange(Math.min(max, (value ?? min) + step))}>+</Btn>
      </div>
    </div>
  );
}
