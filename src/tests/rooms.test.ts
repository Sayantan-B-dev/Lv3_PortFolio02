import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DOOR_COLORS,
  ROOMS,
  ROOM_FACE_ANGLES,
  ROOM_ORDER,
  START_ROOM,
  THEMED_ROOM_ORDER,
  getDoorLabel,
  getNextRoom,
  type RoomId,
} from "../content/rooms";
import {
  LOW_MODEL_URLS,
  LOW_MODEL_VARIANTS,
  MODELS,
  MODEL_URLS,
  getModelUrlForTier,
} from "../content/models";
import { getMusicTracks } from "../content/music";
import { PROFILE, PROFILE_STATS } from "../content/profile";
import { CERTIFICATIONS } from "../content/portfolio";

describe("room navigation", () => {
  it("lists every configured room exactly once", () => {
    expect([...ROOM_ORDER].sort()).toEqual(Object.keys(ROOMS).sort());
    expect(ROOM_ORDER).toEqual(["home", ...THEMED_ROOM_ORDER]);
  });

  it("starts in the home room", () => {
    expect(START_ROOM).toBe("home");
    expect(ROOMS[START_ROOM].kind).toBe("home");
  });

  it("points every door at a real room", () => {
    for (const id of ROOM_ORDER) {
      for (const door of ROOMS[id].doors) {
        expect(ROOMS[door.destination]).toBeDefined();
      }
    }
  });

  it("gives home one numbered door on every hex face", () => {
    expect(ROOMS.home.doors).toHaveLength(6);
    expect(ROOMS.home.doors.map((door) => door.order)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(ROOMS.home.doors.map((door) => door.angle)).toEqual([
      ...ROOM_FACE_ANGLES,
    ]);
    expect(new Set(ROOMS.home.doors.map((door) => door.destination)).size).toBe(
      6,
    );
  });

  it("gives every themed room one door coloured for its destination", () => {
    for (const id of THEMED_ROOM_ORDER) {
      expect(ROOMS[id].doors).toHaveLength(1);
      const door = ROOMS[id].doors[0];
      expect(door.destination).toBe(getNextRoom(id).id);
      const destinationColor =
        DOOR_COLORS[door.destination as keyof typeof DOOR_COLORS];
      if (destinationColor) expect(door.color).toBe(destinationColor);
      expect(door.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("cycles architect through gateway back to home", () => {
    let room: RoomId = "architect";
    const visited: RoomId[] = [room];

    for (let step = 0; step < THEMED_ROOM_ORDER.length; step += 1) {
      room = ROOMS[room].next ?? "home";
      visited.push(room);
    }

    expect(visited).toEqual([...THEMED_ROOM_ORDER, "home"]);
  });

  it("wraps the gateway portal back to home", () => {
    expect(ROOMS.gateway.doors[0].destination).toBe("home");
    expect(getNextRoom("gateway").id).toBe("home");
  });

  it("derives the displayed door label from the destination", () => {
    for (const id of THEMED_ROOM_ORDER) {
      const destination = getNextRoom(id);
      expect(getDoorLabel(id)).toContain(destination.arrivalTitle);
    }
  });

  it("places the door at the front and content at the back", () => {
    for (const id of THEMED_ROOM_ORDER) {
      expect(ROOMS[id].doors[0].angle).toBe(0);
    }
    expect(ROOMS.home.doors[0].angle).toBe(0);
  });
});

describe("room content", () => {
  it("keeps every frame identified and captioned", () => {
    for (const id of ROOM_ORDER) {
      for (const frame of ROOMS[id].frames) {
        expect(frame.id).toBeTruthy();
        expect(frame.caption).toBeTruthy();
      }
    }
  });

  it("points every photo at a file inside public/", () => {
    const publicDir = resolve(process.cwd(), "public");

    for (const id of ROOM_ORDER) {
      for (const frame of ROOMS[id].frames) {
        if (!frame.image) continue;

        expect(frame.image.startsWith("/")).toBe(true);
        expect(existsSync(resolve(publicDir, frame.image.slice(1)))).toBe(true);
      }
    }
  });

  it("carries no GIF frame that would freeze on a phone", () => {
    const images = ROOM_ORDER.flatMap((id) =>
      ROOMS[id].frames.flatMap((frame) => (frame.image ? [frame.image] : [])),
    );

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.endsWith(".gif")).toBe(false);
    }
  });

  it("keeps the animated frame clips on disk", () => {
    const publicDir = resolve(process.cwd(), "public");
    const clips = ROOM_ORDER.flatMap((id) =>
      ROOMS[id].frames.flatMap((frame) =>
        frame.image && frame.image.endsWith(".mp4") ? [frame.image] : [],
      ),
    );

    expect(clips).toHaveLength(9);
    for (const clip of clips) {
      expect(existsSync(resolve(publicDir, clip.slice(1)))).toBe(true);
    }
  });

  it("links every certificate frame to its source image and verify page", () => {
    const publicDir = resolve(process.cwd(), "public");

    expect(CERTIFICATIONS).toHaveLength(8);
    expect(ROOMS.journey.frames).toHaveLength(6);
    for (const cert of CERTIFICATIONS) {
      expect(cert.image.startsWith("/certificates/")).toBe(true);
      expect(existsSync(resolve(publicDir, cert.image.slice(1)))).toBe(true);
      expect(cert.url.startsWith("https://")).toBe(true);
    }
  });

  it("points every project frame at a live link", () => {
    for (const frame of ROOMS.gallery.frames) {
      expect(frame.href).toMatch(/^https:\/\//);
    }
  });

  it("keeps every sticky note identified and readable", () => {
    for (const id of ROOM_ORDER) {
      const ids = ROOMS[id].notes.map((note) => note.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const note of ROOMS[id].notes) {
        expect(note.id).toBeTruthy();
        expect(note.label.trim()).not.toBe("");
        expect(note.message.trim().length).toBeGreaterThan(12);
      }
    }
  });

  it("puts notes where a table carries them", () => {
    expect(ROOMS.home.notes).toHaveLength(1);
    expect(ROOMS.architect.notes).toHaveLength(3);
    expect(ROOMS.gallery.notes).toHaveLength(3);
    expect(ROOMS.core.notes).toHaveLength(3);
    expect(ROOMS.journey.notes).toHaveLength(3);
    expect(ROOMS.playground.notes).toHaveLength(3);
    expect(ROOMS.gateway.notes).toHaveLength(3);
  });

  it("chooses a readable wall-copy colour per room", () => {
    for (const id of ROOM_ORDER) {
      expect(ROOMS[id].palette.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(ROOMS[id].palette.text).not.toBe(ROOMS[id].palette.wall);
    }
  });

  it("seals home and gives every themed room four windows", () => {
    expect(ROOMS.home.space).toBeNull();
    expect(ROOMS.home.windows).toHaveLength(0);
    const windowAngles = ROOM_FACE_ANGLES.filter(
      (angle) => angle !== 0 && angle !== Math.PI,
    );
    for (const id of THEMED_ROOM_ORDER) {
      expect(ROOMS[id].windows).toEqual(windowAngles);
    }

    const spaces = THEMED_ROOM_ORDER.map((id) => ROOMS[id].space);
    expect(new Set(spaces).size).toBe(THEMED_ROOM_ORDER.length);
    for (const space of spaces) {
      expect(space).not.toBeNull();
      expect(MODELS[space!]).toMatch(/^\/models\/space[1-6]\.glb$/);
    }
  });
});

describe("assets", () => {
  it("points every room model at a file inside public/models", () => {
    const srcDir = resolve(process.cwd(), "src");
    const publicDir = resolve(process.cwd(), "public");
    const urls = new Set<string>();

    for (const file of readdirSync(srcDir, { recursive: true, encoding: "utf8" })) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;

      const source = readFileSync(resolve(srcDir, file), "utf8");
      for (const match of source.matchAll(/["'`](\/models\/[^"'`]+\.glb)["'`]/g)) {
        urls.add(match[1]);
      }
    }

    expect(urls.size).toBeGreaterThan(0);
    for (const url of urls) {
      expect(existsSync(resolve(publicDir, url.slice(1)))).toBe(true);
    }
  });

  it("keeps every manifest model on disk and unique", () => {
    const publicDir = resolve(process.cwd(), "public");

    expect(new Set(MODEL_URLS).size).toBe(MODEL_URLS.length);
    for (const url of MODEL_URLS) {
      expect(existsSync(resolve(publicDir, url.slice(1)))).toBe(true);
    }
  });

  it("keeps the preload index complete, scoped and truthful", () => {
    const publicDir = resolve(process.cwd(), "public");
    const index = JSON.parse(
      readFileSync(resolve(publicDir, "fetch_file_index.json"), "utf8"),
    ) as {
      totalFiles: number;
      files: Array<{
        index: number;
        type: string;
        scope: string;
        tier: string;
        url: string;
        size: number;
        sizeLabel: string;
        niceName: string;
      }>;
    };

    expect(index.totalFiles).toBe(index.files.length);

    const urls = new Set<string>();
    const scopes = new Set<string>(["shared", ...ROOM_ORDER]);

    index.files.forEach((file, position) => {
      expect(file.index).toBe(position);
      if (position > 0) {
        expect(index.files[position - 1].size).toBeGreaterThanOrEqual(file.size);
      }
      expect(["both", "low", "high"]).toContain(file.tier);
      expect(file.url.startsWith("/")).toBe(true);
      expect(scopes.has(file.scope)).toBe(true);
      expect(file.niceName.length).toBeGreaterThan(0);
      expect(urls.has(file.url)).toBe(false);
      urls.add(file.url);

      const sizeLabel =
        file.size >= 1e6
          ? `${(file.size / 1e6).toFixed(2)} MB`
          : file.size >= 1e3
            ? `${Math.round(file.size / 1e3)} KB`
            : `${file.size} B`;
      expect(file.sizeLabel).toBe(sizeLabel);

      // A stale size would make the intro's per-file dispatch lie.
      const disk = resolve(publicDir, file.url.slice(1));
      expect(existsSync(disk)).toBe(true);
      expect(readFileSync(disk).byteLength).toBe(file.size);
    });

    const lowUrls = new Set(LOW_MODEL_URLS);
    for (const url of lowUrls) expect(urls.has(url)).toBe(true);

    for (const [key, lowUrl] of Object.entries(LOW_MODEL_VARIANTS)) {
      const highUrl = MODELS[key as keyof typeof MODELS];
      expect(index.files.find((file) => file.url === highUrl)?.tier).toBe("high");
      expect(index.files.find((file) => file.url === lowUrl)?.tier).toBe("low");
      expect(getModelUrlForTier(highUrl, true)).toBe(lowUrl);
      expect(getModelUrlForTier(highUrl, false)).toBe(highUrl);
    }

    for (const file of index.files) {
      if (file.tier === "low") expect(lowUrls.has(file.url)).toBe(true);
    }

    for (const url of MODEL_URLS) expect(urls.has(url)).toBe(true);
    for (const id of ROOM_ORDER) {
      for (const frame of ROOMS[id].frames) {
        if (frame.image) expect(urls.has(frame.image)).toBe(true);
      }
    }
  });

  it("ships the Draco decoder for the reduced exports", () => {
    const publicDir = resolve(process.cwd(), "public");

    for (const file of [
      "draco/draco_decoder.wasm",
      "draco/draco_wasm_wrapper.js",
      "draco/draco_decoder.js",
    ]) {
      expect(existsSync(resolve(publicDir, file))).toBe(true);
    }
  });
});

describe("profile and media", () => {
  it("uses the supplied profile details", () => {
    expect(PROFILE.name.trim().length).toBeGreaterThan(0);
    expect(PROFILE.role.trim().length).toBeGreaterThan(0);
    expect(PROFILE.email).toContain("@");
    expect(PROFILE_STATS.length).toBe(3);
  });

  it("plays every file in the music folder in alphabetical order", () => {
    const musicDir = resolve(process.cwd(), "public", "music");
    const tracks = getMusicTracks();
    const files = readdirSync(musicDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(entry.name),
      )
      .map((entry) => `/music/${encodeURIComponent(entry.name)}`)
      .sort((first, second) =>
        first.localeCompare(second, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

    expect(tracks.map((track) => track.url)).toEqual(files);
    expect(tracks.every((track) => track.title.length > 0)).toBe(true);
    for (const track of tracks) {
      expect(
        existsSync(resolve(process.cwd(), "public", decodeURIComponent(track.url.slice(1)))),
      ).toBe(true);
    }
  });

  it("keeps the playground video on disk", () => {
    expect(ROOMS.playground.video).toBe("/vid/oiiaoiia.mp4");
    expect(
      existsSync(resolve(process.cwd(), "public", "vid", "oiiaoiia.mp4")),
    ).toBe(true);
  });

  it("keeps the interaction sounds on disk", () => {
    const publicDir = resolve(process.cwd(), "public");

    for (const file of [
      "sfx/oiia-oiia-sound.mp3",
      "sfx/pop_7e9Is8L.mp3",
      "sfx/chikns-cute-yipee.mp3",
      "sfx/cs2-walking-sfx.mp3",
      "sfx/nom-nom-nom_gPJiWn4.mp3",
      "sfx/fnaf-4-door-opening.mp3",
      "sfx/book-opening.mp3",
      "sfx/ta-da_yrvBrlS.mp3",
    ]) {
      expect(existsSync(resolve(publicDir, file))).toBe(true);
    }
  });
});
