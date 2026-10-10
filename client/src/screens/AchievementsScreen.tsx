import React from 'react';
import { useStore } from '../lib/store';
import { ScreenHeader, Bar, Chip } from '../ui/common';

/** Badge wall. Locked badges show progress rather than hiding the goal. */
export function AchievementsScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);

  const earned = state.achievements.filter((a) => a.earned);
  const locked = state.achievements.filter((a) => !a.earned);

  return (
    <div className="screen">
      <ScreenHeader
        title="Achievements"
        subtitle={earned.length + ' of ' + state.achievements.length + ' earned'}
        onBack={() => setScreen('home')}
        right={<Chip tone="star">🏆 {earned.length}</Chip>}
      />

      <div className="shell col">
        <div className="card">
          <div className="between" style={{ marginBottom: 8 }}>
            <span className="bold">Overall progress</span>
            <span className="faint tiny">{Math.round((earned.length / state.achievements.length) * 100)}%</span>
          </div>
          <Bar value={earned.length} max={state.achievements.length} tone="good" />
        </div>

        {earned.length ? (
          <>
            <h2>Earned</h2>
            <div className="grid">
              {earned.map((a) => (
                <div className="ach-card earned" key={a.id}>
                  <span className="ico" aria-hidden="true">{a.icon}</span>
                  <div>
                    <div className="bold">{a.name}</div>
                    <div className="faint tiny">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <h2>{earned.length ? 'Still to earn' : 'Your goals'}</h2>
        <div className="grid">
          {locked.map((a) => (
            <div className="ach-card" key={a.id}>
              <span className="ico" aria-hidden="true">{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bold">{a.name}</div>
                <div className="faint tiny" style={{ marginBottom: 6 }}>{a.description}</div>
                <Bar value={a.progress} max={a.goal} />
                <div className="faint tiny" style={{ marginTop: 4 }}>{a.progress} / {a.goal}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
