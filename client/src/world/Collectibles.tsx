import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette, Station } from '../lib/types';
import { mulberry32, hashSeed } from '../lib/rng';

export const GEM_COUNT = 14;

/**
 * Hidden gems scattered around the world.
 *
 * They reward wandering off the direct path to the objective, which is the
 * "explore" half of the learning loop. Positions are seeded per world so a gem
 * is always in the same place, and each one can only be claimed once.
 */
export function gemPositions(worldId: string, stations: Station[]): [number, number][] {
  const rng = mulberry32(hashSeed('gems:' + worldId));
  const out: [number, number][] = [];
  let guard = 0;
  while (out.length < GEM_COUNT && guard++ < GEM_COUNT * 40) {
    const angle = rng() * Math.PI * 2;
    const radius = 12 + Math.sqrt(rng()) * 58;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep gems away from stations so they read as their own discovery.
    if (stations.some((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) < 7)) continue;
    if (out.some((p) => Math.hypot(x - p[0], z - p[1]) < 11)) continue;
    out.push([x, z]);
  }
  return out;
}

export function Collectibles({
  positions, claimed, palette,
}: {
  positions: [number, number][];
  claimed: Set<number>;
  palette: Palette;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      child.rotation.y = t * 1.3 + i;
      child.position.y = 1.1 + Math.sin(t * 1.8 + i * 0.7) * 0.18;
    });
  });

  const visible = useMemo(
    () => positions.map((p, i) => ({ p, i })).filter(({ i }) => !claimed.has(i)),
    [positions, claimed]
  );

  return (
    <group ref={group}>
      {visible.map(({ p, i }) => (
        <mesh key={i} position={[p[0], 1.1, p[1]]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={1.2}
            transparent
            opacity={0.94}
            roughness={0.15}
            metalness={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
