"use client";

import { useState } from "react";
import type { RoomPalette } from "@/content/rooms";
import { NAVIGATOR } from "@/content/layout";
import { Floating } from "./Floating";
import { WallText } from "./WallText";

type RoomNavigatorProps = {
  palette: RoomPalette;
  onOpenMap: () => void;
};

/** A floating map table in every room; clicking it opens the room map. */
export function RoomNavigator({ palette, onOpenMap }: RoomNavigatorProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Floating
      position={[NAVIGATOR.x, 0.32, NAVIGATOR.z]}
      drift={0.2}
      bob={0.12}
      tilt={0.02}
      phase={2.4}
      pushId="map-table"
    >
      <group
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > 6) return;
          onOpenMap();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.86, 1.0, 0.6]} />
          <meshStandardMaterial
            color={palette.trim}
            roughness={0.58}
            metalness={0.12}
          />
        </mesh>

        <mesh position={[0, 1.015, 0]} castShadow>
          <boxGeometry args={[0.98, 0.07, 0.72]} />
          <meshStandardMaterial
            color={hovered ? palette.light : palette.wallAccent}
            emissive={palette.trim}
            emissiveIntensity={hovered ? 0.55 : 0.22}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>

        <mesh position={[0, 1.065, 0]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.04, 6]} />
          <meshStandardMaterial
            color="#1b1620"
            emissive={palette.trim}
            emissiveIntensity={hovered ? 0.9 : 0.5}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>

        <WallText
          text="MAP"
          position={[0, 0.74, 0.305]}
          size={[0.44, 0.16]}
          fontSize={72}
          fontWeight={700}
          color={hovered ? "#fff4e2" : palette.text}
          opacity={0.95}
        />

        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.1, 1.5, 0.9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Floating>
  );
}
