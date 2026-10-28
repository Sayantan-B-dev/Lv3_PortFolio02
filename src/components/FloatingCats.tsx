"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  Vector3,
  type BufferAttribute,
  type Group,
  type Points,
  type PointsMaterial,
} from "three";
import { MODELS } from "@/content/models";
import { ROOM_RADIUS } from "./RoomShell";
import { Model } from "./Model";

const CAT_MODEL = MODELS.cat;
const CAT_HEIGHT = 1.4;

/** Raise or lower this single value to change the look-at spin speed. */
export const CAT_SPIN_RPM = 480;
const SPIN_DECAY = 5.5;
const LOOK_RANGE = 10;
/** A small sphere around the torso, not the whole space around the cat. */
const BODY_RADIUS = 0.36;
const WANDER_RADIUS = ROOM_RADIUS - 1.1;
const WANDER_Y_MIN = 1.7;
const WANDER_Y_MAX = 3.15;
const CAT_COUNT = 5;
const SPARKLE_COUNT = 18;
const SPARKLE_LIFE = 0.7;
const SPARKLE_SIZE = 0.045;

type CatSpot = {
  position: readonly [number, number, number];
  yaw: number;
  phase: number;
  freqX: number;
  freqY: number;
  freqZ: number;
  pitch: number;
  roll: number;
};

/** Hover points with room between them; each one drifts on its own axes. */
const CAT_SPOTS: readonly CatSpot[] = [
  {
    position: [-3.4, 2.25, -2.4],
    yaw: 0.8,
    phase: 0.3,
    freqX: 0.31,
    freqY: 0.24,
    freqZ: 0.27,
    pitch: 0.11,
    roll: 0.13,
  },
  {
    position: [2.55, 2.8, -3.25],
    yaw: -0.4,
    phase: 1.9,
    freqX: 0.25,
    freqY: 0.35,
    freqZ: 0.22,
    pitch: 0.08,
    roll: 0.16,
  },
  {
    position: [-3.65, 1.85, 2.35],
    yaw: 1.5,
    phase: 3.4,
    freqX: 0.23,
    freqY: 0.29,
    freqZ: 0.33,
    pitch: 0.13,
    roll: 0.09,
  },
  {
    position: [3.25, 2.15, 2.15],
    yaw: -1.2,
    phase: 4.8,
    freqX: 0.34,
    freqY: 0.21,
    freqZ: 0.25,
    pitch: 0.07,
    roll: 0.14,
  },
  {
    position: [0.35, 3.0, -0.65],
    yaw: 0.2,
    phase: 5.7,
    freqX: 0.22,
    freqY: 0.26,
    freqZ: 0.3,
    pitch: 0.1,
    roll: 0.12,
  },
  {
    position: [-0.9, 2.55, 3.75],
    yaw: 2.1,
    phase: 0.8,
    freqX: 0.28,
    freqY: 0.22,
    freqZ: 0.31,
    pitch: 0.09,
    roll: 0.11,
  },
  {
    position: [1.6, 2.05, 4.4],
    yaw: -0.9,
    phase: 2.7,
    freqX: 0.26,
    freqY: 0.3,
    freqZ: 0.21,
    pitch: 0.12,
    roll: 0.08,
  },
  {
    position: [4.0, 2.35, -1.15],
    yaw: 1.0,
    phase: 4.1,
    freqX: 0.3,
    freqY: 0.25,
    freqZ: 0.28,
    pitch: 0.06,
    roll: 0.15,
  },
  {
    position: [-2.2, 2.9, 0.9],
    yaw: -1.8,
    phase: 1.4,
    freqX: 0.27,
    freqY: 0.31,
    freqZ: 0.24,
    pitch: 0.11,
    roll: 0.1,
  },
  {
    position: [0.9, 1.9, 1.9],
    yaw: 0.7,
    phase: 3.2,
    freqX: 0.32,
    freqY: 0.23,
    freqZ: 0.26,
    pitch: 0.08,
    roll: 0.13,
  },
  {
    position: [-3.2, 2.7, 4.6],
    yaw: 2.5,
    phase: 5.1,
    freqX: 0.24,
    freqY: 0.28,
    freqZ: 0.3,
    pitch: 0.12,
    roll: 0.07,
  },
  {
    position: [3.6, 1.85, 0.7],
    yaw: -0.6,
    phase: 0.5,
    freqX: 0.29,
    freqY: 0.22,
    freqZ: 0.27,
    pitch: 0.09,
    roll: 0.14,
  },
  {
    position: [-1.2, 2.2, -3.5],
    yaw: 1.6,
    phase: 2.3,
    freqX: 0.25,
    freqY: 0.33,
    freqZ: 0.23,
    pitch: 0.1,
    roll: 0.12,
  },
];

