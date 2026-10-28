/**
 * The renderer's per-frame counters, published by a bridge inside the canvas
 * and read by the stats card outside it. A plain object keeps this off React's
 * render path: the numbers change every frame and no component should re-render
 * for them.
 */
export type RenderMetrics = {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

export const renderMetrics: RenderMetrics = {
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
};

export type FrameStats = {
  frames: number;
  totalMs: number;
  worstMs: number;
  longTasks: number;
};

export const frameStats: FrameStats = {
  frames: 0,
  totalMs: 0,
  worstMs: 0,
  longTasks: 0,
};

/** The stats card consumes the window once a second, so the loop stays tiny. */
export function consumeFrameStats(): FrameStats {
  const snapshot = { ...frameStats };
  frameStats.frames = 0;
  frameStats.totalMs = 0;
  frameStats.worstMs = 0;
  frameStats.longTasks = 0;
  return snapshot;
}
