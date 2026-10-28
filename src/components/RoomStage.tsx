"use client";

import type { ReactNode } from "react";
import type { DoorSpec, NoteContent, RoomContent } from "@/content/rooms";
import { Door } from "./Door";
import { Floating } from "./Floating";
import { PictureFrame } from "./PictureFrame";
import { RoomShell } from "./RoomShell";
import { RoomNavigator } from "./RoomNavigator";
import { WallText } from "./WallText";

export type RoomViewProps = {
  room: RoomContent;
  onDoor: (door: DoorSpec) => void;
  /** Opens the room map overlay. */
  onOpenMap: () => void;
  /** Opens a sticky note as a card over the room. */
  onReadNote: (note: NoteContent) => void;
  /** Opens a project, certificate or contact link from a frame. */
  onOpenLink: (href: string) => void;
  focusedDoorId?: string | null;
  opening?: boolean;
  paused?: boolean;
  onPetCat?: () => void;
  onCatLookChange?: (active: boolean) => void;
  onTheaterChange?: (playing: boolean) => void;
};

type RoomStageProps = Omit<RoomViewProps, "onReadNote" | "paused"> & {
  children?: ReactNode;
};

type FrameLayout = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

/**
 * Frames hang in the air on a loose arc behind the visitor, drifting like
 * everything else on the island. Six certificates get a tighter spread.
 */
function frameLayouts(count: number): FrameLayout[] {
  if (count === 0) return [];

  const six = count >= 6;
  const step = six ? 0.42 : 0.55;
  const radius = six ? 3.9 : 3.7;
  const size: [number, number] = six ? [0.86, 1.04] : [1.25, 1.45];
  const start = -((count - 1) * step) / 2;

  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI + start + index * step;
    return {
      position: [
        Math.sin(angle) * radius,
        1.62 + (index % 3) * 0.42,
        Math.cos(angle) * radius,
      ],
      rotation: [0, angle + Math.PI, 0],
      size,
    };
  });
}

export function RoomStage({
  room,
  onDoor,
  onOpenMap,
  onOpenLink,
  focusedDoorId,
  opening,
  children,
}: RoomStageProps) {
  const layouts = frameLayouts(room.frames.length);

  return (
    <RoomShell palette={room.palette} space={room.space}>
      {room.kind === "room" ? (
        <Floating position={[0, 3.0, -2.1]} drift={0.12} bob={0.1} tilt={0.008}>
          <WallText
            text={room.title}
            position={[0, 0.4, 0]}
            size={[5.8, 0.62]}
            fontSize={68}
            fontWeight={700}
            color={room.palette.text}
            align="center"
          />

          <WallText
            text={room.intro}
            position={[0, -0.24, 0]}
            size={[5.6, 0.44]}
            fontSize={30}
            fontWeight={700}
            color={room.palette.text}
            opacity={0.95}
            align="center"
          />
        </Floating>
      ) : null}

      {room.frames.map((frame, index) => {
        const layout = layouts[index];
        if (!layout) return null;
        return (
          <Floating
            key={frame.id}
            position={layout.position}
            drift={0.22}
            bob={0.14}
            tilt={0.02}
            phase={index * 0.9 + 0.4}
            colliderId={`frame:${room.id}:${frame.id}`}
            colliderRadius={layout.size[0] / 2 + 0.28}
          >
            <PictureFrame
              position={[0, 0, 0]}
              rotation={layout.rotation}
              tone={frame.tone}
              trim={room.palette.trim}
              size={layout.size}
              image={frame.image}
              caption={frame.caption}
              href={frame.href}
              onOpenLink={onOpenLink}
            />
          </Floating>
        );
      })}

      <RoomNavigator palette={room.palette} onOpenMap={onOpenMap} />

      {children}

      {room.doors.map((door) => (
        <Door
          key={door.id}
          room={room}
          door={door}
          onEnter={onDoor}
          focused={focusedDoorId === door.id}
          opening={room.doors.length === 1 ? opening : false}
        />
      ))}
    </RoomShell>
  );
}
