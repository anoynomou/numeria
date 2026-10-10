import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, ScreenHeader, Modal } from '../ui/common';
import type { Settings } from '../lib/types';

export function SettingsScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const setState = useStore((s) => s.setState);
  const saveSettings = useStore((s) => s.saveSettings);
  const logout = useStore((s) => s.logout);
  const toast = useStore((s) => s.toast);

  const s = state.user.settings;
  const [name, setName] = useState(state.user.displayName);
  const [gradeModal, setGradeModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [bugModal, setBugModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [bugText, setBugText] = useState('');

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    void saveSettings({ [key]: value } as Partial<Settings>);
  }

  async function saveName() {
    if (name.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await api.updateProfile({ displayName: name.trim() });
      setState(res.state);
      toast('Name updated.', 'good');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function changeGrade(grade: string) {
    setBusy(true);
    try {
      const res = await api.updateProfile({ grade });
      setState(res.state);
      setGradeModal(false);
      toast('Grade changed to ' + res.state.user.gradeLabel + '. Your old progress is safe.', 'good', '🎓');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not change grade.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwError('');
    setBusy(true);
    try {
      const res = await api.changePassword(currentPw, newPw);
      toast(res.message, 'good');
      setPwModal(false);
      setCurrentPw('');
      setNewPw('');
    } catch (e) {
      setPwError(e instanceof ApiError ? e.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFullscreen() {
    audio.click();
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      toast('Fullscreen is not available in this browser.', 'info');
    }
  }

  return (
    <div className="screen">
      <ScreenHeader title="Settings" onBack={() => setScreen('home')} />

      <div className="shell col">
        {/* Profile */}
        <div className="card">
          <h3>Profile</h3>
          <div className="field">
            <label htmlFor="dn">Display name</label>
            <div className="row">
              <input id="dn" className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
              <Btn onClick={saveName} disabled={busy || name === state.user.displayName || name.trim().length < 2}>
                Save
              </Btn>
            </div>
          </div>
          <div className="between card-soft">
            <div>
              <div className="bold">Grade level</div>
              <div className="faint tiny">
                Currently {state.user.gradeLabel}. Changing grade keeps every grade's progress separate.
              </div>
            </div>
            <Btn onClick={() => { audio.click(); setGradeModal(true); }}>Change</Btn>
          </div>
        </div>

        {/* Audio */}
        <div className="card">
          <h3>Sound</h3>
          <div className="field">
            <label htmlFor="music">Music volume · {Math.round(s.musicVolume * 100)}%</label>
            <input
              id="music" className="range" type="range" min={0} max={1} step={0.05}
              value={s.musicVolume}
              onChange={(e) => set('musicVolume', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="sfx">Sound effects · {Math.round(s.soundVolume * 100)}%</label>
            <input
              id="sfx" className="range" type="range" min={0} max={1} step={0.05}
              value={s.soundVolume}
              onChange={(e) => set('soundVolume', Number(e.target.value))}
              onMouseUp={() => audio.click()}
            />
          </div>
          <Btn size="sm" onClick={() => { set('musicVolume', 0); set('soundVolume', 0); }}>
            Mute everything
          </Btn>
        </div>

        {/* Graphics and controls */}
        <div className="card">
          <h3>Graphics &amp; controls</h3>
          <div className="field">
            <label htmlFor="quality">Graphics quality</label>
            <select
              id="quality" className="select" value={s.graphicsQuality}
              onChange={(e) => set('graphicsQuality', e.target.value as Settings['graphicsQuality'])}
            >
              <option value="low">Low — best for older laptops and Chromebooks</option>
              <option value="medium">Medium — balanced (recommended)</option>
              <option value="high">High — shadows and full detail</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sens">Camera speed · {s.cameraSensitivity.toFixed(1)}x</label>
            <input
              id="sens" className="range" type="range" min={0.3} max={2.5} step={0.1}
              value={s.cameraSensitivity}
              onChange={(e) => set('cameraSensitivity', Number(e.target.value))}
            />
          </div>
          <label className="switch">
            <input type="checkbox" checked={s.invertY} onChange={(e) => set('invertY', e.target.checked)} />
            <span>Invert vertical camera</span>
          </label>
          <Btn size="sm" onClick={toggleFullscreen}>Toggle fullscreen</Btn>
        </div>

        {/* Accessibility */}
        <div className="card">
          <h3>Accessibility</h3>
          <p className="muted tiny">These settings apply everywhere in the game.</p>
          <label className="switch">
            <input type="checkbox" checked={s.largeText} onChange={(e) => set('largeText', e.target.checked)} />
            <span>Larger text</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.highContrast} onChange={(e) => set('highContrast', e.target.checked)} />
            <span>High contrast colours</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.colorBlindSafe} onChange={(e) => set('colorBlindSafe', e.target.checked)} />
            <span>Colour-blind friendly palette</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.reducedMotion} onChange={(e) => set('reducedMotion', e.target.checked)} />
            <span>Reduce motion and animation</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.readAloud} onChange={(e) => set('readAloud', e.target.checked)} />
            <span>Read questions aloud automatically</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.showCaptions} onChange={(e) => set('showCaptions', e.target.checked)} />
            <span>Show captions for character speech</span>
          </label>
          <p className="faint tiny" style={{ marginTop: 10, marginBottom: 0 }}>
            Every screen can also be used with the keyboard alone: Tab to move between controls,
            Enter or Space to activate, and arrow keys inside puzzles.
          </p>
        </div>

        {/* Account */}
        <div className="card">
          <h3>Account</h3>
          <div className="row-wrap">
            <Btn onClick={() => { audio.click(); setPwModal(true); }}>Change password</Btn>
            <Btn onClick={() => { audio.click(); setBugModal(true); }}>Report a problem</Btn>
            <Btn variant="danger" onClick={() => { void logout(); }}>Log out</Btn>
          </div>
          <p className="faint tiny" style={{ marginTop: 12, marginBottom: 0 }}>
            Numeria keeps only your email, display name, grade and progress. Your profile is never
            shown to other students.
          </p>
        </div>
      </div>

      {gradeModal ? (
        <Modal onClose={() => setGradeModal(false)} labelledBy="grade-title">
          <h2 id="grade-title">Change grade level</h2>
          <p className="muted">
            Your progress in {state.user.gradeLabel} is saved and will still be here if you come back.
          </p>
          <div className="grid">
            {state.grades.map((g) => (
              <button
                key={g.id}
                className="option-card"
                aria-pressed={g.id === state.user.grade}
                disabled={busy}
                onClick={() => changeGrade(g.id)}
              >
                <div className="bold">{g.label}</div>
                <div className="faint tiny">{g.topics.slice(0, 3).join(' · ')}</div>
                {g.id === state.user.grade ? <div className="chip chip-good" style={{ marginTop: 6 }}>Current</div> : null}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {pwModal ? (
        <Modal onClose={() => setPwModal(false)} labelledBy="pw-title">
          <h2 id="pw-title">Change password</h2>
          {pwError ? <div className="error-box" role="alert">{pwError}</div> : null}
          <div className="field">
            <label htmlFor="cpw">Current password</label>
            <input id="cpw" className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="npw">New password</label>
            <input id="npw" className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            <span className="faint">At least 8 characters, with a letter and a number.</span>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Btn onClick={() => setPwModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={changePassword} disabled={busy || !currentPw || !newPw}>Update</Btn>
          </div>
        </Modal>
      ) : null}

      {bugModal ? (
        <Modal onClose={() => setBugModal(false)} labelledBy="bug-title">
          <h2 id="bug-title">Report a problem</h2>
          <p className="muted">Tell us what went wrong and we will take a look.</p>
          <textarea
            className="textarea"
            value={bugText}
            onChange={(e) => setBugText(e.target.value)}
            placeholder="What happened? What were you doing at the time?"
            maxLength={2000}
          />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn onClick={() => setBugModal(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={bugText.trim().length < 5 || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api.reportBug(bugText, {
                    grade: state.user.grade,
                    level: state.progress.currentLevel,
                    challenge: state.progress.currentChallenge,
                    userAgent: navigator.userAgent.slice(0, 200),
                  });
                  toast(res.message, 'good', '📨');
                  setBugModal(false);
                  setBugText('');
                } catch (e) {
                  toast(e instanceof ApiError ? e.message : 'Could not send that.', 'bad');
                } finally {
                  setBusy(false);
                }
              }}
            >Send report</Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
