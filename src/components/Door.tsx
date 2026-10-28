"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { MathUtils, type Group } from "three";
import type { DoorSpec, RoomContent } from "@/content/rooms";
import { ROOM_RADIUS } from "./RoomShell";
import { WallText } from "./WallText";

type DoorProps = {
  room: RoomContent;
  door: DoorSpec;
  onEnter: (door: DoorSpec) => void;
  focused?: boolean;
  opening?: boolean;
};

// A drag across the room should not count as a door tap.
const TAP_TOLERANCE = 6;
const OPEN_ANGLE = -1.72;

const OPENING_WIDTH = 1.6;
const LEAF_WIDTH = 1.62;
const LEAF_HEIGHT = 2.84;
const LEAF_CENTER_Y = 1.45;
const HINGE_X = -LEAF_WIDTH / 2;

/** Door centre in world space, used by the aim check in PlayerControls. */
export function doorCenter(door: DoorSpec, radius = ROOM_RADIUS - 0.08) {
  return [
    Math.sin(door.angle) * radius,
    1.35,
    Math.cos(door.angle) * radius,
  ] as const;
}

/**
 * The door is built from boxes rather than a model, so it stays a cheap prop.
 * It is rotated onto the cylinder wall: `rotation.y = angle + PI` turns its
 * local +Z face toward the room centre.
 */
export function Door({
  room,
  door,
  onEnter,
  focused = false,
  opening = false,
}: DoorProps) {
  const [hovered, setHovered] = useState(false);
  const leafRef = useRef<Group>(null);
  const openness = useRef(0);
  const reduceMotion = useRef(false);
  const active = hovered || focused || opening;
  const [x, , z] = doorCenter(door);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useFrame((_, delta) => {
    const leaf = leafRef.current;
    if (!leaf) return;

    const target = opening ? 1 : 0;
    openness.current = reduceMotion.current
      ? target
      : MathUtils.damp(openness.current, target, 5.5, Math.min(delta, 0.05));

    leaf.rotation.y = OPEN_ANGLE * openness.current;
  });

  useEffect(() => {
    if (!hovered) return;

    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, door.angle + Math.PI, 0]}
    >
      <mesh position={[-OPENING_WIDTH / 2 - 0.09, LEAF_CENTER_Y + 0.05, 0]} castShadow>
        <boxGeometry args={[0.18, 3.0, 0.18]} />
        <meshStandardMaterial
          color={room.palette.trim}
          roughness={0.3}
          metalness={0.34}
        />
      </mesh>
      <mesh position={[OPENING_WIDTH / 2 + 0.09, LEAF_CENTER_Y + 0.05, 0]} castShadow>
        <boxGeometry args={[0.18, 3.0, 0.18]} />
        <meshStandardMaterial
          color={room.palette.trim}
          roughness={0.3}
          metalness={0.34}
        />
      </mesh>
      <mesh position={[0, 2.99, 0]} castShadow>
        <boxGeometry args={[1.94, 0.18, 0.18]} />
        <meshStandardMaterial
          color={room.palette.trim}
          roughness={0.3}
          metalness={0.34}
        />
      </mesh>

      <mesh position={[0, 0.04, 0.09]} receiveShadow>
        <boxGeometry args={[1.86, 0.08, 0.3]} />
        <meshStandardMaterial
          color={room.palette.trim}
          roughness={0.24}
          metalness={0.4}
        />
      </mesh>

      {/* A dark passage behind the leaf, so an open door reads as a doorway. */}
      <mesh position={[0, 1.45, -0.01]}>
        <planeGeometry args={[OPENING_WIDTH, 2.82]} />
        <meshBasicMaterial color="#241c30" />
      </mesh>

      <group ref={leafRef} position={[HINGE_X, 0, 0]}>
        <group
          position={[-HINGE_X, 0, 0]}
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta > TAP_TOLERANCE) return;
            onEnter(door);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <mesh position={[0, LEAF_CENTER_Y, 0.02]} castShadow>
            <boxGeometry args={[LEAF_WIDTH, LEAF_HEIGHT, 0.12]} />
            <meshPhysicalMaterial
              color="#432b2b"
              roughness={0.24}
              metalness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </mesh>

          <mesh position={[0, LEAF_CENTER_Y, 0.1]} castShadow>
            <boxGeometry args={[1.24, 2.56, 0.05]} />
            <meshPhysicalMaterial
              color={active ? room.palette.wallAccent : "#5b3b35"}
              emissive={active ? room.palette.light : "#000000"}
              emissiveIntensity={active ? 0.16 : 0}
              roughness={0.2}
              metalness={0.06}
              clearcoat={0.9}
              clearcoatRoughness={0.08}
            />
          </mesh>

          <mesh position={[0.5, 1.14, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 20]} />
            <meshStandardMaterial color="#e0bd7c" metalness={0.8} roughness={0.16} />
          </mesh>
          <mesh position={[0.6, 1.14, 0.22]} castShadow>
            <boxGeometry args={[0.28, 0.045, 0.045]} />
            <meshStandardMaterial color="#e0bd7c" metalness={0.8} roughness={0.15} />
          </mesh>
        </group>
      </group>

      <pointLight
        position={[0, 1.5, 0.7]}
        color={room.palette.light}
        intensity={opening ? 5 : active ? 3 : 0.6}
        distance={4}
      />

      <WallText
        text={door.label}
        position={[0, 3.24, 0.16]}
        size={[2.5, 0.5]}
        fontSize={64}
        fontWeight={700}
        color={room.palette.text}
        opacity={1}
      />
    </group>
  );
}
