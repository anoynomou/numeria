import React, { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { audio } from '../lib/audio';
import { Btn } from '../ui/common';

type Mode = 'login' | 'register' | 'reset';

const GRADE_OPTIONS = [
  { id: 'K', label: 'Kindergarten' },
  { id: '1', label: 'Grade 1' },
  { id: '2', label: 'Grade 2' },
  { id: '3', label: 'Grade 3' },
  { id: '4', label: 'Grade 4' },
  { id: '5', label: 'Grade 5' },
  { id: '6', label: 'Grade 6' },
  { id: '7', label: 'Grade 7' },
  { id: '8', label: 'Grade 8' },
];

export function AuthScreen() {
  const setState = useStore((s) => s.setState);
  const setScreen = useStore((s) => s.setScreen);
  const toast = useStore((s) => s.toast);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState('3');
  const [isGuardian, setIsGuardian] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        audio.click();
        setState(res.state);
        setScreen(
          res.state.user.role === 'student' && !res.state.user.onboarded ? 'onboarding' : 'home'
        );
        toast('Welcome back, ' + (res.state.user.displayName || 'explorer') + '!', 'good', '👋');
      } else if (mode === 'register') {
        const res = await api.register({
          email,
          password,
          displayName,
          grade,
          role: isGuardian ? 'guardian' : 'student',
        });
        audio.click();
        setState(res.state);
        setScreen(isGuardian ? 'dashboard' : 'onboarding');
      } else {
        if (resetToken) {
          const res = await api.confirmReset(resetToken, password);
          setNotice(res.message);
          setMode('login');
          setResetToken('');
          setPassword('');
        } else {
          const res = await api.requestReset(email);
          setNotice(res.message);
          if (res.devToken) {
            setResetToken(res.devToken);
            setNotice(
              res.message + ' This build has no mail service, so the reset code is filled in for you below.'
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="brand-mark">Numeria</div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Explore, build, and solve your way through a 3D math adventure.
          </p>
        </div>

        <div className="tabs" role="tablist" aria-label="Sign in or create an account">
          <button
            className="tab" role="tab" aria-selected={mode === 'login'}
            onClick={() => { audio.click(); setMode('login'); setError(''); setNotice(''); }}
          >Sign in</button>
          <button
            className="tab" role="tab" aria-selected={mode === 'register'}
            onClick={() => { audio.click(); setMode('register'); setError(''); setNotice(''); }}
          >Create account</button>
        </div>

        {error ? <div className="error-box" role="alert">{error}</div> : null}
        {notice ? <div className="success-box" role="status">{notice}</div> : null}

        <form onSubmit={submit}>
          {mode === 'register' ? (
            <>
              <div className="field">
                <label htmlFor="name">{isGuardian ? 'Your name' : 'Display name'}</label>
                <input
                  id="name" className="input" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isGuardian ? 'Ms Rivera' : 'StarBuilder'}
                  maxLength={30} autoComplete="nickname"
                />
                {!isGuardian ? (
                  <span className="faint">This is the name other parts of the game will call you. Please do not use your full real name.</span>
                ) : null}
              </div>
              {!isGuardian ? (
                <div className="field">
                  <label htmlFor="grade">Grade level</label>
                  <select id="grade" className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <span className="faint">You can change this later in Settings without losing progress.</span>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="you@school.org"
            />
          </div>

          {mode !== 'reset' || resetToken ? (
            <div className="field">
              <label htmlFor="password">{mode === 'reset' ? 'New password' : 'Password'}</label>
              <input
                id="password" className="input" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="At least 8 characters"
              />
              {mode !== 'login' ? (
                <span className="faint">Use at least 8 characters with a letter and a number.</span>
              ) : null}
            </div>
          ) : null}

          {mode === 'reset' && resetToken ? (
            <div className="field">
              <label htmlFor="token">Reset code</label>
              <input id="token" className="input mono" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
            </div>
          ) : null}

          {mode === 'register' ? (
            <label className="switch">
              <input type="checkbox" checked={isGuardian} onChange={(e) => setIsGuardian(e.target.checked)} />
              <span>I am a teacher or parent (I want a dashboard, not the game)</span>
            </label>
          ) : null}

          <Btn type="submit" variant="primary" size="lg" block disabled={busy} style={{ marginTop: 10 }}>
            {busy ? 'Please wait...' :
              mode === 'login' ? 'Sign in' :
              mode === 'register' ? 'Create my account' :
              resetToken ? 'Set new password' : 'Send reset link'}
          </Btn>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {mode !== 'reset' ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { audio.click(); setMode('reset'); setError(''); setNotice(''); }}
            >Forgot your password?</button>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { audio.click(); setMode('login'); setError(''); setNotice(''); setResetToken(''); }}
            >Back to sign in</button>
          )}
        </div>

        <p className="faint" style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
          Numeria stores only what it needs to save your progress. Student profiles are never shown publicly.
        </p>
      </div>
    </div>
  );
}
