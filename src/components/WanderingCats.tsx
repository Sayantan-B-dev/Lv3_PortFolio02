"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Raycaster,
  Vector2,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import { FURNITURE } from "@/content/layout";
import { MODELS } from "@/content/models";
import { Model } from "./Model";
import { clampToFloor, ROOM_RADIUS } from "./RoomShell";

const CAT_MODEL = MODELS.catBox;
const PET_MODEL = MODELS.limcaCat;
const CAT_HEIGHT = 0.72;
/** Cats hover a little above the floor now that nothing is anchored. */
const HOVER_HEIGHT = 0.16;
const CAT_RADIUS = 0.26;
const PLAYER_RADIUS = 0.36;
const PET_RANGE = 1.9;
const PET_SECONDS = 2.16;
/** A cat that just changed back stays itself this long before changing again. */
const PET_COOLDOWN_MS = 2000;
/** Halfway up the cat, the point the look test aims at. */
const PET_CENTER_Y = HOVER_HEIGHT + CAT_HEIGHT / 2;
/** Looking counts as looking at the cat inside this radius of the crosshair. */
const BODY_RADIUS = 0.34;
const MAX_SPEED = 0.62;
// Looking around is a drag; only a still tap pets the cat.
const TAP_TOLERANCE = 6;
const STEER = 1.45;
const DRAG = 1.6;
const CAT_MARGIN = CAT_RADIUS + 0.45;

const RAW_SPOTS: readonly (readonly [number, number])[] = [
  [-3.55, 3.45],
  [-3.9, -0.8],
  [-0.15, 0.15],
  [0.95, -4.55],
  [2.9, 4.3],
  [3.7, 2.6],
  [-1.8, 2.2],
  [1.9, 1.2],
  [-4.1, -3.4],
  [3.0, -2.2],
  [4.15, -4.2],
  [-4.15, 2.1],
  [2.0, -3.7],
  [-1.7, 4.9],
  [3.9, 0.1],
  [2.7, 2.9],
  [-2.4, 0.4],
  [-0.85, -2.55],
  [4.0, 4.9],
];

const CAT_SPOTS: readonly (readonly [number, number])[] = RAW_SPOTS.map(
  ([x, z]) => clampToFloor(x, z, CAT_MARGIN),
);

type CatState = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  targetX: number;
  targetZ: number;
  retargetAt: number;
  speed: number;
  phase: number;
};

function seeded(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function blockedByFurniture(x: number, z: number) {
  for (const box of FURNITURE.home) {
    if (
      Math.abs(x - box.x) < box.width / 2 + CAT_RADIUS + 0.06 &&
      Math.abs(z - box.z) < box.depth / 2 + CAT_RADIUS + 0.06
    ) {
      return true;
    }
  }

  return false;
}

function chooseTarget(cat: CatState) {
  const range = ROOM_RADIUS - CAT_MARGIN;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * range;
    const [x, z] = clampToFloor(
      Math.sin(angle) * radius,
      Math.cos(angle) * radius,
      CAT_MARGIN,
    );

    if (blockedByFurniture(x, z)) continue;
    if (Math.hypot(x - cat.x, z - cat.z) < 1.1) continue;

    cat.targetX = x;
    cat.targetZ = z;
    return;
  }

  cat.targetX = cat.x;
  cat.targetZ = cat.z;
}

function keepCatInRoom(cat: CatState) {
  const [x, z] = clampToFloor(cat.x, cat.z, CAT_MARGIN);
  if (x === cat.x && z === cat.z) return;

  cat.x = x;
  cat.z = z;
  cat.vx *= -0.35;
  cat.vz *= -0.35;
}

function pushOutOfFurniture(cat: CatState) {
  for (const box of FURNITURE.home) {
    const halfWidth = box.width / 2 + CAT_RADIUS;
    const halfDepth = box.depth / 2 + CAT_RADIUS;
    const offsetX = cat.x - box.x;
    const offsetZ = cat.z - box.z;
    if (Math.abs(offsetX) >= halfWidth || Math.abs(offsetZ) >= halfDepth) {
      continue;
    }

    const pushX = halfWidth - Math.abs(offsetX);
    const pushZ = halfDepth - Math.abs(offsetZ);
    if (pushX < pushZ) {
      const side = Math.sign(offsetX || 1);
      cat.x += side * pushX;
      cat.vx = side * Math.abs(cat.vx) * 0.35;
    } else {
      const side = Math.sign(offsetZ || 1);
      cat.z += side * pushZ;
      cat.vz = side * Math.abs(cat.vz) * 0.35;
    }
  }
}

