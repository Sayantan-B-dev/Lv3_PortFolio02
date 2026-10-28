"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { WanderingCats } from "@/components/WanderingCats";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { Floating } from "@/components/Floating";
import { MODELS } from "@/content/models";
import { BOOKCASE, ROUND_TABLE } from "@/content/layout";

export function HomeRoom({
  room,
  onDoor,
  onOpenLink,
  onOpenMap,
  onReadNote,
  focusedDoorId,
  opening,
  onPetCat,
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
      <WanderingCats onPet={onPetCat} />

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

        {room.notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            position={[0, ROUND_TABLE.height + 0.006, 0]}
            yaw={-0.2}
            size={0.24}
            onRead={onReadNote}
          />
        ))}
      </Floating>
    </RoomStage>
  );
}
