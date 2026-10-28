"use client";

import { PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Euler,
  Vector3,
  type PerspectiveCamera as ThreePerspectiveCamera,
} from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { doorCenter } from "@/components/Door";
import { clampToFloor, ROOM_SPAWN } from "@/components/RoomShell";
import type { DoorSpec, RoomId } from "@/content/rooms";
import { FURNITURE } from "@/content/layout";
import { getCircleColliders } from "@/scene/colliders";
import {
  ensurePushable,
  pushPushable,
  resetPushables,
  stepPushables,
} from "@/scene/pushables";

const PLAYER_HEIGHT = ROOM_SPAWN[1];
const SPRINT_MULTIPLIER = 1.7;
/** Radians per second at full right-stick deflection. */
const LOOK_STICK_SPEED = 2.4;
const PLAYER_RADIUS = 0.35;
const DOOR_RANGE = 3.6;
const AIM_THRESHOLD = 0.55;
// Apex clears the low tables (~0.9 m) so they can be landed on.
const JUMP_VELOCITY = 6.2;
/** Heavier gravity keeps the drop from floating; the jump arc stays short. */
const GRAVITY = 20;
/** Chrome silently ignores lock requests for ~1s after Esc released the pointer. */
const LOCK_COOLDOWN_MS = 1300;

/** The camera angles the profile avatar mirrors. */
export type CameraLook = {
  yaw: number;
  pitch: number;
};

/** Module scratch for the right stick, so the render loop never owns state. */
const lookEuler = new Euler(0, 0, 0, "YXZ");

const MOVE_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);

