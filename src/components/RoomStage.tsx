"use client";

import type { ReactNode } from "react";
import type {
  DoorSpec,
  NoteContent,
  RoomContent,
} from "@/content/rooms";
import { Door } from "./Door";
import { PictureFrame } from "./PictureFrame";
import { ROOM_RADIUS, RoomShell } from "./RoomShell";
import { WallText } from "./WallText";

const WALL_TEXTURE = "/wall-textures/room1.jpg";
const CONTENT_ANGLE = Math.PI;

export type RoomViewProps = {
  room: RoomContent;
  onDoor: (door: DoorSpec) => void;
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

function onCircle(radius: number, angle: number): [number, number] {
  return [Math.sin(angle) * radius, Math.cos(angle) * radius];
}

/**
 * Frames share the back arc, centred on the content wall. Six certificates
 * get a tighter spread and a smaller moulding than the three-frame rooms.
 */
function frameLayouts(count: number): FrameLayout[] {
  if (count === 0) return [];

  const spread = count >= 6 ? 1.05 : 0.55;
  const size: [number, number] =
    count >= 6 ? [0.9, 1.05] : [1.25, 1.45];
  const radius = ROOM_RADIUS - 0.1;

  return Array.from({ length: count }, (_, index) => {
    const angle =
      count === 1
        ? CONTENT_ANGLE
        : CONTENT_ANGLE - spread + (spread * 2 * index) / (count - 1);
    const [x, z] = onCircle(radius, angle);
    return {
      position: [x, 1.68, z],
      rotation: [0, angle + Math.PI, 0],
      size,
    };
  });
}

export function RoomStage({
  room,
  onDoor,
  onOpenLink,
  focusedDoorId,
  opening,
  children,
}: RoomStageProps) {
  const [titleX, titleZ] = onCircle(ROOM_RADIUS - 0.06, CONTENT_ANGLE);
  const layouts = frameLayouts(room.frames.length);

  return (
    <RoomShell
      palette={room.palette}
      wallTexture={WALL_TEXTURE}
      windows={room.windows}
      doorAngles={room.doors.map((door) => door.angle)}
      space={room.space}
    >
      {room.kind === "room" ? (
        <>
          <WallText
            text={room.title}
            position={[titleX, 3.86, titleZ]}
            size={[5.4, 0.56]}
            fontSize={68}
            fontWeight={700}
            color={room.palette.text}
            align="center"
          />

          <WallText
            text={room.intro}
            position={[titleX, 3.22, titleZ]}
            size={[5.4, 0.48]}
            fontSize={30}
            fontWeight={700}
            color={room.palette.text}
            opacity={0.95}
            align="center"
          />
        </>
      ) : null}

      {room.frames.map((frame, index) => {
        const layout = layouts[index];
        if (!layout) return null;
        return (
          <PictureFrame
            key={frame.id}
            position={layout.position}
            rotation={layout.rotation}
            tone={frame.tone}
            trim={room.palette.trim}
            size={layout.size}
            image={frame.image}
            caption={frame.caption}
            href={frame.href}
            onOpenLink={onOpenLink}
          />
        );
      })}

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
