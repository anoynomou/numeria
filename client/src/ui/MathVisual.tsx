import React from 'react';
import type { QuestionVisual } from '../lib/types';

/**
 * Renders the picture that goes with a question: a clock face, an array of
 * dots, a shaded fraction bar, a coordinate grid, and so on. Everything is
 * inline SVG so it scales cleanly and needs no image assets.
 */

const INK = '#f2f6ff';
const DIM = '#aab6d8';
const ACCENT = '#ffd166';
const FILL = '#38bdf8';
const FILL_2 = '#a78bfa';

const box: React.CSSProperties = {
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14,
  padding: 12,
  margin: '0 0 14px',
  display: 'flex',
  justifyContent: 'center',
  overflowX: 'auto',
};

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={box} role="img" aria-label={label}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Clock({ hour, minute }: { hour: number; minute: number }) {
  const cx = 90, cy = 90, r = 76;
  const minuteAngle = (minute / 60) * 360 - 90;
  const hourAngle = (((hour % 12) + minute / 60) / 12) * 360 - 90;
  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = (angle * Math.PI) / 180;
    return (
      <line
        x1={cx} y1={cy}
        x2={cx + Math.cos(rad) * length}
        y2={cy + Math.sin(rad) * length}
        stroke={color} strokeWidth={width} strokeLinecap="round"
      />
    );
  };
  return (
    <Frame label={`Clock showing ${hour}:${String(minute).padStart(2, '0')}`}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={r} fill="#111a36" stroke={INK} strokeWidth="3" />
        {Array.from({ length: 60 }, (_, i) => {
          const a = ((i / 60) * 360 - 90) * (Math.PI / 180);
          const big = i % 5 === 0;
          const inner = big ? r - 12 : r - 6;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * inner} y1={cy + Math.sin(a) * inner}
              x2={cx + Math.cos(a) * (r - 2)} y2={cy + Math.sin(a) * (r - 2)}
              stroke={big ? INK : DIM} strokeWidth={big ? 2.5 : 1}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const a = ((n / 12) * 360 - 90) * (Math.PI / 180);
          return (
            <text
              key={n}
              x={cx + Math.cos(a) * (r - 26)} y={cy + Math.sin(a) * (r - 26) + 6}
              fill={INK} fontSize="16" fontWeight="800" textAnchor="middle"
            >{n}</text>
          );
        })}
        {hand(hourAngle, 40, 7, ACCENT)}
        {hand(minuteAngle, 60, 4.5, INK)}
        <circle cx={cx} cy={cy} r={5} fill={ACCENT} />
      </svg>
    </Frame>
  );
}

function BaseTen({ tens, ones }: { tens: number; ones: number }) {
  return (
    <Frame label={`${tens} rods of ten and ${ones} single units`}>
      <svg width={Math.max(160, tens * 22 + ones * 16 + 40)} height="120" viewBox={`0 0 ${Math.max(160, tens * 22 + ones * 16 + 40)} 120`}>
        {Array.from({ length: tens }, (_, i) => (
          <g key={'t' + i}>
            <rect x={10 + i * 22} y={14} width={16} height={92} fill={FILL} stroke={INK} strokeWidth="1.5" rx="3" />
            {Array.from({ length: 10 }, (_, j) => (
              <line key={j} x1={10 + i * 22} y1={14 + j * 9.2} x2={26 + i * 22} y2={14 + j * 9.2} stroke="#0b1026" strokeWidth="1" />
            ))}
          </g>
        ))}
        {Array.from({ length: ones }, (_, i) => (
          <rect key={'o' + i} x={20 + tens * 22 + i * 16} y={92} width={12} height={12} fill={ACCENT} stroke={INK} strokeWidth="1.5" rx="2" />
        ))}
      </svg>
    </Frame>
  );
}

