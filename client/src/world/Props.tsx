import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Palette } from '../lib/types';
import { mulberry32, hashSeed } from '../lib/rng';
import { shade } from '../lib/avatar';

/**
 * World scenery. Every prop is built from primitives and placed with a seeded
 * random number generator, so a world looks the same each time a student
 * returns to it without shipping any model files.
 */

interface PropProps {
  kind: string;
  palette: Palette;
  variant: number;
  scale: number;
}

function PropMesh({ kind, palette, variant, scale }: PropProps) {
  const p = palette;
  switch (kind) {
    case 'tree':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 1.8, 6]} />
            <meshStandardMaterial color="#6b4423" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <sphereGeometry args={[1.25, 9, 7]} />
            <meshStandardMaterial color={variant > 0.5 ? '#2f7d4f' : '#3a9160'} roughness={0.92} flatShading />
          </mesh>
          <mesh position={[0.5, 3.2, 0.3]} castShadow>
            <sphereGeometry args={[0.8, 8, 6]} />
            <meshStandardMaterial color="#48a068" roughness={0.92} flatShading />
          </mesh>
        </group>
      );
    case 'pine':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.2, 1.4, 6]} />
            <meshStandardMaterial color="#5b3a1f" roughness={0.95} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 1.7 + i * 0.85, 0]} castShadow>
              <coneGeometry args={[1.25 - i * 0.3, 1.3, 7]} />
              <meshStandardMaterial color={i % 2 ? '#25603d' : '#2d7048'} roughness={0.92} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'rock':
      return (
        <mesh scale={scale} position={[0, 0.34 * scale, 0]} rotation={[variant, variant * 3, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={variant > 0.5 ? '#8a8f9c' : '#767c8a'} roughness={1} flatShading />
        </mesh>
      );
    case 'flower':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.36, 4]} />
            <meshStandardMaterial color="#3f7d3f" />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.12, 7, 6]} />
            <meshStandardMaterial
              color={['#ef4444', '#eab308', '#f472b6', '#a855f7'][Math.floor(variant * 4) % 4]}
              emissive="#000"
            />
          </mesh>
        </group>
      );
    case 'hut':
      return (
        <group scale={scale}>
          <mesh position={[0, 1, 0]} castShadow receiveShadow>
            <boxGeometry args={[3, 2, 3]} />
            <meshStandardMaterial color={p.structure} roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[2.5, 1.3, 4]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.75, 1.52]}>
            <boxGeometry args={[0.8, 1.5, 0.08]} />
            <meshStandardMaterial color={shade(p.structureAlt, 0.3)} />
          </mesh>
          <mesh position={[1, 1.3, 1.52]}>
            <boxGeometry args={[0.6, 0.6, 0.06]} />
            <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={0.45} />
          </mesh>
        </group>
      );
    case 'peak':
      return (
        <mesh scale={scale} position={[0, 3.4 * scale, 0]} castShadow receiveShadow>
          <coneGeometry args={[3.4, 7, 5]} />
          <meshStandardMaterial color={p.groundAlt} roughness={1} flatShading />
        </mesh>
      );
    case 'tower':
      return (
        <group scale={scale}>
          <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 7, 2.4]} />
            <meshStandardMaterial color={p.structure} roughness={0.6} metalness={0.25} />
          </mesh>
          {[1.4, 3.2, 5].map((y, i) => (
            <mesh key={i} position={[0, y, 1.22]}>
              <boxGeometry args={[1.7, 0.5, 0.06]} />
              <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={0.85} />
            </mesh>
          ))}
          <mesh position={[0, 7.3, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.2, 5]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      );
    case 'pipe':
      return (
        <group scale={scale} rotation={[0, variant * Math.PI, 0]}>
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 4, 10]} />
            <meshStandardMaterial color={p.structureAlt} metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[-2, 0.5, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.3, 10]} />
            <meshStandardMaterial color={p.accent} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      );
    case 'lamp':
      return (
        <group scale={scale}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 3.2, 6]} />
            <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Emissive rather than a real light: dozens of point lights would
              stall the low-end laptops these classrooms often run. */}
          <mesh position={[0, 3.35, 0]}>
            <sphereGeometry args={[0.3, 10, 8]} />
            <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'crate':
      return (
        <group scale={scale} rotation={[0, variant * Math.PI, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.85} />
          </mesh>
          {variant > 0.55 ? (
            <mesh position={[0, 1.5, 0]} rotation={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              <meshStandardMaterial color={p.structure} roughness={0.85} />
            </mesh>
          ) : null}
        </group>
      );
    case 'module':
      return (
        <group scale={scale}>
          <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <capsuleGeometry args={[1.1, 2.4, 4, 10]} />
            <meshStandardMaterial color={p.structure} metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.3, 1.15]}>
            <cylinderGeometry args={[0.42, 0.42, 0.12, 14]} />
            <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={0.9} />
          </mesh>
        </group>
      );
    case 'panel':
      return (
        <group scale={scale} rotation={[0, variant * Math.PI * 2, 0]}>
          <mesh position={[0, 1.6, 0]} rotation={[-0.42, 0, 0]} castShadow>
            <boxGeometry args={[2.6, 0.1, 1.7]} />
            <meshStandardMaterial color="#1e3a8a" metalness={0.65} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 1.6, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} />
          </mesh>
        </group>
      );
    case 'spire':
      return (
        <group scale={scale}>
          <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.85, 6.4, 6]} />
            <meshStandardMaterial
              color={p.structure} roughness={0.35} metalness={0.2}
              emissive={p.accent} emissiveIntensity={0.16}
            />
          </mesh>
          <mesh position={[0, 6.7, 0]}>
            <octahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={1.5} />
          </mesh>
        </group>
      );
    case 'crystal':
      return (
        <group scale={scale} rotation={[variant * 0.3, variant * 6, variant * 0.2]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <octahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial
              color={p.accent} emissive={p.accent} emissiveIntensity={0.7}
              transparent opacity={0.85} roughness={0.15} metalness={0.3}
            />
          </mesh>
        </group>
      );
    case 'mushroom':
      return (
        <group scale={scale}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.7, 7]} />
            <meshStandardMaterial color="#e9d5ff" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.78, 0]} castShadow>
            <sphereGeometry args={[0.52, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial
              color={variant > 0.5 ? '#f472b6' : '#22d3ee'}
              emissive={variant > 0.5 ? '#be185d' : '#0e7490'} emissiveIntensity={0.55}
              roughness={0.6} side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh scale={scale} position={[0, 0.5 * scale, 0]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={p.structure} />
        </mesh>
      );
  }
}

