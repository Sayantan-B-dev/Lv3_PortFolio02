import type { RoomId } from "./rooms";

export type FurnitureBox = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** Low tables can be jumped onto; taller pieces stay solid walls. */
  standable?: boolean;
};

export const ROUND_TABLE = { x: 0, z: 1.4, height: 0.87 } as const;
export const READING_TABLE = { x: -3.25, z: 0.4, height: 0.82 } as const;
export const READING_CHAIR = { x: -2.35, z: 0.4, height: 0.95 } as const;
export const VICTORIAN_TABLE = { x: -2.2, z: 1.2, height: 0.85 } as const;
export const BOOKCASE = { x: 4.15, z: 0.2, height: 2.7 } as const;

function readingSet(): FurnitureBox[] {
  return [
    {
      id: "reading-table",
      x: READING_TABLE.x,
      z: READING_TABLE.z,
      width: 0.95,
      depth: 1.55,
      height: READING_TABLE.height,
      standable: true,
    },
    {
      id: "reading-chair",
      x: READING_CHAIR.x,
      z: READING_CHAIR.z,
      width: 0.7,
      depth: 0.7,
      height: READING_CHAIR.height,
    },
  ];
}

function bookcaseBox(): FurnitureBox {
  return {
    id: "bookcase",
    x: BOOKCASE.x,
    z: BOOKCASE.z,
    width: 0.46,
    depth: 2.3,
    height: BOOKCASE.height,
  };
}

function roundTableBox(): FurnitureBox {
  return {
    id: "round-table",
    x: ROUND_TABLE.x,
    z: ROUND_TABLE.z,
    width: 1.2,
    depth: 1.2,
    height: ROUND_TABLE.height,
  };
}

function victorianBox(): FurnitureBox {
  return {
    id: "coffee-table",
    x: VICTORIAN_TABLE.x,
    z: VICTORIAN_TABLE.z,
    width: 2.0,
    depth: 0.95,
    height: VICTORIAN_TABLE.height,
    standable: true,
  };
}

export const FURNITURE: Record<RoomId, readonly FurnitureBox[]> = {
  home: [roundTableBox(), bookcaseBox()],
  architect: [...readingSet(), bookcaseBox()],
  gallery: [roundTableBox(), bookcaseBox()],
  core: [...readingSet(), bookcaseBox()],
  journey: [victorianBox(), bookcaseBox()],
  playground: [victorianBox(), roundTableBox()],
  gateway: [roundTableBox(), bookcaseBox()],
};
