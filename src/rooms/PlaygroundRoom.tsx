"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { FloatingCats } from "@/components/FloatingCats";
import { SpaceTheater } from "@/components/SpaceTheater";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { MODELS } from "@/content/models";
import { ROUND_TABLE, VICTORIAN_TABLE } from "@/content/layout";

const SEAT = VICTORIAN_TABLE.height - 0.01;
const NOTE_Y = SEAT + 0.016;

const NOTE_SPOTS = [
  { x: VICTORIAN_TABLE.x - 0.55, z: VICTORIAN_TABLE.z - 0.02, yaw: -0.24, paper: "#cfe1ef" },
  { x: VICTORIAN_TABLE.x - 0.1, z: VICTORIAN_TABLE.z + 0.08, yaw: 0.04, paper: "#f4cfc7" },
  { x: VICTORIAN_TABLE.x + 0.42, z: VICTORIAN_TABLE.z - 0.04, yaw: 0.28, paper: "#f6e6a8" },
] as const;

export function PlaygroundRoom({
  room,
  onDoor,
  onOpenLink,
  onReadNote,
  focusedDoorId,
  opening,
  paused,
  onCatLookChange,
  onTheaterChange,
}: RoomViewProps) {
  return (
    <RoomStage
      room={room}
      onDoor={onDoor}
      onOpenLink={onOpenLink}
      focusedDoorId={focusedDoorId}
      opening={opening}
    >
      <FloatingCats paused={paused} onLookChange={onCatLookChange} />

      <SpaceTheater
        videoUrl={room.video ?? "/vid/oiiaoiia.mp4"}
        onPlayingChange={onTheaterChange}
      />

      <Model
        url={MODELS.victorianTable}
        fit="height"
        size={VICTORIAN_TABLE.height}
        position={[VICTORIAN_TABLE.x, 0, VICTORIAN_TABLE.z]}
        rotation={[0, Math.PI / 2, 0]}
        merge
      />

      <Model
        url={MODELS.roundTable}
        fit="height"
        size={ROUND_TABLE.height}
        position={[ROUND_TABLE.x, 0, ROUND_TABLE.z]}
        merge
        shadows={false}
      />

      {room.notes.map((note, index) => {
        const spot = NOTE_SPOTS[index % NOTE_SPOTS.length];
        return (
          <StickyNote
            key={note.id}
            note={note}
            position={[spot.x, NOTE_Y, spot.z]}
            yaw={spot.yaw}
            paper={spot.paper}
            size={0.2}
            onRead={onReadNote}
          />
        );
      })}
    </RoomStage>
  );
}
