"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BufferGeometry,
  CircleGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Points,
  RepeatWrapping,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { getModelScene, getPreparedModel } from "@/scene/assets";
import { MODELS, type SpaceId } from "@/content/models";
import type { RoomPalette } from "@/content/rooms";
import { Model } from "./Model";

/** The floating island's radius. There are no walls beyond this edge. */
export const ROOM_RADIUS = 6;
export const ROOM_HEIGHT = 4.5;
export const ROOM_SPAWN = [0, 1.7, 2.8] as const;

const SPACE_SIZE = 280;
const STARFIELD_SPIN_SPEED = 0.14;
const SPACE_CLEAR_RADIUS = ROOM_RADIUS + 2.4;
const SPACE_CLEAR_BOTTOM = -1.5;
const SPACE_CLEAR_TOP = ROOM_HEIGHT + 3.5;

/** Deterministic pseudo-random in [0, 1). */
function hash(value: number) {
  return Math.abs(Math.sin(value * 12.9898) * 43758.5453) % 1;
}

/** Keeps a walker on the island's circular floor. */
export function clampToFloor(
  x: number,
  z: number,
  margin: number,
): [number, number] {
  const limit = Math.max(0, ROOM_RADIUS - margin);
  const distance = Math.hypot(x, z);
  if (distance <= limit) return [x, z];

  const scale = limit / distance;
  return [x * scale, z * scale];
}