type Wanderer = {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  retargetAt: number;
};

function createWanderers(): Wanderer[] {
  return CAT_SPOTS.slice(0, CAT_COUNT).map((spot) => ({
    x: spot.position[0],
    y: spot.position[1],
    z: spot.position[2],
    targetX: spot.position[0],
    targetY: spot.position[1],
    targetZ: spot.position[2],
    retargetAt: Math.random() * 1.2,
  }));
}

function chooseWanderTarget(wanderer: Wanderer, spot: CatSpot) {
  const [baseX, baseY, baseZ] = spot.position;

  let targetX = baseX + (Math.random() - 0.5) * 3.2;
  let targetZ = baseZ + (Math.random() - 0.5) * 3.2;
  const radius = Math.hypot(targetX, targetZ);
  if (radius > WANDER_RADIUS) {
    targetX *= WANDER_RADIUS / radius;
    targetZ *= WANDER_RADIUS / radius;
  }

  wanderer.targetX = targetX;
  wanderer.targetY = Math.min(
    WANDER_Y_MAX,
    Math.max(WANDER_Y_MIN, baseY + (Math.random() - 0.5) * 2),
  );
  wanderer.targetZ = targetZ;
}

type CatSparklesProps = {
  index: number;
  speeds: { current: number[] };
};

