"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Object3D,
  type Texture,
} from "three";
import type { RoomPalette } from "@/content/rooms";
import { MODELS, type SpaceId } from "@/content/models";
import { getImageTexture, getModelScene, getPreparedModel } from "@/scene/assets";
import { Model } from "./Model";

/** One round room, shared by the home hub and every themed room. */
export const ROOM_RADIUS = 6;
export const ROOM_HEIGHT = 4.5;
export const ROOM_WALL_THICKNESS = 0.2;

const SPAWN_RADIUS = 2.8;
/** The visitor lands facing the content wall at the back of the room. */
export const ROOM_SPAWN: [number, number, number] = [0, 1.7, SPAWN_RADIUS];

const WINDOW_ARC = 0.42;
const WINDOW_SILL = 1.2;
const WINDOW_HEIGHT = 1.5;
const DOOR_ARC = 0.16;
/** The cinema balcony: a full-height opening aligned with the screen. */
const BALCONY_ANGLE = 1.1;
const BALCONY_ARC = 0.55;

const SPACE_SIZE = 280;
const STARFIELD_SPIN_SPEED = 0.14;
const SPACE_CLEAR_RADIUS = ROOM_RADIUS + 2.4;
const SPACE_CLEAR_BOTTOM = -1.5;
const SPACE_CLEAR_TOP = ROOM_HEIGHT + 2.5;

type Opening = { start: number; end: number };

/** Drop the points that would sit inside the room, keeping the rest. */
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

type RoomShellProps = {
  palette: RoomPalette;
  wallTexture: string;
  /** Angular positions of the side windows. */
  windows: readonly number[];
  /** Angular positions of every door opening. */
  doorAngles: readonly number[];
  space: SpaceId | null;
  children: ReactNode;
};

/** A curved wall, baseboard, crown or glass pane between two angles. */
function Arc({
  radius,
  height,
  y,
  start,
  length,
  material,
}: {
  radius: number;
  height: number;
  y: number;
  start: number;
  length: number;
  material: MeshStandardMaterial | MeshBasicMaterial;
}) {
  const geometry = useMemo(
    () =>
      new CylinderGeometry(radius, radius, height, 32, 1, true, start, length),
    [radius, height, start, length],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} position={[0, y, 0]} material={material} />;
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

function usePlasterTexture(url: string) {
  return useMemo(() => {
    try {
      const texture = getImageTexture(url);
      if (!texture) return null;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    } catch {
      return null;
    }
  }, [url]);
}

function wallSegments(openings: Opening[]): Opening[] {
  const sorted = openings
    .map((opening) => {
      const length = opening.end - opening.start;
      const mid = (opening.start + opening.end) / 2;
      const center = Math.atan2(Math.sin(mid), Math.cos(mid));
      return {
        start: Math.max(-Math.PI, center - length / 2),
        end: Math.min(Math.PI, center + length / 2),
      };
    })
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start);

  const merged: Opening[] = [];
  for (const opening of sorted) {
    const last = merged[merged.length - 1];
    if (last && opening.start <= last.end) {
      last.end = Math.max(last.end, opening.end);
    } else {
      merged.push({ ...opening });
    }
  }

  const segments: Opening[] = [];
  let cursor = -Math.PI;
  for (const opening of merged) {
    if (opening.start > cursor) {
      segments.push({ start: cursor, end: opening.start });
    }
    cursor = Math.max(cursor, opening.end);
  }
  if (cursor < Math.PI) segments.push({ start: cursor, end: Math.PI });
  return segments;
}

/** x = R sin a, z = R cos a, matching three's cylinder theta. */
function onCircle(radius: number, angle: number): [number, number] {
  return [Math.sin(angle) * radius, Math.cos(angle) * radius];
}

