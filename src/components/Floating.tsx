"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { getPushOffset } from "@/scene/pushables";
import { clearCircleCollider, setCircleCollider } from "@/scene/colliders";

type FloatingProps = {
  children: ReactNode;
  position?: [number, number, number];
  /** Horizontal wander in metres. */
  drift?: number;
  /** Vertical bob in metres. */
  bob?: number;
  /** Idle tilt in radians. */
  tilt?: number;
  speed?: number;
  /** Keeps neighbouring props out of sync. */
  phase?: number;
  /** Furniture id whose pushed offset this wrapper follows. */
  pushId?: string;
  /** Publishes a solid circle at the floating position for the walker. */
  colliderId?: string;
  colliderRadius?: number;
};

/**
 * Bobs, drifts and tilts whatever it wraps on three offset sine waves, so the
 * motion never settles into a visible loop.
 */
export function Floating({
  children,
  position = [0, 0, 0],
  drift = 0.16,
  bob = 0.08,
  tilt = 0.015,
  speed = 1,
  phase = 0,
  pushId,
  colliderId,
  colliderRadius,
}: FloatingProps) {
  const ref = useRef<Group>(null);

  useEffect(
    () => () => {
      if (colliderId) clearCircleCollider(colliderId);
    },
    [colliderId],
  );

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;

    const t = clock.elapsedTime * speed + phase;
    const pushed = pushId ? getPushOffset(pushId) : null;

    group.position.set(
      position[0] + (pushed?.[0] ?? 0) + Math.sin(t * 0.53) * drift,
      position[1] + Math.sin(t * 1.07 + 1.3) * bob,
      position[2] + (pushed?.[1] ?? 0) + Math.cos(t * 0.71) * drift * 0.85,
    );
    group.rotation.set(
      Math.sin(t * 0.43) * tilt,
      Math.sin(t * 0.31 + 0.6) * tilt * 1.6,
      Math.cos(t * 0.57) * tilt,
    );

    if (colliderId && colliderRadius) {
      setCircleCollider(
        colliderId,
        group.position.x,
        group.position.z,
        colliderRadius,
      );
    }
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