function createCats(): CatState[] {
  const random = seeded(0xc47b07);

  return CAT_SPOTS.map(([x, z]) => ({
    x,
    z,
    vx: 0,
    vz: 0,
    targetX: x,
    targetZ: z,
    retargetAt: random() * 2,
    speed: 0.38 + random() * 0.26,
    phase: random() * Math.PI * 2,
  }));
}

type WanderingCatsProps = {
  onPet?: () => void;
};

export function WanderingCats({ onPet }: WanderingCatsProps) {
  const camera = useThree((state) => state.camera);
  const groups = useRef<Array<Group | null>>([]);
  const cats = useRef(createCats());
  /** Cats showing the animated model. Several may be changed at once. */
  const pets = useRef(new Set<number>());
  /** Cats that just changed back and are waiting out their cooldown. */
  const cooling = useRef(new Set<number>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const nearestRef = useRef<number | null>(null);
  const raycaster = useRef(new Raycaster());
  const screenCenter = useRef(new Vector2(0, 0));
  const forward = useRef(new Vector3());
  const [pettingIds, setPettingIds] = useState<readonly number[]>([]);
  const [nearestIndex, setNearestIndex] = useState<number | null>(null);
  const [coarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    // The same Set instance lives for the whole mount, so a timer started
    // after this effect ran is still reachable from the cleanup.
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const startPet = useCallback(
    (index: number) => {
      if (pets.current.has(index) || cooling.current.has(index)) return;

      pets.current.add(index);
      setPettingIds([...pets.current]);
      setNearestIndex(null);
      nearestRef.current = null;
      onPet?.();

      const end = setTimeout(() => {
        timers.current.delete(end);
        pets.current.delete(index);
        setPettingIds([...pets.current]);
        cooling.current.add(index);

        // The cooldown only starts once the cat is itself again, so a cat can
        // never be rushed straight back into the animated form.
        const ready = setTimeout(() => {
          timers.current.delete(ready);
          cooling.current.delete(index);
        }, PET_COOLDOWN_MS);
        timers.current.add(ready);
      }, PET_SECONDS * 1000);
      timers.current.add(end);
    },
    [onPet],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;

      const clickable = groups.current.filter(
        (group): group is Group => group !== null,
      );
      if (clickable.length === 0) return;

      // Raycast the crosshair against the cat meshes. The visible body is the
      // hit target, so a click cannot miss because of a tight aim cone.
      raycaster.current.setFromCamera(screenCenter.current, camera);
      const hits = raycaster.current.intersectObjects(clickable, true);

      for (const hit of hits) {
        if (hit.distance > PET_RANGE) continue;

        const index = groups.current.findIndex((group) => {
          if (!group) return false;
          let node: Object3D | null = hit.object;
          while (node) {
            if (node === group) return true;
            node = node.parent;
          }
          return false;
        });

        if (index < 0) continue;

        // The crosshair is the cursor while locked; handle the pet before the
        // door or note click handlers see the same click.
        event.preventDefault();
        event.stopImmediatePropagation();
        startPet(index);
        return;
      }
    };

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [camera, startPet]);

  useFrame(({ camera, clock }, delta) => {
    const step = Math.min(delta, 0.05);
    const time = clock.elapsedTime;
    const list = cats.current;
    for (let index = 0; index < list.length; index += 1) {
      const cat = list[index];

      if (!pets.current.has(index)) {
        const reached =
          Math.hypot(cat.targetX - cat.x, cat.targetZ - cat.z) < 0.28;
        if (time > cat.retargetAt || reached) {
          chooseTarget(cat);
          cat.retargetAt = time + 2.4 + Math.random() * 3.6;
        }

        const dx = cat.targetX - cat.x;
        const dz = cat.targetZ - cat.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0.001) {
          const pull = STEER * cat.speed * step;
          cat.vx += (dx / distance) * pull;
          cat.vz += (dz / distance) * pull;
        }

        const damping = Math.exp(-DRAG * step);
        cat.vx *= damping;
        cat.vz *= damping;

        const speed = Math.hypot(cat.vx, cat.vz);
        if (speed > MAX_SPEED) {
          cat.vx = (cat.vx / speed) * MAX_SPEED;
          cat.vz = (cat.vz / speed) * MAX_SPEED;
        }

        cat.x += cat.vx * step;
        cat.z += cat.vz * step;

        const awayX = cat.x - camera.position.x;
        const awayZ = cat.z - camera.position.z;
        const away = Math.hypot(awayX, awayZ);
        const clearance = CAT_RADIUS + PLAYER_RADIUS + 0.08;
        if (away < clearance) {
          const nx = away > 0.001 ? awayX / away : 1;
          const nz = away > 0.001 ? awayZ / away : 0;
          cat.x = camera.position.x + nx * clearance;
          cat.z = camera.position.z + nz * clearance;
          cat.vx = nx * 0.32;
          cat.vz = nz * 0.32;
        }

        pushOutOfFurniture(cat);
        keepCatInRoom(cat);
      } else {
        cat.vx = 0;
        cat.vz = 0;
      }

    }

    for (let pass = 0; pass < 2; pass += 1) {
      for (let a = 0; a < list.length; a += 1) {
        for (let b = a + 1; b < list.length; b += 1) {
          const first = list[a];
          const second = list[b];
          const dx = second.x - first.x;
          const dz = second.z - first.z;
          const minDistance = CAT_RADIUS * 2;
          const distanceSq = dx * dx + dz * dz;

          if (distanceSq >= minDistance * minDistance) continue;

          const distance = Math.sqrt(distanceSq) || 0.001;
          const nx = distanceSq > 0 ? dx / distance : 1;
          const nz = distanceSq > 0 ? dz / distance : 0;
          const overlap = (minDistance - distance) / 2;

          first.x -= nx * overlap;
          first.z -= nz * overlap;
          second.x += nx * overlap;
          second.z += nz * overlap;
        }
      }
    }

    for (const cat of list) {
      pushOutOfFurniture(cat);
      keepCatInRoom(cat);
    }

    let nearest: number | null = null;
    let nearestDistance = PET_RANGE;

    for (let index = 0; index < list.length; index += 1) {
      const cat = list[index];
      const group = groups.current[index];
      const petted = pets.current.has(index);
      const bob = petted ? 0 : Math.sin(time * 2.1 + cat.phase) * 0.012;

      if (group) {
        group.position.set(cat.x, HOVER_HEIGHT + bob, cat.z);

        if (petted || Math.hypot(cat.vx, cat.vz) > 0.035) {
          const targetYaw = petted
            ? Math.atan2(
                camera.position.x - cat.x,
                camera.position.z - cat.z,
              )
            : Math.atan2(cat.vx, cat.vz);
          const turn = Math.atan2(
            Math.sin(targetYaw - group.rotation.y),
            Math.cos(targetYaw - group.rotation.y),
          );
          group.rotation.y += turn * Math.min(1, step * (petted ? 10 : 7));
        }
      }

      const distanceToPlayer = Math.hypot(
        cat.x - camera.position.x,
        cat.z - camera.position.z,
      );
      if (!pets.current.has(index) && distanceToPlayer < nearestDistance) {
        nearestDistance = distanceToPlayer;
        nearest = index;
      }
    }

    if (nearest !== nearestRef.current) {
      nearestRef.current = nearest;
      setNearestIndex(nearest);
    }

    // A phone has no cursor to aim with, so a cat that the crosshair sits on
    // changes on its own. Every cat is judged separately, and the per-cat
    // cooldown keeps a wandering cat from changing over and over.
    if (!coarsePointer) return;

    camera.getWorldDirection(forward.current);
    for (let index = 0; index < list.length; index += 1) {
      if (pets.current.has(index) || cooling.current.has(index)) continue;

      const cat = list[index];
      const dx = cat.x - camera.position.x;
      const dy = PET_CENTER_Y - camera.position.y;
      const dz = cat.z - camera.position.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > PET_RANGE) continue;

      const depth =
        dx * forward.current.x +
        dy * forward.current.y +
        dz * forward.current.z;
      if (depth <= 0) continue;

      const lateralSq = distance * distance - depth * depth;
      if (lateralSq > BODY_RADIUS * BODY_RADIUS) continue;

      startPet(index);
    }
  });

  return (
    <>
      {CAT_SPOTS.map((_, index) => (
        <group
          key={`cat-${index}`}
          ref={(node) => {
            groups.current[index] = node;
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta > TAP_TOLERANCE) return;
            if (!coarsePointer) return;
            if (nearestRef.current !== index) return;
            startPet(index);
          }}
        >
          <Model
            url={pettingIds.includes(index) ? PET_MODEL : CAT_MODEL}
            size={CAT_HEIGHT}
            animate={pettingIds.includes(index)}
            shadows={false}
          />

          {/* Looking at a cat is what changes it on touch, so the cue is only
              for the pointer that has to click. */}
          {!coarsePointer &&
          nearestIndex === index &&
          !pettingIds.includes(index) ? (
            <Html
              position={[0, CAT_HEIGHT + 0.2, 0]}
              center
              zIndexRange={[10, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div className="glass-chip whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tracking-wide text-[#f6ebdd]">
                Click the cat to pet
              </div>
            </Html>
          ) : null}
        </group>
      ))}
    </>
  );
}
