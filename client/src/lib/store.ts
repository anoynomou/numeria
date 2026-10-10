import { create } from 'zustand';
import { api, ApiError } from './api';
import type { GameState, Settings } from './types';
import { audio } from './audio';

export type Screen =
  | 'loading' | 'auth' | 'onboarding' | 'home' | 'map' | 'game'
  | 'profile' | 'settings' | 'wardrobe' | 'achievements'
  | 'dashboard' | 'admin';

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
  icon?: string;
}

interface Store {
  state: GameState | null;
  screen: Screen;
  booted: boolean;
  toasts: Toast[];
  playLevel: number | null;

  boot: () => Promise<void>;
  setScreen: (s: Screen) => void;
  setState: (s: GameState) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  toast: (text: string, tone?: Toast['tone'], icon?: string) => void;
  dismissToast: (id: number) => void;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  startPlay: (level?: number) => void;
}

let toastId = 0;

export const useStore = create<Store>((set, get) => ({
  state: null,
  screen: 'loading',
  booted: false,
  toasts: [],
  playLevel: null,

  async boot() {
    try {
      const res = await api.me();
      if (res.state) {
        applyAccessibility(res.state.user.settings);
        audio.configure(res.state.user.settings.musicVolume, res.state.user.settings.soundVolume);
        set({
          state: res.state,
          screen: res.state.user.role === 'student' && !res.state.user.onboarded ? 'onboarding' : 'home',
          booted: true,
        });
      } else {
        set({ state: null, screen: 'auth', booted: true });
      }
    } catch {
      set({ state: null, screen: 'auth', booted: true });
    }
  },

  setScreen(screen) {
    set({ screen });
  },

  setState(state) {
    applyAccessibility(state.user.settings);
    audio.configure(state.user.settings.musicVolume, state.user.settings.soundVolume);
    set({ state });
  },

  async refresh() {
    try {
      const res = await api.state();
      get().setState(res.state);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) set({ state: null, screen: 'auth' });
    }
  },

  async logout() {
    audio.stopMusic();
    try { await api.logout(); } catch { /* ignore */ }
    set({ state: null, screen: 'auth', playLevel: null });
  },

  toast(text, tone = 'info', icon) {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, text, tone, icon }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  async saveSettings(patch) {
    const current = get().state;
    if (!current) return;
    // Apply immediately so the UI never feels laggy, then persist.
    const merged = { ...current.user.settings, ...patch };
    applyAccessibility(merged);
    audio.configure(merged.musicVolume, merged.soundVolume);
    set({ state: { ...current, user: { ...current.user, settings: merged } } });
    try {
      const res = await api.updateProfile({ settings: patch });
      set({ state: res.state });
    } catch {
      get().toast('Could not save that setting.', 'bad');
    }
  },

  startPlay(level) {
    set({ playLevel: level ?? null, screen: 'game' });
  },
}));

/** Reflect accessibility preferences on the document root. */
export function applyAccessibility(settings: Settings) {
  const root = document.documentElement;
  root.classList.toggle('a11y-large-text', !!settings.largeText);
  root.classList.toggle('a11y-high-contrast', !!settings.highContrast);
  root.classList.toggle('a11y-colorblind', !!settings.colorBlindSafe);
  root.classList.toggle('a11y-reduced-motion', !!settings.reducedMotion);
}
