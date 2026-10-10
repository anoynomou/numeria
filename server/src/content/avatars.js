/**
 * Avatar catalogue.
 *
 * Avatars are built from primitives in the 3D scene rather than loaded from
 * model files, so they cost nothing to download and render fast on school
 * hardware. Everything here is a colour or a simple style token the renderer
 * understands.
 *
 * The MVP ships 3 characters unlocked from the start; the rest unlock with
 * coins or level progress. Coins are earned in-game only and buy nothing
 * outside the game.
 */

export const CHARACTERS = [
  { id: 'explorer', name: 'Explorer', blurb: 'Ready for any trail.', cost: 0, build: 'medium', hatDefault: 'cap' },
  { id: 'inventor', name: 'Inventor', blurb: 'Always carrying a spare bolt.', cost: 0, build: 'slim', hatDefault: 'goggles' },
  { id: 'scout', name: 'Scout', blurb: 'First to spot the hidden path.', cost: 0, build: 'short', hatDefault: 'none' },
  { id: 'engineer', name: 'Engineer', blurb: 'Builds bridges that hold.', cost: 150, build: 'sturdy', hatDefault: 'helmet', unlockLevel: 2 },
  { id: 'astronaut', name: 'Astronaut', blurb: 'At home in zero gravity.', cost: 300, build: 'medium', hatDefault: 'visor', unlockLevel: 5 },
  { id: 'ranger', name: 'Ranger', blurb: 'Knows every mountain track.', cost: 250, build: 'tall', hatDefault: 'hood', unlockLevel: 4 },
  { id: 'starcaller', name: 'Starcaller', blurb: 'Speaks the language of spires.', cost: 500, build: 'tall', hatDefault: 'crown', unlockLevel: 9 },
];

export const SKIN_TONES = [
  { id: 'porcelain', hex: '#f6dcc4' },
  { id: 'sand', hex: '#eec39a' },
  { id: 'honey', hex: '#d9a066' },
  { id: 'amber', hex: '#b97a4c' },
  { id: 'chestnut', hex: '#8d5524' },
  { id: 'espresso', hex: '#5c3317' },
  { id: 'deep', hex: '#3d2314' },
];

export const HAIR_STYLES = [
  { id: 'short', name: 'Short' },
  { id: 'curly', name: 'Curly' },
  { id: 'long', name: 'Long' },
  { id: 'braids', name: 'Braids' },
  { id: 'bun', name: 'Bun' },
  { id: 'buzz', name: 'Buzz' },
  { id: 'afro', name: 'Afro' },
  { id: 'ponytail', name: 'Ponytail' },
];

export const HAIR_COLORS = [
  { id: 'black', hex: '#1b1b1f' },
  { id: 'brown', hex: '#5a3a22' },
  { id: 'chestnut', hex: '#7b4b2a' },
  { id: 'blonde', hex: '#e0b552' },
  { id: 'ginger', hex: '#c65d2e' },
  { id: 'grey', hex: '#9aa0a6' },
  { id: 'teal', hex: '#14b8a6', cost: 60 },
  { id: 'violet', hex: '#a855f7', cost: 60 },
  { id: 'pink', hex: '#ec4899', cost: 60 },
];

export const SHIRTS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'green', hex: '#22c55e' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'teal', hex: '#14b8a6' },
  { id: 'orange', hex: '#f97316' },
  { id: 'white', hex: '#f1f5f9' },
  { id: 'aurora', hex: '#22d3ee', cost: 120, unlockLevel: 3 },
  { id: 'nebula', hex: '#7c3aed', cost: 200, unlockLevel: 7 },
];

export const PANTS = [
  { id: 'denim', hex: '#3b5c8f' },
  { id: 'charcoal', hex: '#374151' },
  { id: 'khaki', hex: '#b69769' },
  { id: 'forest', hex: '#2f6b46' },
  { id: 'plum', hex: '#6b2d5c' },
  { id: 'crimson', hex: '#9f1239', cost: 80 },
];

