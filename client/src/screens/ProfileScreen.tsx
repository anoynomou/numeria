import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { Btn, ScreenHeader, Bar, Chip, Loader, Stars } from '../ui/common';
import { AvatarPortrait } from '../ui/AvatarPortrait';

/** The student's own progress report. */
export function ProfileScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const [data, setData] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);

  useEffect(() => {
    void api.profileSummary().then(setData).catch(() => setData({ error: true }));
    void api.myGuardians().then((r) => setGuardians(r.guardians)).catch(() => setGuardians([]));
  }, []);

  if (!data) return <Loader label="Gathering your progress..." />;

  const stats = data.stats || state.stats;
  const earned = (data.achievements || []).filter((a: any) => a.earned).length;

  return (
    <div className="screen">
      <ScreenHeader title="My Progress" onBack={() => setScreen('home')} />

      <div className="shell col">
        <div className="card row" style={{ gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <AvatarPortrait avatar={state.user.avatar} catalog={state.catalog} size={110} />
          <div className="grow" style={{ minWidth: 200 }}>
            <h2 style={{ marginBottom: 4 }}>{state.user.displayName || 'Explorer'}</h2>
            <div className="row-wrap">
              <Chip>{state.user.gradeLabel}</Chip>
              <Chip>Level {state.progress.currentLevel}</Chip>
              <Chip tone="xp">⚡ {state.progress.xp} XP</Chip>
              <Chip tone="coin">🪙 {state.user.coins}</Chip>
              <Chip tone="good">🔥 {stats.currentStreak} day streak</Chip>
            </div>
          </div>
        </div>

        <div className="stat-tiles">
          <div className="stat-tile"><div className="v">{stats.totalAnswered}</div><div className="k">Questions</div></div>
          <div className="stat-tile"><div className="v">{stats.totalCorrect}</div><div className="k">Correct</div></div>
          <div className="stat-tile"><div className="v">{Math.round((stats.accuracy || 0) * 100)}%</div><div className="k">Accuracy</div></div>
          <div className="stat-tile"><div className="v">{stats.puzzlesCompleted}</div><div className="k">Puzzles</div></div>
          <div className="stat-tile"><div className="v">{stats.levelsCompleted}</div><div className="k">Levels</div></div>
          <div className="stat-tile"><div className="v">{earned}</div><div className="k">Achievements</div></div>
        </div>

        {data.byTopic?.length ? (
          <div className="card">
            <h3>How you are doing by topic</h3>
            <p className="muted tiny">Based on every question you have answered in {state.user.gradeLabel}.</p>
            <div className="col" style={{ gap: 12, marginTop: 12 }}>
              {data.byTopic.map((t: any) => (
                <div key={t.topic}>
                  <div className="between" style={{ marginBottom: 4 }}>
                    <span className="bold tiny">{t.topic}</span>
                    <span className="faint tiny">
                      {t.correct}/{t.attempted} · {Math.round(t.accuracy * 100)}%
                    </span>
                  </div>
                  <Bar value={t.correct} max={t.attempted} tone={t.accuracy >= 0.75 ? 'good' : undefined} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>No questions yet</h3>
            <p className="muted">Play a level and your topic breakdown will appear here.</p>
            <Btn variant="primary" onClick={() => setScreen('home')}>Go play</Btn>
          </div>
        )}

        <div className="card">
          <h3>Worlds</h3>
          <div className="row-wrap">
            {(data.worlds || state.worlds).map((w: any) => (
              <div
                key={w.id}
                className="card-soft"
                style={{ flex: '1 1 150px', textAlign: 'center', opacity: w.unlocked ? 1 : 0.45 }}
              >
                <div style={{ fontSize: '1.7rem' }} aria-hidden="true">{w.unlocked ? w.emoji : '🔒'}</div>
                <div className="bold tiny">{w.name}</div>
                <div style={{ color: 'var(--star)' }}><Stars count={w.stars} max={w.maxStars} /></div>
                {w.complete ? <div className="chip chip-good tiny" style={{ marginTop: 6 }}>Complete</div> : null}
              </div>
            ))}
          </div>
        </div>

        {data.perGrade?.length > 1 ? (
          <div className="card">
            <h3>Your other grades</h3>
            <p className="muted tiny">Each grade keeps its own progress. Switch any time in Settings.</p>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="data">
                <thead>
                  <tr><th>Grade</th><th className="num">Level</th><th className="num">XP</th><th className="num">Levels done</th></tr>
                </thead>
                <tbody>
                  {data.perGrade.map((g: any) => (
                    <tr key={g.grade}>
                      <td>{g.grade === 'K' ? 'Kindergarten' : 'Grade ' + g.grade}</td>
                      <td className="num">{g.currentLevel}</td>
                      <td className="num">{g.xp}</td>
                      <td className="num">{g.levelsCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {data.recentLevels?.length ? (
          <div className="card">
            <h3>Recent levels</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Level</th><th className="num">Score</th><th className="num">Stars</th><th className="num">XP</th><th>When</th></tr>
                </thead>
                <tbody>
                  {data.recentLevels.map((l: any, i: number) => (
                    <tr key={i}>
                      <td>Grade {l.grade} · Level {l.level}</td>
                      <td className="num">{l.correct}/{l.total}</td>
                      <td className="num" style={{ color: 'var(--star)' }}><Stars count={l.stars} /></td>
                      <td className="num">{l.xp}</td>
                      <td className="faint tiny">{new Date(l.completed_at + 'Z').toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="card">
          <h3>Who can see my progress</h3>
          {guardians.length ? (
            <>
              <p className="muted tiny">These people can see your progress, but never your password.</p>
              <div className="col" style={{ gap: 8 }}>
                {guardians.map((g) => (
                  <div key={g.id} className="between card-soft">
                    <div>
                      <div className="bold">{g.name}</div>
                      <div className="faint tiny">{g.label || (g.role === 'guardian' ? 'Teacher or parent' : g.role)}</div>
                    </div>
                    <Btn
                      size="sm" variant="ghost"
                      onClick={async () => {
                        await api.unlinkGuardian(g.id).catch(() => { /* stale link: drop it locally anyway */ });
                        setGuardians((prev) => prev.filter((x) => x.id !== g.id));
                      }}
                    >Disconnect</Btn>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">
              Nobody is connected to your account. Your teacher or a grown-up at home can give you a
              6-letter code to connect from the home screen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
