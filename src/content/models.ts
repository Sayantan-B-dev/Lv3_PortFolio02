/**
 * Every model the experience loads, in one place. Rooms reference these keys,
 * and the loader resolves each URL through the active tier, so an asset can
 * never be preloaded under one URL and requested under another.
 */
export const MODELS = {
  frame: "/models/frame.glb",
  floor: "/models/floor.glb",
  rug: "/models/rug.glb",
  ceilingTiles: "/models/ceiling-tiles.glb",
  space1: "/models/space1.glb",
  space2: "/models/space2.glb",
  space3: "/models/space3.glb",
  space4: "/models/space4.glb",
  space5: "/models/space5.glb",
  space6: "/models/space6.glb",
  bookcase: "/models/bookcase.glb",
  classicTable: "/models/classic-table.glb",
  chair: "/models/chair.glb",
  books: "/models/books.glb",
  roundTable: "/models/cake-table.glb",
  victorianTable: "/models/victorian-table.glb",
  player: "/models/player.glb",
  cat: "/models/cat.glb",
  catBox: "/models/cat-box.glb",
  limcaCat: "/models/limca-cat.glb",
} as const;

export type ModelKey = keyof typeof MODELS;

/**
 * Smaller exports for slow connections and touch devices. Every URL must also
 * exist on disk; the file index gives these entries the `low` tier.
 */
export const LOW_MODEL_VARIANTS = {
  books: "/models/books-low.glb",
  classicTable: "/models/classic-table-low.glb",
  player: "/models/player-low.glb",
  victorianTable: "/models/victorian-table-low.glb",
} as const satisfies Partial<Record<ModelKey, string>>;

const LOW_BY_MODEL = new Map<string, string>(
  Object.entries(LOW_MODEL_VARIANTS).map(([key, url]) => [
    MODELS[key as ModelKey],
    url,
  ]),
);

export const LOW_MODEL_URLS: readonly string[] = [
  ...new Set(Object.values(LOW_MODEL_VARIANTS)),
];

/** Maps a logical model URL to its reduced file when the tier asks for one. */
export function getModelUrlForTier(url: string, low: boolean) {
  return low ? (LOW_BY_MODEL.get(url) ?? url) : url;
}

/** Each themed room carries one of the prepared space backdrops. */
export type SpaceId =
  | "space1"
  | "space2"
  | "space3"
  | "space4"
  | "space5"
  | "space6";

export const MODEL_URLS: readonly string[] = Object.values(MODELS);
