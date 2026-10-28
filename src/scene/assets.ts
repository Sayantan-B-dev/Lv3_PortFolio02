"use client";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import {
  CanvasTexture,
  Mesh,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type AnimationClip,
  type Material,
  type Object3D,
} from "three";
import { ROOM_ORDER, START_ROOM, type RoomId } from "@/content/rooms";
import { getModelUrlForTier } from "@/content/models";
import {
  mergeModelByMaterial,
  prepareModel,
  type PrepareOptions,
} from "@/components/modelUtils";

/** `shared` is needed by every room; the rest match a room id. */
export type AssetScope = "shared" | RoomId;

export type RoomLoadStatus = "pending" | "loading" | "ready";

/** `low` swaps in the reduced model exports for slow links and touch devices. */
export type AssetTier = "low" | "high";

export type AssetState = {
  /** True once the shared files and the starting room are cached. */
  ready: boolean;
  /** 0–100, divided into one equal section per file the intro waits for. */
  percent: number;
  completed: number;
  count: number;
  current: string;
  failed: number;
  /** Per-room readiness, so the door can wait for its destination. */
  rooms: Record<RoomId, RoomLoadStatus>;
  roomProgress: Record<RoomId, number>;
};

export type FileIndexEntry = {
  index: number;
  type: "model" | "image" | "video";
  scope: AssetScope;
  /** `both` means the file is needed by every tier. */
  tier: AssetTier | "both";
  url: string;
  size: number;
  /** Human-readable copy of `size`, e.g. "4.69 MB"; display only. */
  sizeLabel: string;
  niceName: string;
};

export type FileIndex = {
  version: number;
  totalFiles: number;
  files: FileIndexEntry[];
};

/** 1024² source textures are capped here so huge skyboxes stay affordable. */
export const MODEL_TEXTURE_SIZE = 1024;
const IMAGE_TEXTURE_SIZE = 1024;

const modelCache = new Map<string, Object3D>();
const animationCache = new Map<string, readonly AnimationClip[]>();
const imageCache = new Map<string, Texture>();
/** Downloaded tracks and clips: the blob URL is what actually plays. */
const mediaCache = new Map<string, string>();
const mediaRequests = new Map<string, Promise<void>>();
const preparedCache = new Map<string, Object3D>();
const mergedCache = new Map<string, Object3D>();
const optimisedTextures = new WeakMap<Texture, Texture>();

let indexPromise: Promise<FileIndexEntry[]> | null = null;
let startRoomId: RoomId = START_ROOM;
let failedCount = 0;
let activeTier: AssetTier | null = null;

/**
 * One tier per page load: a metered/slow connection or a touch device gets the
 * reduced exports. Cached so a connection change mid-session cannot swap URLs
 * under a half-built cache.
 */
export function getAssetTier(): AssetTier {
  activeTier ??= detectTier();
  return activeTier;
}

function detectTier(): AssetTier {
  if (typeof window === "undefined") return "high";

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (connection?.saveData) return "low";
  if (/^(slow-)?2g$|^3g$/.test(connection?.effectiveType ?? "")) return "low";
  if (window.matchMedia?.("(pointer: coarse)").matches) return "low";

  return "high";
}

function matchesTier(file: FileIndexEntry) {
  // An older cached index has no tier field; keeping those files loads the
  // full exports instead of an empty room.
  return !file.tier || file.tier === "both" || file.tier === getAssetTier();
}

function resolveModelUrl(url: string) {
  return getModelUrlForTier(url, getAssetTier() === "low");
}

const roomPromises = new Map<RoomId, Promise<void>>();

function roomStatusMap(status: RoomLoadStatus) {
  return Object.fromEntries(
    ROOM_ORDER.map((id) => [id, status]),
  ) as Record<RoomId, RoomLoadStatus>;
}

function roomProgressMap(progress: number) {
  return Object.fromEntries(
    ROOM_ORDER.map((id) => [id, progress]),
  ) as Record<RoomId, number>;
}

let assetState: AssetState = {
  ready: false,
  percent: 0,
  completed: 0,
  count: 0,
  current: "",
  failed: 0,
  rooms: roomStatusMap("pending"),
  roomProgress: roomProgressMap(0),
};

const listeners = new Set<(state: AssetState) => void>();
let preloadPromise: Promise<void> | null = null;

