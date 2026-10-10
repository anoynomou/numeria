import React from 'react';
import type { AvatarConfig, Catalog } from '../lib/types';
import { resolveAvatar, buildScale, shade } from '../lib/avatar';

/**
 * A flat SVG portrait of the student's avatar, used on the home screen, the
 * wardrobe and dashboards. The 3D world draws the same character from boxes;
 * this keeps menus instant without spinning up a WebGL canvas.
 */
export function AvatarPortrait({
  avatar, catalog, size = 96, showPet = true,
}: {
  avatar: AvatarConfig;
  catalog?: Catalog | null;
  size?: number;
  showPet?: boolean;
}) {
  const a = resolveAvatar(avatar, catalog);
  const s = buildScale(a.build);
  const skinDark = shade(a.skin, 0.16);
  const shirtDark = shade(a.shirt, 0.2);

  const headY = 34;
  const headR = 20 * s.width;
  const bodyTop = headY + headR + 2;
  const bodyW = 42 * s.width;
  const bodyH = 40 * s.height;
  const cx = 60;

  return (
    <svg
      width={size} height={size} viewBox="0 0 120 120"
      role="img"
      aria-label="Your character"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="hairClip">
          <circle cx={cx} cy={headY} r={headR} />
        </clipPath>
      </defs>

      {/* Legs */}
      <rect x={cx - bodyW / 2 + 3} y={bodyTop + bodyH - 2} width={bodyW / 2 - 4} height={24 * s.height} rx="5" fill={a.pants} />
      <rect x={cx + 1} y={bodyTop + bodyH - 2} width={bodyW / 2 - 4} height={24 * s.height} rx="5" fill={shade(a.pants, 0.12)} />

      {/* Shoes */}
      <rect x={cx - bodyW / 2 + 1} y={bodyTop + bodyH + 20 * s.height} width={bodyW / 2 - 1} height={9} rx="4" fill={a.shoes} stroke="#0b1026" strokeWidth="1" />
      <rect x={cx + 0} y={bodyTop + bodyH + 20 * s.height} width={bodyW / 2 - 1} height={9} rx="4" fill={a.shoes} stroke="#0b1026" strokeWidth="1" />

      {/* Arms, shaded slightly darker so they read as limbs against the torso */}
      <rect x={cx - bodyW / 2 - 9} y={bodyTop + 5} width={9} height={30 * s.height} rx="4.5" fill={shade(a.shirt, 0.22)} />
      <rect x={cx + bodyW / 2} y={bodyTop + 5} width={9} height={30 * s.height} rx="4.5" fill={shade(a.shirt, 0.22)} />
      <circle cx={cx - bodyW / 2 - 4.5} cy={bodyTop + 34 * s.height} r="5" fill={a.skin} />
      <circle cx={cx + bodyW / 2 + 4.5} cy={bodyTop + 34 * s.height} r="5" fill={a.skin} />

      {/* Torso */}
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} rx="10" fill={a.shirt} stroke={shirtDark} strokeWidth="1.5" />

      {/* Backpack strap detail */}
      {a.accessory === 'backpack' ? (
        <>
          <rect x={cx - bodyW / 2 + 5} y={bodyTop + 2} width={5} height={bodyH - 8} fill={shade(a.shirt, 0.42)} rx="2" />
          <rect x={cx + bodyW / 2 - 10} y={bodyTop + 2} width={5} height={bodyH - 8} fill={shade(a.shirt, 0.42)} rx="2" />
        </>
      ) : null}

      {/* Neck + head */}
      <rect x={cx - 6} y={headY + headR - 6} width="12" height="10" fill={skinDark} />
      <circle cx={cx} cy={headY} r={headR} fill={a.skin} stroke={skinDark} strokeWidth="1.5" />

      {/* Hair */}
      <g clipPath="url(#hairClip)">
        <Hair style={a.hairStyle} color={a.hairColor} cx={cx} cy={headY} r={headR} />
      </g>
      {a.hairStyle === 'braids' ? (
        <>
          <rect x={cx - headR - 4} y={headY - 2} width="7" height="24" rx="3.5" fill={a.hairColor} />
          <rect x={cx + headR - 3} y={headY - 2} width="7" height="24" rx="3.5" fill={a.hairColor} />
        </>
      ) : null}
      {a.hairStyle === 'ponytail' ? (
        <rect x={cx + headR - 4} y={headY - 6} width="8" height="26" rx="4" fill={a.hairColor} />
      ) : null}
      {a.hairStyle === 'bun' ? (
        <circle cx={cx} cy={headY - headR - 3} r="7" fill={a.hairColor} />
      ) : null}
      {a.hairStyle === 'afro' ? (
        <circle cx={cx} cy={headY - 4} r={headR + 6} fill={a.hairColor} opacity="0.95" />
      ) : null}
      {a.hairStyle === 'afro' ? (
        <circle cx={cx} cy={headY + 3} r={headR - 2} fill={a.skin} />
      ) : null}

      {/* Face */}
      <circle cx={cx - 7} cy={headY + 1} r="2.4" fill="#1b1b1f" />
      <circle cx={cx + 7} cy={headY + 1} r="2.4" fill="#1b1b1f" />
      <path d={`M ${cx - 6} ${headY + 9} Q ${cx} ${headY + 14} ${cx + 6} ${headY + 9}`}
        stroke="#1b1b1f" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Accessories worn on the head */}
      <Accessory kind={a.accessory} cx={cx} cy={headY} r={headR} />

      {showPet && a.petEmoji ? (
        <text x="102" y="104" fontSize="20" textAnchor="middle">{a.petEmoji}</text>
      ) : null}
    </svg>
  );
}