function ArrayDots({ rows, cols }: { rows: number; cols: number }) {
  const gap = 24, pad = 14;
  const w = cols * gap + pad * 2, h = rows * gap + pad * 2;
  return (
    <Frame label={`${rows} rows of ${cols} dots`}>
      <svg width={Math.min(w, 420)} height={Math.min(h, 300)} viewBox={`0 0 ${w} ${h}`}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <circle key={r + '-' + c} cx={pad + c * gap + gap / 2} cy={pad + r * gap + gap / 2} r={8} fill={FILL} stroke={INK} strokeWidth="1.5" />
          ))
        )}
      </svg>
    </Frame>
  );
}

function Coins({ quarters, dimes, nickels, pennies }: { quarters: number; dimes: number; nickels: number; pennies: number }) {
  const list: { label: string; color: string; size: number }[] = [];
  for (let i = 0; i < quarters; i++) list.push({ label: '25', color: '#cbd5e1', size: 22 });
  for (let i = 0; i < dimes; i++) list.push({ label: '10', color: '#e2e8f0', size: 16 });
  for (let i = 0; i < nickels; i++) list.push({ label: '5', color: '#94a3b8', size: 19 });
  for (let i = 0; i < pennies; i++) list.push({ label: '1', color: '#d97706', size: 17 });
  const perRow = 6;
  const rows = Math.ceil(list.length / perRow);
  return (
    <Frame label="A group of coins">
      <svg width={perRow * 52} height={rows * 52} viewBox={`0 0 ${perRow * 52} ${rows * 52}`}>
        {list.map((c, i) => {
          const x = (i % perRow) * 52 + 26;
          const y = Math.floor(i / perRow) * 52 + 26;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={c.size} fill={c.color} stroke="#0b1026" strokeWidth="2" />
              <text x={x} y={y + 5} fontSize="13" fontWeight="900" textAnchor="middle" fill="#0b1026">{c.label}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

function FractionBar({ num, den }: { num: number; den: number }) {
  const w = 320, h = 54;
  const seg = w / den;
  return (
    <Frame label={`A bar split into ${den} parts with ${num} shaded`}>
      <svg width={w + 4} height={h + 4} viewBox={`0 0 ${w + 4} ${h + 4}`}>
        {Array.from({ length: den }, (_, i) => (
          <rect
            key={i} x={2 + i * seg} y={2} width={seg} height={h}
            fill={i < num ? FILL : 'rgba(255,255,255,0.08)'}
            stroke={INK} strokeWidth="2"
          />
        ))}
      </svg>
    </Frame>
  );
}

function FractionCompare({ a, b }: { a: [number, number]; b: [number, number] }) {
  const w = 280, h = 40;
  const bar = (f: [number, number], y: number, color: string) => {
    const seg = w / f[1];
    return (
      <g>
        {Array.from({ length: f[1] }, (_, i) => (
          <rect key={i} x={2 + i * seg} y={y} width={seg} height={h}
            fill={i < f[0] ? color : 'rgba(255,255,255,0.08)'} stroke={INK} strokeWidth="1.8" />
        ))}
        <text x={w + 12} y={y + h / 2 + 5} fill={INK} fontSize="15" fontWeight="800">{f[0]}/{f[1]}</text>
      </g>
    );
  };
  return (
    <Frame label={`Comparing ${a[0]}/${a[1]} with ${b[0]}/${b[1]}`}>
      <svg width={w + 60} height={h * 2 + 20} viewBox={`0 0 ${w + 60} ${h * 2 + 20}`}>
        {bar(a, 2, FILL)}
        {bar(b, h + 14, FILL_2)}
      </svg>
    </Frame>
  );
}

function Rect({ w, h }: { w: number; h: number }) {
  const scale = Math.min(26, 240 / Math.max(w, h));
  const pw = w * scale, ph = h * scale;
  return (
    <Frame label={`A rectangle ${w} by ${h}`}>
      <svg width={pw + 60} height={ph + 50} viewBox={`0 0 ${pw + 60} ${ph + 50}`}>
        <rect x={30} y={10} width={pw} height={ph} fill="rgba(56,189,248,0.25)" stroke={FILL} strokeWidth="2.5" />
        {scale > 12 && w <= 16 && h <= 16 ? (
          <g opacity="0.4">
            {Array.from({ length: w - 1 }, (_, i) => (
              <line key={'v' + i} x1={30 + (i + 1) * scale} y1={10} x2={30 + (i + 1) * scale} y2={10 + ph} stroke={INK} />
            ))}
            {Array.from({ length: h - 1 }, (_, i) => (
              <line key={'h' + i} x1={30} y1={10 + (i + 1) * scale} x2={30 + pw} y2={10 + (i + 1) * scale} stroke={INK} />
            ))}
          </g>
        ) : null}
        <text x={30 + pw / 2} y={ph + 32} fill={ACCENT} fontSize="15" fontWeight="800" textAnchor="middle">{w}</text>
        <text x={16} y={10 + ph / 2} fill={ACCENT} fontSize="15" fontWeight="800" textAnchor="middle">{h}</text>
      </svg>
    </Frame>
  );
}

function Prism({ l, w, h }: { l: number; w: number; h: number }) {
  const s = Math.min(18, 150 / Math.max(l, w, h));
  const W = l * s, H = h * s, D = w * s * 0.55;
  return (
    <Frame label={`A box ${l} by ${w} by ${h}`}>
      <svg width={W + D + 70} height={H + D + 50} viewBox={`0 0 ${W + D + 70} ${H + D + 50}`}>
        <polygon points={`20,${D + 10} ${20 + D},10 ${20 + D + W},10 ${20 + W},${D + 10}`}
          fill="rgba(167,139,250,0.4)" stroke={FILL_2} strokeWidth="2" />
        <polygon points={`${20 + W},${D + 10} ${20 + D + W},10 ${20 + D + W},${10 + H} ${20 + W},${D + 10 + H}`}
          fill="rgba(56,189,248,0.3)" stroke={FILL} strokeWidth="2" />
        <rect x={20} y={D + 10} width={W} height={H} fill="rgba(56,189,248,0.22)" stroke={FILL} strokeWidth="2.5" />
        <text x={20 + W / 2} y={D + H + 32} fill={ACCENT} fontSize="14" fontWeight="800" textAnchor="middle">{l}</text>
        <text x={8} y={D + 10 + H / 2} fill={ACCENT} fontSize="14" fontWeight="800" textAnchor="middle">{h}</text>
        <text x={26 + W + D / 2} y={D + 6 + H / 2} fill={ACCENT} fontSize="14" fontWeight="800">{w}</text>
      </svg>
    </Frame>
  );
}

function Angle({ degrees }: { degrees: number }) {
  const cx = 30, cy = 130, len = 150;
  const rad = (degrees * Math.PI) / 180;
  const x2 = cx + Math.cos(-rad) * len;
  const y2 = cy + Math.sin(-rad) * len;
  const arcR = 42;
  const ax = cx + arcR, ay = cy;
  const bx = cx + Math.cos(-rad) * arcR, by = cy + Math.sin(-rad) * arcR;
  const large = degrees > 180 ? 1 : 0;
  return (
    <Frame label={`An angle of ${degrees} degrees`}>
      <svg width="220" height="160" viewBox="0 0 220 160">
        <line x1={cx} y1={cy} x2={cx + len} y2={cy} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
        <path d={`M ${ax} ${ay} A ${arcR} ${arcR} 0 ${large} 0 ${bx} ${by}`} fill="none" stroke={FILL} strokeWidth="2.5" />
        <text x={cx + 52} y={cy - 16} fill={FILL} fontSize="16" fontWeight="800">{degrees}°</text>
      </svg>
    </Frame>
  );
}

function Circle({ r }: { r: number }) {
  const R = 66;
  return (
    <Frame label={`A circle with radius ${r}`}>
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={R} fill="rgba(56,189,248,0.22)" stroke={FILL} strokeWidth="2.5" />
        <line x1="85" y1="85" x2={85 + R} y2="85" stroke={ACCENT} strokeWidth="2.5" />
        <circle cx="85" cy="85" r="3.5" fill={ACCENT} />
        <text x={85 + R / 2} y="78" fill={ACCENT} fontSize="15" fontWeight="800" textAnchor="middle">r = {r}</text>
      </svg>
    </Frame>
  );
}

function TriangleShape({ b, h, parallel }: { b: number; h: number; parallel?: boolean }) {
  const s = Math.min(14, 220 / Math.max(b, h));
  const W = b * s, H = h * s;
  return (
    <Frame label={`A ${parallel ? 'parallelogram' : 'triangle'} with base ${b} and height ${h}`}>
      <svg width={W + 70} height={H + 50} viewBox={`0 0 ${W + 70} ${H + 50}`}>
        {parallel ? (
          <polygon points={`30,${H + 10} ${30 + W},${H + 10} ${30 + W + 24},10 ${30 + 24},10`}
            fill="rgba(52,211,153,0.25)" stroke="#34d399" strokeWidth="2.5" />
        ) : (
          <polygon points={`30,${H + 10} ${30 + W},${H + 10} ${30 + W * 0.42},10`}
            fill="rgba(52,211,153,0.25)" stroke="#34d399" strokeWidth="2.5" />
        )}
        <line x1={30 + W * (parallel ? 0.2 : 0.42)} y1={10} x2={30 + W * (parallel ? 0.2 : 0.42)} y2={H + 10}
          stroke={ACCENT} strokeWidth="2" strokeDasharray="5 4" />
        <text x={30 + W / 2} y={H + 34} fill={INK} fontSize="14" fontWeight="800" textAnchor="middle">b = {b}</text>
        <text x={30 + W * (parallel ? 0.2 : 0.42) + 8} y={H / 2 + 10} fill={ACCENT} fontSize="14" fontWeight="800">h = {h}</text>
      </svg>
    </Frame>
  );
}

function RightTriangle({ a, b, c, unknown }: { a: number; b: number; c: number; unknown: string }) {
  const s = Math.min(9, 180 / Math.max(a, b));
  const W = b * s, H = a * s;
  return (
    <Frame label="A right triangle">
      <svg width={W + 80} height={H + 50} viewBox={`0 0 ${W + 80} ${H + 50}`}>
        <polygon points={`30,${H + 10} ${30 + W},${H + 10} 30,10`}
          fill="rgba(251,191,36,0.2)" stroke={ACCENT} strokeWidth="2.5" />
        <rect x={30} y={H - 4} width={14} height={14} fill="none" stroke={INK} strokeWidth="2" />
        <text x={30 + W / 2} y={H + 34} fill={INK} fontSize="14" fontWeight="800" textAnchor="middle">
          {unknown === 'b' ? '?' : b}
        </text>
        <text x={12} y={H / 2 + 10} fill={INK} fontSize="14" fontWeight="800">{a}</text>
        <text x={30 + W / 2 + 6} y={H / 2 - 4} fill="#34d399" fontSize="14" fontWeight="800">
          {unknown === 'c' ? '?' : c}
        </text>
      </svg>
    </Frame>
  );
}

function GridPoint({ x, y, max, signed }: { x: number; y: number; max: number; signed?: boolean }) {
  const lo = signed ? -max : 0;
  const span = max - lo;
  const size = 240;
  const step = size / span;
  const px = (v: number) => 24 + (v - lo) * step;
  const py = (v: number) => size + 12 - (v - lo) * step;
  const ticks: number[] = [];
  const tickStep = span > 14 ? Math.ceil(span / 10) : 1;
  for (let v = lo; v <= max; v += tickStep) ticks.push(v);
  return (
    <Frame label={`A coordinate grid with a point at ${x}, ${y}`}>
      <svg width={size + 50} height={size + 46} viewBox={`0 0 ${size + 50} ${size + 46}`}>
        {ticks.map((v) => (
          <g key={v} opacity="0.28">
            <line x1={px(v)} y1={12} x2={px(v)} y2={size + 12} stroke={INK} />
            <line x1={24} y1={py(v)} x2={size + 24} y2={py(v)} stroke={INK} />
          </g>
        ))}
        <line x1={px(Math.max(lo, 0))} y1={12} x2={px(Math.max(lo, 0))} y2={size + 12} stroke={INK} strokeWidth="2.5" />
        <line x1={24} y1={py(Math.max(lo, 0))} x2={size + 24} y2={py(Math.max(lo, 0))} stroke={INK} strokeWidth="2.5" />
        {ticks.filter((v) => v !== 0).map((v) => (
          <text key={'lx' + v} x={px(v)} y={py(Math.max(lo, 0)) + 16} fill={DIM} fontSize="10" textAnchor="middle">{v}</text>
        ))}
        {ticks.filter((v) => v !== 0).map((v) => (
          <text key={'ly' + v} x={px(Math.max(lo, 0)) - 8} y={py(v) + 4} fill={DIM} fontSize="10" textAnchor="end">{v}</text>
        ))}
        <circle cx={px(x)} cy={py(y)} r="7" fill={ACCENT} stroke="#0b1026" strokeWidth="2" />
      </svg>
    </Frame>
  );
}

function LinePlot({ labels, counts }: { labels: string[]; counts: number[] }) {
  const colW = 70;
  const maxC = Math.max(...counts, 1);
  const h = maxC * 18 + 46;
  return (
    <Frame label="A line plot of the data">
      <svg width={labels.length * colW + 20} height={h} viewBox={`0 0 ${labels.length * colW + 20} ${h}`}>
        <line x1={10} y1={h - 30} x2={labels.length * colW + 10} y2={h - 30} stroke={INK} strokeWidth="2" />
        {labels.map((lab, i) => (
          <g key={lab}>
            {Array.from({ length: counts[i] }, (_, j) => (
              <circle key={j} cx={10 + i * colW + colW / 2} cy={h - 42 - j * 18} r="6.5" fill={FILL} stroke={INK} strokeWidth="1.4" />
            ))}
            <text x={10 + i * colW + colW / 2} y={h - 10} fill={INK} fontSize="13" fontWeight="800" textAnchor="middle">{lab}</text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

function BarData({ values }: { values: number[] }) {
  const maxV = Math.max(...values, 1);
  const bw = 40, h = 130;
  return (
    <Frame label="A bar chart of the data">
      <svg width={values.length * bw + 20} height={h + 30} viewBox={`0 0 ${values.length * bw + 20} ${h + 30}`}>
        {values.map((v, i) => {
          const bh = (v / maxV) * h;
          return (
            <g key={i}>
              <rect x={12 + i * bw} y={h - bh + 6} width={bw - 12} height={bh} fill={FILL_2} rx="3" />
              <text x={12 + i * bw + (bw - 12) / 2} y={h + 22} fill={INK} fontSize="12" fontWeight="800" textAnchor="middle">{v}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

function IntegerLine({ a, b, result }: { a: number; b: number; result: number }) {
  const all = [a, b, result, 0];
  const lo = Math.min(...all) - 2;
  const hi = Math.max(...all) + 2;
  const span = hi - lo;
  const w = 340;
  const px = (v: number) => 16 + ((v - lo) / span) * w;
  const marks: number[] = [];
  const stepT = span > 24 ? Math.ceil(span / 12) : span > 12 ? 2 : 1;
  for (let v = Math.ceil(lo); v <= hi; v += stepT) marks.push(v);
  return (
    <Frame label="A number line">
      <svg width={w + 32} height="74" viewBox={`0 0 ${w + 32} 74`}>
        <line x1={16} y1={40} x2={w + 16} y2={40} stroke={INK} strokeWidth="2.5" />
        {marks.map((v) => (
          <g key={v}>
            <line x1={px(v)} y1={34} x2={px(v)} y2={46} stroke={v === 0 ? ACCENT : DIM} strokeWidth={v === 0 ? 2.5 : 1.5} />
            <text x={px(v)} y={62} fill={v === 0 ? ACCENT : DIM} fontSize="11" textAnchor="middle">{v}</text>
          </g>
        ))}
        <circle cx={px(a)} cy={40} r="6" fill={FILL} stroke="#0b1026" strokeWidth="1.5" />
        <text x={px(a)} y={24} fill={FILL} fontSize="12" fontWeight="800" textAnchor="middle">start</text>
      </svg>
    </Frame>
  );
}

function Scatter({ points }: { points: [number, number][] }) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = 250, h = 180;
  const px = (v: number) => 34 + ((v - minX) / (maxX - minX || 1)) * w;
  const py = (v: number) => h + 8 - ((v - minY) / (maxY - minY || 1)) * h;
  return (
    <Frame label="A scatter plot">
      <svg width={w + 54} height={h + 46} viewBox={`0 0 ${w + 54} ${h + 46}`}>
        <line x1={30} y1={8} x2={30} y2={h + 12} stroke={INK} strokeWidth="2" />
        <line x1={30} y1={h + 12} x2={w + 40} y2={h + 12} stroke={INK} strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={px(p[0])} cy={py(p[1])} r="5.5" fill={ACCENT} stroke="#0b1026" strokeWidth="1.4" />
        ))}
        <text x={(w + 40) / 2 + 14} y={h + 38} fill={DIM} fontSize="12" textAnchor="middle">study minutes</text>
      </svg>
    </Frame>
  );
}

function Cylinder({ r, h, kind }: { r: number; h: number; kind: string }) {
  const R = Math.min(52, 14 + r * 3.2);
  const H = Math.min(120, 34 + h * 4);
  if (kind === 'sphere') {
    return (
      <Frame label={`A sphere with radius ${r}`}>
        <svg width={R * 2 + 60} height={R * 2 + 30} viewBox={`0 0 ${R * 2 + 60} ${R * 2 + 30}`}>
          <circle cx={R + 20} cy={R + 12} r={R} fill="rgba(167,139,250,0.3)" stroke={FILL_2} strokeWidth="2.5" />
          <ellipse cx={R + 20} cy={R + 12} rx={R} ry={R * 0.32} fill="none" stroke={FILL_2} strokeWidth="1.4" opacity="0.6" />
          <line x1={R + 20} y1={R + 12} x2={R * 2 + 20} y2={R + 12} stroke={ACCENT} strokeWidth="2" />
          <text x={R + 20 + R / 2} y={R + 6} fill={ACCENT} fontSize="13" fontWeight="800" textAnchor="middle">r={r}</text>
        </svg>
      </Frame>
    );
  }
  if (kind === 'cone') {
    return (
      <Frame label={`A cone with radius ${r} and height ${h}`}>
        <svg width={R * 2 + 60} height={H + 50} viewBox={`0 0 ${R * 2 + 60} ${H + 50}`}>
          <polygon points={`${R + 20},10 ${20},${H + 14} ${R * 2 + 20},${H + 14}`}
            fill="rgba(56,189,248,0.26)" stroke={FILL} strokeWidth="2.5" />
          <ellipse cx={R + 20} cy={H + 14} rx={R} ry={R * 0.28} fill="rgba(56,189,248,0.4)" stroke={FILL} strokeWidth="2.5" />
          <text x={R + 20} y={H + 42} fill={ACCENT} fontSize="13" fontWeight="800" textAnchor="middle">r={r}, h={h}</text>
        </svg>
      </Frame>
    );
  }
  return (
    <Frame label={`A cylinder with radius ${r} and height ${h}`}>
      <svg width={R * 2 + 60} height={H + 60} viewBox={`0 0 ${R * 2 + 60} ${H + 60}`}>
        <rect x={20} y={20} width={R * 2} height={H} fill="rgba(56,189,248,0.24)" stroke={FILL} strokeWidth="2.5" />
        <ellipse cx={R + 20} cy={H + 20} rx={R} ry={R * 0.3} fill="rgba(56,189,248,0.4)" stroke={FILL} strokeWidth="2.5" />
        <ellipse cx={R + 20} cy={20} rx={R} ry={R * 0.3} fill="rgba(56,189,248,0.55)" stroke={FILL} strokeWidth="2.5" />
        <text x={R + 20} y={H + 50} fill={ACCENT} fontSize="13" fontWeight="800" textAnchor="middle">r={r}, h={h}</text>
      </svg>
    </Frame>
  );
}

function LineTwoPoints({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const max = Math.max(10, Math.abs(x1), Math.abs(x2), Math.abs(y1), Math.abs(y2)) + 1;
  const size = 230;
  const px = (v: number) => size / 2 + 20 + (v / max) * (size / 2);
  const py = (v: number) => size / 2 + 12 - (v / max) * (size / 2);
  return (
    <Frame label={`Two points plotted at ${x1},${y1} and ${x2},${y2}`}>
      <svg width={size + 44} height={size + 30} viewBox={`0 0 ${size + 44} ${size + 30}`}>
        <line x1={px(-max)} y1={py(0)} x2={px(max)} y2={py(0)} stroke={INK} strokeWidth="2" />
        <line x1={px(0)} y1={py(-max)} x2={px(0)} y2={py(max)} stroke={INK} strokeWidth="2" />
        <line x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={FILL} strokeWidth="2.5" strokeDasharray="6 4" />
        <circle cx={px(x1)} cy={py(y1)} r="6" fill={ACCENT} stroke="#0b1026" strokeWidth="1.6" />
        <circle cx={px(x2)} cy={py(y2)} r="6" fill="#34d399" stroke="#0b1026" strokeWidth="1.6" />
        <text x={px(x1) + 9} y={py(y1) - 7} fill={ACCENT} fontSize="11" fontWeight="800">({x1},{y1})</text>
        <text x={px(x2) + 9} y={py(y2) - 7} fill="#34d399" fontSize="11" fontWeight="800">({x2},{y2})</text>
      </svg>
    </Frame>
  );
}

/* ---------------------------------------------------------------- */

export function MathVisual({ visual }: { visual: QuestionVisual | null }) {
  if (!visual || !visual.kind) return null;
  const v = visual as any;
  switch (v.kind) {
    case 'clock': return <Clock hour={v.hour} minute={v.minute} />;
    case 'base-ten': return <BaseTen tens={v.tens} ones={v.ones} />;
    case 'array': return <ArrayDots rows={v.rows} cols={v.cols} />;
    case 'coins': return <Coins quarters={v.quarters} dimes={v.dimes} nickels={v.nickels} pennies={v.pennies} />;
    case 'fraction-bar': return <FractionBar num={v.num} den={v.den} />;
    case 'fraction-compare': return <FractionCompare a={v.a} b={v.b} />;
    case 'rect': return <Rect w={v.w} h={v.h} />;
    case 'prism': return <Prism l={v.l} w={v.w} h={v.h} />;
    case 'angle': return <Angle degrees={v.degrees} />;
    case 'circle': return <Circle r={v.r} />;
    case 'triangle': return <TriangleShape b={v.b} h={v.h} />;
    case 'parallelogram': return <TriangleShape b={v.b} h={v.h} parallel />;
    case 'right-triangle': return <RightTriangle a={v.a} b={v.b} c={v.c} unknown={v.unknown} />;
    case 'grid-point': return <GridPoint x={v.x} y={v.y} max={v.max} signed={v.signed} />;
    case 'line-plot': return <LinePlot labels={v.labels} counts={v.counts} />;
    case 'bar-data': return <BarData values={v.values} />;
    case 'integer-line': return <IntegerLine a={v.a} b={v.b} result={v.result} />;
    case 'scatter': return <Scatter points={v.points} />;
    case 'cylinder': return <Cylinder r={v.r} h={v.h} kind="cylinder" />;
    case 'cone': return <Cylinder r={v.r} h={v.h} kind="cone" />;
    case 'sphere': return <Cylinder r={v.r} h={v.h} kind="sphere" />;
    case 'line-two-points': return <LineTwoPoints x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} />;
    default: return null;
  }
}
