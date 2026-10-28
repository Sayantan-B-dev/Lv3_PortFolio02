"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { Floating } from "@/components/Floating";
import { MODELS } from "@/content/models";
import { BOOKCASE, VICTORIAN_TABLE } from "@/content/layout";

const SEAT = VICTORIAN_TABLE.height - 0.01;
const NOTE_Y = SEAT + 0.016;

const NOTE_SPOTS = [
  { x: VICTORIAN_TABLE.x - 0.55, z: VICTORIAN_TABLE.z - 0.02, yaw: -0.24, paper: "#f6e6a8" },
  { x: VICTORIAN_TABLE.x - 0.1, z: VICTORIAN_TABLE.z + 0.08, yaw: 0.04, paper: "#f4cfc7" },
  { x: VICTORIAN_TABLE.x + 0.42, z: VICTORIAN_TABLE.z - 0.04, yaw: 0.28, paper: "#cfe1ef" },
] as const;

export function JourneyRoom({
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
        position={[VICTORIAN_TABLE.x, 0.1, VICTORIAN_TABLE.z]}
        drift={0.14}
        bob={0.1}
        tilt={0.015}
        phase={2.1}
        pushId="coffee-table"
      >
        <Model
          url={MODELS.victorianTable}
          fit="height"
          size={VICTORIAN_TABLE.height}
          position={[0, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          merge
        />

        {room.notes.map((note, index) => {
          const spot = NOTE_SPOTS[index % NOTE_SPOTS.length];
          return (
            <StickyNote
              key={note.id}
              note={note}
              position={[
                spot.x - VICTORIAN_TABLE.x,
                NOTE_Y,
                spot.z - VICTORIAN_TABLE.z,
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
