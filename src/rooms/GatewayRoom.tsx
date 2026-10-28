"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { MODELS } from "@/content/models";
import { BOOKCASE, ROUND_TABLE } from "@/content/layout";

const NOTE_SPOTS = [
  { x: ROUND_TABLE.x - 0.3, z: ROUND_TABLE.z - 0.12, yaw: -0.22, paper: "#c7e0d8" },
  { x: ROUND_TABLE.x, z: ROUND_TABLE.z + 0.12, yaw: 0.04, paper: "#f6e6a8" },
  { x: ROUND_TABLE.x + 0.3, z: ROUND_TABLE.z - 0.08, yaw: 0.26, paper: "#cfe1ef" },
] as const;

export function GatewayRoom({
  room,
  onDoor,
  onOpenLink,
  onReadNote,
  focusedDoorId,
  opening,
}: RoomViewProps) {
  return (
    <RoomStage
      room={room}
      onDoor={onDoor}
      onOpenLink={onOpenLink}
      focusedDoorId={focusedDoorId}
      opening={opening}
    >
      <Model
        url={MODELS.bookcase}
        fit="height"
        size={BOOKCASE.height}
        position={[BOOKCASE.x, 0, BOOKCASE.z]}
        rotation={[0, -Math.PI / 2, 0]}
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
            position={[spot.x, ROUND_TABLE.height + 0.006, spot.z]}
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
