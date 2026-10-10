import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Palette, Station } from '../lib/types';
import { shade } from '../lib/avatar';

/**
 * An interactive point in the world: a character to talk to, a machine to
 * repair, a sign to read or a gate to open. The station a student needs next
 * gets a glowing beacon so there is always a clear objective.
 */
export function Station3D({
  station, palette, active, done, nearby,
}: {
  station: Station;
  palette: Palette;
  active: boolean;
  done: boolean;
  nearby: boolean;
}) {
  const beacon = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (beacon.current) {
      beacon.current.position.y = 3.4 + Math.sin(t * 2) * 0.22;
      beacon.current.rotation.y += delta * 1.6;
    }
    if (ring.current) {
      const s = 1 + Math.sin(t * 2.2) * 0.12;
      ring.current.scale.set(s, s, s);
    }
    // Characters turn to face a student who walks up to them.
    if (body.current && station.kind === 'npc') {
      body.current.rotation.y = Math.sin(t * 0.6) * 0.25;
      body.current.position.y = Math.sin(t * 1.4) * 0.04;
    }
  });

  return (
    <group position={[station.pos[0], 0, station.pos[1]]}>
      <group ref={body}>
        <StationBody station={station} palette={palette} done={done} />
      </group>

      {/* Objective beacon */}
      {active && !done ? (
        <>
          <mesh ref={beacon} position={[0, 3.4, 0]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={1.7} toneMapped={false} />
          </mesh>
          <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 1.9, 28]} />
            <meshBasicMaterial color="#ffd166" transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 3.2, 0]} color="#ffd166" intensity={9} distance={13} decay={2} />
        </>
      ) : null}

      {done ? (
        <mesh position={[0, 3.2, 0]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color="#34d399" emissive="#059669" emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
      ) : null}

      {/* Name plate, shown when close or when this is the objective. */}
      {nearby || active ? (
        <Html position={[0, 2.7, 0]} center distanceFactor={14} zIndexRange={[20, 0]} pointerEvents="none">
          <div
            style={{
              background: 'rgba(10,16,36,0.88)',
              border: '1px solid ' + (active ? '#ffd166' : 'rgba(255,255,255,0.22)'),
              color: active ? '#ffd166' : '#f2f6ff',
              padding: '4px 10px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: 'nowrap',
              fontFamily: "'Baloo 2','Trebuchet MS',sans-serif",
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {done ? '✓ ' : ''}{station.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function StationBody({ station, palette, done }: { station: Station; palette: Palette; done: boolean }) {
  const p = palette;
  const dim = done ? 0.35 : 0;

  switch (station.character) {
    /* ---------------- Characters ---------------- */
    case 'villager':
    case 'builder':
    case 'climber':
    case 'ranger':
      return <SimpleNpc skin="#eec39a" shirt={station.character === 'builder' ? '#f97316' : station.character === 'ranger' ? '#2f6b46' : '#e76f51'} pants="#4b5563" hat={station.character === 'builder' ? 'helmet' : 'none'} />;
    case 'robot':
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.52, 1, 10]} />
            <meshStandardMaterial color={shade('#94a3b8', dim)} metalness={0.7} roughness={0.32} />
          </mesh>
          <mesh position={[0, 1.42, 0]} castShadow>
            <boxGeometry args={[0.86, 0.84, 0.72]} />
            <meshStandardMaterial color={shade('#cbd5e1', dim)} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.5, 0.38]}>
            <boxGeometry args={[0.6, 0.28, 0.05]} />
            <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={done ? 0.3 : 1.3} toneMapped={false} />
          </mesh>
          <mesh position={[-0.56, 0.95, 0]} rotation={[0, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.56, 0.95, 0]} rotation={[0, 0, -0.3]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 5]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <mesh position={[0, 2.14, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={done ? 0.2 : 1.1} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'astronaut':
      return (
        <group>
          <SimpleNpc skin="#eec39a" shirt="#e2e8f0" pants="#cbd5e1" hat="none" />
          <mesh position={[0, 1.72, 0]}>
            <sphereGeometry args={[0.32, 14, 12]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.38} roughness={0.1} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.15, -0.34]} castShadow>
            <boxGeometry args={[0.5, 0.62, 0.26]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      );
    case 'alien':
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <capsuleGeometry args={[0.3, 0.76, 4, 10]} />
            <meshStandardMaterial color="#86efac" roughness={0.6} emissive="#16a34a" emissiveIntensity={0.18} />
          </mesh>
          <mesh position={[0, 1.62, 0]} castShadow>
            <sphereGeometry args={[0.38, 14, 12]} />
            <meshStandardMaterial color="#bbf7d0" roughness={0.5} emissive="#22c55e" emissiveIntensity={0.16} />
          </mesh>
          <mesh position={[-0.13, 1.66, 0.32]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0.13, 1.66, 0.32]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          {[-0.2, 0.2].map((x, i) => (
            <group key={i}>
              <mesh position={[x, 2.05, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.34, 5]} />
                <meshStandardMaterial color="#4ade80" />
              </mesh>
              <mesh position={[x, 2.26, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color={p.accent} emissive={p.accent} emissiveIntensity={1.2} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      );

    /* ---------------- Objects ---------------- */
    case 'bridge':
      return (
        <group>
          <mesh position={[-1.7, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.9, 2.4]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.9} />
          </mesh>
          <mesh position={[1.7, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.9, 2.4]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.9} />
          </mesh>
          {done ? (
            <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.2, 0.18, 2.2]} />
              <meshStandardMaterial color={p.structure} roughness={0.85} />
            </mesh>
          ) : (
            <>
              <mesh position={[-0.75, 0.95, 0.8]} rotation={[0, 0, -0.35]} castShadow>
                <boxGeometry args={[1, 0.14, 0.5]} />
                <meshStandardMaterial color={p.structure} roughness={0.9} />
              </mesh>
              <mesh position={[0.8, 0.9, -0.7]} rotation={[0, 0.4, 0.3]} castShadow>
                <boxGeometry args={[0.9, 0.14, 0.5]} />
                <meshStandardMaterial color={p.structure} roughness={0.9} />
              </mesh>
            </>
          )}
        </group>
      );
    case 'machine':
      return (
        <group>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 1.6, 1.3]} />
            <meshStandardMaterial color={p.structure} metalness={0.5} roughness={0.42} />
          </mesh>
          <mesh position={[0, 1.2, 0.68]}>
            <boxGeometry args={[1.1, 0.6, 0.06]} />
            <meshStandardMaterial color={done ? '#34d399' : p.accent} emissive={done ? '#059669' : p.accent} emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.44, 0.13, 8, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      );
    case 'crate':
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 1.2, 1.5]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.88} />
          </mesh>
          <mesh position={[0.9, 0.4, 0.7]} rotation={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color={p.structure} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.24, 0]}>
            <boxGeometry args={[1.56, 0.12, 1.56]} />
            <meshStandardMaterial color={p.accent} roughness={0.6} />
          </mesh>
        </group>
      );
    case 'hive':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.4 + i * 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.7 - i * 0.12, 0.78 - i * 0.12, 0.55, 6]} />
              <meshStandardMaterial color={i % 2 ? '#d9a066' : '#eab308'} roughness={0.85} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'well':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.95, 1, 0.9, 12]} />
            <meshStandardMaterial color="#7d8590" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <cylinderGeometry args={[0.78, 0.78, 0.08, 12]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.2} />
          </mesh>
          {[-0.85, 0.85].map((x, i) => (
            <mesh key={i} position={[x, 1.6, 0]} castShadow>
              <boxGeometry args={[0.14, 1.5, 0.14]} />
              <meshStandardMaterial color="#6b4423" roughness={0.95} />
            </mesh>
          ))}
          <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 1.9, 8]} />
            <meshStandardMaterial color="#6b4423" roughness={0.95} />
          </mesh>
        </group>
      );
    case 'fire':
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.6) * 0.42, 0.18, Math.sin(i * 1.6) * 0.42]} rotation={[0.35, i * 1.6, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 1.3, 6]} />
              <meshStandardMaterial color="#6b4423" roughness={0.95} />
            </mesh>
          ))}
          <mesh position={[0, 0.85, 0]}>
            <coneGeometry args={[0.45, 1, 8]} />
            <meshStandardMaterial color={done ? '#f97316' : '#78716c'} emissive={done ? '#ea580c' : '#000'} emissiveIntensity={done ? 1.5 : 0} toneMapped={false} />
          </mesh>
          {done ? <pointLight position={[0, 1.2, 0]} color="#f97316" intensity={12} distance={12} decay={2} /> : null}
        </group>
      );
    case 'wall':
      return (
        <group>
          {[0, 1, 2].map((row) =>
            [-1, 0, 1].map((col) => (
              <mesh key={row + ':' + col} position={[col * 0.92, 0.35 + row * 0.62, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.86, 0.56, 0.6]} />
                <meshStandardMaterial color={row % 2 ? p.structure : p.structureAlt} roughness={0.92} />
              </mesh>
            ))
          )}
        </group>
      );
    case 'panel':
      return (
        <group>
          <mesh position={[0, 1.5, 0]} rotation={[-0.35, 0, 0]} castShadow>
            <boxGeometry args={[2.4, 0.12, 1.6]} />
            <meshStandardMaterial color="#1e3a8a" metalness={0.65} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 1.5, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.4} />
          </mesh>
        </group>
      );
    case 'crystal':
      return (
        <group>
          {[[0, 0.9, 0, 1], [-0.6, 0.55, 0.3, 0.6], [0.55, 0.62, -0.25, 0.7]].map((c, i) => (
            <mesh key={i} position={[c[0], c[1], c[2]]} scale={c[3]} rotation={[0.2, i, 0.1]} castShadow>
              <octahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial
                color={p.accent} emissive={p.accent} emissiveIntensity={done ? 1.4 : 0.5}
                transparent opacity={0.88} roughness={0.15} metalness={0.3}
              />
            </mesh>
          ))}
        </group>
      );

    /* ---------------- Signs and gates ---------------- */
    case 'sign':
      return (
        <group>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 1.6, 6]} />
            <meshStandardMaterial color="#6b4423" roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.75, 0]} rotation={[0, 0, 0.04]} castShadow>
            <boxGeometry args={[1.8, 1.05, 0.12]} />
            <meshStandardMaterial color={p.structure} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.75, 0.07]}>
            <boxGeometry args={[1.5, 0.78, 0.03]} />
            <meshStandardMaterial color={shade(p.structureAlt, 0.2)} roughness={0.9} />
          </mesh>
        </group>
      );
    case 'gate':
      return (
        <group>
          {[-1.4, 1.4].map((x, i) => (
            <mesh key={i} position={[x, 1.6, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.5, 3.2, 0.7]} />
              <meshStandardMaterial color={p.structure} roughness={0.7} metalness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, 3.35, 0]} castShadow>
            <boxGeometry args={[3.3, 0.45, 0.8]} />
            <meshStandardMaterial color={p.structureAlt} roughness={0.7} metalness={0.2} />
          </mesh>
          {!done ? (
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[2.3, 3.1, 0.14]} />
              <meshStandardMaterial
                color={p.accent} transparent opacity={0.34}
                emissive={p.accent} emissiveIntensity={0.7} side={THREE.DoubleSide}
              />
            </mesh>
          ) : null}
        </group>
      );
    default:
      return (
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.2, 1.4, 1.2]} />
          <meshStandardMaterial color={p.structure} roughness={0.85} />
        </mesh>
      );
  }
}

/** A lightweight villager-style character used for several NPC roles. */
function SimpleNpc({ skin, shirt, pants, hat }: { skin: string; shirt: string; pants: string; hat: string }) {
  return (
    <group>
      <mesh position={[-0.13, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.56, 0.2]} />
        <meshStandardMaterial color={pants} roughness={0.9} />
      </mesh>
      <mesh position={[0.13, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.56, 0.2]} />
        <meshStandardMaterial color={shade(pants, 0.12)} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[0.52, 0.66, 0.3]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[-0.34, 0.86, 0]} castShadow>
        <boxGeometry args={[0.14, 0.58, 0.16]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0.34, 0.86, 0]} castShadow>
        <boxGeometry args={[0.14, 0.58, 0.16]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.26, 14, 12]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[-0.09, 1.45, 0.22]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#12131a" />
      </mesh>
      <mesh position={[0.09, 1.45, 0.22]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#12131a" />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#4b3621" roughness={0.9} />
      </mesh>
      {hat === 'helmet' ? (
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} metalness={0.15} />
        </mesh>
      ) : null}
    </group>
  );
}
