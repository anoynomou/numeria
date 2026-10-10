import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio, type Ambience } from '../lib/audio';
import { Btn, Modal, Loader, Chip, Bar } from '../ui/common';
import { World3D, useCameraDrag } from '../world/World3D';
import { Joystick, useIsTouch } from '../world/Joystick';
import { attachKeyboard, resetInput } from '../world/controls';
import { gemPositions, GEM_COUNT } from '../world/Collectibles';
import { PuzzleHost } from '../puzzles/PuzzleHost';
import { MathChallenge } from '../math/MathChallenge';
import { LevelComplete } from './LevelComplete';
import type { WorldScene, Challenge, Station, LevelSummary, AnswerResult } from '../lib/types';

type Phase = 'explore' | 'dialogue' | 'puzzle' | 'math' | 'complete';

export function GameScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const refresh = useStore((s) => s.refresh);
  const toast = useStore((s) => s.toast);
  const playLevel = useStore((s) => s.playLevel);

  const [scene, setScene] = useState<WorldScene | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [phase, setPhase] = useState<Phase>('explore');
  const [near, setNear] = useState<Station | null>(null);
  const [dialogueLine, setDialogueLine] = useState(0);
  const [levelSummary, setLevelSummary] = useState<LevelSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [flavour, setFlavour] = useState<Station | null>(null);
  const [claimedGems, setClaimedGems] = useState<Set<number>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouch();
  const phaseRef = useRef<Phase>('explore');
  phaseRef.current = phase;
  const nearRef = useRef<Station | null>(null);
  nearRef.current = near;

  useCameraDrag(rootRef);

  /* ---------------------------------------------------------------- */
  /* Load the world and the current challenge                          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [w, c] = await Promise.all([
          api.world(playLevel ?? undefined),
          api.challenge().catch(() => ({ challenge: null as Challenge | null })),
        ]);
        if (cancelled) return;
        setScene(w);
        setChallenge(c.challenge);
        audio.startMusic((w.world.ambience as Ambience) || 'forest');
        const g = await api.gems(w.level.level).catch(() => ({ claimed: [] as number[], total: GEM_COUNT }));
        if (!cancelled) setClaimedGems(new Set(g.claimed));
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load the world.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      audio.stopMusic();
      resetInput();
    };
  }, [playLevel]);

  /* ---------------------------------------------------------------- */
  /* Interaction                                                       */
  /* ---------------------------------------------------------------- */
  const handleInteract = useCallback(() => {
    if (phaseRef.current !== 'explore') return;
    const station = nearRef.current;
    if (!station || !scene) return;

    if (station.id === scene.activeStationId && challenge) {
      audio.click();
      setDialogueLine(0);
      setPhase('dialogue');
    } else {
      audio.hover();
      setFlavour(station);
    }
  }, [scene, challenge]);

  useEffect(() => {
    const detach = attachKeyboard(handleInteract);
    return detach;
  }, [handleInteract]);

  // Escape opens the pause menu while exploring.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phaseRef.current === 'explore') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Challenge flow                                                    */
  /* ---------------------------------------------------------------- */
  async function loadNextChallenge() {
    try {
      const res = await api.challenge();
      setChallenge(res.challenge);
      const w = await api.world();
      setScene(w);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast('You have finished everything here!', 'good', '🎉');
        setScreen('home');
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Could not load the next challenge.');
    }
  }

  function startChallengeBody() {
    if (!challenge) return;
    if (challenge.puzzle && !challenge.puzzleDone) setPhase('puzzle');
    else setPhase('math');
  }

  async function handlePuzzleComplete(pieces: number, seconds: number) {
    if (!challenge) return;
    try {
      const res = await api.completePuzzle(challenge.id, pieces, seconds);
      setChallenge(res.challenge);
      if (res.achievements?.length) {
        res.achievements.forEach((a) => toast('Achievement unlocked: ' + a.name, 'good', a.icon));
      }
      setPhase('math');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save your build.', 'bad');
    }
  }

  const submitAnswer = useCallback(
    async (answer: string, seconds: number): Promise<AnswerResult> => {
      if (!challenge) throw new Error('no challenge');
      const res = await api.answer(challenge.id, answer, seconds);
      if (res.achievements?.length) {
        res.achievements.forEach((a) => toast('Achievement unlocked: ' + a.name, 'good', a.icon));
      }
      return res;
    },
    [challenge, toast]
  );

  const requestHint = useCallback(async () => {
    if (!challenge) return [];
    const res = await api.hint(challenge.id);
    return res.hints;
  }, [challenge]);

  async function handleAnswerDone(result: AnswerResult) {
    if (result.levelComplete && result.levelSummary) {
      setLevelSummary(result.levelSummary);
      setPhase('complete');
      void refresh();
      return;
    }
    setPhase('explore');
    await loadNextChallenge();
    void refresh();
  }

  async function skipChallenge() {
    if (!challenge) return;
    try {
      await api.skipChallenge(challenge.id);
      await loadNextChallenge();
    } catch { /* keep the student in the world regardless */ }
    setPhase('explore');
  }

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
  /* ---------------------------------------------------------------- */
  const doneStationIds = useMemo(() => {
    if (!scene) return [];
    const stations = scene.world.stations;
    const completed = scene.progress.currentChallenge - 1;
    const cycle = stations.length;
    const inCycle = completed % cycle;
    // Stations already visited during this pass through the world.
    return stations.slice(0, inCycle).map((s) => s.id);
  }, [scene]);

  const activeStation = useMemo(
    () => scene?.world.stations.find((s) => s.id === scene.activeStationId) || null,
    [scene]
  );

  const gems = useMemo(
    () => (scene ? gemPositions(scene.world.id, scene.world.stations) : []),
    [scene]
  );

  const collectGem = useCallback(async (index: number) => {
    if (!scene) return;
    setClaimedGems((prev) => new Set(prev).add(index));
    try {
      const res = await api.collectGem(scene.level.level, index);
      if (res.reward) {
        audio.reward();
        toast('Found a gem! +' + res.reward + ' coins', 'good', '💎');
        void refresh();
      }
    } catch {
      // A failed claim just leaves the gem hidden for this session.
    }
  }, [scene, toast, refresh]);

  if (loading) return <Loader label="Building the world..." />;

  if (error || !scene) {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h2>We could not open that world</h2>
          <p className="muted">{error || 'Something went wrong.'}</p>
          <Btn variant="primary" onClick={() => setScreen('home')}>Back to home</Btn>
        </div>
      </div>
    );
  }

  const modalOpen = phase !== 'explore' || paused || !!flavour;
  const progressPct = scene.progress.currentChallenge - 1;

  return (
    <div className="game-root" ref={rootRef}>
      <World3D
        worldId={scene.world.id}
        palette={scene.world.palette}
        ambience={scene.world.ambience}
        props={scene.world.props}
        stations={scene.world.stations}
        activeStationId={scene.activeStationId}
        doneStationIds={doneStationIds}
        avatar={state.user.avatar}
        catalog={state.catalog}
        settings={state.user.settings}
        paused={modalOpen}
        gems={gems}
        claimedGems={claimedGems}
        onCollectGem={collectGem}
        onNearStation={setNear}
      />

      <div className="hud">
        <div className="hud-top">
          <div className="hud-panel">
            <div className="row-wrap" style={{ gap: 8 }}>
              <span className="bold">{scene.world.emoji} {scene.world.name}</span>
              <Chip>Level {scene.level.level}</Chip>
            </div>
            <div className="row" style={{ marginTop: 6, minWidth: 190 }}>
              <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>
                {progressPct}/{scene.level.challengeCount}
              </span>
              <div className="grow"><Bar value={progressPct} max={scene.level.challengeCount} tone="good" /></div>
            </div>
          </div>

          <div className="row-wrap" style={{ gap: 8 }}>
            <div className="hud-panel row-wrap" style={{ gap: 8 }}>
              <Chip tone="xp">⚡ {state.progress.xp}</Chip>
              <Chip tone="coin">🪙 {state.user.coins}</Chip>
              <Chip title="Hidden gems found in this level">💎 {claimedGems.size}/{GEM_COUNT}</Chip>
            </div>
            <Btn className="btn-icon" onClick={() => setPaused(true)} aria-label="Pause menu">☰</Btn>
          </div>
        </div>

        {/* Objective tracker */}
        {activeStation && phase === 'explore' ? (
          <div className="objective">
            <div className="faint tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Objective {scene.progress.currentChallenge} of {scene.level.challengeCount}
            </div>
            <div className="bold">Find {activeStation.name}</div>
            <div className="faint tiny">Follow the golden beacon.</div>
          </div>
        ) : null}

        {/* Interact prompt */}
        {near && phase === 'explore' && !modalOpen ? (
          <div className="interact-prompt">
            <div className="bold" style={{ color: 'var(--brand)' }}>{near.name}</div>
            <div className="tiny muted">
              {near.id === scene.activeStationId ? 'Your objective' : 'Have a look around'}
            </div>
            {!isTouch ? (
              <div style={{ marginTop: 6 }}>
                Press <kbd className="chip">E</kbd> to interact
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Touch controls */}
        {isTouch && phase === 'explore' && !modalOpen ? (
          <>
            <Joystick />
            <Btn
              className="touch-interact"
              variant={near ? 'primary' : 'default'}
              onClick={handleInteract}
              disabled={!near}
              aria-label="Interact"
            >
              {near ? 'Interact' : '—'}
            </Btn>
          </>
        ) : null}

        {!isTouch && phase === 'explore' && !modalOpen ? (
          <div className="hud-panel" style={{ position: 'absolute', right: 12, bottom: 12, fontSize: '0.8rem' }}>
            <div><strong>WASD</strong> / arrows to move</div>
            <div><strong>Drag</strong> to look around</div>
            <div><strong>Shift</strong> to run · <strong>E</strong> to interact</div>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Dialogue                                                     */}
      {/* ---------------------------------------------------------- */}
      {phase === 'dialogue' && challenge?.station ? (
        <div className="overlay" style={{ alignItems: 'flex-end', paddingBottom: '8vh' }}>
          <div className="dialogue" style={{ position: 'relative', left: 'auto', bottom: 'auto', transform: 'none' }}>
            <div className="who">{challenge.station.name}</div>
            <p style={{ fontSize: '1.05rem' }}>
              {challenge.station.lines[Math.min(dialogueLine, challenge.station.lines.length - 1)]}
            </p>
            <div className="between">
              <span className="faint tiny">
                {dialogueLine + 1} / {challenge.station.lines.length}
              </span>
              <div className="row">
                <Btn size="sm" variant="ghost" onClick={() => { setPhase('explore'); }}>
                  Not now
                </Btn>
                <Btn
                  variant="primary"
                  onClick={() => {
                    audio.click();
                    if (dialogueLine < challenge.station!.lines.length - 1) setDialogueLine((d) => d + 1);
                    else startChallengeBody();
                  }}
                >
                  {dialogueLine < challenge.station.lines.length - 1 ? 'Next' : "Let's do it"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Flavour dialogue for non-objective stations */}
      {flavour ? (
        <Modal onClose={() => setFlavour(null)} labelledBy="flavour-title">
          <div className="who" style={{ color: 'var(--brand)', fontWeight: 900 }}>{flavour.name}</div>
          <h2 id="flavour-title" style={{ marginTop: 4 }}>{flavour.lines[0]}</h2>
          <p className="muted">
            {doneStationIds.includes(flavour.id)
              ? 'You have already helped here. Well done!'
              : 'There is nothing to do here yet. Follow the golden beacon to your current objective.'}
          </p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="primary" onClick={() => setFlavour(null)}>Close</Btn>
          </div>
        </Modal>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Puzzle                                                       */}
      {/* ---------------------------------------------------------- */}
      {phase === 'puzzle' && challenge?.puzzle ? (
        <Modal wide labelledBy="puzzle-title">
          <PuzzleHost
            puzzle={challenge.puzzle}
            onComplete={handlePuzzleComplete}
            onSkip={() => { setPhase('explore'); void skipChallenge(); }}
          />
        </Modal>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Math                                                         */}
      {/* ---------------------------------------------------------- */}
      {phase === 'math' && challenge?.question ? (
        <Modal wide>
          <MathChallenge
            key={challenge.id}
            question={challenge.question}
            hints={challenge.question.hints}
            onSubmit={submitAnswer}
            onHint={requestHint}
            onDone={handleAnswerDone}
            readAloud={state.user.settings.readAloud}
            stationName={challenge.station?.name}
          />
        </Modal>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Level complete                                               */}
      {/* ---------------------------------------------------------- */}
      {phase === 'complete' && levelSummary ? (
        <LevelComplete
          summary={levelSummary}
          onContinue={async () => {
            setLevelSummary(null);
            setPhase('explore');
            setLoading(true);
            try {
              const [w, c] = await Promise.all([api.world(), api.challenge()]);
              setScene(w);
              setChallenge(c.challenge);
              audio.startMusic((w.world.ambience as Ambience) || 'forest');
            } catch {
              setScreen('home');
            } finally {
              setLoading(false);
            }
          }}
          onHome={() => setScreen('home')}
        />
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Pause menu                                                   */}
      {/* ---------------------------------------------------------- */}
      {paused ? (
        <Modal onClose={() => setPaused(false)} labelledBy="pause-title">
          <h2 id="pause-title">Paused</h2>
          <p className="muted">{scene.level.intro}</p>
          <div className="stat-tiles" style={{ marginBottom: 16 }}>
            <div className="stat-tile">
              <div className="v">{scene.progress.levelCorrect}</div>
              <div className="k">Correct so far</div>
            </div>
            <div className="stat-tile">
              <div className="v">{progressPct}/{scene.level.challengeCount}</div>
              <div className="k">Challenges</div>
            </div>
            <div className="stat-tile">
              <div className="v">{state.user.coins}</div>
              <div className="k">Coins</div>
            </div>
          </div>
          <div className="col">
            <Btn variant="primary" block onClick={() => setPaused(false)}>Keep playing</Btn>
            <Btn block onClick={() => { setPaused(false); setScreen('settings'); }}>Settings</Btn>
            <Btn block onClick={() => { setPaused(false); setScreen('map'); }}>World map</Btn>
            <Btn block onClick={() => setScreen('home')}>Save and exit to home</Btn>
          </div>
          <p className="faint tiny" style={{ marginTop: 12, marginBottom: 0 }}>
            Your progress saves automatically after every challenge.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
