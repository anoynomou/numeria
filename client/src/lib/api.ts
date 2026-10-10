import type {
  GameState, WorldScene, Challenge, AnswerResult, Achievement,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || 'Something went wrong (' + res.status + ').', res.status);
  }
  return data as T;
}

export const api = {
  /* auth */
  me: () => request<{ state?: GameState; user?: null }>('GET', '/api/auth/me'),
  register: (body: { email: string; password: string; displayName?: string; grade?: string; role?: string }) =>
    request<{ ok: true; state: GameState }>('POST', '/api/auth/register', body),
  login: (body: { email: string; password: string }) =>
    request<{ ok: true; state: GameState }>('POST', '/api/auth/login', body),
  logout: () => request<{ ok: true }>('POST', '/api/auth/logout'),
  requestReset: (email: string) =>
    request<{ ok: true; message: string; devToken?: string }>('POST', '/api/auth/reset/request', { email }),
  confirmReset: (token: string, password: string) =>
    request<{ ok: true; message: string }>('POST', '/api/auth/reset/confirm', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true; message: string }>('POST', '/api/auth/password', { currentPassword, newPassword }),

  /* game */
  state: () => request<{ state: GameState }>('GET', '/api/game/state'),
  world: (level?: number) =>
    request<WorldScene>('GET', '/api/game/world' + (level ? '?level=' + level : '')),
  challenge: () => request<{ challenge: Challenge }>('GET', '/api/game/challenge'),
  gems: (level: number) =>
    request<{ claimed: number[]; total: number }>('GET', '/api/game/collect?level=' + level),
  collectGem: (level: number, index: number) =>
    request<{ ok: true; reward?: number; coins: number; found?: number; total?: number; alreadyClaimed?: boolean }>(
      'POST', '/api/game/collect', { level, index }),
  completePuzzle: (id: string, pieces: number, seconds: number) =>
    request<{ ok: true; challenge: Challenge; achievements: Achievement[] }>(
      'POST', '/api/game/challenge/' + id + '/puzzle', { pieces, seconds }),
  hint: (id: string) =>
    request<{ ok: true; hints: string[]; hintsUsed: number; exhausted: boolean }>(
      'POST', '/api/game/challenge/' + id + '/hint'),
  answer: (id: string, answer: string, seconds: number) =>
    request<AnswerResult>('POST', '/api/game/challenge/' + id + '/answer', { answer, seconds }),
  skipChallenge: (id: string) => request<{ ok: true }>('POST', '/api/game/challenge/' + id + '/skip'),
  selectLevel: (level: number) =>
    request<{ ok: true; state: GameState }>('POST', '/api/game/level/select', { level }),

  /* profile */
  updateProfile: (body: Record<string, unknown>) =>
    request<{ ok: true; state: GameState }>('PATCH', '/api/game/profile', body),
  buy: (slot: string, id: string) =>
    request<{ ok: true; coins: number; state: GameState }>('POST', '/api/game/shop/buy', { slot, id }),
  profileSummary: () => request<any>('GET', '/api/game/profile/summary'),
  reportBug: (message: string, context: Record<string, unknown>) =>
    request<{ ok: true; message: string }>('POST', '/api/game/report-bug', { message, context }),

  /* guardian dashboard */
  linkCode: (label: string) =>
    request<{ ok: true; code: string; expiresAt: string }>('POST', '/api/dashboard/link-code', { label }),
  redeemCode: (code: string) =>
    request<{ ok: true; connectedTo: string }>('POST', '/api/dashboard/redeem', { code }),
  students: () => request<{ students: any[] }>('GET', '/api/dashboard/students'),
  student: (id: number) => request<any>('GET', '/api/dashboard/students/' + id),
  unlinkStudent: (id: number) => request<{ ok: true }>('DELETE', '/api/dashboard/students/' + id),
  myGuardians: () => request<{ guardians: any[] }>('GET', '/api/dashboard/my-guardians'),
  unlinkGuardian: (id: number) => request<{ ok: true }>('DELETE', '/api/dashboard/my-guardians/' + id),

  /* admin */
  adminStats: () => request<any>('GET', '/api/admin/stats'),
  adminCurriculum: () => request<any>('GET', '/api/admin/curriculum'),
  adminLevel: (level: number) => request<any>('GET', '/api/admin/levels/' + level),
  adminPreviewQuestion: (body: Record<string, unknown>) =>
    request<any>('POST', '/api/admin/preview/question', body),
  adminPreviewPuzzle: (body: Record<string, unknown>) =>
    request<any>('POST', '/api/admin/preview/puzzle', body),
  adminQuestions: (grade?: string) =>
    request<{ questions: any[] }>('GET', '/api/admin/questions' + (grade ? '?grade=' + grade : '')),
  adminCreateQuestion: (body: Record<string, unknown>) =>
    request<any>('POST', '/api/admin/questions', body),
  adminUpdateQuestion: (id: number, body: Record<string, unknown>) =>
    request<any>('PUT', '/api/admin/questions/' + id, body),
  adminDeleteQuestion: (id: number) => request<{ ok: true }>('DELETE', '/api/admin/questions/' + id),
  adminUsers: (search?: string) =>
    request<{ users: any[] }>('GET', '/api/admin/users' + (search ? '?search=' + encodeURIComponent(search) : '')),
  adminUpdateUser: (id: number, body: Record<string, unknown>) =>
    request<{ ok: true }>('PATCH', '/api/admin/users/' + id, body),
  adminDeleteUser: (id: number) => request<{ ok: true }>('DELETE', '/api/admin/users/' + id),
  adminBugs: () => request<{ reports: any[] }>('GET', '/api/admin/bugs'),
  adminUpdateBug: (id: number, status: string) =>
    request<{ ok: true }>('PATCH', '/api/admin/bugs/' + id, { status }),
};
