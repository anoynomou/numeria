import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarConfig, Catalog } from '../lib/types';
import { resolveAvatar, buildScale, shade } from '../lib/avatar';

/**
 * The student's character, assembled from box and sphere primitives and
 * coloured from their avatar choices. Building it from primitives keeps the
 * download at zero bytes and renders fast on school laptops and Chromebooks.
 */
export function Avatar3D({
  avatar, catalog, moving, speed = 0, castShadow = true,
}: {
  avatar: AvatarConfig;
  catalog?: Catalog | null;
  moving: boolean;
  speed?: number;
  castShadow?: boolean;
}) {
  const a = useMemo(() => resolveAvatar(avatar, catalog), [avatar, catalog]);
  const s = useMemo(() => buildScale(a.build), [a.build]);

  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pet = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  useFrame((_, delta) => {
    // Swing limbs while walking, and settle them smoothly when stopping.
    const target = moving ? Math.min(1, speed / 4.2) : 0;
    phase.current += delta * (6 + target * 7) * (moving ? 1 : 0);
    const swing = Math.sin(phase.current) * 0.62 * target;
    const counter = Math.sin(phase.current + Math.PI) * 0.62 * target;

    if (legL.current) legL.current.rotation.x = THREE.MathUtils.lerp(legL.current.rotation.x, swing, 0.35);
    if (legR.current) legR.current.rotation.x = THREE.MathUtils.lerp(legR.current.rotation.x, counter, 0.35);
    if (armL.current) armL.current.rotation.x = THREE.MathUtils.lerp(armL.current.rotation.x, counter * 0.8, 0.35);
    if (armR.current) armR.current.rotation.x = THREE.MathUtils.lerp(armR.current.rotation.x, swing * 0.8, 0.35);
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(phase.current)) * 0.05 * target;
      body.current.rotation.z = Math.sin(phase.current) * 0.03 * target;
    }
    if (pet.current) {
      pet.current.position.y = 0.55 + Math.sin(phase.current * 0.6) * 0.1;
      pet.current.rotation.y += delta * 1.4;
    }
  });

  const W = 0.44 * s.width;
  const H = 0.62 * s.height;
  const legH = 0.46 * s.height;
  const headR = 0.24 * s.width;
  const skinDark = shade(a.skin, 0.18);

  return (
    <group>
      {/* Legs hang from the hips so rotation looks like a stride. */}
      <group ref={legL} position={[-W * 0.28, legH, 0]}>
        <mesh position={[0, -legH / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[W * 0.36, legH, W * 0.36]} />
          <meshStandardMaterial color={a.pants} roughness={0.85} />
        </mesh>
        <mesh position={[0, -legH + 0.05, 0.04]} castShadow={castShadow}>
          <boxGeometry args={[W * 0.4, 0.12, W * 0.55]} />
          <meshStandardMaterial color={a.shoes} roughness={0.7} />
        </mesh>
      </group>
      <group ref={legR} position={[W * 0.28, legH, 0]}>
        <mesh position={[0, -legH / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[W * 0.36, legH, W * 0.36]} />
          <meshStandardMaterial color={shade(a.pants, 0.1)} roughness={0.85} />
        </mesh>
        <mesh position={[0, -legH + 0.05, 0.04]} castShadow={castShadow}>
          <boxGeometry args={[W * 0.4, 0.12, W * 0.55]} />
          <meshStandardMaterial color={a.shoes} roughness={0.7} />
        </mesh>
      </group>

      <group ref={body}>
        {/* Torso */}
        <mesh position={[0, legH + H / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[W, H, W * 0.62]} />
          <meshStandardMaterial color={a.shirt} roughness={0.75} />
        </mesh>

        {/* Backpack */}
        {a.accessory === 'backpack' ? (
          <mesh position={[0, legH + H * 0.58, -W * 0.44]} castShadow={castShadow}>
            <boxGeometry args={[W * 0.7, H * 0.62, W * 0.3]} />
            <meshStandardMaterial color={shade(a.shirt, 0.45)} roughness={0.8} />
          </mesh>
        ) : null}

        {/* Arms */}
        <group ref={armL} position={[-W * 0.62, legH + H * 0.92, 0]}>
          <mesh position={[0, -H * 0.36, 0]} castShadow={castShadow}>
            <boxGeometry args={[W * 0.24, H * 0.76, W * 0.24]} />
            <meshStandardMaterial color={shade(a.shirt, 0.22)} roughness={0.75} />
          </mesh>
          <mesh position={[0, -H * 0.76, 0]} castShadow={castShadow}>
            <sphereGeometry args={[W * 0.16, 10, 8]} />
            <meshStandardMaterial color={a.skin} roughness={0.8} />
          </mesh>
        </group>
        <group ref={armR} position={[W * 0.62, legH + H * 0.92, 0]}>
          <mesh position={[0, -H * 0.36, 0]} castShadow={castShadow}>
            <boxGeometry args={[W * 0.24, H * 0.76, W * 0.24]} />
            <meshStandardMaterial color={shade(a.shirt, 0.22)} roughness={0.75} />
          </mesh>
          <mesh position={[0, -H * 0.76, 0]} castShadow={castShadow}>
            <sphereGeometry args={[W * 0.16, 10, 8]} />
            <meshStandardMaterial color={a.skin} roughness={0.8} />
          </mesh>
        </group>

        {/* Neck and head */}
        <mesh position={[0, legH + H + 0.05, 0]}>
          <cylinderGeometry args={[W * 0.14, W * 0.16, 0.1, 8]} />
          <meshStandardMaterial color={skinDark} roughness={0.85} />
        </mesh>
        <mesh position={[0, legH + H + 0.12 + headR, 0]} castShadow={castShadow}>
          <sphereGeometry args={[headR, 16, 14]} />
          <meshStandardMaterial color={a.skin} roughness={0.8} />
        </mesh>

        {/* Eyes, so the character clearly has a front. */}
        <mesh position={[-headR * 0.36, legH + H + 0.14 + headR, headR * 0.84]}>
          <sphereGeometry args={[headR * 0.13, 8, 8]} />
          <meshStandardMaterial color="#12131a" />
        </mesh>
        <mesh position={[headR * 0.36, legH + H + 0.14 + headR, headR * 0.84]}>
          <sphereGeometry args={[headR * 0.13, 8, 8]} />
          <meshStandardMaterial color="#12131a" />
        </mesh>

        <Hair style={a.hairStyle} color={a.hairColor} y={legH + H + 0.12 + headR} r={headR} />
        <Accessory kind={a.accessory} y={legH + H + 0.12 + headR} r={headR} />
      </group>

      {a.petEmoji ? (
        <mesh ref={pet} position={[W * 1.5, 0.55, -0.3]} castShadow={castShadow}>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color="#34d399" emissive="#065f46" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
      ) : null}
    </group>
  );
}

function Hair({ style, color, y, r }: { style: string; color: string; y: number; r: number }) {
  const mat = <meshStandardMaterial color={color} roughness={0.9} />;
  switch (style) {
    case 'buzz':
      return (
        <mesh position={[0, y + r * 0.16, 0]}>
          <sphereGeometry args={[r * 1.02, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          {mat}
        </mesh>
      );
    case 'afro':
      return (
        <mesh position={[0, y + r * 0.26, 0]}>
          <sphereGeometry args={[r * 1.34, 14, 12]} />
          {mat}
        </mesh>
      );
    case 'long':
      return (
        <group>
          <mesh position={[0, y + r * 0.18, 0]}>
            <sphereGeometry args={[r * 1.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            {mat}
          </mesh>
          <mesh position={[0, y - r * 0.55, -r * 0.5]}>
            <boxGeometry args={[r * 1.5, r * 1.9, r * 0.5]} />
            {mat}
          </mesh>
        </group>
      );
    case 'curly':
      return (
        <group position={[0, y + r * 0.3, 0]}>
          {[[-0.6, 0, 0.3], [0.6, 0, 0.3], [0, 0.18, -0.5], [0, 0.22, 0.55], [-0.5, 0.1, -0.4], [0.5, 0.1, -0.4]].map((p, i) => (
            <mesh key={i} position={[p[0] * r, p[1] * r, p[2] * r]}>
              <sphereGeometry args={[r * 0.5, 8, 8]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'bun':
      return (
        <group>
          <mesh position={[0, y + r * 0.16, 0]}>
            <sphereGeometry args={[r * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            {mat}
          </mesh>
          <mesh position={[0, y + r * 1.12, -r * 0.2]}>
            <sphereGeometry args={[r * 0.42, 10, 8]} />
            {mat}
          </mesh>
        </group>
      );
    case 'ponytail':
      return (
        <group>
          <mesh position={[0, y + r * 0.16, 0]}>
            <sphereGeometry args={[r * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            {mat}
          </mesh>
          <mesh position={[0, y - r * 0.2, -r * 0.92]} rotation={[0.4, 0, 0]}>
            <capsuleGeometry args={[r * 0.24, r * 1.1, 4, 8]} />
            {mat}
          </mesh>
        </group>
      );
    case 'braids':
      return (
        <group>
          <mesh position={[0, y + r * 0.16, 0]}>
            <sphereGeometry args={[r * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            {mat}
          </mesh>
          <mesh position={[-r * 0.92, y - r * 0.5, 0]}>
            <capsuleGeometry args={[r * 0.18, r * 1.1, 4, 8]} />
            {mat}
          </mesh>
          <mesh position={[r * 0.92, y - r * 0.5, 0]}>
            <capsuleGeometry args={[r * 0.18, r * 1.1, 4, 8]} />
            {mat}
          </mesh>
        </group>
      );
    default:
      return (
        <mesh position={[0, y + r * 0.2, 0]}>
          <sphereGeometry args={[r * 1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          {mat}
        </mesh>
      );
  }
}

function Accessory({ kind, y, r }: { kind: string; y: number; r: number }) {
  switch (kind) {
    case 'cap':
      return (
        <group position={[0, y + r * 0.72, 0]}>
          <mesh>
            <sphereGeometry args={[r * 1.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <meshStandardMaterial color="#ef4444" roughness={0.7} />
          </mesh>
          <mesh position={[0, -r * 0.08, r * 0.78]}>
            <boxGeometry args={[r * 1.3, r * 0.12, r * 0.86]} />
            <meshStandardMaterial color="#dc2626" roughness={0.7} />
          </mesh>
        </group>
      );
    case 'goggles':
      return (
        <group position={[0, y + r * 0.34, 0]}>
          <mesh>
            <torusGeometry args={[r * 0.96, r * 0.12, 8, 20]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-r * 0.42, 0, r * 0.82]}>
            <cylinderGeometry args={[r * 0.28, r * 0.28, r * 0.12, 12]} />
            <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[r * 0.42, 0, r * 0.82]}>
            <cylinderGeometry args={[r * 0.28, r * 0.28, r * 0.12, 12]} />
            <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.4} />
          </mesh>
        </group>
      );
    case 'helmet':
      return (
        <group position={[0, y + r * 0.2, 0]}>
          <mesh>
            <sphereGeometry args={[r * 1.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.55} metalness={0.15} />
          </mesh>
          <mesh position={[0, r * 0.1, r * 0.6]}>
            <boxGeometry args={[r * 1.7, r * 0.16, r * 1.1]} />
            <meshStandardMaterial color="#d97706" roughness={0.6} />
          </mesh>
        </group>
      );
    case 'hood':
      return (
        <mesh position={[0, y + r * 0.14, -r * 0.14]}>
          <sphereGeometry args={[r * 1.24, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
          <meshStandardMaterial color="#2f6b46" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      );
    case 'visor':
      return (
        <group position={[0, y + r * 0.1, 0]}>
          <mesh>
            <sphereGeometry args={[r * 1.2, 16, 14]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.34} roughness={0.1} metalness={0.2} />
          </mesh>
          <mesh position={[0, r * 0.05, r * 0.5]}>
            <sphereGeometry args={[r * 0.92, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <meshStandardMaterial color="#22d3ee" transparent opacity={0.5} />
          </mesh>
        </group>
      );
    case 'crown':
      return (
        <mesh position={[0, y + r * 1.02, 0]}>
          <cylinderGeometry args={[r * 0.78, r * 0.68, r * 0.42, 8, 1, true]} />
          <meshStandardMaterial
            color="#fcd34d" metalness={0.75} roughness={0.25}
            emissive="#b45309" emissiveIntensity={0.3} side={THREE.DoubleSide}
          />
        </mesh>
      );
    default:
      return null;
  }
}
