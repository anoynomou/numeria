import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, Bar, Chip, Modal, Stars } from '../ui/common';
import { AvatarPortrait } from '../ui/AvatarPortrait';

export function HomeScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const startPlay = useStore((s) => s.startPlay);
  const logout = useStore((s) => s.logout);
  const toast = useStore((s) => s.toast);
  const setState = useStore((s) => s.setState);

  const [linkOpen, setLinkOpen] = useState(false);
  const [code, setCode] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState('');

  const { user, progress, currentLevel, stats, worlds } = state;
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const world = worlds.find((w) => w.id === currentLevel.worldId);

  async function redeem() {
    setLinkBusy(true);
    setLinkError('');
    try {
      const res = await api.redeemCode(code.trim().toUpperCase());
      toast('Connected to ' + res.connectedTo + '.', 'good', '🔗');
      setLinkOpen(false);
      setCode('');
    } catch (e) {
      setLinkError(e instanceof ApiError ? e.message : 'Could not use that code.');
    } finally {
      setLinkBusy(false);
    }
  }

  // Guardians land on their dashboard instead of the game hub.
  if (user.role === 'guardian') {
    return (
      <div className="screen">
        <div className="shell col">
          <div className="card between">
            <div>
              <h1 style={{ marginBottom: 4 }}>Hello, {user.displayName || 'there'}</h1>
              <p className="muted" style={{ marginBottom: 0 }}>You have a teacher and parent account.</p>
            </div>
            <div className="row-wrap">
              <Btn variant="primary" onClick={() => setScreen('dashboard')}>Open dashboard</Btn>
              <Btn onClick={() => { void logout(); }}>Log out</Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="shell col">
        {/* Header */}
        <div className="card">
          <div className="hub-header">
            <button
              className="hub-avatar"
              onClick={() => { audio.click(); setScreen('wardrobe'); }}
              aria-label="Change your character"
              style={{ cursor: 'pointer', padding: 0 }}
            >
              <AvatarPortrait avatar={user.avatar} catalog={state.catalog} size={92} />
            </button>

            <div className="grow" style={{ minWidth: 200 }}>
              <h1 style={{ marginBottom: 2 }}>{user.displayName || 'Explorer'}</h1>
              <div className="row-wrap">
                <Chip>{user.gradeLabel}</Chip>
                <Chip tone="xp">⚡ {progress.xp} XP</Chip>
                <Chip tone="coin">🪙 {user.coins}</Chip>
                <Chip tone="star">⭐ {totalStars}</Chip>
                {user.streak > 0 ? <Chip tone="good">🔥 {user.streak} day streak</Chip> : null}
              </div>
            </div>

            <div className="row-wrap">
              {user.role === 'admin' ? (
                <Btn size="sm" onClick={() => setScreen('admin')}>🛠️ Admin</Btn>
              ) : null}
              <Btn size="sm" onClick={() => { void logout(); }}>Log out</Btn>
            </div>
          </div>
        </div>

        {/* Continue card */}
        <div className="card">
          <div className="between">
            <div style={{ minWidth: 220 }}>
              <div className="faint" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Continue your adventure
              </div>
              <h2 style={{ marginTop: 6, marginBottom: 6 }}>
                {world?.emoji} Level {currentLevel.level} · {currentLevel.name}
              </h2>
              <p className="muted" style={{ marginBottom: 8 }}>{currentLevel.intro}</p>
              <div className="row" style={{ maxWidth: 360 }}>
                <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>
                  {progress.currentChallenge - 1}/{progress.challengesPerLevel}
                </span>
                <div className="grow">
                  <Bar value={progress.currentChallenge - 1} max={progress.challengesPerLevel} tone="good" />
                </div>
              </div>
              <div className="faint" style={{ marginTop: 6 }}>{currentLevel.worldName}</div>
            </div>

            <Btn variant="primary" size="lg" onClick={() => { audio.click(); startPlay(); }}>
              ▶ Play
            </Btn>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className="v">{stats.totalCorrect}</div>
            <div className="k">Correct</div>
          </div>
          <div className="stat-tile">
            <div className="v">{stats.totalAnswered ? Math.round(stats.accuracy * 100) : 0}%</div>
            <div className="k">Accuracy</div>
          </div>
          <div className="stat-tile">
            <div className="v">{stats.puzzlesCompleted}</div>
            <div className="k">Puzzles</div>
          </div>
          <div className="stat-tile">
            <div className="v">{stats.levelsCompleted}</div>
            <div className="k">Levels done</div>
          </div>
          <div className="stat-tile">
            <div className="v">{stats.worldsCompleted}</div>
            <div className="k">Worlds done</div>
          </div>
        </div>

        {/* Menu */}
        <div className="menu-grid">
          <button className="menu-btn" onClick={() => { audio.click(); setScreen('map'); }}>
            <span className="ico" aria-hidden="true">🗺️</span>
            <span>Worlds &amp; Levels</span>
          </button>
          <button className="menu-btn" onClick={() => { audio.click(); setScreen('wardrobe'); }}>
            <span className="ico" aria-hidden="true">👕</span>
            <span>Character</span>
          </button>
          <button className="menu-btn" onClick={() => { audio.click(); setScreen('achievements'); }}>
            <span className="ico" aria-hidden="true">🏆</span>
            <span>Achievements</span>
          </button>
          <button className="menu-btn" onClick={() => { audio.click(); setScreen('profile'); }}>
            <span className="ico" aria-hidden="true">📊</span>
            <span>My Progress</span>
          </button>
          <button className="menu-btn" onClick={() => { audio.click(); setScreen('settings'); }}>
            <span className="ico" aria-hidden="true">⚙️</span>
            <span>Settings</span>
          </button>
          <button className="menu-btn" onClick={() => { audio.click(); setLinkOpen(true); }}>
            <span className="ico" aria-hidden="true">🔗</span>
            <span>Connect teacher</span>
          </button>
        </div>

        {/* World strip */}
        <div className="card">
          <div className="between" style={{ marginBottom: 12 }}>
            <h2 style={{ marginBottom: 0 }}>Your worlds</h2>
            <Btn size="sm" onClick={() => setScreen('map')}>See the map</Btn>
          </div>
          <div className="row-wrap">
            {worlds.map((w) => (
              <div
                key={w.id}
                className="card-soft"
                style={{
                  flex: '1 1 150px', textAlign: 'center',
                  opacity: w.unlocked ? 1 : 0.45,
                  borderColor: w.complete ? 'var(--brand)' : undefined,
                }}
              >
                <div style={{ fontSize: '1.8rem' }} aria-hidden="true">{w.unlocked ? w.emoji : '🔒'}</div>
                <div className="bold tiny">{w.name}</div>
                <div className="tiny" style={{ color: 'var(--star)' }}>
                  <Stars count={w.stars} max={w.maxStars} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {linkOpen ? (
        <Modal onClose={() => setLinkOpen(false)} labelledBy="link-title">
          <h2 id="link-title">Connect to a teacher or parent</h2>
          <p className="muted">
            If your teacher or a grown-up at home gave you a 6-letter code, type it here. They will be
            able to see your progress, but never your password.
          </p>
          {linkError ? <div className="error-box" role="alert">{linkError}</div> : null}
          <input
            className="input mono"
            style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em' }}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            aria-label="Connection code"
          />
          <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setLinkOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={redeem} disabled={code.length !== 6 || linkBusy}>
              {linkBusy ? 'Connecting...' : 'Connect'}
            </Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
