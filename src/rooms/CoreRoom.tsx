"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { Floating } from "@/components/Floating";
import { MODELS } from "@/content/models";
import { BOOKCASE, READING_CHAIR, READING_TABLE } from "@/content/layout";

const NOTE_SPOTS = [
  { x: READING_TABLE.x - 0.24, z: READING_TABLE.z - 0.28, yaw: -0.22, paper: "#cfe1ef" },
  { x: READING_TABLE.x + 0.12, z: READING_TABLE.z + 0.06, yaw: 0.06, paper: "#f6e6a8" },
  { x: READING_TABLE.x + 0.3, z: READING_TABLE.z + 0.4, yaw: 0.28, paper: "#f4cfc7" },
] as const;

export function CoreRoom({
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
        position={[READING_TABLE.x, 0.1, READING_TABLE.z]}
        drift={0.14}
        bob={0.1}
        tilt={0.015}
        phase={2.1}
        pushId="reading-table"
      >
        <Model
          url={MODELS.classicTable}
          fit="height"
          size={READING_TABLE.height}
          position={[0, 0, 0]}
        />

        <Model
          url={MODELS.books}
          fit="width"
          size={0.75}
          position={[-0.02, READING_TABLE.height, -0.06]}
          rotation={[0, 0.3, 0]}
          shadows={false}
        />

        {room.notes.map((note, index) => {
          const spot = NOTE_SPOTS[index % NOTE_SPOTS.length];
          return (
            <StickyNote
              key={note.id}
              note={note}
              position={[
                spot.x - READING_TABLE.x,
                READING_TABLE.height + 0.006,
                spot.z - READING_TABLE.z,
              ]}
              yaw={spot.yaw}
              paper={spot.paper}
              size={0.2}
              onRead={onReadNote}
            />
          );
        })}
      </Floating>

      <Floating
        position={[READING_CHAIR.x, 0.14, READING_CHAIR.z]}
        drift={0.2}
        bob={0.12}
        tilt={0.025}
        phase={4.3}
        pushId="reading-chair"
      >
        <Model
          url={MODELS.chair}
          fit="height"
          size={READING_CHAIR.height}
          position={[0, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          merge
          shadows={false}
        />
      </Floating>
    </RoomStage>
  );
}
