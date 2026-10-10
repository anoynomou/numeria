import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, ScreenHeader, Bar, Chip, Modal, Loader } from '../ui/common';

/**
 * Teacher and parent view.
 *
 * Shows progress only: no contact details, and only for students who have
 * connected themselves using a code the guardian generated.
 */
export function TeacherDashboard() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const logout = useStore((s) => s.logout);
  const toast = useStore((s) => s.toast);

  const [students, setStudents] = useState<any[] | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.students();
      setStudents(res.students);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not load students.', 'bad');
      setStudents([]);
    }
  }

  useEffect(() => { void load(); }, []);

  async function openStudent(id: number) {
    setLoadingDetail(true);
    try {
      const res = await api.student(id);
      setDetail(res);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not load that student.', 'bad');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function makeCode() {
    setBusy(true);
    try {
      const res = await api.linkCode(label);
      setCode(res.code);
      audio.unlock();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not create a code.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  if (!students) return <Loader label="Loading your class..." />;

  return (
    <div className="screen">
      <ScreenHeader
        title="Teacher & parent dashboard"
        subtitle={students.length + (students.length === 1 ? ' student connected' : ' students connected')}
        onBack={state.user.role === 'admin' ? () => setScreen('home') : undefined}
        right={
          <div className="row-wrap">
            <Btn variant="primary" onClick={() => { audio.click(); setCodeModal(true); setCode(''); }}>
              + Connect a student
            </Btn>
            <Btn onClick={() => { void logout(); }}>Log out</Btn>
          </div>
        }
      />

      <div className="shell col">
        {students.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.6rem' }} aria-hidden="true">👋</div>
            <h2>No students yet</h2>
            <p className="muted">
              Create a connection code and give it to your student. They enter it from their home
              screen and their progress will appear here.
            </p>
            <Btn variant="primary" onClick={() => { setCodeModal(true); setCode(''); }}>Create a code</Btn>
          </div>
        ) : (
          <>
            {/* Class summary */}
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="v">{students.length}</div>
                <div className="k">Students</div>
              </div>
              <div className="stat-tile">
                <div className="v">{students.reduce((a, s) => a + s.questionsAnswered, 0)}</div>
                <div className="k">Questions done</div>
              </div>
              <div className="stat-tile">
                <div className="v">
                  {(() => {
                    const t = students.reduce((a, s) => a + s.questionsAnswered, 0);
                    const c = students.reduce((a, s) => a + s.correct, 0);
                    return t ? Math.round((c / t) * 100) : 0;
                  })()}%
                </div>
                <div className="k">Class accuracy</div>
              </div>
              <div className="stat-tile">
                <div className="v">{students.reduce((a, s) => a + s.minutesPlayed, 0)}</div>
                <div className="k">Minutes played</div>
              </div>
            </div>

            <div className="card">
              <h3>Students</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade</th>
                      <th className="num">Level</th>
                      <th className="num">Questions</th>
                      <th className="num">Accuracy</th>
                      <th className="num">Puzzles</th>
                      <th className="num">Streak</th>
                      <th>Last played</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="bold">{s.displayName}</td>
                        <td>{s.gradeLabel}</td>
                        <td className="num">{s.currentLevel}</td>
                        <td className="num">{s.questionsAnswered}</td>
                        <td className="num">
                          <span style={{ color: s.accuracy >= 0.75 ? 'var(--good)' : s.accuracy >= 0.5 ? 'var(--brand)' : 'var(--bad)' }}>
                            {s.questionsAnswered ? Math.round(s.accuracy * 100) + '%' : '—'}
                          </span>
                        </td>
                        <td className="num">{s.puzzlesCompleted}</td>
                        <td className="num">{s.streak}</td>
                        <td className="faint tiny">{s.lastPlayed || 'Never'}</td>
                        <td>
                          <Btn size="sm" onClick={() => openStudent(s.id)}>View</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <p className="faint">
          You can see progress data only. Numeria never shows you a student's password, and student
          profiles are not public.
        </p>
      </div>

      {/* Connection code */}
      {codeModal ? (
        <Modal onClose={() => setCodeModal(false)} labelledBy="code-title">
          <h2 id="code-title">Connect a student</h2>
          {!code ? (
            <>
              <p className="muted">
                Give this code to a student. They enter it from their home screen under
                "Connect teacher". Codes last 7 days and can be used by more than one student.
              </p>
              <div className="field">
                <label htmlFor="label">Label (optional)</label>
                <input
                  id="label" className="input" value={label} maxLength={60}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Period 3, or Maya at home"
                />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Btn onClick={() => setCodeModal(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={makeCode} disabled={busy}>
                  {busy ? 'Creating...' : 'Create code'}
                </Btn>
              </div>
            </>
          ) : (
            <>
              <p className="muted">Share this code with your student:</p>
              <div
                className="mono"
                style={{
                  fontSize: '2.6rem', fontWeight: 900, letterSpacing: '0.4em',
                  textAlign: 'center', padding: '18px 0', color: 'var(--brand)',
                  background: 'rgba(0,0,0,0.28)', borderRadius: 'var(--radius)',
                }}
              >{code}</div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <Btn onClick={() => { void navigator.clipboard?.writeText(code); toast('Code copied.', 'good'); }}>
                  Copy
                </Btn>
                <Btn variant="primary" onClick={() => { setCodeModal(false); void load(); }}>Done</Btn>
              </div>
            </>
          )}
        </Modal>
      ) : null}

      {/* Student detail */}
      {loadingDetail ? <Loader label="Loading student..." /> : null}
      {detail ? (
        <Modal wide onClose={() => setDetail(null)} labelledBy="detail-title">
          <div className="between">
            <div>
              <h2 id="detail-title" style={{ marginBottom: 4 }}>{detail.student.displayName}</h2>
              <div className="row-wrap">
                <Chip>{detail.student.gradeLabel}</Chip>
                <Chip>Level {detail.progress.currentLevel}</Chip>
                <Chip tone="good">🔥 {detail.student.streak} day streak</Chip>
              </div>
            </div>
            <Btn onClick={() => setDetail(null)}>Close</Btn>
          </div>

          <div className="stat-tiles" style={{ marginTop: 16 }}>
            <div className="stat-tile"><div className="v">{detail.stats.totalAnswered}</div><div className="k">Questions</div></div>
            <div className="stat-tile"><div className="v">{Math.round(detail.stats.accuracy * 100)}%</div><div className="k">Accuracy</div></div>
            <div className="stat-tile"><div className="v">{detail.stats.puzzlesCompleted}</div><div className="k">Puzzles</div></div>
            <div className="stat-tile"><div className="v">{detail.stats.levelsCompleted}</div><div className="k">Levels</div></div>
          </div>

          {detail.struggling?.length ? (
            <div className="card-soft" style={{ marginTop: 16, borderLeft: '4px solid var(--bad)' }}>
              <h3 style={{ marginBottom: 8 }}>Topics to work on</h3>
              {detail.struggling.map((t: any, i: number) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div className="between" style={{ marginBottom: 3 }}>
                    <span className="bold tiny">{t.skill || t.topic}</span>
                    <span className="faint tiny">{t.correct}/{t.attempted} · {Math.round(t.accuracy * 100)}%</span>
                  </div>
                  <Bar value={t.correct} max={t.attempted} />
                </div>
              ))}
            </div>
          ) : null}

          {detail.strengths?.length ? (
            <div className="card-soft" style={{ marginTop: 12, borderLeft: '4px solid var(--good)' }}>
              <h3 style={{ marginBottom: 8 }}>Strengths</h3>
              <div className="row-wrap">
                {detail.strengths.map((t: any, i: number) => (
                  <Chip key={i} tone="good">{t.skill || t.topic} · {Math.round(t.accuracy * 100)}%</Chip>
                ))}
              </div>
            </div>
          ) : null}

          {detail.activity?.length ? (
            <div className="card-soft" style={{ marginTop: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Daily activity (last 30 days)</h3>
              <div className="spark" aria-hidden="true">
                {detail.activity.map((d: any, i: number) => {
                  const max = Math.max(...detail.activity.map((x: any) => x.questions), 1);
                  return <i key={i} style={{ height: Math.max(2, (d.questions / max) * 46) + 'px' }} title={d.day + ': ' + d.questions} />;
                })}
              </div>
              <div className="faint tiny" style={{ marginTop: 6 }}>
                {detail.activity.reduce((a: number, d: any) => a + d.questions, 0)} questions ·{' '}
                {Math.round(detail.activity.reduce((a: number, d: any) => a + d.seconds, 0) / 60)} minutes
              </div>
            </div>
          ) : null}

          {detail.byTopic?.length ? (
            <div className="card-soft" style={{ marginTop: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Every skill practised</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>Topic</th><th>Skill</th><th className="num">Tried</th><th className="num">Correct</th><th className="num">Accuracy</th></tr>
                  </thead>
                  <tbody>
                    {detail.byTopic.map((t: any, i: number) => (
                      <tr key={i}>
                        <td>{t.topic}</td>
                        <td className="faint tiny">{t.skill}</td>
                        <td className="num">{t.attempted}</td>
                        <td className="num">{t.correct}</td>
                        <td className="num">{Math.round(t.accuracy * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {detail.recent?.length ? (
            <div className="card-soft" style={{ marginTop: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Recent answers</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>Skill</th><th className="num">Level</th><th>Result</th><th className="num">Hints</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {detail.recent.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>{r.skill || r.topic}</td>
                        <td className="num">{r.difficulty}</td>
                        <td>{r.correct ? <span style={{ color: 'var(--good)' }}>✓ Correct</span> : <span style={{ color: 'var(--bad)' }}>✗ Missed</span>}</td>
                        <td className="num">{r.hints_used}</td>
                        <td className="faint tiny">{new Date(r.answered_at + 'Z').toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <Btn
              variant="ghost" size="sm"
              onClick={async () => {
                await api.unlinkStudent(detail.student.id).catch(() => {});
                setDetail(null);
                void load();
                toast('Student disconnected.', 'info');
              }}
            >Disconnect this student</Btn>
            <Btn variant="primary" onClick={() => setDetail(null)}>Close</Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
