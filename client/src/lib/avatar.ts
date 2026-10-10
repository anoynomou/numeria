import type { AvatarConfig, Catalog, CatalogItem } from './types';

export interface ResolvedAvatar {
  skin: string;
  hairColor: string;
  hairStyle: string;
  shirt: string;
  pants: string;
  shoes: string;
  accessory: string;
  character: string;
  build: string;
  petEmoji: string | null;
}

/** Fallbacks so a portrait still renders if the catalog has not loaded yet. */
const FALLBACK: Record<string, Record<string, string>> = {
  skinTones: { porcelain: '#f6dcc4', sand: '#eec39a', honey: '#d9a066', amber: '#b97a4c', chestnut: '#8d5524', espresso: '#5c3317', deep: '#3d2314' },
  hairColors: { black: '#1b1b1f', brown: '#5a3a22', chestnut: '#7b4b2a', blonde: '#e0b552', ginger: '#c65d2e', grey: '#9aa0a6', teal: '#14b8a6', violet: '#a855f7', pink: '#ec4899' },
  shirts: { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', purple: '#a855f7', teal: '#14b8a6', orange: '#f97316', white: '#f1f5f9', aurora: '#22d3ee', nebula: '#7c3aed' },
  pants: { denim: '#3b5c8f', charcoal: '#374151', khaki: '#b69769', forest: '#2f6b46', plum: '#6b2d5c', crimson: '#9f1239' },
  shoes: { sneakers: '#f8fafc', boots: '#4b3621', trainers: '#1f2937', gravboots: '#22d3ee' },
};

function hexFrom(list: CatalogItem[] | undefined, id: string, group: string, fallback: string): string {
  const found = list?.find((i) => i.id === id);
  if (found?.hex) return found.hex;
  return FALLBACK[group]?.[id] || fallback;
}

export function resolveAvatar(avatar: AvatarConfig, catalog?: Catalog | null): ResolvedAvatar {
  const character = catalog?.characters.find((c) => c.id === avatar.character);
  const pet = catalog?.pets.find((p) => p.id === avatar.pet);
  return {
    skin: hexFrom(catalog?.skinTones, avatar.skinTone, 'skinTones', '#eec39a'),
    hairColor: hexFrom(catalog?.hairColors, avatar.hairColor, 'hairColors', '#5a3a22'),
    hairStyle: avatar.hairStyle || 'short',
    shirt: hexFrom(catalog?.shirts, avatar.shirt, 'shirts', '#3b82f6'),
    pants: hexFrom(catalog?.pants, avatar.pants, 'pants', '#3b5c8f'),
    shoes: hexFrom(catalog?.shoes, avatar.shoes, 'shoes', '#f8fafc'),
    accessory: avatar.accessory || 'none',
    character: avatar.character || 'explorer',
    build: character?.build || 'medium',
    petEmoji: pet && pet.id !== 'none' ? pet.emoji || '🐾' : null,
  };
}

/** Body proportions per character build, shared by the portrait and 3D model. */
export function buildScale(build: string): { height: number; width: number } {
  switch (build) {
    case 'slim': return { height: 1.02, width: 0.86 };
    case 'short': return { height: 0.88, width: 1.02 };
    case 'sturdy': return { height: 0.97, width: 1.18 };
    case 'tall': return { height: 1.14, width: 0.94 };
    default: return { height: 1, width: 1 };
  }
}

/** Darken a hex colour by a factor, for shading. */
export function shade(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(m[1], 16) * (1 - amount));
  const g = clamp(parseInt(m[2], 16) * (1 - amount));
  const b = clamp(parseInt(m[3], 16) * (1 - amount));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