/** Drop the points that would sit inside the island, keeping the rest. */
function clearPointsInsideRoom(model: Object3D) {
  model.updateMatrixWorld(true);
  const world = new Vector3();

  model.traverse((node) => {
    const points = node as Points;
    if (!points.isPoints) return;

    const source = points.geometry;
    const position = source.getAttribute("position");
    if (!position) return;

    const color = source.getAttribute("color");
    const positions: number[] = [];
    const colors: number[] = [];

    for (let index = 0; index < position.count; index += 1) {
      world
        .fromBufferAttribute(position, index)
        .applyMatrix4(points.matrixWorld);

      const inside =
        world.y > SPACE_CLEAR_BOTTOM &&
        world.y < SPACE_CLEAR_TOP &&
        Math.hypot(world.x, world.z) < SPACE_CLEAR_RADIUS;
      if (inside) continue;

      positions.push(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      );
      if (color) {
        for (let channel = 0; channel < color.itemSize; channel += 1) {
          colors.push(color.getComponent(index, channel));
        }
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    if (color) {
      geometry.setAttribute(
        "color",
        new Float32BufferAttribute(colors, color.itemSize),
      );
    }
    geometry.computeBoundingSphere();
    points.geometry = geometry;
  });
}

function Starfield({ space }: { space: SpaceId }) {
  const groupRef = useRef<Group>(null);
  const backdrop = useMemo(() => {
    const model = getPreparedModel(MODELS[space], {
      size: SPACE_SIZE,
      fit: "height",
      shadows: false,
    });

    if (!model) return null;

    model.position.y -= SPACE_SIZE / 2;
    clearPointsInsideRoom(model);
    return model;
  }, [space]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += Math.min(delta, 0.05) * STARFIELD_SPIN_SPEED;
  });

  if (!backdrop) return null;

  return (
    <group ref={groupRef}>
      <primitive object={backdrop} dispose={null} />
    </group>
  );
}

/**
 * Home has no authored skybox, so it gets a cheap generated starfield that is
 * there from the first frame instead of waiting on another room's asset.
 */
function ProceduralStars() {
  const groupRef = useRef<Group>(null);

  const geometry = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399963;
      const height = hash(index * 1.7 + 0.3) * 2 - 1;
      const ring = Math.sqrt(1 - height * height);
      const radius = 42 + hash(index * 3.1 + 1.3) * 78;

      positions[index * 3] = Math.cos(angle) * ring * radius;
      positions[index * 3 + 1] = height * radius;
      positions[index * 3 + 2] = Math.sin(angle) * ring * radius;
    }

    const buffer = new BufferGeometry();
    buffer.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += Math.min(delta, 0.05) * STARFIELD_SPIN_SPEED;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          color="#f2e8ff"
          size={0.9}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/** A custom floating ring of light instead of a ceiling model. */
function CeilingRing({ palette }: { palette: RoomPalette }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.elapsedTime;
    group.position.y = ROOM_HEIGHT - 0.35 + Math.sin(t * 0.6) * 0.07;
    group.rotation.y += Math.min(delta, 0.05) * 0.55;
  });

  return (
    <group ref={groupRef} position={[0, ROOM_HEIGHT - 0.35, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.5, 0.09, 16, 96]} />
        <meshStandardMaterial
          color={palette.trim}
          emissive={palette.light}
          emissiveIntensity={0.35}
          roughness={0.42}
          metalness={0.35}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.25, 0.045, 12, 80]} />
        <meshStandardMaterial
          color={palette.trim}
          emissive={palette.light}
          emissiveIntensity={0.5}
          roughness={0.38}
          metalness={0.4}
        />
      </mesh>

      {Array.from({ length: 6 }, (_, index) => {
        const angle = (Math.PI / 3) * index;
        return (
          <group key={`spoke-${index}`} rotation={[0, angle, 0]}>
            <mesh position={[1.75, 0, 0]}>
              <boxGeometry args={[3.5, 0.045, 0.1]} />
              <meshStandardMaterial
                color={palette.trim}
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
            <mesh position={[3.5, -0.12, 0]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial
                color={palette.light}
                emissive={palette.light}
                emissiveIntensity={1.6}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      <pointLight
        position={[0, -0.3, 0]}
        color={palette.light}
        intensity={9}
        distance={14}
        decay={1.4}
      />
    </group>
  );
}

function TiledFloor({ fallback }: { fallback: string }) {
  const material = useMemo(() => {
    let map: Texture | null = null;

    try {
      const scene = getModelScene(MODELS.floor);
      if (!scene) throw new Error("no floor scene");
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (map || !mesh.isMesh) return;

        const mat = mesh.material as MeshStandardMaterial;
        const source = mat.map;
        if (!source) return;

        map = source.clone();
        map.wrapS = RepeatWrapping;
        map.wrapT = RepeatWrapping;
        map.repeat.set(5, 5);
        map.anisotropy = 1;
        map.needsUpdate = true;
      });
    } catch {
      map = null;
    }

    return new MeshStandardMaterial({
      map: map ?? null,
      color: map ? "#ffffff" : fallback,
      roughness: 0.82,
      metalness: 0,
    });
  }, [fallback]);

  useEffect(
    () => () => {
      if (material.map) material.map.dispose();
      material.dispose();
    },
    [material],
  );

  const geometry = useMemo(() => new CircleGeometry(ROOM_RADIUS, 96), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      material={material}
      geometry={geometry}
    />
  );
}

type RoomShellProps = {
  palette: RoomPalette;
  space: SpaceId | null;
  children: ReactNode;
};

export function RoomShell({ palette, space, children }: RoomShellProps) {
  const rimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: palette.trim,
        roughness: 0.48,
        metalness: 0.32,
      }),
    [palette.trim],
  );

  useEffect(() => () => rimMaterial.dispose(), [rimMaterial]);

  return (
    <>
      <color attach="background" args={["#05040a"]} />

      {space ? <Starfield space={space} /> : <ProceduralStars />}

      <ambientLight color={palette.light} intensity={0.7} />
      <directionalLight
        position={[0, 7, 1]}
        color={palette.light}
        intensity={1}
      />
      <pointLight
        position={[0, 3, 0]}
        color={palette.light}
        intensity={5}
        distance={18}
        decay={1.5}
      />

      <TiledFloor fallback={palette.floor} />

      {/* The island's edge: a wood ring and a dark underside. */}
      <mesh
        position={[0, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={rimMaterial}
      >
        <ringGeometry args={[ROOM_RADIUS - 0.22, ROOM_RADIUS + 0.05, 96]} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[ROOM_RADIUS, ROOM_RADIUS, 0.18, 96]} />
        <meshStandardMaterial
          color={palette.ceiling}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      <Model
        url={MODELS.rug}
        fit="width"
        size={4.4}
        position={[0, 0.006, 0]}
        tint="#d3b995"
        shadows={false}
      />

      <CeilingRing palette={palette} />

      {children}
    </>
  );
}