/**
 * Resolve the public folder root at runtime so the JSON index can be fetched
 * from the same origin as the other assets without a hard-coded base path.
 */
function publicUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const base = window.location.origin;
  return `${base}${path}`;
}

async function loadFileIndex(): Promise<FileIndexEntry[]> {
  const response = await fetch(publicUrl("/fetch_file_index.json"));
  if (!response.ok) throw new Error(`HTTP ${response.status} loading file index`);
  const index: FileIndex = await response.json();
  return index.files;
}

/** ONE index fetch shared by the intro gate and the background room warmers. */
function getIndex() {
  indexPromise ??= loadFileIndex();
  return indexPromise;
}

/** Smallest-file-first dispatch so the progress bar fills from the quick wins. */
function dispatchOrder(files: FileIndexEntry[]): FileIndexEntry[] {
  return [...files].sort((a, b) => a.size - b.size);
}

export function getAssetState() {
  return assetState;
}

export function subscribeAssets(listener: (state: AssetState) => void) {
  listeners.add(listener);
  listener(assetState);
  return () => {
    listeners.delete(listener);
  };
}

function publish(patch: Partial<AssetState>) {
  assetState = { ...assetState, ...patch };
  for (const listener of listeners) listener(assetState);
}

/** Keep the decode peak low: all-at-once GLB loads hold several textures at once. */
async function runLimited(tasks: (() => Promise<void>)[], limit: number) {
  let next = 0;

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (next < tasks.length) {
        const index = next;
        next += 1;
        await tasks[index]();
      }
    },
  );

  await Promise.all(workers);
}

export function preloadAssets(startRoom: RoomId = START_ROOM): Promise<void> {
  if (preloadPromise) return preloadPromise;

  startRoomId = startRoom;
  preloadPromise = runPreload(startRoom).catch((error) => {
    console.error("Asset preload failed", error);
    publish({ ready: true, percent: 100 });
  });

  return preloadPromise;
}

async function runPreload(startRoom: RoomId) {
  const files = await getIndex();
  // Only the shared files plus the room the visitor lands in are allowed to block the
  // intro. The door order is walked in the background after the reveal.
  const gate = files.filter(
    (file) =>
      (file.scope === "shared" || file.scope === startRoom) && matchesTier(file),
  );
  const dispatch = dispatchOrder(gate);
  const cores = navigator.hardwareConcurrency ?? 4;
  const limit = Math.max(3, Math.min(6, cores));

  publish({
    count: dispatch.length,
    completed: 0,
    percent: 0,
    current: dispatch[0]?.niceName ?? "",
    failed: failedCount,
  });

  let completed = 0;
  let lastPublish = 0;

  const tasks = dispatch.map((entry) => async () => {
    await loadEntry(entry);
    completed += 1;

    const now = performance.now();
    const final = completed === dispatch.length;
    if (!final && now - lastPublish < 80) return;
    lastPublish = now;

    publish({
      percent: Math.min(100, Math.round((completed / dispatch.length) * 100)),
      completed,
      count: dispatch.length,
      current: entry.niceName,
      failed: failedCount,
    });
  });

  await runLimited(tasks, limit);

  publish({
    ready: true,
    percent: 100,
    completed: dispatch.length,
    count: dispatch.length,
    current: "",
    failed: failedCount,
  });

  publishRoom(startRoom, "ready", 100);

  // Let the reveal paint before the other rooms compete for bandwidth.
  window.setTimeout(() => {
    void warmOtherRooms(startRoom);
  }, 1400);
}

/** Every room except the one already cached, in door order. */
async function warmOtherRooms(startRoom: RoomId) {
  for (const room of ROOM_ORDER) {
    if (room === startRoom) continue;
    await loadRoom(room);
  }
}

/**
 * Load one room's files at low concurrency. Safe to call early: the promise is
 * cached, so a door click while the warmer is mid-room just awaits the same run.
 */
