import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { api, ApiError } from '../lib/api';
import { audio } from '../lib/audio';
import { Btn, ScreenHeader, Chip } from '../ui/common';
import { AvatarPortrait } from '../ui/AvatarPortrait';
import type { AvatarConfig, CatalogItem } from '../lib/types';

type SlotKey = keyof AvatarConfig;

const SECTIONS: { slot: SlotKey; title: string; list: keyof typeof LIST_MAP; kind: 'card' | 'swatch' }[] = [
  { slot: 'character', title: 'Character', list: 'characters', kind: 'card' },
  { slot: 'skinTone', title: 'Skin tone', list: 'skinTones', kind: 'swatch' },
  { slot: 'hairStyle', title: 'Hair style', list: 'hairStyles', kind: 'card' },
  { slot: 'hairColor', title: 'Hair colour', list: 'hairColors', kind: 'swatch' },
  { slot: 'shirt', title: 'Shirt', list: 'shirts', kind: 'swatch' },
  { slot: 'pants', title: 'Trousers', list: 'pants', kind: 'swatch' },
  { slot: 'shoes', title: 'Shoes', list: 'shoes', kind: 'card' },
  { slot: 'accessory', title: 'Accessory', list: 'accessories', kind: 'card' },
  { slot: 'pet', title: 'Companion', list: 'pets', kind: 'card' },
];

const LIST_MAP = {
  characters: 1, skinTones: 1, hairStyles: 1, hairColors: 1,
  shirts: 1, pants: 1, shoes: 1, accessories: 1, pets: 1,
};

/** Character customisation and the coin shop, in one place. */
export function WardrobeScreen() {
  const state = useStore((s) => s.state)!;
  const setScreen = useStore((s) => s.setScreen);
  const setState = useStore((s) => s.setState);
  const toast = useStore((s) => s.toast);

  const [draft, setDraft] = useState<AvatarConfig>(state.user.avatar);
  const [busy, setBusy] = useState(false);

  const owned = new Set(state.user.ownedItems);
  const highestLevel = Math.max(
    state.progress.currentLevel,
    ...(state.progress.completedLevels.length ? state.progress.completedLevels : [0])
  );

  function itemState(slot: SlotKey, item: CatalogItem) {
    const free = !item.cost && !item.unlockLevel;
    const isOwned = free || owned.has(slot + ':' + item.id);
    const levelLocked = !!item.unlockLevel && highestLevel < item.unlockLevel;
    return { isOwned, levelLocked, free };
  }

  async function pick(slot: SlotKey, item: CatalogItem) {
    const { isOwned, levelLocked } = itemState(slot, item);
    if (isOwned) {
      audio.click();
      setDraft((d) => ({ ...d, [slot]: item.id }));
      return;
    }
    if (levelLocked) {
      toast('Reach level ' + item.unlockLevel + ' to unlock this.', 'info', '🔒');
      return;
    }
    if ((item.cost || 0) > state.user.coins) {
      toast('You need ' + ((item.cost || 0) - state.user.coins) + ' more coins.', 'info', '🪙');
      return;
    }
    setBusy(true);
    try {
      const res = await api.buy(slot, item.id);
      setState(res.state);
      audio.unlock();
      toast('Unlocked ' + (item.name || item.id) + '!', 'good', '✨');
      setDraft((d) => ({ ...d, [slot]: item.id }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not buy that.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await api.updateProfile({ avatar: draft });
      setState(res.state);
      toast('Looking good!', 'good', '👕');
      setScreen('home');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save.', 'bad');
      setBusy(false);
    }
  }

  const catalog = state.catalog as unknown as Record<string, CatalogItem[]>;
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.user.avatar);

  return (
    <div className="screen">
      <ScreenHeader
        title="Your character"
        subtitle="Earn coins by solving problems, then spend them here."
        onBack={() => setScreen('home')}
        right={<Chip tone="coin">🪙 {state.user.coins}</Chip>}
      />

      <div className="shell col">
        <div className="card row" style={{ alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'linear-gradient(180deg,#4a5b9c,#2b3a68)',
              borderRadius: 24, padding: 8, border: '1px solid var(--border)',
            }}
          >
            <AvatarPortrait avatar={draft} catalog={state.catalog} size={170} />
          </div>
          <div className="grow" style={{ minWidth: 220 }}>
            <h2 style={{ marginBottom: 4 }}>{state.user.displayName || 'Explorer'}</h2>
            <p className="muted">{state.user.gradeLabel} · Level {state.progress.currentLevel}</p>
            <div className="row-wrap">
              <Btn variant="good" onClick={save} disabled={busy || !dirty}>
                {busy ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}
              </Btn>
              {dirty ? (
                <Btn variant="ghost" onClick={() => { audio.click(); setDraft(state.user.avatar); }}>
                  Undo
                </Btn>
              ) : null}
            </div>
          </div>
        </div>

        {SECTIONS.map((section) => {
          const list = catalog[section.list] || [];
          return (
            <div className="card" key={section.slot}>
              <h3>{section.title}</h3>
              {section.kind === 'swatch' ? (
                <div className="swatch-row" style={{ paddingBottom: 14 }}>
                  {list.map((item) => {
                    const { isOwned, levelLocked } = itemState(section.slot, item);
                    return (
                      <button
                        key={item.id}
                        className={'swatch' + (isOwned ? '' : ' locked')}
                        style={{ background: item.hex || '#888' }}
                        aria-pressed={draft[section.slot] === item.id}
                        aria-label={
                          section.title + ' ' + (item.name || item.id) +
                          (isOwned ? '' : levelLocked ? ', locked until level ' + item.unlockLevel : ', costs ' + item.cost + ' coins')
                        }
                        onClick={() => pick(section.slot, item)}
                      >
                        {!isOwned ? (
                          <span className="price">{levelLocked ? '🔒 L' + item.unlockLevel : '🪙' + item.cost}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                  {list.map((item) => {
                    const { isOwned, levelLocked } = itemState(section.slot, item);
                    return (
                      <button
                        key={item.id}
                        className={'option-card' + (isOwned ? '' : ' locked')}
                        aria-pressed={draft[section.slot] === item.id}
                        onClick={() => pick(section.slot, item)}
                      >
                        <div className="bold">
                          {item.emoji ? item.emoji + ' ' : ''}{item.name || item.id}
                        </div>
                        {item.blurb ? <div className="faint tiny">{item.blurb}</div> : null}
                        {!isOwned ? (
                          <div className="chip" style={{ marginTop: 6 }}>
                            {levelLocked ? '🔒 Level ' + item.unlockLevel : '🪙 ' + item.cost}
                          </div>
                        ) : draft[section.slot] === item.id ? (
                          <div className="chip chip-good" style={{ marginTop: 6 }}>Wearing</div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <p className="faint">
          Coins are only used inside Numeria. There is nothing to buy with real money.
        </p>
      </div>
    </div>
  );
}
