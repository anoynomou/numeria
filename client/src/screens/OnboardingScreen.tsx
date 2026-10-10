import React, { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { audio } from '../lib/audio';
import { Btn, Bar } from '../ui/common';
import { AvatarPortrait } from '../ui/AvatarPortrait';
import type { AvatarConfig } from '../lib/types';

const STEPS = ['Your name', 'Your grade', 'Your character'];

export function OnboardingScreen() {
  const state = useStore((s) => s.state)!;
  const setState = useStore((s) => s.setState);
  const setScreen = useStore((s) => s.setScreen);
  const toast = useStore((s) => s.toast);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.user.displayName || '');
  const [grade, setGrade] = useState(state.user.grade);
  const [avatar, setAvatar] = useState<AvatarConfig>(state.user.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const catalog = state.catalog;
  const freeCharacters = catalog.characters.filter((c) => !c.cost && !c.unlockLevel);

  function set<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) {
    audio.click();
    setAvatar((a) => ({ ...a, [key]: value }));
  }

  async function finish() {
    setBusy(true);
    setError('');
    try {
      const res = await api.updateProfile({
        displayName: name.trim(),
        grade,
        avatar,
        onboarded: true,
      });
      setState(res.state);
      audio.unlock();
      toast('Your adventure begins!', 'good', '🎉');
      setScreen('home');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile.');
      setBusy(false);
    }
  }

  const canAdvance = step === 0 ? name.trim().length >= 2 : true;

  return (
    <div className="screen">
      <div className="shell">
        <div className="card">
          <div className="between" style={{ marginBottom: 14 }}>
            <h1 style={{ marginBottom: 0 }}>Let's get you ready</h1>
            <span className="chip">Step {step + 1} of {STEPS.length}</span>
          </div>
          <Bar value={step + 1} max={STEPS.length} />

          {error ? <div className="error-box" style={{ marginTop: 14 }} role="alert">{error}</div> : null}

          <div style={{ marginTop: 22 }}>
            {step === 0 ? (
              <>
                <h2>What should we call you?</h2>
                <p className="muted">
                  Pick a nickname you like. Other students never see your profile, but keep your full
                  real name out of it anyway.
                </p>
                <input
                  className="input" value={name} maxLength={30} autoFocus
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. StarBuilder"
                  onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) setStep(1); }}
                  aria-label="Display name"
                />
                <div className="row-wrap" style={{ marginTop: 12 }}>
                  {['StarBuilder', 'MathPilot', 'PuzzleFox', 'NovaScout'].map((s) => (
                    <Btn key={s} size="sm" onClick={() => setName(s)}>{s}</Btn>
                  ))}
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2>Which grade are you in?</h2>
                <p className="muted">
                  This sets the math you will practise. You can change it any time in Settings, and
                  each grade keeps its own progress.
                </p>
                <div className="grid">
                  {state.grades.map((g) => (
                    <button
                      key={g.id}
                      className="option-card"
                      aria-pressed={grade === g.id}
                      onClick={() => { audio.click(); setGrade(g.id); }}
                    >
                      <div className="bold" style={{ fontSize: '1.1rem' }}>{g.label}</div>
                      <div className="faint" style={{ marginTop: 4 }}>
                        {g.topics.slice(0, 3).join(' · ')}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2>Choose your character</h2>
                <p className="muted">More characters and styles unlock as you play.</p>
                <div className="row" style={{ alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
                  <div className="card-soft" style={{ textAlign: 'center' }}>
                    <AvatarPortrait avatar={avatar} catalog={catalog} size={150} />
                    <div className="bold" style={{ marginTop: 6 }}>{name || 'Explorer'}</div>
                  </div>

                  <div className="grow" style={{ minWidth: 260 }}>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                      {freeCharacters.map((c) => (
                        <button
                          key={c.id}
                          className="option-card"
                          aria-pressed={avatar.character === c.id}
                          onClick={() => set('character', c.id)}
                        >
                          <div className="bold">{c.name}</div>
                          <div className="faint">{c.blurb}</div>
                        </button>
                      ))}
                    </div>

                    <h3 style={{ marginTop: 18 }}>Skin tone</h3>
                    <div className="swatch-row">
                      {catalog.skinTones.map((t) => (
                        <button
                          key={t.id} className="swatch" style={{ background: t.hex }}
                          aria-pressed={avatar.skinTone === t.id}
                          aria-label={'Skin tone ' + t.id}
                          onClick={() => set('skinTone', t.id)}
                        />
                      ))}
                    </div>

                    <h3 style={{ marginTop: 16 }}>Hair</h3>
                    <div className="row-wrap">
                      {catalog.hairStyles.map((h) => (
                        <Btn
                          key={h.id} size="sm"
                          variant={avatar.hairStyle === h.id ? 'primary' : 'default'}
                          onClick={() => set('hairStyle', h.id)}
                        >{h.name}</Btn>
                      ))}
                    </div>
                    <div className="swatch-row" style={{ marginTop: 10 }}>
                      {catalog.hairColors.filter((c) => !c.cost).map((c) => (
                        <button
                          key={c.id} className="swatch" style={{ background: c.hex }}
                          aria-pressed={avatar.hairColor === c.id}
                          aria-label={'Hair colour ' + c.id}
                          onClick={() => set('hairColor', c.id)}
                        />
                      ))}
                    </div>

                    <h3 style={{ marginTop: 16 }}>Shirt</h3>
                    <div className="swatch-row">
                      {catalog.shirts.filter((c) => !c.cost).map((c) => (
                        <button
                          key={c.id} className="swatch" style={{ background: c.hex }}
                          aria-pressed={avatar.shirt === c.id}
                          aria-label={'Shirt colour ' + c.id}
                          onClick={() => set('shirt', c.id)}
                        />
                      ))}
                    </div>

                    <h3 style={{ marginTop: 16 }}>Trousers</h3>
                    <div className="swatch-row">
                      {catalog.pants.filter((c) => !c.cost).map((c) => (
                        <button
                          key={c.id} className="swatch" style={{ background: c.hex }}
                          aria-pressed={avatar.pants === c.id}
                          aria-label={'Trouser colour ' + c.id}
                          onClick={() => set('pants', c.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="between" style={{ marginTop: 26 }}>
            <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
              Back
            </Btn>
            {step < STEPS.length - 1 ? (
              <Btn variant="primary" size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
                Next
              </Btn>
            ) : (
              <Btn variant="good" size="lg" onClick={finish} disabled={busy}>
                {busy ? 'Saving...' : 'Start the adventure'}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