function loadRoom(room: RoomId): Promise<void> {
  if (room === startRoomId) return preloadPromise ?? Promise.resolve();

  const existing = roomPromises.get(room);
  if (existing) return existing;

  const promise = (async () => {
    const files = (await getIndex()).filter(
      (file) => file.scope === room && matchesTier(file),
    );
    if (files.length === 0) {
      publishRoom(room, "ready", 100);
      return;
    }

    publishRoom(room, "loading", 0);
    const dispatch = dispatchOrder(files);
    let done = 0;

    await runLimited(
      dispatch.map((entry) => async () => {
        await loadEntry(entry);
        done += 1;
        publishRoom(
          room,
          "loading",
          Math.round((done / dispatch.length) * 100),
        );
      }),
      2,
    );

    publishRoom(room, "ready", 100);
  })().catch((error) => {
    // A failed room still opens its door; the missing prop is the only loss.
    console.warn(`Could not warm ${room}`, error);
    publishRoom(room, "ready", 100);
  });

  roomPromises.set(room, promise);
  return promise;
}

/** Resolves when a room is cached, or immediately if it already is. */
export function whenRoomReady(room: RoomId): Promise<void> {
  return loadRoom(room);
}

function publishRoom(
  room: RoomId,
  status: RoomLoadStatus,
  progress: number,
) {
  publish({
    rooms: { ...assetState.rooms, [room]: status },
    roomProgress: { ...assetState.roomProgress, [room]: progress },
    failed: failedCount,
  });
}

let gltfLoader: GLTFLoader | null = null;

function getGltfLoader() {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    // The reduced exports are Draco-compressed. The decoder files live in
    // public/draco and are fetched only when a Draco file is actually parsed.
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(draco);
  }
  return gltfLoader;
}

/** One file, no state. Returns false when the loader gave up so callers can count. */
async function loadEntry(entry: FileIndexEntry) {
  try {
    if (entry.type === "model") {
      const gltf = await getGltfLoader().loadAsync(entry.url);

      try {
        optimiseScene(gltf.scene);
      } catch (error) {
        console.warn(`Could not optimise ${entry.url}`, error);
      }

      modelCache.set(entry.url, gltf.scene);
      animationCache.set(entry.url, gltf.animations ?? []);
    } else if (entry.type === "image") {
      const texture = await new TextureLoader().loadAsync(entry.url);

      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 1;
      const optimised = optimiseTexture(texture, IMAGE_TEXTURE_SIZE);
      if (optimised !== texture) disposeTexture(texture);
      imageCache.set(entry.url, optimised);
    } else {
      await cacheMediaFile(entry.url);
    }

    return true;
  } catch (error) {
    failedCount += 1;
    console.warn(`Could not load ${entry.url}`, error);
    return false;
  }
}

/** Throws when the file failed; the model/frame boundary turns that into a gap. */
/** Null while the cache is empty (HMR re-evaluates this module mid-scene). */
export function getModelScene(url: string) {
  url = resolveModelUrl(url);
  const scene = modelCache.get(url);
  if (!scene) return null;
  return scene;
}

export function getModelAnimations(url: string) {
  url = resolveModelUrl(url);
  return animationCache.get(url) ?? [];
}

/** Null while the cache is empty (HMR re-evaluates this module mid-scene). */
export function getImageTexture(url: string) {
  const texture = imageCache.get(url);
  if (!texture) return null;
  return texture;
}

async function cacheMediaFile(
  url: string,
  onProgress?: (loaded: number) => void,
) {
  if (mediaCache.has(url)) return;

  const pending = mediaRequests.get(url);
  if (pending) {
    await pending;
    return;
  }

  const request = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const type = response.headers.get("content-type") || "audio/mpeg";
    const reader = response.body?.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new Uint8Array(value));
        loaded += value.byteLength;
        onProgress?.(loaded);
      }
    }

    const blob = reader ? new Blob(chunks, { type }) : await response.blob();
    mediaCache.set(url, URL.createObjectURL(blob));
  })();

  mediaRequests.set(url, request);
  try {
    await request;
  } finally {
    mediaRequests.delete(url);
  }
}

/** Fetch the next tracks quietly, outside the intro's progress total. */
export async function preloadMusic(urls: readonly string[]) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cacheMediaFile(url);
      } catch (error) {
        console.warn(`Could not preload music ${url}`, error);
      }
    }),
  );
}

/** Prefer the already-downloaded blob; fall back to the network URL on failure. */
function getMediaUrl(url: string) {
  return mediaCache.get(url) ?? url;
}

export function getMusicPlaybackUrl(url: string) {
  return getMediaUrl(url);
}

export function getVideoUrl(url: string) {
  return getMediaUrl(url);
}

