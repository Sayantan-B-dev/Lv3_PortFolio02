"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3, type Camera } from "three";
import type { NoteContent } from "@/content/rooms";
import { WallText } from "./WallText";

const READ_RANGE = 3.4;
/** The crosshair has to sit on the paper, not merely near it. */
const AIM_THRESHOLD = 0.94;
// A drag across the table should not open a note.
const TAP_TOLERANCE = 6;

/**
 * Fanned notes lie close enough together that the crosshair can be inside two
 * aim cones at once. Every mounted note registers itself here so all of them
 * agree on one winner: the paper the crosshair points at most directly. Without
 * that, the first note in the DOM claimed the click for all of them.
 */
type NoteTarget = { id: string; center: Vector3 };
const noteTargets = new Set<NoteTarget>();

const lookDirection = new Vector3();
const toNote = new Vector3();

function aimedNoteId(camera: Camera): string | null {
  camera.getWorldDirection(lookDirection);

  let winner: string | null = null;
  let bestDot = AIM_THRESHOLD;

  for (const target of noteTargets) {
    if (camera.position.distanceTo(target.center) >= READ_RANGE) continue;

    toNote.subVectors(target.center, camera.position).normalize();
    const dot = lookDirection.dot(toNote);
    if (dot > bestDot) {
      bestDot = dot;
      winner = target.id;
    }
  }

  return winner;
}

type StickyNoteProps = {
  note: NoteContent;
  /** Centre of the paper, already above the table top. */
  position: [number, number, number];
  /** Spin of the paper on the table, in radians. */
  yaw?: number;
  size?: number;
  paper?: string;
  onRead: (note: NoteContent) => void;
};

/**
 * A paper note on a table: aim at it and click to open the message as a card.
 * The same click opens it on a tap.
 */
export function StickyNote({
  note,
  position,
  yaw = 0,
  size = 0.2,
  paper = "#f6e6a8",
  onRead,
}: StickyNoteProps) {
  const camera = useThree((state) => state.camera);
  const [hovered, setHovered] = useState(false);
  const [near, setNear] = useState(false);
  const [aimed, setAimed] = useState(false);
  const nearRef = useRef(false);
  const aimedRef = useRef(false);

  const center = useMemo(() => new Vector3(...position), [position]);

  useEffect(() => {
    const target: NoteTarget = { id: note.id, center };
    noteTargets.add(target);
    return () => {
      noteTargets.delete(target);
    };
  }, [center, note.id]);

  const checkFocus = () => {
    const nextNear = camera.position.distanceTo(center) < READ_RANGE;
    if (nextNear !== nearRef.current) {
      nearRef.current = nextNear;
      setNear(nextNear);
    }

    const nextAimed = nearRef.current && aimedNoteId(camera) === note.id;
    if (nextAimed !== aimedRef.current) {
      aimedRef.current = nextAimed;
      setAimed(nextAimed);
    }
  };

  useFrame(checkFocus);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (!nearRef.current || aimedRef.current === false) return;
      // Only the winning note claims the click; the others share the cone but
      // must not open their own message.
      if (aimedNoteId(camera) !== note.id) return;

      // The crosshair is the cursor while locked; claim the click before the
      // door or a nearby cat hears it.
      event.preventDefault();
      event.stopImmediatePropagation();
      onRead(note);
    };

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [camera, note, onRead]);

  const focused = near && (hovered || aimed);

  return (
    <group position={position}>
      <group
        rotation={[-Math.PI / 2, 0, yaw]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          checkFocus();
        }}
        onPointerMove={checkFocus}
        onPointerOut={() => {
          setHovered(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > TAP_TOLERANCE) return;
          if (!near) return;
          onRead(note);
        }}
      >
        <mesh>
          <planeGeometry args={[size, size * 1.08]} />
          <meshStandardMaterial
            color={hovered ? "#fff6cd" : paper}
            roughness={0.92}
            metalness={0}
          />
        </mesh>

        <WallText
          text={note.label}
          position={[0, -size * 0.04, 0.004]}
          size={[size * 0.82, size * 0.62]}
          fontSize={64}
          fontWeight={600}
          color="#4a3a1e"
          opacity={0.92}
        />

        {/* The whole sheet is one hit target, so aiming is forgiving. */}
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[size, size * 1.08]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {focused ? (
        <Html
          position={[0, 0.2, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="glass-chip whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tracking-wide text-[#f6ebdd]">
            <span className="pointer-coarse:hidden">
              Click to read the note
            </span>
            <span className="hidden pointer-coarse:inline">
              Tap to read the note
            </span>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