function Hair({ style, color, cx, cy, r }: { style: string; color: string; cx: number; cy: number; r: number }) {
  switch (style) {
    case 'buzz':
      return <path d={`M ${cx - r} ${cy - 2} A ${r} ${r} 0 0 1 ${cx + r} ${cy - 2} Z`} fill={color} opacity="0.85" />;
    case 'long':
      return (
        <>
          <path d={`M ${cx - r} ${cy + 2} A ${r} ${r} 0 0 1 ${cx + r} ${cy + 2} Z`} fill={color} />
          <rect x={cx - r} y={cy - 2} width={r * 2} height={r + 12} fill={color} />
          <circle cx={cx} cy={cy + 2} r={r - 5} fill="transparent" />
        </>
      );
    case 'curly':
      return (
        <>
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={color} />
          <circle cx={cx - r * 0.6} cy={cy - r * 0.5} r="7" fill={color} />
          <circle cx={cx} cy={cy - r * 0.8} r="8" fill={color} />
          <circle cx={cx + r * 0.6} cy={cy - r * 0.5} r="7" fill={color} />
        </>
      );
    case 'bun':
    case 'ponytail':
    case 'braids':
      return <path d={`M ${cx - r} ${cy - 1} A ${r} ${r} 0 0 1 ${cx + r} ${cy - 1} Z`} fill={color} />;
    case 'afro':
      return null;
    default:
      return (
        <path d={`M ${cx - r} ${cy + 1} A ${r} ${r} 0 0 1 ${cx + r} ${cy + 1} L ${cx + r} ${cy - 3} A ${r} ${r} 0 0 0 ${cx - r} ${cy - 3} Z`} fill={color} />
      );
  }
}

function Accessory({ kind, cx, cy, r }: { kind: string; cx: number; cy: number; r: number }) {
  switch (kind) {
    case 'cap':
      return (
        <>
          <path d={`M ${cx - r - 1} ${cy - 3} A ${r + 1} ${r + 1} 0 0 1 ${cx + r + 1} ${cy - 3} Z`} fill="#ef4444" />
          <rect x={cx - r - 9} y={cy - 5} width="16" height="4.5" rx="2" fill="#dc2626" />
        </>
      );
    case 'goggles':
      return (
        <>
          <rect x={cx - r - 1} y={cy - 9} width={r * 2 + 2} height="7" rx="3" fill="#64748b" />
          <circle cx={cx - 7} cy={cy - 5.5} r="4.6" fill="#22d3ee" stroke="#334155" strokeWidth="1.4" />
          <circle cx={cx + 7} cy={cy - 5.5} r="4.6" fill="#22d3ee" stroke="#334155" strokeWidth="1.4" />
        </>
      );
    case 'helmet':
      return (
        <>
          <path d={`M ${cx - r - 2} ${cy - 1} A ${r + 2} ${r + 2} 0 0 1 ${cx + r + 2} ${cy - 1} Z`} fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <rect x={cx - r - 4} y={cy - 3} width={r * 2 + 8} height="4.5" rx="2" fill="#d97706" />
        </>
      );
    case 'hood':
      return (
        <path d={`M ${cx - r - 4} ${cy + 8} Q ${cx} ${cy - r - 12} ${cx + r + 4} ${cy + 8} L ${cx + r} ${cy + 8} Q ${cx} ${cy - r - 2} ${cx - r} ${cy + 8} Z`}
          fill="#2f6b46" />
      );
    case 'visor':
      return (
        <>
          <path d={`M ${cx - r - 2} ${cy - 2} A ${r + 2} ${r + 2} 0 0 1 ${cx + r + 2} ${cy - 2} Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.4" />
          <path d={`M ${cx - r + 1} ${cy - 1} A ${r - 1} ${r - 1} 0 0 0 ${cx + r - 1} ${cy - 1} Z`} fill="rgba(34,211,238,0.55)" />
        </>
      );
    case 'crown':
      return (
        <path d={`M ${cx - 14} ${cy - r - 1} L ${cx - 14} ${cy - r - 12} L ${cx - 7} ${cy - r - 5} L ${cx} ${cy - r - 15} L ${cx + 7} ${cy - r - 5} L ${cx + 14} ${cy - r - 12} L ${cx + 14} ${cy - r - 1} Z`}
          fill="#fcd34d" stroke="#d97706" strokeWidth="1.3" />
      );
    default:
      return null;
  }
}