function prepareKey(url: string, options: PrepareOptions) {
  return JSON.stringify([
    url,
    options.size,
    options.fit ?? "height",
    options.stretch ?? null,
    options.repeat ?? null,
    options.tint ?? null,
    options.emissive ?? null,
    options.emissiveIntensity ?? null,
    options.hide ? [options.hide.source, options.hide.flags] : null,
    Boolean(options.merge),
    options.shadows !== false,
  ]);
}

/**
 * The prepared template is built once per option set and then cloned. Clones
 * share geometry and materials, so four windows or eight frames cost one copy
 * of the data instead of four or eight.
 */
export function getPreparedModel(url: string, options: PrepareOptions) {
  url = resolveModelUrl(url);
  const scene = getModelScene(url);
  if (!scene) return null;

  const key = prepareKey(url, options);
  let template = preparedCache.get(key);

  if (!template) {
    template = prepareModel(scene, options);
    preparedCache.set(key, template);
  }

  return template.clone(true);
}

/** The avatar's many meshes are merged once and cloned into each preview. */
export function getMergedModel(url: string) {
  url = resolveModelUrl(url);
  const scene = getModelScene(url);
  if (!scene) return null;

  let template = mergedCache.get(url);

  if (!template) {
    template = scene.clone(true);
    template.updateMatrixWorld(true);
    mergeModelByMaterial(template);
    mergedCache.set(url, template);
  }

  return template.clone(true);
}

function optimiseScene(root: Object3D) {
  const materials = new Set<Material>();

  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) materials.add(material);
  });

  const replaced = new Set<Texture>();

  const optimiseValue = (value: unknown): unknown => {
    if (value instanceof Texture) {
      const optimised = optimiseTexture(value, MODEL_TEXTURE_SIZE);
      if (optimised !== value) replaced.add(value);
      return optimised;
    }

    if (
      Array.isArray(value) &&
      value.some((item) => item instanceof Texture)
    ) {
      return value.map(optimiseValue);
    }

    return value;
  };

  for (const material of materials) {
    const fields = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(fields)) {
      const current = fields[key];
      const optimised = optimiseValue(current);
      if (optimised !== current) fields[key] = optimised;
    }
    material.needsUpdate = true;
  }

  // Two texture slots can point at the same decoded image. Never close an
  // image that a surviving texture still needs.
  const liveImages = new Set<unknown>();
  const collectLive = (value: unknown) => {
    if (value instanceof Texture) {
      if (value.image) liveImages.add(value.image);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collectLive(item);
    }
  };

  for (const material of materials) {
    const fields = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(fields)) collectLive(fields[key]);
  }

  const closedImages = new Set<unknown>();
  for (const texture of replaced) {
    const image = texture.image as unknown;
    if (image && liveImages.has(image)) {
      texture.dispose();
      continue;
    }
    if (image && closedImages.has(image)) {
      texture.dispose();
      continue;
    }
    if (image) closedImages.add(image);
    disposeTexture(texture);
  }
}

function optimiseTexture(source: Texture, maxSize: number) {
  const cached = optimisedTextures.get(source);
  if (cached) return cached;

  const image = source.image as
    | (CanvasImageSource & { width?: number; height?: number })
    | null;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;

  source.anisotropy = 1;

  if (!image || !width || !height || Math.max(width, height) <= maxSize) {
    optimisedTextures.set(source, source);
    return source;
  }

  const scale = maxSize / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    optimisedTextures.set(source, source);
    return source;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const optimised = new CanvasTexture(canvas);
  optimised.colorSpace = source.colorSpace;
  optimised.wrapS = source.wrapS;
  optimised.wrapT = source.wrapT;
  optimised.magFilter = source.magFilter;
  optimised.minFilter = source.minFilter;
  optimised.flipY = source.flipY;
  optimised.repeat.copy(source.repeat);
  optimised.offset.copy(source.offset);
  optimised.center.copy(source.center);
  optimised.rotation = source.rotation;
  optimised.premultiplyAlpha = source.premultiplyAlpha;
  optimised.anisotropy = 1;
  optimised.needsUpdate = true;

  optimisedTextures.set(source, optimised);
  return optimised;
}

function disposeTexture(texture: Texture) {
  const image = texture.image as { close?: () => void } | null;
  image?.close?.();
  texture.dispose();
}

