import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarConfig, Catalog, Palette, Station, Settings } from '../lib/types';
import { Avatar3D } from './Avatar3D';
import { Scenery, useSceneryLayout } from './Props';
import { Station3D } from './Station3D';
import { Collectibles } from './Collectibles';
import { input, addLook } from './controls';
import { audio } from '../lib/audio';

const WORLD_RADIUS = 86;
const WALK_SPEED = 5.4;
const RUN_SPEED = 8.6;

export interface WorldProps {
  worldId: string;
  palette: Palette;
  ambience: string;
  props: { kind: string; count: number; spread: number }[];
  stations: Station[];
  activeStationId: string;
  doneStationIds: string[];
  avatar: AvatarConfig;
  catalog: Catalog;
  settings: Settings;
  paused: boolean;
  gems: [number, number][];
  claimedGems: Set<number>;
  onCollectGem: (index: number) => void;
  onNearStation: (station: Station | null) => void;
  onPlayerMove?: (x: number, z: number, yaw: number) => void;
}

/**
 * The 3D scene. The camera follows the avatar from behind; the mouse or a
 * touch drag swings it around. Everything is drawn from primitives, so the
 * world streams in instantly with no model downloads.
 */
export function World3D(props: WorldProps) {
  const quality = props.settings.graphicsQuality;
  const dpr: [number, number] =
    quality === 'low' ? [0.6, 1] : quality === 'medium' ? [1, 1.5] : [1, 2];

  return (
    <Canvas
      className="game-canvas"
      shadows={quality === 'high'}
      dpr={dpr}
      camera={{ fov: 62, near: 0.1, far: 240, position: [0, 6, 12] }}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(props.palette.sky);
        scene.background = new THREE.Color(props.palette.sky);
        scene.fog = new THREE.Fog(props.palette.fog, 42, 165);
      }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}