type PlayerControlsProps = {
  roomId: RoomId;
  doors: readonly DoorSpec[];
  onEnter: (door: DoorSpec) => void;
  onFocusChange: (doorId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  sensitivity: number;
  moveSpeed: number;
  recentreKey: number;
  paused: boolean;
  fov: number;
  onWalkChange?: (walking: boolean) => void;
  /** True while the walker is shoving a piece of furniture. */
  onPushChange?: (pushing: boolean) => void;
  cameraLookRef: { current: CameraLook };
  /**
   * Filled with the guarded lock request so the overlays can use it. `force`
   * skips the post-Esc cooldown for requests made from a fresh click, such as
   * closing a note or the menu.
   */
  lockRequestRef: { current: ((force?: boolean) => void) | null };
  /** The left joystick: x strafes right, z walks forward. */
  moveInputRef: { current: { x: number; z: number } };
  /** The right joystick: x turns right, z looks up. */
  lookInputRef: { current: { x: number; z: number } };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PlayerControls({
  roomId,
  doors,
  onEnter,
  onFocusChange,
  onLockChange,
  sensitivity,
  moveSpeed,
  recentreKey,
  paused,
  fov,
  onWalkChange,
  onPushChange,
  cameraLookRef,
  lockRequestRef,
  moveInputRef,
  lookInputRef,
}: PlayerControlsProps) {
  const gl = useThree((state) => state.gl);
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const focusedDoorRef = useRef<DoorSpec | null>(null);
  const pausedRef = useRef(paused);
  const verticalVelocity = useRef(0);
  const airborne = useRef(false);
  const controlsRef = useRef<PointerLockControlsImpl>(null);
  const lastUnlockAt = useRef(0);
  const walkingRef = useRef(false);
  const walkChangeRef = useRef(onWalkChange);
  const pushingRef = useRef(false);
  const pushChangeRef = useRef(onPushChange);

  const supportsPointerLock = useMemo(
    () =>
      typeof document !== "undefined" &&
      "pointerLockElement" in document &&
      window.matchMedia("(pointer: fine)").matches,
    [],
  );

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) return;
    keysRef.current = {};
    if (!walkingRef.current) return;
    walkingRef.current = false;
    walkChangeRef.current?.(false);
  }, [paused]);

  useEffect(() => {
    walkChangeRef.current = onWalkChange;
  }, [onWalkChange]);

  useEffect(() => {
    pushChangeRef.current = onPushChange;
  }, [onPushChange]);

  useEffect(() => {
    return () => {
      if (!walkingRef.current) return;
      walkingRef.current = false;
      walkChangeRef.current?.(false);
    };
  }, []);

  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const move = useMemo(() => new Vector3(), []);
  const lookDirection = useMemo(() => new Vector3(), []);
  const toDoor = useMemo(() => new Vector3(), []);
  const euler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);

  const handleLock = useCallback(() => onLockChange(true), [onLockChange]);
  const handleUnlock = useCallback(() => {
    lastUnlockAt.current = Date.now();
    onLockChange(false);
  }, [onLockChange]);

  // A single guarded path: asking for the pointer while another request is in
  // flight, or during the browser's post-Esc cooldown, only logs a pointer
  // lock error and leaves the visitor without mouse look.
  const requestLock = useCallback((force = false) => {
    const controls = controlsRef.current;
    if (!supportsPointerLock || !controls || document.pointerLockElement) return;
    if (!force && Date.now() - lastUnlockAt.current < LOCK_COOLDOWN_MS) return;

    // Lock the element the controls listen on, so their lock/unlock events fire.
    const element = controls.domElement;
    if (!element) return;

    try {
      const request: unknown = element.requestPointerLock();
      if (request instanceof Promise) request.catch(() => {});
    } catch {
      // Pointer lock needs a user gesture; the next click tries again.
    }
  }, [supportsPointerLock]);

  useEffect(() => {
    lockRequestRef.current = requestLock;
    return () => {
      lockRequestRef.current = null;
    };
  }, [lockRequestRef, requestLock]);

  const tryEnter = useCallback(() => {
    const door = focusedDoorRef.current;
    if (door) onEnter(door);
  }, [onEnter]);

  // One string key keeps the dependency array a constant size, so hot reloads
  // and room changes never change the hook signature.
  const resetKey = `${roomId}:${recentreKey}`;

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    camera.position.set(...ROOM_SPAWN);
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();

    verticalVelocity.current = 0;
    airborne.current = false;
    cameraLookRef.current.yaw = 0;
    cameraLookRef.current.pitch = 0;
    focusedDoorRef.current = null;
    onFocusChange(null);

    resetPushables();
    if (pushingRef.current) {
      pushingRef.current = false;
      pushChangeRef.current?.(false);
    }
  }, [resetKey, onFocusChange, cameraLookRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (pausedRef.current) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (!airborne.current) {
          verticalVelocity.current = JUMP_VELOCITY;
          airborne.current = true;
        }
        return;
      }

      if (event.code === "KeyE" && focusedDoorRef.current) {
        event.preventDefault();
        tryEnter();
        return;
      }

      if (MOVE_CODES.has(event.code)) {
        event.preventDefault();
        keysRef.current[event.code] = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (MOVE_CODES.has(event.code)) {
        keysRef.current[event.code] = false;
      }
    };

    const clearKeys = () => {
      keysRef.current = {};
      if (!walkingRef.current) return;
      walkingRef.current = false;
      walkChangeRef.current?.(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [tryEnter]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (pausedRef.current) return;

      // While the pointer is locked, clicks land on the R3F event container,
      // which is an ancestor of the canvas; HUD clicks are on neither.
      const target = event.target;
      const onRoom =
        target instanceof Element &&
        (target === gl.domElement || target.contains(gl.domElement));
      if (!onRoom) return;

      if (document.pointerLockElement) {
        const door = focusedDoorRef.current;
        if (door) onEnter(door);
        return;
      }

      // First click on the room arms mouse look.
      requestLock();
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [gl, onEnter, requestLock]);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const step = Math.min(delta, 0.05);
    const look = lookInputRef.current;

    // The right stick turns at a steady rate while held.
    if (!pausedRef.current && (look.x || look.z)) {
      lookEuler.setFromQuaternion(camera.quaternion, "YXZ");
      lookEuler.y -= look.x * LOOK_STICK_SPEED * sensitivity * step;
      lookEuler.x = clamp(
        lookEuler.x + look.z * LOOK_STICK_SPEED * 0.7 * sensitivity * step,
        -0.9,
        0.9,
      );
      lookEuler.z = 0;
      camera.quaternion.setFromEuler(lookEuler);
    }

    const keys = keysRef.current;
    const startX = camera.position.x;
    const startZ = camera.position.z;

    // Keys and the touch stick add up but never exceed a full push.
    const stick = moveInputRef.current;
    const forwardInput = clamp(
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
        (keys.KeyS || keys.ArrowDown ? 1 : 0) +
        stick.z,
      -1,
      1,
    );
    const strafeInput = clamp(
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
        stick.x,
      -1,
      1,
    );

    euler.setFromQuaternion(camera.quaternion, "YXZ");
    cameraLookRef.current.yaw = euler.y;
    cameraLookRef.current.pitch = euler.x;
    forward.set(-Math.sin(euler.y), 0, -Math.cos(euler.y));
    right.set(Math.cos(euler.y), 0, -Math.sin(euler.y));

    if (!paused && (forwardInput || strafeInput)) {
      move
        .set(0, 0, 0)
        .addScaledVector(forward, forwardInput)
        .addScaledVector(right, strafeInput);

      if (move.lengthSq() > 1) move.normalize();

      const sprint =
        keys.ShiftLeft || keys.ShiftRight ? SPRINT_MULTIPLIER : 1;
      camera.position.addScaledVector(move, moveSpeed * sprint * step);
    }

    const colliders = FURNITURE[roomId];
    const feet = camera.position.y - PLAYER_HEIGHT;

    // Let shoved furniture drift home before testing this frame's contact.
    stepPushables(step);

    let pushing = false;

    // Furniture yields to the walker: it is shoved away along the shallowest
    // side and the soft spring later brings it back to its authored spot.
    for (const box of colliders) {
      if (feet >= box.height - 0.03) continue;

      const state = ensurePushable(box.id, box.x, box.z);
      const halfWidth = box.width / 2 + PLAYER_RADIUS;
      const halfDepth = box.depth / 2 + PLAYER_RADIUS;
      const offsetX = camera.position.x - state.x;
      const offsetZ = camera.position.z - state.z;
      if (Math.abs(offsetX) >= halfWidth || Math.abs(offsetZ) >= halfDepth) {
        continue;
      }

      pushing = true;
      const pushX = halfWidth - Math.abs(offsetX);
      const pushZ = halfDepth - Math.abs(offsetZ);
      if (pushX < pushZ) {
        pushPushable(box.id, box.x, box.z, -Math.sign(offsetX || 1) * pushX, 0);
      } else {
        pushPushable(box.id, box.x, box.z, 0, -Math.sign(offsetZ || 1) * pushZ);
      }

      // If the piece reached its travel limit, the walker takes the remainder.
      const moved = ensurePushable(box.id, box.x, box.z);
      const movedX = camera.position.x - moved.x;
      const movedZ = camera.position.z - moved.z;
      if (Math.abs(movedX) < halfWidth && Math.abs(movedZ) < halfDepth) {
        const restX = halfWidth - Math.abs(movedX);
        const restZ = halfDepth - Math.abs(movedZ);
        if (restX < restZ) {
          camera.position.x += Math.sign(movedX || 1) * restX;
        } else {
          camera.position.z += Math.sign(movedZ || 1) * restZ;
        }
      }
    }

    // Floating frames publish a solid circle so the walker cannot pass through.
    for (const collider of getCircleColliders()) {
      const offsetX = camera.position.x - collider.x;
      const offsetZ = camera.position.z - collider.z;
      const minDistance = collider.radius + PLAYER_RADIUS;
      const distanceSq = offsetX * offsetX + offsetZ * offsetZ;
      if (distanceSq >= minDistance * minDistance) continue;

      const distance = Math.sqrt(distanceSq) || 0.0001;
      camera.position.x = collider.x + (offsetX / distance) * minDistance;
      camera.position.z = collider.z + (offsetZ / distance) * minDistance;
    }

    // Keep the walker on the island, including after a furniture push.
    const [clampedX, clampedZ] = clampToFloor(
      camera.position.x,
      camera.position.z,
      PLAYER_RADIUS,
    );
    camera.position.x = clampedX;
    camera.position.z = clampedZ;

    const walking =
      !pausedRef.current &&
      Boolean(forwardInput || strafeInput) &&
      Math.hypot(camera.position.x - startX, camera.position.z - startZ) >
        0.0005;
    if (walking !== walkingRef.current) {
      walkingRef.current = walking;
      walkChangeRef.current?.(walking);
    }

    // Low tops can be landed on; solid furniture stays solid.
    let ground = 0;
    for (const box of colliders) {
      if (!box.standable) continue;
      const state = ensurePushable(box.id, box.x, box.z);
      if (Math.abs(camera.position.x - state.x) > box.width / 2 + 0.05) {
        continue;
      }
      if (Math.abs(camera.position.z - state.z) > box.depth / 2 + 0.05) {
        continue;
      }
      if (feet >= box.height - 0.06) ground = Math.max(ground, box.height);
    }

    if (airborne.current) {
      verticalVelocity.current -= GRAVITY * step;
      camera.position.y += verticalVelocity.current * step;

      if (camera.position.y <= ground + PLAYER_HEIGHT) {
        camera.position.y = ground + PLAYER_HEIGHT;
        verticalVelocity.current = 0;
        airborne.current = false;
      }
    } else if (camera.position.y > ground + PLAYER_HEIGHT + 0.02) {
      // Stepping off a table starts a short drop instead of snapping down.
      airborne.current = true;
      verticalVelocity.current = 0;
    } else {
      camera.position.y = ground + PLAYER_HEIGHT;
    }

    if (pushing !== pushingRef.current) {
      pushingRef.current = pushing;
      pushChangeRef.current?.(pushing);
    }

    camera.getWorldDirection(lookDirection);

    let focused: DoorSpec | null = null;
    let bestDot = AIM_THRESHOLD;

    for (const door of doors) {
      const [x, y, z] = doorCenter(door);
      toDoor.set(x, y, z).sub(camera.position);
      const distance = toDoor.length();
      if (distance >= DOOR_RANGE) continue;

      const dot = lookDirection.dot(toDoor.normalize());
      if (dot > bestDot) {
        bestDot = dot;
        focused = door;
      }
    }

    if (focused?.id !== focusedDoorRef.current?.id) {
      focusedDoorRef.current = focused;
      onFocusChange(focused?.id ?? null);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={fov}
        near={0.08}
        far={900}
      />

      {supportsPointerLock ? (
        <PointerLockControls
          ref={controlsRef}
          // Clicks are handled on the canvas so every lock request goes through
          // one guarded path. This selector matches nothing on purpose: drei
          // would otherwise add its own unguarded click listener.
          selector="#pointer-lock-managed-by-the-canvas"
          pointerSpeed={sensitivity}
          onLock={handleLock}
          onUnlock={handleUnlock}
        />
      ) : null}
    </>
  );
}