export interface PlacedProp {
  kind: string;
  x: number;
  z: number;
  rot: number;
  scale: number;
  variant: number;
}

/**
 * Lay out the scenery. Props keep clear of the paths between stations and of
 * the stations themselves so a student is never blocked in.
 */
export function useSceneryLayout(
  worldId: string,
  props: { kind: string; count: number; spread: number }[],
  stations: { pos: [number, number] }[],
  quality: 'low' | 'medium' | 'high'
): PlacedProp[] {
  return useMemo(() => {
    const rng = mulberry32(hashSeed('scenery:' + worldId));
    const density = quality === 'low' ? 0.42 : quality === 'medium' ? 0.72 : 1;
    const out: PlacedProp[] = [];

    for (const group of props) {
      const count = Math.max(4, Math.round(group.count * density));
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < count * 14) {
        const angle = rng() * Math.PI * 2;
        const radius = 9 + Math.sqrt(rng()) * group.spread;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Keep a clear ring around every station and the spawn point.
        if (Math.hypot(x, z) < 7) continue;
        let tooClose = false;
        for (const st of stations) {
          if (Math.hypot(x - st.pos[0], z - st.pos[1]) < 5.5) { tooClose = true; break; }
        }
        if (tooClose) continue;

        out.push({
          kind: group.kind,
          x, z,
          rot: rng() * Math.PI * 2,
          scale: 0.75 + rng() * 0.6,
          variant: rng(),
        });
        placed++;
      }
    }
    return out;
  }, [worldId, props, stations, quality]);
}

export function Scenery({ layout, palette }: { layout: PlacedProp[]; palette: Palette }) {
  return (
    <group>
      {layout.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <PropMesh kind={p.kind} palette={palette} variant={p.variant} scale={p.scale} />
        </group>
      ))}
    </group>
  );
}

export { PropMesh };