function CatSparkles({ index, speeds }: CatSparklesProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const emitCarry = useRef(0);
  const state = useRef({
    lives: new Float32Array(SPARKLE_COUNT),
    velocities: new Float32Array(SPARKLE_COUNT * 3),
  });
  const positions = useMemo(
    () => new Float32Array(SPARKLE_COUNT * 3),
    [],
  );
  const colors = useMemo(() => new Float32Array(SPARKLE_COUNT * 3), []);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    result.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return result;
  }, [colors, positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const { lives, velocities } = state.current;
    const positionAttribute = geometry.getAttribute(
      "position",
    ) as BufferAttribute;
    const colorAttribute = geometry.getAttribute("color") as BufferAttribute;
    const livePositions = positionAttribute.array as Float32Array;
    const liveColors = colorAttribute.array as Float32Array;
    const step = Math.min(delta, 0.05);
    const spinTarget = CAT_SPIN_RPM * ((Math.PI * 2) / 60);
    const intensity = Math.min(
      1,
      Math.abs(speeds.current[index] ?? 0) / spinTarget,
    );

    emitCarry.current += step * 62 * intensity;
    let emitting = Math.floor(emitCarry.current);
    emitCarry.current -= emitting;

    while (emitting > 0) {
      let slot = -1;
      for (let candidate = 0; candidate < SPARKLE_COUNT; candidate += 1) {
        if (lives[candidate] <= 0) {
          slot = candidate;
          break;
        }
      }
      if (slot < 0) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.12 + Math.random() * 0.24;
      const offset = slot * 3;
      livePositions[offset] = Math.cos(angle) * radius;
      livePositions[offset + 1] = -0.12 + Math.random() * 0.5;
      livePositions[offset + 2] = Math.sin(angle) * radius;
      velocities[offset] = Math.cos(angle) * (0.55 + Math.random() * 0.7);
      velocities[offset + 1] = 0.35 + Math.random() * 0.9;
      velocities[offset + 2] = Math.sin(angle) * (0.55 + Math.random() * 0.7);
      lives[slot] = SPARKLE_LIFE * (0.65 + Math.random() * 0.35);
      emitting -= 1;
    }

    for (let sparkle = 0; sparkle < SPARKLE_COUNT; sparkle += 1) {
      const offset = sparkle * 3;
      if (lives[sparkle] > 0) {
        lives[sparkle] -= step;
        livePositions[offset] += velocities[offset] * step;
        livePositions[offset + 1] += velocities[offset + 1] * step;
        livePositions[offset + 2] += velocities[offset + 2] * step;
        velocities[offset] *= Math.exp(-1.5 * step);
        velocities[offset + 1] -= 0.5 * step;
        velocities[offset + 2] *= Math.exp(-1.5 * step);
      }

      const life = Math.max(0, lives[sparkle] / SPARKLE_LIFE);
      liveColors[offset] = 1 * life;
      liveColors[offset + 1] = 0.86 * life;
      liveColors[offset + 2] = 0.98 * life;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    if (materialRef.current) {
      materialRef.current.size =
        SPARKLE_SIZE * (0.85 + intensity * 0.3);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        vertexColors
        size={SPARKLE_SIZE}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

type FloatingCatsProps = {
  paused?: boolean;
  onLookChange?: (active: boolean) => void;
};

export function FloatingCats({
  paused = false,
  onLookChange,
}: FloatingCatsProps) {
  const groups = useRef<Array<Group | null>>([]);
  const spinners = useRef<Array<Group | null>>([]);
  const angles = useRef(CAT_SPOTS.slice(0, CAT_COUNT).map(() => 0));
  const speeds = useRef(CAT_SPOTS.slice(0, CAT_COUNT).map(() => 0));
  const wanderers = useRef(createWanderers());
  const reducedMotion = useRef(false);
  const pausedRef = useRef(paused);
  const lookingRef = useRef(false);
  const lookChangeRef = useRef(onLookChange);
  const forward = useRef(new Vector3());

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    lookChangeRef.current = onLookChange;
  }, [onLookChange]);

  useEffect(() => {
    return () => lookChangeRef.current?.(false);
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const step = Math.min(delta, 0.05);
    const time = clock.elapsedTime;
    const spinRpm = reducedMotion.current ? CAT_SPIN_RPM * 0.45 : CAT_SPIN_RPM;
    const spinTarget = spinRpm * ((Math.PI * 2) / 60);
    camera.getWorldDirection(forward.current);
    let anyLooking = false;

    for (let index = 0; index < CAT_COUNT; index += 1) {
      const group = groups.current[index];
      const spinner = spinners.current[index];
      if (!group) continue;

      const spot = CAT_SPOTS[index];
      const wanderer = wanderers.current[index];
      const motion = reducedMotion.current ? 0.35 : 1;

      if (time > wanderer.retargetAt) {
        chooseWanderTarget(wanderer, spot);
        wanderer.retargetAt =
          time + (1.4 + Math.random() * 2) / motion;
      }

      const ease = 1 - Math.exp(-1.05 * motion * step);
      wanderer.x += (wanderer.targetX - wanderer.x) * ease;
      wanderer.y += (wanderer.targetY - wanderer.y) * ease;
      wanderer.z += (wanderer.targetZ - wanderer.z) * ease;

      const x =
        wanderer.x + motion * Math.sin(time * spot.freqX + spot.phase) * 0.12;
      const y =
        wanderer.y +
        motion * Math.cos(time * spot.freqY + spot.phase * 1.3) * 0.1;
      const z =
        wanderer.z +
        motion * Math.cos(time * spot.freqZ + spot.phase * 0.8) * 0.12;

      group.position.set(x, y, z);

      const dx = x - camera.position.x;
      const dy = y - camera.position.y;
      const dz = z - camera.position.z;
      const distance = Math.hypot(dx, dy, dz);
      const depth =
        dx * forward.current.x +
        dy * forward.current.y +
        dz * forward.current.z;
      const lateralSq = dx * dx + dy * dy + dz * dz - depth * depth;
      const lookedAt =
        !pausedRef.current &&
        distance < LOOK_RANGE &&
        depth > 0 &&
        lateralSq <= BODY_RADIUS * BODY_RADIUS;
      if (lookedAt) anyLooking = true;

      if (lookedAt) {
        speeds.current[index] = spinTarget;
      } else {
        speeds.current[index] = MathUtils.damp(
          speeds.current[index],
          0,
          SPIN_DECAY,
          step,
        );
      }
      angles.current[index] += speeds.current[index] * step;

      if (spinner) {
        const slowYaw =
          motion * Math.sin(time * 0.16 + spot.phase * 1.9) * 0.7;
        spinner.rotation.y = spot.yaw + slowYaw + angles.current[index];
        spinner.rotation.x =
          motion *
          (Math.sin(time * 0.22 + spot.phase) * spot.pitch +
            Math.sin(time * 0.07 + spot.phase * 2.4) * spot.pitch * 0.35);
        spinner.rotation.z =
          motion *
          (Math.cos(time * 0.18 + spot.phase * 1.4) * spot.roll +
            Math.sin(time * 0.09 + spot.phase) * spot.roll * 0.3);
      }
    }

    if (anyLooking !== lookingRef.current) {
      lookingRef.current = anyLooking;
      lookChangeRef.current?.(anyLooking);
    }
  });

  return (
    <>
      {CAT_SPOTS.slice(0, CAT_COUNT).map((spot, index) => (
        <group
          key={`${spot.position[0]}:${spot.position[2]}`}
          ref={(node) => {
            groups.current[index] = node;
          }}
          position={spot.position}
        >
          <group
            ref={(node) => {
              spinners.current[index] = node;
            }}
          >
            <Model
              url={CAT_MODEL}
              size={CAT_HEIGHT}
              position={[0, -CAT_HEIGHT / 2, 0]}
              outline="#d8b6ff"
              shadows={false}
            />
          </group>
          <CatSparkles index={index} speeds={speeds} />
        </group>
      ))}
    </>
  );
}
