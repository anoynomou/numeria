import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, ScreenHeader, Chip, Modal, Loader, Bar } from '../ui/common';
import { MathVisual } from '../ui/MathVisual';

type Tab = 'overview' | 'questions' | 'curriculum' | 'users' | 'bugs';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'questions', label: 'Question bank', icon: '✏️' },
  { id: 'curriculum', label: 'Curriculum', icon: '📚' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'bugs', label: 'Reports', icon: '🐞' },
];

const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];

export function AdminDashboard() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="screen">
      <ScreenHeader
        title="Admin"
        subtitle="Manage content, users and reports"
        onBack={() => setScreen('home')}
        right={<Chip>{state.user.email}</Chip>}
      />

      <div className="shell col">
        <div className="row-wrap" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <Btn
              key={t.id}
              variant={tab === t.id ? 'primary' : 'default'}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
            >
              {t.icon} {t.label}
            </Btn>
          ))}
        </div>

        {tab === 'overview' ? <Overview /> : null}
        {tab === 'questions' ? <QuestionBank onToast={toast} /> : null}
        {tab === 'curriculum' ? <Curriculum /> : null}
        {tab === 'users' ? <Users onToast={toast} /> : null}
        {tab === 'bugs' ? <Bugs onToast={toast} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { void api.adminStats().then(setData).catch(() => setData({ error: true })); }, []);
  if (!data) return <Loader label="Loading statistics..." />;
  if (data.error) return <div className="card">Could not load statistics.</div>;

  const t = data.totals;
  const maxDay = Math.max(1, ...data.dailyTrend.map((d: any) => d.questions));

  return (
    <div className="col">
      <div className="stat-tiles">
        <div className="stat-tile"><div className="v">{t.students}</div><div className="k">Students</div></div>
        <div className="stat-tile"><div className="v">{t.guardians}</div><div className="k">Teachers/parents</div></div>
        <div className="stat-tile"><div className="v">{t.activeToday}</div><div className="k">Active today</div></div>
        <div className="stat-tile"><div className="v">{t.activeThisWeek}</div><div className="k">Active this week</div></div>
        <div className="stat-tile"><div className="v">{t.questionsAnswered}</div><div className="k">Questions answered</div></div>
        <div className="stat-tile"><div className="v">{Math.round(t.accuracy * 100)}%</div><div className="k">Overall accuracy</div></div>
        <div className="stat-tile"><div className="v">{t.puzzlesCompleted}</div><div className="k">Puzzles completed</div></div>
        <div className="stat-tile"><div className="v">{t.levelsCompleted}</div><div className="k">Levels completed</div></div>
      </div>

      {data.dailyTrend?.length ? (
        <div className="card">
          <h3>Questions answered (last 30 days)</h3>
          <div className="spark" style={{ height: 70 }} aria-hidden="true">
            {data.dailyTrend.map((d: any, i: number) => (
              <i key={i} style={{ height: Math.max(2, (d.questions / maxDay) * 70) + 'px' }} title={d.day + ': ' + d.questions} />
            ))}
          </div>
        </div>
      ) : null}

      {data.byGrade?.length ? (
        <div className="card">
          <h3>Students by grade</h3>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Grade</th><th className="num">Students</th><th className="num">Answers</th></tr></thead>
              <tbody>
                {data.byGrade.map((g: any) => (
                  <tr key={g.grade}>
                    <td>{g.grade === 'K' ? 'Kindergarten' : 'Grade ' + g.grade}</td>
                    <td className="num">{g.students}</td>
                    <td className="num">{g.answers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {data.hardestTopics?.length ? (
        <div className="card">
          <h3>Hardest topics across all students</h3>
          <p className="muted tiny">Lowest accuracy first. Useful for spotting where content needs work.</p>
          <div className="col" style={{ gap: 10, marginTop: 10 }}>
            {data.hardestTopics.map((t: any, i: number) => (
              <div key={i}>
                <div className="between" style={{ marginBottom: 3 }}>
                  <span className="bold tiny">{t.topic} <span className="faint">· grade {t.grade}</span></span>
                  <span className="faint tiny">{t.correct}/{t.attempted} · {Math.round(t.accuracy * 100)}%</span>
                </div>
                <Bar value={t.correct} max={t.attempted} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const BLANK = {
  grade: '3', topic: '', skill: '', difficulty: 2, type: 'numeric',
  prompt: '', answer: '', choices: ['', '', '', ''], accept: [] as string[],
  hints: ['', '', ''], explanation: '', active: true,
};

function QuestionBank({ onToast }: { onToast: (t: string, tone?: any, i?: string) => void }) {
  const [grade, setGrade] = useState('3');
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.adminQuestions(grade).catch(() => ({ questions: [] }));
    setQuestions(res.questions);
  }
  useEffect(() => { void load(); }, [grade]);

  async function save() {
    setBusy(true);
    try {
      const body = {
        ...editing,
        choices: editing.type === 'multiple-choice' ? editing.choices.filter((c: string) => c.trim()) : [],
        hints: editing.hints.filter((h: string) => h.trim()),
      };
      if (editing.id) await api.adminUpdateQuestion(editing.id, body);
      else await api.adminCreateQuestion(body);
      onToast('Question saved.', 'good', '✅');
      setEditing(null);
      await load();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Could not save.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function showPreview() {
    const res = await api.adminPreviewQuestion({ grade, difficulty: 3 }).catch(() => null);
    if (res) setPreview(res.question);
  }

  if (!questions) return <Loader label="Loading questions..." />;

  return (
    <div className="col">
      <div className="card between">
        <div className="row-wrap">
          <label htmlFor="qg" className="bold">Grade</label>
          <select id="qg" className="select" style={{ width: 'auto' }} value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : 'Grade ' + g}</option>)}
          </select>
          <Chip>{questions.length} custom question{questions.length === 1 ? '' : 's'}</Chip>
        </div>
        <div className="row-wrap">
          <Btn onClick={showPreview}>Preview a generated question</Btn>
          <Btn variant="primary" onClick={() => { audio.click(); setEditing({ ...BLANK, grade }); }}>
            + New question
          </Btn>
        </div>
      </div>

      <div className="card">
        <p className="muted tiny">
          Numeria generates questions for every grade automatically. Questions you add here are mixed
          into the same pool at the difficulty you choose, so you can target specific curriculum needs
          without rebuilding the app.
        </p>
        {questions.length === 0 ? (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            No custom questions for this grade yet.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr><th>Question</th><th>Topic</th><th className="num">Difficulty</th><th>Type</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td style={{ maxWidth: 320 }}>{q.prompt.slice(0, 90)}{q.prompt.length > 90 ? '…' : ''}</td>
                    <td>{q.topic}</td>
                    <td className="num">{q.difficulty}</td>
                    <td className="faint tiny">{q.type}</td>
                    <td>{q.active ? <span style={{ color: 'var(--good)' }}>Active</span> : <span className="faint">Off</span>}</td>
                    <td>
                      <div className="row">
                        <Btn size="sm" onClick={() => setEditing({ ...q, choices: q.choices.length ? q.choices : ['', '', '', ''], hints: [...q.hints, '', '', ''].slice(0, 3) })}>Edit</Btn>
                        <Btn
                          size="sm" variant="danger"
                          onClick={async () => {
                            await api.adminDeleteQuestion(q.id);
                            onToast('Question deleted.', 'info');
                            void load();
                          }}
                        >Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing ? (
        <Modal wide onClose={() => setEditing(null)} labelledBy="edit-title">
          <h2 id="edit-title">{editing.id ? 'Edit question' : 'New question'}</h2>
          <div className="row-wrap">
            <div className="field grow">
              <label htmlFor="eg">Grade</label>
              <select id="eg" className="select" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: e.target.value })}>
                {GRADES.map((g) => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : 'Grade ' + g}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label htmlFor="ed">Difficulty (1 easiest – 5 hardest)</label>
              <select id="ed" className="select" value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label htmlFor="et">Answer type</label>
              <select id="et" className="select" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option value="numeric">Numeric entry</option>
                <option value="text">Short text</option>
                <option value="multiple-choice">Multiple choice</option>
              </select>
            </div>
          </div>

          <div className="row-wrap">
            <div className="field grow">
              <label htmlFor="etop">Topic</label>
              <input id="etop" className="input" value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} placeholder="e.g. Fractions" />
            </div>
            <div className="field grow">
              <label htmlFor="esk">Skill (optional)</label>
              <input id="esk" className="input" value={editing.skill} onChange={(e) => setEditing({ ...editing, skill: e.target.value })} placeholder="e.g. Add unlike denominators" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ep">Question text</label>
            <textarea id="ep" className="textarea" value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} />
          </div>

          {editing.type === 'multiple-choice' ? (
            <div className="field">
              <label>Choices (the answer below must match one exactly)</label>
              {editing.choices.map((c: string, i: number) => (
                <input
                  key={i} className="input" style={{ marginBottom: 6 }} value={c}
                  placeholder={'Option ' + (i + 1)}
                  onChange={(e) => {
                    const next = [...editing.choices];
                    next[i] = e.target.value;
                    setEditing({ ...editing, choices: next });
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className="row-wrap">
            <div className="field grow">
              <label htmlFor="ea">Correct answer</label>
              <input id="ea" className="input" value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
            </div>
            <div className="field grow">
              <label htmlFor="eacc">Also accept (comma separated)</label>
              <input
                id="eacc" className="input"
                value={(editing.accept || []).join(', ')}
                onChange={(e) => setEditing({ ...editing, accept: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
                placeholder="e.g. 0.5, 1/2"
              />
            </div>
          </div>

          <div className="field">
            <label>Hints (shown one at a time)</label>
            {[0, 1, 2].map((i) => (
              <input
                key={i} className="input" style={{ marginBottom: 6 }}
                value={editing.hints[i] || ''}
                placeholder={'Hint ' + (i + 1) + (i === 0 ? ' — a small clue' : i === 1 ? ' — explain the first step' : ' — show a similar example')}
                onChange={(e) => {
                  const next = [...editing.hints];
                  next[i] = e.target.value;
                  setEditing({ ...editing, hints: next });
                }}
              />
            ))}
          </div>

          <div className="field">
            <label htmlFor="ee">Explanation shown after answering</label>
            <textarea id="ee" className="textarea" value={editing.explanation} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
          </div>

          <label className="switch">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span>Active (students can receive this question)</span>
          </label>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save question'}</Btn>
          </div>
        </Modal>
      ) : null}

      {preview ? (
        <Modal onClose={() => setPreview(null)} labelledBy="prev-title">
          <h2 id="prev-title">Generated question preview</h2>
          <div className="row-wrap" style={{ marginBottom: 10 }}>
            <Chip>{preview.topic}</Chip>
            <Chip>{preview.skill}</Chip>
            <Chip>Difficulty {preview.difficulty}</Chip>
            <Chip>{preview.type}</Chip>
          </div>
          <div className="question-prompt">{preview.prompt}</div>
          <MathVisual visual={preview.visual} />
          {preview.choices ? (
            <div className="choice-grid">
              {preview.choices.map((c: string) => <div key={c} className="choice">{c}</div>)}
            </div>
          ) : null}
          <div className="card-soft" style={{ marginTop: 12 }}>
            <div className="bold tiny">Answer</div>
            <div>{preview.answer}</div>
            <div className="bold tiny" style={{ marginTop: 8 }}>Hints</div>
            <ol style={{ margin: '4px 0 0 18px' }}>
              {preview.hints.map((h: string, i: number) => <li key={i}>{h}</li>)}
            </ol>
            <div className="bold tiny" style={{ marginTop: 8 }}>Explanation</div>
            <div>{preview.explanation}</div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setPreview(null)}>Close</Btn>
            <Btn variant="primary" onClick={async () => {
              const res = await api.adminPreviewQuestion({ grade, difficulty: 3 });
              setPreview(res.question);
            }}>Another one</Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Curriculum() {
  const [data, setData] = useState<any>(null);
  const [levelPlan, setLevelPlan] = useState<any>(null);
  useEffect(() => { void api.adminCurriculum().then(setData).catch(() => setData({ error: true })); }, []);
  if (!data) return <Loader label="Loading curriculum..." />;
  if (data.error) return <div className="card">Could not load the curriculum.</div>;

  return (
    <div className="col">
      <div className="card">
        <h3>Structure</h3>
        <div className="row-wrap">
          <Chip>{data.structure.levelsPerGrade} levels per grade</Chip>
          <Chip>{data.structure.challengesPerLevel} challenges per level</Chip>
          <Chip>{data.structure.levelsPerGrade * data.structure.challengesPerLevel} interactions per grade</Chip>
          <Chip>{data.grades.length} grades</Chip>
          <Chip>{data.worlds.length} worlds</Chip>
          <Chip>{data.puzzleTypes.length} puzzle types</Chip>
        </div>
      </div>

      <div className="card">
        <h3>Skills by grade</h3>
        {data.grades.map((g: any) => (
          <details key={g.id} style={{ marginBottom: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800, padding: '6px 0' }}>
              {g.label} — {g.skills.length} skills · {g.topics.length} topics
            </summary>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="data">
                <thead><tr><th>Topic</th><th>Skill</th><th>Generator id</th></tr></thead>
                <tbody>
                  {g.skills.map((s: any) => (
                    <tr key={s.id}><td>{s.topic}</td><td>{s.skill}</td><td className="faint tiny mono">{s.id}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      <div className="card">
        <h3>Worlds</h3>
        <div className="grid">
          {data.worlds.map((w: any) => (
            <div key={w.id} className="card-soft">
              <div style={{ fontSize: '1.8rem' }} aria-hidden="true">{w.emoji}</div>
              <div className="bold">{w.name}</div>
              <div className="faint tiny">{w.tagline}</div>
              <div className="row-wrap" style={{ marginTop: 8 }}>
                <Chip>Levels {w.levels.join('–')}</Chip>
                <Chip>{w.stationCount} stations</Chip>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Levels</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th className="num">#</th><th>Name</th><th>World</th><th>Intro</th><th /></tr></thead>
            <tbody>
              {data.levels.map((l: any) => (
                <tr key={l.level}>
                  <td className="num">{l.level}</td>
                  <td className="bold">{l.name}</td>
                  <td>{l.worldName}</td>
                  <td className="faint tiny">{l.intro}</td>
                  <td>
                    <Btn size="sm" onClick={async () => {
                      const res = await api.adminLevel(l.level);
                      setLevelPlan(res.plan);
                    }}>Inspect</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Puzzle types</h3>
        <div className="grid">
          {data.puzzleTypes.map((p: any) => (
            <div key={p.id} className="card-soft">
              <div className="bold">{p.name}</div>
              <div className="faint tiny">{p.summary}</div>
              <Chip>{p.kind}</Chip>
            </div>
          ))}
        </div>
      </div>

      {levelPlan ? (
        <Modal wide onClose={() => setLevelPlan(null)} labelledBy="lp-title">
          <h2 id="lp-title">Level {levelPlan.level}: {levelPlan.name}</h2>
          <p className="muted">{levelPlan.intro} · {levelPlan.worldName}</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th className="num">#</th><th>Station</th><th>Puzzle</th><th className="num">Puzzle diff.</th><th className="num">Math diff.</th></tr>
              </thead>
              <tbody>
                {levelPlan.challenges.map((c: any) => (
                  <tr key={c.index} style={c.isMilestone ? { background: 'rgba(255,209,102,0.12)' } : undefined}>
                    <td className="num">{c.index}</td>
                    <td>{c.stationName} <span className="faint tiny">({c.stationKind})</span></td>
                    <td>{c.puzzleId || <span className="faint">—</span>}</td>
                    <td className="num">{c.puzzleDifficulty ?? '—'}</td>
                    <td className="num">{c.mathDifficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn variant="primary" onClick={() => setLevelPlan(null)}>Close</Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Users({ onToast }: { onToast: (t: string, tone?: any, i?: string) => void }) {
  const [users, setUsers] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    const res = await api.adminUsers(search).catch(() => ({ users: [] }));
    setUsers(res.users);
  }
  useEffect(() => { void load(); }, []);

  if (!users) return <Loader label="Loading users..." />;

  return (
    <div className="col">
      <div className="card row">
        <input
          className="input" value={search} placeholder="Search by email or name"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
        />
        <Btn onClick={() => void load()}>Search</Btn>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th className="num">ID</th><th>Email</th><th>Name</th><th>Role</th><th>Grade</th><th className="num">Coins</th><th>Last login</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="num">{u.id}</td>
                  <td className="tiny">{u.email}</td>
                  <td>{u.displayName || <span className="faint">—</span>}</td>
                  <td>
                    <select
                      className="select" style={{ padding: '4px 8px', width: 'auto' }}
                      value={u.role}
                      onChange={async (e) => {
                        try {
                          await api.adminUpdateUser(u.id, { role: e.target.value });
                          onToast('Role updated.', 'good');
                          void load();
                        } catch (err) {
                          onToast(err instanceof ApiError ? err.message : 'Could not update.', 'bad');
                        }
                      }}
                    >
                      <option value="student">student</option>
                      <option value="guardian">guardian</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.grade}</td>
                  <td className="num">{u.coins}</td>
                  <td className="faint tiny">{u.lastLogin ? new Date(u.lastLogin + 'Z').toLocaleDateString() : 'Never'}</td>
                  <td>
                    <Btn
                      size="sm" variant="danger"
                      onClick={async () => {
                        if (!window.confirm('Delete ' + u.email + ' and all their progress? This cannot be undone.')) return;
                        try {
                          await api.adminDeleteUser(u.id);
                          onToast('User deleted.', 'info');
                          void load();
                        } catch (err) {
                          onToast(err instanceof ApiError ? err.message : 'Could not delete.', 'bad');
                        }
                      }}
                    >Delete</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Bugs({ onToast }: { onToast: (t: string, tone?: any, i?: string) => void }) {
  const [reports, setReports] = useState<any[] | null>(null);

  async function load() {
    const res = await api.adminBugs().catch(() => ({ reports: [] }));
    setReports(res.reports);
  }
  useEffect(() => { void load(); }, []);

  if (!reports) return <Loader label="Loading reports..." />;

  return (
    <div className="card">
      <h3>Reported problems</h3>
      {reports.length === 0 ? (
        <p className="muted">Nothing reported. That is a good sign.</p>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {reports.map((r) => (
            <div key={r.id} className="card-soft">
              <div className="between">
                <div className="row-wrap">
                  <span className="bold">{r.from}</span>
                  <Chip tone={r.status === 'resolved' ? 'good' : undefined}>{r.status}</Chip>
                  <span className="faint tiny">{new Date(r.createdAt + 'Z').toLocaleString()}</span>
                </div>
                <select
                  className="select" style={{ width: 'auto', padding: '4px 8px' }}
                  value={r.status}
                  onChange={async (e) => {
                    await api.adminUpdateBug(r.id, e.target.value);
                    onToast('Status updated.', 'good');
                    void load();
                  }}
                >
                  <option value="open">open</option>
                  <option value="investigating">investigating</option>
                  <option value="resolved">resolved</option>
                  <option value="wontfix">wontfix</option>
                </select>
              </div>
              <p style={{ marginTop: 8, marginBottom: 4 }}>{r.message}</p>
              {r.context && Object.keys(r.context).length ? (
                <div className="faint tiny mono">{JSON.stringify(r.context)}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