function SceneContents({
  worldId, palette, props: propGroups, stations, activeStationId, doneStationIds,
  avatar, catalog, settings, paused, gems, claimedGems, onCollectGem,
  onNearStation, onPlayerMove,
}: WorldProps) {
  const quality = settings.graphicsQuality;
  const layout = useSceneryLayout(worldId, propGroups, stations, quality);
  const isDark = worldId === 'space' || worldId === 'alien';
  const done = useMemo(() => new Set(doneStationIds), [doneStationIds]);
  const [nearId, setNearId] = useState<string | null>(null);

  return (
    <>
      {/* Lighting: one directional key light plus hemisphere fill keeps the
          draw cost low while still reading as daylight (or starlight). */}
      <hemisphereLight args={[palette.horizon, palette.ground, isDark ? 0.5 : 0.95]} />
      <directionalLight
        position={[28, 46, 18]}
        intensity={isDark ? 0.75 : 1.5}
        color={isDark ? '#b3c7ff' : '#fff6e0'}
        castShadow={quality === 'high'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={130}
      />
      <ambientLight intensity={isDark ? 0.35 : 0.22} />

      {isDark ? <Stars radius={150} depth={60} count={quality === 'low' ? 900 : 2600} factor={4} fade speed={0.4} /> : null}

      <Ground palette={palette} />

      <Scenery layout={layout} palette={palette} />

      {stations.map((s) => (
        <Station3D
          key={s.id}
          station={s}
          palette={palette}
          active={s.id === activeStationId}
          done={done.has(s.id)}
          nearby={nearId === s.id}
        />
      ))}

      <Collectibles positions={gems} claimed={claimedGems} palette={palette} />

      <Player
        avatar={avatar}
        catalog={catalog}
        settings={settings}
        stations={stations}
        paused={paused}
        gems={gems}
        claimedGems={claimedGems}
        onCollectGem={onCollectGem}
        onNear={(s) => {
          setNearId(s ? s.id : null);
          onNearStation(s);
        }}
        onMove={onPlayerMove}
      />
    </>
  );
}

function Ground({ palette }: { palette: Palette }) {
  // A ring of alternating tiles gives the ground a sense of scale without a texture.
  const tiles = useMemo(() => {
    const out: { x: number; z: number; alt: boolean }[] = [];
    const step = 12;
    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x += step) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z += step) {
        if (Math.hypot(x, z) > WORLD_RADIUS) continue;
        out.push({ x, z, alt: (Math.round(x / step) + Math.round(z / step)) % 2 === 0 });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS + 14, 56]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>
      {tiles.filter((t) => t.alt).map((t, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[t.x, 0, t.z]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={palette.groundAlt} roughness={1} />
        </mesh>
      ))}
      {/* A soft central plaza marks the spawn point. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[8, 34]} />
        <meshStandardMaterial color={palette.path} roughness={0.95} />
      </mesh>
      {/* A low wall at the edge so students understand the boundary. */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[WORLD_RADIUS + 1, WORLD_RADIUS + 1, 2.4, 64, 1, true]} />
        <meshStandardMaterial
          color={palette.structureAlt} side={THREE.BackSide}
          transparent opacity={0.34} roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Player({
  avatar, catalog, settings, stations, paused, gems, claimedGems, onCollectGem, onNear, onMove,
}: {
  avatar: AvatarConfig;
  catalog: Catalog;
  settings: Settings;
  stations: Station[];
  paused: boolean;
  gems: [number, number][];
  claimedGems: Set<number>;
  onCollectGem: (index: number) => void;
  onNear: (s: Station | null) => void;
  onMove?: (x: number, z: number, yaw: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 0, 6));
  const yaw = useRef(0);
  const facing = useRef(0);
  const pitch = useRef(0.33);
  const currentNear = useRef<string | null>(null);
  // Guards against firing the same pickup repeatedly while the request is in flight.
  const pickedThisSession = useRef<Set<number>>(new Set());
  const stepTimer = useRef(0);
  const [moving, setMoving] = useState(false);
  const speedRef = useRef(0);

  useFrame((_, rawDelta) => {
    // Clamp the frame delta so a stall cannot teleport the player through a
    // collision, but keep the cap well below the frame time of slow hardware:
    // at 0.05 a laptop running at 15fps would walk at half speed. At 0.12 the
    // avatar keeps full speed down to ~8fps, and a single step is still only
    // 0.65 units, far short of the 1.35 collision radius.
    const delta = Math.min(rawDelta, 0.12);

    // Camera orbit from mouse or touch drag.
    const sens = settings.cameraSensitivity || 1;
    yaw.current -= input.yawDelta * 0.0032 * sens;
    pitch.current += (settings.invertY ? -1 : 1) * input.pitchDelta * 0.0022 * sens;
    pitch.current = THREE.MathUtils.clamp(pitch.current, 0.06, 1.05);
    input.yawDelta = 0;
    input.pitchDelta = 0;

    let isMoving = false;
    let speed = 0;

    if (!paused) {
      const fwd = input.forward;
      const str = input.strafe;
      const mag = Math.min(1, Math.hypot(fwd, str));
      if (mag > 0.06) {
        isMoving = true;
        speed = (input.running ? RUN_SPEED : WALK_SPEED) * mag;

        // Move relative to where the camera is looking.
        const sin = Math.sin(yaw.current);
        const cos = Math.cos(yaw.current);
        const dirX = (str * cos - fwd * sin);
        const dirZ = (-str * sin - fwd * cos);
        const len = Math.hypot(dirX, dirZ) || 1;
        const nx = dirX / len;
        const nz = dirZ / len;

        const nextX = pos.current.x + nx * speed * delta;
        const nextZ = pos.current.z + nz * speed * delta;

        // Stay inside the world and do not walk through stations.
        let blocked = false;
        for (const s of stations) {
          if (Math.hypot(nextX - s.pos[0], nextZ - s.pos[1]) < 1.35) { blocked = true; break; }
        }
        if (!blocked && Math.hypot(nextX, nextZ) < WORLD_RADIUS - 2) {
          pos.current.x = nextX;
          pos.current.z = nextZ;
        }
        facing.current = Math.atan2(nx, nz);

        stepTimer.current += delta;
        const interval = input.running ? 0.28 : 0.42;
        if (stepTimer.current > interval) {
          stepTimer.current = 0;
          audio.footstep();
        }
      }
    }

    speedRef.current = speed;
    if (isMoving !== moving) setMoving(isMoving);

    if (group.current) {
      group.current.position.set(pos.current.x, 0, pos.current.z);
      // Turn smoothly towards the direction of travel.
      const cur = group.current.rotation.y;
      let diff = facing.current - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.current.rotation.y = cur + diff * Math.min(1, delta * 12);
    }

    // Third-person camera.
    const dist = 8.4;
    const height = 3.1 + Math.sin(pitch.current) * 6.2;
    const camX = pos.current.x + Math.sin(yaw.current) * dist * Math.cos(pitch.current);
    const camZ = pos.current.z + Math.cos(yaw.current) * dist * Math.cos(pitch.current);
    camera.position.lerp(new THREE.Vector3(camX, height, camZ), Math.min(1, delta * 9));
    camera.lookAt(pos.current.x, 1.4, pos.current.z);

    // Which station is close enough to interact with?
    let nearest: Station | null = null;
    let nearestDist = Infinity;
    for (const s of stations) {
      const d = Math.hypot(pos.current.x - s.pos[0], pos.current.z - s.pos[1]);
      if (d < 4.6 && d < nearestDist) {
        nearest = s;
        nearestDist = d;
      }
    }
    const nearId = nearest ? nearest.id : null;
    if (nearId !== currentNear.current) {
      currentNear.current = nearId;
      onNear(nearest);
    }

    // Walking over a gem picks it up.
    for (let i = 0; i < gems.length; i++) {
      if (claimedGems.has(i) || pickedThisSession.current.has(i)) continue;
      // A generous radius: finding a gem should feel like a reward for
      // exploring, not like threading a needle.
      if (Math.hypot(pos.current.x - gems[i][0], pos.current.z - gems[i][1]) < 2.8) {
        pickedThisSession.current.add(i);
        onCollectGem(i);
      }
    }

    onMove?.(pos.current.x, pos.current.z, yaw.current);
  });

  return (
    <group ref={group} position={[0, 0, 6]}>
      <Avatar3D
        avatar={avatar}
        catalog={catalog}
        moving={moving}
        speed={speedRef.current}
        castShadow={settings.graphicsQuality === 'high'}
      />
    </group>
  );
}

/**
 * Turns pointer drags anywhere on the canvas into camera rotation. Lives
 * outside the Canvas so it can sit under the HUD without stealing its clicks.
 */
export function useCameraDrag(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId: number | null = null;

    const down = (e: PointerEvent) => {
      // Ignore drags that start on HUD buttons.
      const target = e.target as HTMLElement;
      if (target.closest('button, input, .joystick, .dialogue, .hud-panel')) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      addLook(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointerId) {
        dragging = false;
        pointerId = null;
      }
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [ref]);
}
