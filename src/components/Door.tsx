"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  type Group,
  type Points,
} from "three";
import type { DoorSpec, RoomContent } from "@/content/rooms";
import { WallText } from "./WallText";

type DoorProps = {
  room: RoomContent;
  door: DoorSpec;
  onEnter: (door: DoorSpec) => void;
  focused?: boolean;
  opening?: boolean;
};

const TAP_TOLERANCE = 6;
/** The portal hangs in the air, not on a wall. */
const PORTAL_DISTANCE = 4.15;
const PORTAL_HEIGHT = 2.05;
const PORTAL_RADIUS = 1.06;
const NAME_HEIGHT = 1.58;
const SPIN_SPEED = 9;
const PARTICLE_COUNT = 64;

/** Base centre in world space, used by the aim check in PlayerControls. */
export function doorCenter(door: DoorSpec) {
  const lift = door.order ? ((door.order - 1) % 3) * 0.26 : 0.2;

  return [
    Math.sin(door.angle) * PORTAL_DISTANCE,
    PORTAL_HEIGHT + lift,
    Math.cos(door.angle) * PORTAL_DISTANCE,
  ] as const;
}

/**
 * Air particles spiral from just outside the ring into its centre, each one a
 * different colour so the suction reads even against a busy skybox.
 */
function PortalParticles() {
  const pointsRef = useRef<Points>(null);

  const { geometry, particles } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      angle: index * 2.399963,
      radius: 0.4 + ((index * 37) % 100) / 100 * 1.45,
      spin: 1.4 + ((index * 53) % 100) / 100 * 2.6,
      inward: 0.55 + ((index * 29) % 100) / 100 * 0.85,
      height: (((index * 41) % 100) / 100 - 0.5) * 0.5,
    }));

    seeds.forEach((_, index) => {
      const color = new Color().setHSL(
        (index / PARTICLE_COUNT + 0.08) % 1,
        0.88,
        0.64,
      );
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });

    const buffer = new BufferGeometry();
    buffer.setAttribute("position", new Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new Float32BufferAttribute(colors, 3));

    return { geometry: buffer, particles: seeds };
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const attribute = points.geometry.getAttribute("position");
    const dt = Math.min(delta, 0.05);

    particles.forEach((particle, index) => {
      particle.angle += particle.spin * dt;
      particle.radius -= particle.inward * dt;

      if (particle.radius < 0.12) {
        particle.radius = 1.55 + (index % 7) * 0.06;
      }

      attribute.setXYZ(
        index,
        Math.cos(particle.angle) * particle.radius,
        Math.sin(particle.angle) * particle.radius,
        Math.sin(particle.angle * 2 + index) * 0.18 + particle.height * 0.4,
      );
    });

    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0.95}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/**
 * A circular portal that drifts in the air and always turns to face the
 * visitor. Its name is drawn in white with a black border so it reads against
 * any background.
 */
export function Door({
  door,
  onEnter,
  focused = false,
  opening = false,
}: DoorProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const counterSpinRef = useRef<Group>(null);
  const scaleRef = useRef(1);
  const cursorRef = useRef(false);
  const active = hovered || focused || opening;
  const base = doorCenter(door);
  const phase = (door.order ?? 1) * 1.37;

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.elapsedTime + phase;
    group.position.set(
      base[0] + Math.sin(t * 0.52) * 0.34,
      base[1] + Math.sin(t * 0.93 + 1.2) * 0.16,
      base[2] + Math.cos(t * 0.61) * 0.3,
    );

    // Billboard: the ring and the name always face the visitor.
    group.quaternion.copy(camera.quaternion);

    const target = opening ? 1.18 : focused ? 1.07 : hovered ? 1.04 : 1;
    scaleRef.current = MathUtils.damp(
      scaleRef.current,
      target,
      7,
      Math.min(delta, 0.05),
    );
    group.scale.setScalar(scaleRef.current);

    if (spinRef.current) spinRef.current.rotation.z += delta * SPIN_SPEED;
    if (counterSpinRef.current) {
      counterSpinRef.current.rotation.z -= delta * SPIN_SPEED * 0.55;
    }
  });

  useEffect(() => {
    if (hovered === cursorRef.current) return;
    cursorRef.current = hovered;
    document.body.style.cursor = hovered ? "pointer" : "auto";

    return () => {
      document.body.style.cursor = "auto";
      cursorRef.current = false;
    };
  }, [hovered]);

  return (
    <group
      ref={groupRef}
      position={[base[0], base[1], base[2]]}
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
      <PortalParticles />

      <mesh>
        <circleGeometry args={[PORTAL_RADIUS, 64]} />
        <meshBasicMaterial
          color={door.color}
          transparent
          opacity={active ? 0.34 : 0.22}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <torusGeometry args={[PORTAL_RADIUS + 0.08, 0.065, 16, 80]} />
        <meshStandardMaterial
          color={door.color}
          emissive={door.color}
          emissiveIntensity={active ? 1.9 : 1.1}
          roughness={0.28}
          metalness={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* Solid slivers make the spin visible; a plain torus would look still. */}
      <group ref={spinRef}>
        {Array.from({ length: 14 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 14;
          const radius = PORTAL_RADIUS - 0.12;
          return (
            <mesh
              key={`sliver-${index}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.02,
              ]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.17, 0.032, 0.02]} />
              <meshBasicMaterial
                color={index % 3 === 0 ? "#ffffff" : door.color}
                transparent
                opacity={0.85}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      <group ref={counterSpinRef}>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 8;
          const radius = PORTAL_RADIUS - 0.38;
          return (
            <mesh
              key={`dot-${index}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.01,
              ]}
            >
              <sphereGeometry args={[0.026, 8, 8]} />
              <meshBasicMaterial
                color={door.color}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      <WallText
        text={door.label}
        position={[0, -NAME_HEIGHT, 0.04]}
        size={[2.9, 0.72]}
        fontSize={92}
        fontWeight={700}
        color="#ffffff"
        outline="#000000"
        outlineWidth={12}
      />

      <pointLight
        position={[0, 0, 0.7]}
        color={door.color}
        intensity={opening ? 7 : active ? 4 : 1.6}
        distance={5}
        decay={1.5}
      />

      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[PORTAL_RADIUS + 0.25, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