export const SHOES = [
  { id: 'sneakers', name: 'Sneakers', hex: '#f8fafc' },
  { id: 'boots', name: 'Boots', hex: '#4b3621' },
  { id: 'trainers', name: 'Trainers', hex: '#1f2937' },
  { id: 'gravboots', name: 'Grav Boots', hex: '#22d3ee', cost: 180, unlockLevel: 6 },
];

export const ACCESSORIES = [
  { id: 'none', name: 'None', cost: 0 },
  { id: 'cap', name: 'Cap', cost: 0 },
  { id: 'goggles', name: 'Goggles', cost: 40 },
  { id: 'helmet', name: 'Helmet', cost: 90 },
  { id: 'hood', name: 'Hood', cost: 90 },
  { id: 'visor', name: 'Visor', cost: 160, unlockLevel: 5 },
  { id: 'crown', name: 'Star Crown', cost: 400, unlockLevel: 9 },
  { id: 'backpack', name: 'Backpack', cost: 120 },
];

export const PETS = [
  { id: 'none', name: 'No companion', cost: 0 },
  { id: 'sprout', name: 'Sprout', emoji: '🌱', cost: 200, unlockLevel: 2 },
  { id: 'bolt', name: 'Bolt', emoji: '🤖', cost: 350, unlockLevel: 5 },
  { id: 'comet', name: 'Comet', emoji: '☄️', cost: 500, unlockLevel: 8 },
];

export const AVATAR_CATALOG = {
  characters: CHARACTERS,
  skinTones: SKIN_TONES,
  hairStyles: HAIR_STYLES,
  hairColors: HAIR_COLORS,
  shirts: SHIRTS,
  pants: PANTS,
  shoes: SHOES,
  accessories: ACCESSORIES,
  pets: PETS,
};

export const DEFAULT_AVATAR = {
  character: 'explorer',
  skinTone: 'sand',
  hairStyle: 'short',
  hairColor: 'brown',
  shirt: 'blue',
  pants: 'denim',
  shoes: 'sneakers',
  accessory: 'none',
  pet: 'none',
};

const SLOT_TO_LIST = {
  character: CHARACTERS,
  skinTone: SKIN_TONES,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  shirt: SHIRTS,
  pants: PANTS,
  shoes: SHOES,
  accessory: ACCESSORIES,
  pet: PETS,
};

/** Every catalogue item that costs coins or requires a level, for the shop. */
export function shopItems() {
  const out = [];
  for (const [slot, list] of Object.entries(SLOT_TO_LIST)) {
    for (const item of list) {
      if (item.cost > 0 || item.unlockLevel) {
        out.push({
          key: slot + ':' + item.id,
          slot,
          id: item.id,
          name: item.name || item.id,
          cost: item.cost || 0,
          unlockLevel: item.unlockLevel || 0,
          hex: item.hex || null,
          emoji: item.emoji || null,
        });
      }
    }
  }
  return out;
}

/** Items that need no purchase: free from the start. */
export function isFreeItem(slot, id) {
  const list = SLOT_TO_LIST[slot];
  if (!list) return false;
  const item = list.find((i) => i.id === id);
  if (!item) return false;
  return !item.cost && !item.unlockLevel;
}

export function findItem(slot, id) {
  const list = SLOT_TO_LIST[slot];
  return list ? list.find((i) => i.id === id) || null : null;
}

/** Keep an avatar object to known slots and known ids. */
export function sanitizeAvatar(avatar, ownedKeys = []) {
  const owned = new Set(ownedKeys);
  const out = { ...DEFAULT_AVATAR };
  for (const slot of Object.keys(SLOT_TO_LIST)) {
    const wanted = avatar && avatar[slot];
    if (!wanted) continue;
    const item = findItem(slot, wanted);
    if (!item) continue;
    const free = !item.cost && !item.unlockLevel;
    if (free || owned.has(slot + ':' + item.id)) out[slot] = item.id;
  }
  return out;
}
