import React, { useEffect } from 'react';
import type { LevelSummary } from '../lib/types';
import { Btn, Modal, Bar } from '../ui/common';
import { audio } from '../lib/audio';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return s + 's';
  return m + 'm ' + s + 's';
}

/** The end-of-level report: what was practised, what was earned, what is next. */
export function LevelComplete({
  summary, onContinue, onHome,
}: {
  summary: LevelSummary;
  onContinue: () => void;
  onHome: () => void;
}) {
  useEffect(() => {
    audio.levelComplete();
  }, []);

  return (
    <Modal labelledBy="level-complete-title">
      <div style={{ textAlign: 'center' }}>
        <div className="faint" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Level {summary.level}
        </div>
        <h1 id="level-complete-title" style={{ marginTop: 4 }}>Level Complete!</h1>
        <p className="muted">{summary.levelName}</p>

        <div className="stars" aria-label={summary.stars + ' out of 3 stars'}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="star-pop"
              style={{ animationDelay: 180 + i * 220 + 'ms', opacity: i < summary.stars ? 1 : 0.22, color: 'var(--star)' }}
              aria-hidden="true"
            >★</span>
          ))}
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: 20 }}>
        <div className="stat-tile">
          <div className="v">{summary.correct} / {summary.total}</div>
          <div className="k">Correct</div>
        </div>
        <div className="stat-tile">
          <div className="v">{summary.accuracyPercent}%</div>
          <div className="k">Accuracy</div>
        </div>
        <div className="stat-tile">
          <div className="v" style={{ color: 'var(--xp)' }}>+{summary.xpEarned}</div>
          <div className="k">XP</div>
        </div>
        <div className="stat-tile">
          <div className="v" style={{ color: 'var(--coin)' }}>+{summary.coinsEarned}</div>
          <div className="k">Coins</div>
        </div>
        <div className="stat-tile">
          <div className="v">{formatTime(summary.seconds)}</div>
          <div className="k">Time played</div>
        </div>
      </div>

      {summary.skills.length ? (
        <div className="card-soft" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Skills you practised</h3>
          <div className="col" style={{ gap: 10 }}>
            {summary.skills.map((s) => (
              <div key={s.topic}>
                <div className="between" style={{ marginBottom: 4 }}>
                  <span className="bold tiny">{s.topic}</span>
                  <span className="faint tiny">{s.correct} of {s.attempted} correct</span>
                </div>
                <Bar value={s.correct} max={s.attempted} tone="good" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {summary.unlockedWorld ? (
        <div className="feedback good" style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem' }} aria-hidden="true">{summary.unlockedWorld.emoji}</div>
          <h3 style={{ marginBottom: 4 }}>New world unlocked: {summary.unlockedWorld.name}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>{summary.unlockedWorld.tagline}</p>
        </div>
      ) : null}

      {summary.gradeComplete ? (
        <div className="feedback good" style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem' }} aria-hidden="true">🏆</div>
          <h3 style={{ marginBottom: 4 }}>You finished every level for this grade!</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Try a harder grade in Settings, or replay any level from the world map to raise your stars.
          </p>
        </div>
      ) : null}

      <div className="between" style={{ marginTop: 22 }}>
        <Btn onClick={onHome}>Back to home</Btn>
        {!summary.gradeComplete && summary.nextLevel ? (
          <Btn variant="primary" size="lg" onClick={onContinue}>
            Continue to Level {summary.nextLevel} →
          </Btn>
        ) : (
          <Btn variant="primary" size="lg" onClick={onHome}>Celebrate 🎉</Btn>
        )}
      </div>
    </Modal>
  );
}
