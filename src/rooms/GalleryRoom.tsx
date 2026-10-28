"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { Floating } from "@/components/Floating";
import { MODELS } from "@/content/models";
import { BOOKCASE, ROUND_TABLE } from "@/content/layout";

const NOTE_SPOTS = [
  { x: ROUND_TABLE.x - 0.3, z: ROUND_TABLE.z - 0.1, yaw: -0.24, paper: "#f6e6a8" },
  { x: ROUND_TABLE.x, z: ROUND_TABLE.z + 0.1, yaw: 0.04, paper: "#f4cfc7" },
  { x: ROUND_TABLE.x + 0.3, z: ROUND_TABLE.z - 0.06, yaw: 0.26, paper: "#cfe1ef" },
] as const;

export function GalleryRoom({
  room,
  onDoor,
  onOpenLink,
  onOpenMap,
  onReadNote,
  focusedDoorId,
  opening,
}: RoomViewProps) {
  return (
    <RoomStage
      room={room}
      onDoor={onDoor}
      onOpenLink={onOpenLink}
      onOpenMap={onOpenMap}
      focusedDoorId={focusedDoorId}
      opening={opening}
    >
      <Floating
        position={[BOOKCASE.x, 0.12, BOOKCASE.z]}
        drift={0.24}
        bob={0.16}
        tilt={0.03}
        phase={0.7}
        pushId="bookcase"
      >
        <Model
          url={MODELS.bookcase}
          fit="height"
          size={BOOKCASE.height}
          position={[0, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          merge
        />
      </Floating>

      <Floating
        position={[ROUND_TABLE.x, 0.1, ROUND_TABLE.z]}
        drift={0.14}
        bob={0.1}
        tilt={0.015}
        phase={2.1}
        pushId="round-table"
      >
        <Model
          url={MODELS.roundTable}
          fit="height"
          size={ROUND_TABLE.height}
          position={[0, 0, 0]}
          merge
          shadows={false}
        />

        {room.notes.map((note, index) => {
          const spot = NOTE_SPOTS[index % NOTE_SPOTS.length];
          return (
            <StickyNote
              key={note.id}
              note={note}
              position={[
                spot.x - ROUND_TABLE.x,
                ROUND_TABLE.height + 0.006,
                spot.z - ROUND_TABLE.z,
              ]}
              yaw={spot.yaw}
              paper={spot.paper}
              size={0.2}
              onRead={onReadNote}
            />
          );
        })}
      </Floating>
    </RoomStage>
  );
}