export function RoomShell({
  palette,
  wallTexture,
  windows,
  doorAngles,
  space,
  children,
}: RoomShellProps) {
  const wallMap = usePlasterTexture(wallTexture);

  const trimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: palette.trim,
        roughness: 0.62,
        metalness: 0.1,
      }),
    [palette.trim],
  );

  const wallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: palette.wall,
        map: wallMap ?? undefined,
        roughness: 0.94,
        metalness: 0,
        side: DoubleSide,
      }),
    [palette.wall, wallMap],
  );

  const glassMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: palette.light,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: DoubleSide,
      }),
    [palette.light],
  );

  const ceilingMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: palette.ceiling,
        roughness: 0.95,
        side: DoubleSide,
      }),
    [palette.ceiling],
  );

  useEffect(
    () => () => {
      trimMaterial.dispose();
      wallMaterial.dispose();
      glassMaterial.dispose();
      ceilingMaterial.dispose();
    },
    [trimMaterial, wallMaterial, glassMaterial, ceilingMaterial],
  );

  const segments = useMemo(() => {
    const openings: Opening[] = doorAngles.map((angle) => ({
      start: angle - DOOR_ARC,
      end: angle + DOOR_ARC,
    }));

    if (space) {
      openings.push({
        start: BALCONY_ANGLE - BALCONY_ARC,
        end: BALCONY_ANGLE + BALCONY_ARC,
      });
    }

    for (const angle of windows) {
      openings.push({
        start: angle - WINDOW_ARC / 2,
        end: angle + WINDOW_ARC / 2,
      });
    }

    return wallSegments(openings);
  }, [doorAngles, space, windows]);

  const ceilingGeometry = useMemo(
    () => new CircleGeometry(ROOM_RADIUS, 96),
    [],
  );
  useEffect(() => () => ceilingGeometry.dispose(), [ceilingGeometry]);

  return (
    <>
      <color attach="background" args={[space ? "#05040a" : "#120d14"]} />

      {space ? <Starfield space={space} /> : null}

      <ambientLight color={palette.light} intensity={0.66} />
      <directionalLight
        position={[0, 6.5, 0.8]}
        color={palette.light}
        intensity={1.05}
      />
      <pointLight
        position={[0, 3.3, 0.3]}
        color={palette.light}
        intensity={6}
        distance={18}
        decay={1.5}
      />

      <TiledFloor fallback={palette.floor} />

      <Model
        url={MODELS.rug}
        fit="width"
        size={4.4}
        position={[0, 0.006, 0]}
        tint="#d3b995"
        shadows={false}
      />

      {segments.map((segment, index) => (
        <Arc
          key={`wall-${index}`}
          radius={ROOM_RADIUS}
          height={ROOM_HEIGHT}
          y={ROOM_HEIGHT / 2}
          start={segment.start}
          length={segment.end - segment.start}
          material={wallMaterial}
        />
      ))}

      {segments.map((segment, index) => (
        <group key={`trim-${index}`}>
          <Arc
            radius={ROOM_RADIUS - 0.02}
            height={0.22}
            y={0.11}
            start={segment.start}
            length={segment.end - segment.start}
            material={trimMaterial}
          />
          <Arc
            radius={ROOM_RADIUS - 0.02}
            height={0.14}
            y={ROOM_HEIGHT - 0.18}
            start={segment.start}
            length={segment.end - segment.start}
            material={trimMaterial}
          />
        </group>
      ))}

      {windows.map((angle) => {
        const [x, z] = onCircle(ROOM_RADIUS - 0.05, angle);
        return (
          <group key={`window-${angle}`} position={[x, 0, z]}>
            <Arc
              radius={ROOM_RADIUS - 0.06}
              height={WINDOW_HEIGHT}
              y={WINDOW_SILL + WINDOW_HEIGHT / 2}
              start={angle - WINDOW_ARC / 2 + 0.02}
              length={WINDOW_ARC - 0.04}
              material={glassMaterial}
            />
            <Arc
              radius={ROOM_RADIUS - 0.04}
              height={0.1}
              y={WINDOW_SILL}
              start={angle - WINDOW_ARC / 2}
              length={WINDOW_ARC}
              material={trimMaterial}
            />
            <Arc
              radius={ROOM_RADIUS - 0.04}
              height={0.1}
              y={WINDOW_SILL + WINDOW_HEIGHT}
              start={angle - WINDOW_ARC / 2}
              length={WINDOW_ARC}
              material={trimMaterial}
            />
            {[-1, 1].map((side) => {
              const edge = angle + (side * WINDOW_ARC) / 2;
              const [ex, ez] = onCircle(ROOM_RADIUS - 0.04, edge);
              return (
                <mesh
                  key={edge}
                  position={[ex, WINDOW_SILL + WINDOW_HEIGHT / 2, ez]}
                  rotation={[0, edge, 0]}
                  material={trimMaterial}
                >
                  <boxGeometry args={[0.1, WINDOW_HEIGHT + 0.16, 0.14]} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {space ? (
        <group>
          <Arc
            radius={ROOM_RADIUS - 0.06}
            height={ROOM_HEIGHT - 0.16}
            y={ROOM_HEIGHT / 2}
            start={BALCONY_ANGLE - BALCONY_ARC + 0.02}
            length={BALCONY_ARC * 2 - 0.04}
            material={glassMaterial}
          />
          <Arc
            radius={ROOM_RADIUS - 0.04}
            height={0.22}
            y={0.11}
            start={BALCONY_ANGLE - BALCONY_ARC}
            length={BALCONY_ARC * 2}
            material={trimMaterial}
          />
          <Arc
            radius={ROOM_RADIUS - 0.04}
            height={0.16}
            y={ROOM_HEIGHT - 0.16}
            start={BALCONY_ANGLE - BALCONY_ARC}
            length={BALCONY_ARC * 2}
            material={trimMaterial}
          />
          {[-1, 1].map((side) => {
            const angle = BALCONY_ANGLE + side * BALCONY_ARC;
            const [x, z] = onCircle(ROOM_RADIUS - 0.04, angle);
            return (
              <mesh
                key={angle}
                position={[x, ROOM_HEIGHT / 2, z]}
                rotation={[0, angle, 0]}
                material={trimMaterial}
              >
                <boxGeometry args={[0.12, ROOM_HEIGHT, 0.16]} />
              </mesh>
            );
          })}
        </group>
      ) : null}

      <mesh
        position={[0, ROOM_HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={ceilingGeometry}
        material={ceilingMaterial}
        receiveShadow
      />

      <Model
        url={MODELS.ceilingTiles}
        fit="width"
        size={ROOM_RADIUS * 1.6}
        stretch={[1, 1, 2.4]}
        repeat={[1, 2.4]}
        rotation={[Math.PI, 0, 0]}
        position={[0, ROOM_HEIGHT - 0.07, 0]}
        shadows={false}
      />

      {children}
    </>
  );
}
