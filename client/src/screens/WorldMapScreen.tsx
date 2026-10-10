import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, ScreenHeader, Stars, Chip } from '../ui/common';
import type { WorldSummary } from '../lib/types';

/** The world map: pick a world, then a level inside it. */
export function WorldMapScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const setState = useStore((s) => s.setState);
  const startPlay = useStore((s) => s.startPlay);
  const toast = useStore((s) => s.toast);

  const [openWorld, setOpenWorld] = useState<WorldSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const { worlds, levels, progress } = state;

  async function playLevel(level: number) {
    setBusy(true);
    try {
      const res = await api.selectLevel(level);
      setState(res.state);
      audio.unlock();
      startPlay(level);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not open that level.', 'bad');
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <ScreenHeader
        title="Worlds & Levels"
        subtitle={state.user.gradeLabel + ' · ' + progress.completedLevels.length + ' of ' + progress.levelsPerGrade + ' levels complete'}
        onBack={() => setScreen('home')}
        right={<Chip tone="star">⭐ {Object.values(progress.stars).reduce((a, b) => a + b, 0)} / {progress.levelsPerGrade * 3}</Chip>}
      />

      <div className="shell col">
        {!openWorld ? (
          <>
            <p className="muted">
              Your adventure runs through five worlds. Finish the levels in one to unlock the next.
            </p>
            <div className="world-grid">
              {worlds.map((w) => (
                <button
                  key={w.id}
                  className={'world-card' + (w.unlocked ? '' : ' locked')}
                  disabled={!w.unlocked}
                  onClick={() => { audio.click(); setOpenWorld(w); }}
                  style={{
                    background: `linear-gradient(160deg, ${w.palette.horizon} 0%, ${w.palette.ground} 60%, ${w.palette.structureAlt} 100%)`,
                  }}
                  aria-label={
                    w.name + (w.unlocked ? ', unlocked, ' + w.stars + ' of ' + w.maxStars + ' stars' : ', locked until level ' + w.unlockLevel)
                  }
                >
                  <div>
                    <div className="emoji" aria-hidden="true">{w.emoji}</div>
                    <h3 style={{ marginTop: 6, marginBottom: 4 }}>{w.name}</h3>
                    <p className="tiny" style={{ marginBottom: 0, opacity: 0.92 }}>{w.tagline}</p>
                  </div>
                  <div className="between" style={{ marginTop: 10 }}>
                    <span className="tiny bold">Levels {w.levels[0]}–{w.levels[w.levels.length - 1]}</span>
                    <span style={{ color: '#ffe08a' }}><Stars count={w.stars} max={w.maxStars} /></span>
                  </div>
                  {!w.unlocked ? (
                    <div className="lock" aria-hidden="true">
                      <div style={{ textAlign: 'center' }}>
                        🔒
                        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Reach level {w.unlockLevel}</div>
                      </div>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <div className="between">
                <div>
                  <div style={{ fontSize: '2.2rem' }} aria-hidden="true">{openWorld.emoji}</div>
                  <h2 style={{ marginBottom: 4 }}>{openWorld.name}</h2>
                  <p className="muted" style={{ marginBottom: 0 }}>{openWorld.tagline}</p>
                </div>
                <Btn onClick={() => { audio.click(); setOpenWorld(null); }}>All worlds</Btn>
              </div>
            </div>

            <div className="level-list">
              {levels
                .filter((l) => openWorld.levels.includes(l.level))
                .map((l) => {
                  const unlocked = l.level <= progress.currentLevel || progress.completedLevels.includes(l.level);
                  const stars = progress.stars[String(l.level)] || 0;
                  const isCurrent = l.level === progress.currentLevel;
                  return (
                    <button
                      key={l.level}
                      className={'level-pill' + (isCurrent ? ' current' : '')}
                      disabled={!unlocked || busy}
                      onClick={() => playLevel(l.level)}
                      aria-label={
                        'Level ' + l.level + ', ' + l.name +
                        (unlocked ? (isCurrent ? ', your current level' : '') + ', ' + stars + ' stars' : ', locked')
                      }
                    >
                      <div className="between">
                        <span className="bold">Level {l.level}</span>
                        {unlocked ? (
                          <span style={{ color: 'var(--star)' }}><Stars count={stars} /></span>
                        ) : <span aria-hidden="true">🔒</span>}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0' }}>{l.name}</div>
                      <div className="faint tiny">{l.intro}</div>
                      {isCurrent ? (
                        <div className="chip chip-good" style={{ marginTop: 8 }}>Continue here</div>
                      ) : progress.completedLevels.includes(l.level) ? (
                        <div className="chip" style={{ marginTop: 8 }}>Replay</div>
                      ) : null}
                    </button>
                  );
                })}
            </div>

            <p className="faint">
              Replaying a level is always allowed. Your best star rating is the one that is kept.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
