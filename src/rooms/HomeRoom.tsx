"use client";

import type { RoomViewProps } from "@/components/RoomStage";
import { RoomStage } from "@/components/RoomStage";
import { WanderingCats } from "@/components/WanderingCats";
import { StickyNote } from "@/components/StickyNote";
import { Model } from "@/components/Model";
import { MODELS } from "@/content/models";
import { BOOKCASE, ROUND_TABLE } from "@/content/layout";

export function HomeRoom({
  room,
  onDoor,
  onOpenLink,
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
      focusedDoorId={focusedDoorId}
      opening={opening}
    >
      <WanderingCats onPet={onPetCat} />

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

      {room.notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          position={[ROUND_TABLE.x, ROUND_TABLE.height + 0.006, ROUND_TABLE.z]}
          yaw={-0.2}
          size={0.24}
          onRead={onReadNote}
        />
      ))}
    </RoomStage>
  );
}
