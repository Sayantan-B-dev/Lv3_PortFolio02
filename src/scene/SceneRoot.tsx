"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { setConsoleFunction } from "three";
import type { MusicTrack } from "@/content/music";
import { CONTENT } from "@/content/config";
import {
  ROOMS,
  ROOM_ORDER,
  START_ROOM,
  type DoorSpec,
  type NoteContent,
  type RoomContent,
  type RoomId,
} from "@/content/rooms";
import { DoorChoice } from "@/components/DoorChoice";
import { IntroOverlay } from "@/components/IntroOverlay";
import { NoteCard } from "@/components/NoteCard";
import { OptionsDialog } from "@/components/OptionsDialog";
import { OrientationGate, useTouchPortrait } from "@/components/OrientationGate";
import { PauseOverlay } from "@/components/PauseOverlay";
import { ProfileCard } from "@/components/ProfileCard";
import { RenderMetricsBridge, StatsMonitor } from "@/components/StatsMonitor";
import { TouchJoystick } from "@/components/TouchJoystick";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ArchitectRoom } from "@/rooms/ArchitectRoom";
import { CoreRoom } from "@/rooms/CoreRoom";
import { GalleryRoom } from "@/rooms/GalleryRoom";
import { GatewayRoom } from "@/rooms/GatewayRoom";
import { HomeRoom } from "@/rooms/HomeRoom";
import { JourneyRoom } from "@/rooms/JourneyRoom";
import { PlaygroundRoom } from "@/rooms/PlaygroundRoom";
import { useAssets } from "@/scene/useAssets";
import { whenRoomReady } from "@/scene/assets";
import { useMusic } from "@/scene/useMusic";
import { useSfx } from "@/scene/useSfx";
import { PlayerControls, type CameraLook } from "./PlayerControls";

export type QualityLevel = "low" | "balanced" | "high";

/** Quality only trades resolution, antialiasing, and shader precision. */
const QUALITY_PROFILES: Record<
  QualityLevel,
  {
    dpr: [number, number];
    antialias: boolean;
    precision: "highp" | "mediump";
  }
> = {
  low: { dpr: [0.75, 0.75], antialias: false, precision: "mediump" },
  balanced: { dpr: [1, 1], antialias: true, precision: "highp" },
  high: { dpr: [1.25, 1.5], antialias: true, precision: "highp" },
};

const ROOM_COMPONENTS = {
  home: HomeRoom,
  architect: ArchitectRoom,
  gallery: GalleryRoom,
  core: CoreRoom,
  journey: JourneyRoom,
  playground: PlaygroundRoom,
  gateway: GatewayRoom,
} as const;

const DOOR_OPEN_MS = 360;
/** Each half of the room change is a crossfade; the swap hides inside it. */
const FADE_MS = 1100;

const DEFAULT_SENSITIVITY = 0.7;
const DEFAULT_MOVE_SPEED = 3.2;
/** A thumb on glass wants a firmer stick and a quicker walk than a mouse. */
const TOUCH_SENSITIVITY = 1;
const TOUCH_MOVE_SPEED = 4;
const DEFAULT_FOV = 90;

function isCoarsePointer() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

function defaultSensitivity() {
  return isCoarsePointer() ? TOUCH_SENSITIVITY : DEFAULT_SENSITIVITY;
}

function defaultMoveSpeed() {
  return isCoarsePointer() ? TOUCH_MOVE_SPEED : DEFAULT_MOVE_SPEED;
}

type DoorChoiceState = {
  door: DoorSpec;
  title: string;
  home: RoomId;
  next: RoomId | null;
};

type WebGLStatus = "checking" | "ready" | "unsupported";

/**
 * Mobile starts balanced and drops to low only while it actually lags. A phone
 * mid-range GPU is usually fine on balance, and the fixed low profile thins the
 * compositor readback path for overlays in a way that balances never do.
 */
function detectQuality(): QualityLevel {
  if (typeof window === "undefined") return "balanced";

  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  // This replacement only changes the mobile default; software renderers stay
  // low so the overlay tint path is used there.
  if (!coarse && (memory ?? 6) >= 4 && cores > 4 && !isSoftwareRenderer()) {
    return "balanced";
  }

  return "low";
}

type WebGLProbe = {
  ok: boolean;
  renderer: string;
};

let cachedProbe: WebGLProbe | null = null;

function probeWebGL(): WebGLProbe {
  if (cachedProbe) return cachedProbe;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      cachedProbe = { ok: false, renderer: "" };
      return cachedProbe;
    }

    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      extension
        ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    );

    cachedProbe = { ok: true, renderer };
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cachedProbe = { ok: false, renderer: "" };
  }

  return cachedProbe;
}

function isSoftwareRenderer() {
  return /swiftshader|llvmpipe|software|basic render/i.test(
    probeWebGL().renderer,
  );
}

function supportsWebGL() {
  return probeWebGL().ok;
}

let cachedWebGLStatus: WebGLStatus | null = null;

function getWebGLStatus(): WebGLStatus {
  if (cachedWebGLStatus) return cachedWebGLStatus;

  cachedWebGLStatus = supportsWebGL() ? "ready" : "unsupported";
  return cachedWebGLStatus;
}

function subscribeToWebGLStatus() {
  return () => {};
}

function getServerWebGLStatus(): WebGLStatus {
  return "checking";
}

let cachedQuality: QualityLevel | null = null;

function getDetectedQuality(): QualityLevel {
  if (!cachedQuality) cachedQuality = detectQuality();
  return cachedQuality;
}

function subscribeToQuality() {
  return () => {};
}

// The server cannot measure the GPU, so hydration starts balanced and the
// client snapshot re-renders once the real profile is known.
function getServerQuality(): QualityLevel {
  return "balanced";
}

// three r183 deprecates Clock, but @react-three/fiber 9 still builds one per
// Canvas (the room and the profile preview), so the console carries a notice we
// cannot act on. three's own console hook lets us drop that line and keep every
// other three.js warning and error.
const CLOCK_DEPRECATION = "THREE.Clock: This module has been deprecated";

setConsoleFunction((type, message, ...params) => {
  if (message.startsWith(CLOCK_DEPRECATION)) return;
  if (type === "error") console.error(message, ...params);
  else if (type === "warn") console.warn(message, ...params);
  else console.log(message, ...params);
});

type SceneRootProps = {
  musicTracks: readonly MusicTrack[];
};

export default function SceneRoot({ musicTracks }: SceneRootProps) {
  const [activeRoom, setActiveRoom] = useState<RoomId>(START_ROOM);
  const [fading, setFading] = useState(false);
  const [focusedDoorId, setFocusedDoorId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [introFaded, setIntroFaded] = useState(false);
  const [doorOpening, setDoorOpening] = useState(false);
  // Set while the door waits for a room still warming in the background.
  const [preparingRoom, setPreparingRoom] = useState<RoomId | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(defaultSensitivity);
  const [moveSpeed, setMoveSpeed] = useState(defaultMoveSpeed);
  const [fov, setFov] = useState(DEFAULT_FOV);
  // Null means "follow the detected profile"; the menu can pin a level.
  const [qualityOverride, setQualityOverride] =
    useState<QualityLevel | null>(null);
  const [recentreKey, setRecentreKey] = useState(0);
  const [doorChoice, setDoorChoice] = useState<DoorChoiceState | null>(null);
  const [openNote, setOpenNote] = useState<NoteContent | null>(null);
  const openNoteRef = useRef<NoteContent | null>(null);
  const doorChoiceRef = useRef<DoorChoiceState | null>(null);
  const cameraLookRef = useRef<CameraLook>({ yaw: 0, pitch: 0 });
  const moveInputRef = useRef({ x: 0, z: 0 });
  const lookInputRef = useRef({ x: 0, z: 0 });
  const portraitSeen = useRef(false);
  const lockRequestRef = useRef<((force?: boolean) => void) | null>(null);
  const transitionRef = useRef(false);
  const lastUnlockAt = useRef(0);
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webglStatus = useSyncExternalStore(
    subscribeToWebGLStatus,
    getWebGLStatus,
    getServerWebGLStatus,
  );
  const detectedQuality = useSyncExternalStore(
    subscribeToQuality,
    getDetectedQuality,
    getServerQuality,
  );
  const quality = qualityOverride ?? detectedQuality;
  const portrait = useTouchPortrait();
  // While the rotate gate is up the room preload stays off: the page is about
  // to reload into landscape, so that work would be thrown away.
  const assets = useAssets(
    START_ROOM,
    webglStatus === "ready" && !portrait,
  );
  const assetsReady = assets.ready;
  const music = useMusic(musicTracks, assetsReady);
  const { setOiiaActive, setWalkingActive, playPet, playDoor, playBook } =
    useSfx();

  // Rotating a phone from portrait back to landscape restarts the page, so the
  // canvas and every size-dependent layout are measured in the new viewport.
  useEffect(() => {
    if (portrait) {
      portraitSeen.current = true;
      return;
    }
    if (!portraitSeen.current) return;

    portraitSeen.current = false;
    // A fullscreen request is a one-shot user gesture. Reloading would drop the
    // fullscreen state, so let the canvas resize into the new viewport instead.
    if (
      document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element | null })
        .webkitFullscreenElement
    ) {
      return;
    }
    window.location.reload();
  }, [portrait]);

  // Walking and the door wait whenever the menu, a note or the door prompt is
  // open, or the pointer is free, so the pause prompt owns the resume click.
  const paused =
    optionsOpen ||
    Boolean(doorChoice) ||
    Boolean(openNote) ||
    (!(typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches) &&
      !isLocked);

  useEffect(() => {
    doorChoiceRef.current = doorChoice;
  }, [doorChoice]);

  useEffect(() => {
    return () => {
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
      if (introTimer.current) clearTimeout(introTimer.current);
    };
  }, []);

  // Esc opens the menu. While the pointer is locked the browser releases it
  // first, so the unlock handler covers that case.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // Esc closes the note card or the door prompt first; the menu is next.
      if (openNoteRef.current) {
        event.preventDefault();
        openNoteRef.current = null;
        setOpenNote(null);
        return;
      }

      if (doorChoiceRef.current) {
        event.preventDefault();
        doorChoiceRef.current = null;
        setDoorChoice(null);
        lockRequestRef.current?.(true);
        return;
      }

      if (document.pointerLockElement) return;
      // Ignore the same key press that already opened the dialog on unlock.
      if (Date.now() - lastUnlockAt.current < 600) return;

      event.preventDefault();

      if (optionsOpen) {
        // Closing never re-requests the lock: Chrome rejects a fresh lock right
        // after Esc, so the pause prompt takes the click instead.
        setOptionsOpen(false);
        return;
      }

      setOptionsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [optionsOpen]);

  const room = ROOMS[activeRoom];
  const ActiveRoom = ROOM_COMPONENTS[activeRoom];
  const focusedDoor = room.doors.find((door) => door.id === focusedDoorId);
  const roomIndex = ROOM_ORDER.indexOf(activeRoom);
  const choiceNext = doorChoice?.next ?? null;

  const handleSceneWarm = useCallback(() => {
    setSceneReady(true);

    // The menu waits for the intro to fade; otherwise it paints over the
    // loading screen and the reveal loses its last beat.
    if (introTimer.current) clearTimeout(introTimer.current);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    introTimer.current = setTimeout(
      () => {
        setIntroFaded(true);
      },
      reduceMotion ? 60 : 560,
    );
  }, []);

  const handleLockChange = useCallback((locked: boolean) => {
    setIsLocked(locked);
    if (locked) return;

    lastUnlockAt.current = Date.now();
    // A note or the door prompt takes the pointer on purpose: opening the menu
    // on top of them would bury the choice the visitor just asked for.
    if (openNoteRef.current || doorChoiceRef.current) return;
    setOptionsOpen(true);
  }, []);

  const handleReadNote = useCallback((note: NoteContent) => {
    if (transitionRef.current) return;

    playBook();
    openNoteRef.current = note;
    setOpenNote(note);
    setFocusedDoorId(null);

    // The card needs the cursor for its close button.
    if (document.pointerLockElement) document.exitPointerLock();
  }, [playBook]);

  const handleCloseNote = useCallback(() => {
    // Esc reaches both the scene and the card; closing twice must not ask for
    // the pointer twice.
    if (!openNoteRef.current) return;

    openNoteRef.current = null;
    setOpenNote(null);

    // Reading a note hands the pointer back for its close button; closing it
    // hands the room back without a second click.
    lockRequestRef.current?.(true);
  }, []);

  const handleCloseOptions = useCallback(() => {
    setOptionsOpen(false);
    lockRequestRef.current?.(true);
  }, []);

  const handleCatLookChange = useCallback(
    (active: boolean) => setOiiaActive(active),
    [setOiiaActive],
  );

  // Frames open real links. Releasing the pointer first gives the browser a
  // normal click to open the tab with.
  const handleOpenLink = useCallback((href: string) => {
    if (document.pointerLockElement) document.exitPointerLock();
    if (href.startsWith("mailto:")) {
      window.location.href = href;
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const theaterPausedMusic = useRef(false);
  const musicRef = useRef(music);

  useEffect(() => {
    musicRef.current = music;
  }, [music]);

  // The space screen brings its own song, so the root playlist steps aside
  // while it plays and picks up again when the screen stops. Reading the music
  // through a ref keeps this callback stable for the room that calls it.
  const handleTheaterChange = useCallback((active: boolean) => {
    const player = musicRef.current;

    if (active) {
      if (player.playing) {
        theaterPausedMusic.current = true;
        player.togglePlay();
      }
      return;
    }

    if (!theaterPausedMusic.current) return;
    theaterPausedMusic.current = false;
    if (!player.playing) player.togglePlay();
  }, []);

  const goToRoom = useCallback((target: RoomId) => {
    if (transitionRef.current) return;

    transitionRef.current = true;
    setFocusedDoorId(null);
    setDoorChoice(null);
    doorChoiceRef.current = null;
    const next = ROOMS[target];

    const begin = () => {
      setPreparingRoom(null);
      playDoor();
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        setActiveRoom(next.id);
        transitionRef.current = false;
        return;
      }

      setDoorOpening(true);

      // The curtain needs one painted frame at opacity 0 before it is raised,
      // otherwise the browser commits both values at once and nothing fades.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFading(true));
      });

      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
      sequenceTimer.current = setTimeout(() => {
        setActiveRoom(next.id);
        setDoorOpening(false);

        // Give the new room a painted frame while the screen is still black.
        sequenceTimer.current = setTimeout(() => {
          setFading(false);
          sequenceTimer.current = setTimeout(() => {
            transitionRef.current = false;
          }, FADE_MS);
        }, 240);
      }, DOOR_OPEN_MS + FADE_MS);
    };

    // The intro only warms the landing room; if the visitor reaches the next
    // door before its files are down, keep them here with real progress instead
    // of starting a fetch on a room that would render empty.
    if (assets.rooms[next.id] === "ready") {
      begin();
      return;
    }

    setPreparingRoom(next.id);
    void whenRoomReady(next.id)
      .then(begin)
      .catch(() => {
        setPreparingRoom(null);
        transitionRef.current = false;
      });
  }, [assets.rooms, playDoor]);

  const handleDoor = useCallback(
    (door: DoorSpec) => {
      if (transitionRef.current) return;

      if (door.mode === "recenter") {
        setRecentreKey((key) => key + 1);
        setFocusedDoorId(null);
        return;
      }

      if (door.mode === "choice") {
        const choice: DoorChoiceState = {
          door,
          title: room.title,
          home: "home",
          next: room.next ?? null,
        };
        doorChoiceRef.current = choice;
        setDoorChoice(choice);
        setFocusedDoorId(null);
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }

      goToRoom(door.destination);
    },
    [goToRoom, room.next, room.title],
  );

  const handleChooseRoom = useCallback(
    (target: RoomId | null) => {
      if (!target) return;
      goToRoom(target);
      lockRequestRef.current?.(true);
    },
    [goToRoom],
  );

  const handleStay = useCallback(() => {
    setDoorChoice(null);
    doorChoiceRef.current = null;
    lockRequestRef.current?.(true);
  }, []);

  const coarsePointer = isCoarsePointer();
  // The touch HUD has no room for a hint; its controls are on screen and
  // listed in the menu.
  const movementHint = "WASD walk · Space jumps · E enters · Esc menu";

  // Upright phones never mount the room; rotating reloads into landscape.
  if (portrait) {
    return (
      <div
        className="relative h-full w-full"
        data-quality={quality}
        onContextMenu={(event) => event.preventDefault()}
      >
        <OrientationGate />
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      data-quality={quality}
      onContextMenu={(event) => event.preventDefault()}
    >
      {webglStatus === "unsupported" ? (
        <WebGLFallback />
      ) : (
        <>
          {webglStatus === "ready" && assetsReady ? (
            <ErrorBoundary fallback={<WebGLFallback />}>
              <Canvas
                id="room-canvas"
                shadows={false}
                dpr={QUALITY_PROFILES[quality].dpr}
                gl={{
                  antialias: QUALITY_PROFILES[quality].antialias,
                  precision: QUALITY_PROFILES[quality].precision,
                  powerPreference: "high-performance",
                }}
                fallback={<WebGLFallback />}
              >
                <Warmup onWarm={handleSceneWarm} />
                <PlayerControls
                  roomId={activeRoom}
                  doors={room.doors}
                  onEnter={handleDoor}
                  onFocusChange={setFocusedDoorId}
                  onLockChange={handleLockChange}
                  sensitivity={sensitivity}
                  moveSpeed={moveSpeed}
                  recentreKey={recentreKey}
                  paused={paused}
                  fov={fov}
                  onWalkChange={setWalkingActive}
                  cameraLookRef={cameraLookRef}
                  lockRequestRef={lockRequestRef}
                  moveInputRef={moveInputRef}
                  lookInputRef={lookInputRef}
                />
                <RenderMetricsBridge />
                <ActiveRoom
                  room={room}
                  onDoor={handleDoor}
                  onReadNote={handleReadNote}
                  onOpenLink={handleOpenLink}
                  focusedDoorId={focusedDoorId}
                  opening={doorOpening}
                  paused={paused}
                  onPetCat={playPet}
                  onCatLookChange={handleCatLookChange}
                  onTheaterChange={handleTheaterChange}
                />
              </Canvas>
            </ErrorBoundary>
          ) : (
            <LoadingRoom room={room} />
          )}

          {sceneReady ? (
            <div
              className={`pointer-events-none absolute inset-0 z-20 ${
                coarsePointer ? "hud-pad-touch" : "hud-pad-pointer"
              }`}
            >
              <header className="flex items-start justify-between gap-2">
                <div
                  className={`glass-chip rounded-lg ${
                    coarsePointer ? "px-2.5 py-1.5" : "px-4 py-3"
                  }`}
                >
                  <RoomHeader room={room} compact={coarsePointer} />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div
                    className={`glass-chip flex flex-col items-end rounded-lg ${
                      coarsePointer ? "gap-1 px-2 py-1.5" : "gap-1.5 px-3 py-2"
                    }`}
                  >
                    <ol
                      className={`flex items-center ${
                        coarsePointer ? "gap-1.5" : "gap-2"
                      }`}
                      aria-label="Room progress"
                    >
                      {ROOM_ORDER.map((id) => (
                        <li
                          key={id}
                          aria-current={id === activeRoom ? "step" : undefined}
                        >
                          <span className="sr-only">{ROOMS[id].title}</span>
                          <span
                            aria-hidden
                            className={`block rounded-sm transition-colors ${
                              coarsePointer ? "h-1 w-4" : "h-1.5 w-6"
                            } ${id === activeRoom ? "bg-[#c99b52]" : "bg-[#f6ebdd]/25"}`}
                          />
                        </li>
                      ))}
                    </ol>
                    <p
                      className={`font-medium uppercase tracking-[0.24em] text-[#f6ebdd]/55 ${
                        coarsePointer ? "text-[0.65rem]" : "text-[0.75rem]"
                      }`}
                    >
                      Room {roomIndex + 1} of {ROOM_ORDER.length}
                    </p>
                  </div>

                </div>
              </header>

              {isLocked || (coarsePointer && !paused) ? (
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6ebdd] ring-4 ring-[#10101a]/40"
                />
              ) : null}

              {preparingRoom ? (
                <div
                  aria-live="polite"
                  className="glass-chip absolute left-1/2 top-[56%] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md px-4 py-2 text-center text-sm font-medium text-[#f6ebdd] shadow-lg"
                >
                  Preparing {ROOMS[preparingRoom].title}
                  <span className="ml-1.5 text-[#c99b52]">
                    {Math.round(assets.roomProgress[preparingRoom] ?? 0)}%
                  </span>
                </div>
              ) : focusedDoor && !coarsePointer ? (
                <div className="glass-chip absolute left-1/2 top-[56%] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md px-4 py-2 text-center text-sm font-medium text-[#f6ebdd] shadow-lg">
                  Press{" "}
                  <kbd className="rounded border border-[#f6ebdd]/25 bg-[#f6ebdd]/10 px-1.5 py-0.5 font-sans text-xs">
                    E
                  </kbd>{" "}
                  to open {focusedDoor.label}
                </div>
              ) : null}

              {coarsePointer ? (
                <>
                  <div className="pointer-events-auto absolute hud-thumb-left">
                    <TouchJoystick
                      inputRef={moveInputRef}
                      label={CONTENT.ui.touch.move}
                      disabled={paused}
                    />
                  </div>

                  <div className="absolute hud-thumb-right flex items-end gap-3">
                    <div className="pointer-events-auto">
                      <TouchJoystick
                        inputRef={lookInputRef}
                        label={CONTENT.ui.touch.look}
                        disabled={paused}
                      />
                    </div>
                    <div className="pointer-events-auto">
                      <ProfileCard
                        cameraLookRef={cameraLookRef}
                        onOpenOptions={() => setOptionsOpen(true)}
                        compact
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 hud-bottom-bar">
                  <div className="hidden shrink-0 lg:block lg:w-80">
                    <StatsMonitor />
                  </div>

                  <div className="flex flex-1 flex-col items-center gap-3">
                    <p className="glass-chip hidden rounded-md px-3 py-1 text-center text-xs tracking-wide text-[#f6ebdd]/70 sm:block">
                      {movementHint}
                    </p>
                  </div>

                  <div className="w-56 shrink-0 sm:w-64 lg:w-80">
                    <ProfileCard
                      cameraLookRef={cameraLookRef}
                      onOpenOptions={() => setOptionsOpen(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <IntroOverlay
            visible={!sceneReady}
            progress={assets.percent}
            completed={assets.completed}
            total={assets.count}
            current={assets.current}
          />

          {openNote ? (
              <NoteCard
                note={openNote}
                onClose={handleCloseNote}
                onOpenLink={handleOpenLink}
              />
          ) : null}

          <div
            aria-hidden
            style={{
              opacity: fading ? 1 : 0,
              transition: `opacity ${FADE_MS}ms linear`,
              willChange: "opacity",
            }}
            className="pointer-events-none absolute inset-0 z-50 bg-black"
          />

          {sceneReady && introFaded && !optionsOpen && !doorChoice && !isLocked && !openNote && !coarsePointer ? (
            <PauseOverlay
              onResume={() => lockRequestRef.current?.()}
              onOpenMenu={() => setOptionsOpen(true)}
            />
          ) : null}

          {doorChoice ? (
            <DoorChoice
              roomTitle={doorChoice.title}
              homeLabel={CONTENT.ui.doorChoice.home}
              nextLabel={
                choiceNext
                  ? `${CONTENT.ui.doorChoice.next}: ${ROOMS[choiceNext].title}`
                  : CONTENT.ui.doorChoice.next
              }
              stayLabel={CONTENT.ui.doorChoice.close}
              title={CONTENT.ui.doorChoice.title}
              onHome={() => handleChooseRoom(doorChoice.home)}
              onNext={
                choiceNext ? () => handleChooseRoom(choiceNext) : undefined
              }
              onStay={handleStay}
            />
          ) : null}

          {sceneReady ? (
            <OptionsDialog
              room={room}
              open={optionsOpen}
              sensitivity={sensitivity}
              moveSpeed={moveSpeed}
              fov={fov}
              quality={quality}
              coarsePointer={coarsePointer}
              cameraLookRef={cameraLookRef}
              musicTitle={music.track.title}
              musicPlaying={music.playing}
              musicMuted={music.muted}
              musicVolume={music.volume}
              musicCurrentTime={music.currentTime}
              musicDuration={music.duration}
              onMusicPrevious={music.previous}
              onMusicTogglePlay={music.togglePlay}
              onMusicNext={music.next}
              onMusicToggleMute={music.toggleMute}
              onMusicVolumeChange={music.setVolume}
              onMusicSeek={music.seek}
              onSensitivityChange={setSensitivity}
              onMoveSpeedChange={setMoveSpeed}
              onFovChange={setFov}
              onQualityChange={setQualityOverride}
              onRecentre={() => setRecentreKey((key) => key + 1)}
              onReset={() => {
                setSensitivity(defaultSensitivity());
                setMoveSpeed(defaultMoveSpeed());
                setFov(DEFAULT_FOV);
                setQualityOverride(null);
              }}
              onClose={handleCloseOptions}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Compiles the room's shaders and lets three painted frames land behind the
 * intro, so the reveal does not stutter on its first visit.
 */
function Warmup({ onWarm }: { onWarm: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    try {
      gl.compile(scene, camera);
    } catch {
      // Compilation is best-effort; the first real frame reports the error.
    }

    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      if (frame >= 3) {
        onWarm();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera, onWarm]);

  return null;
}

function RoomHeader({
  room,
  compact = false,
}: {
  room: RoomContent;
  compact?: boolean;
}) {
  return (
    <>
      <p
        className={`font-semibold uppercase text-[#c99b52] ${
          compact
            ? "text-[0.65rem] tracking-[0.2em]"
            : "text-[0.75rem] tracking-[0.32em]"
        }`}
      >
        {CONTENT.profile.role}
      </p>
      <p
        className={`text-[#f6ebdd]/70 ${
          compact ? "mt-0.5 text-[0.7rem]" : "mt-1 text-sm"
        }`}
      >
        {room.eyebrow}
      </p>
      <p
        className={`mt-0.5 font-display leading-tight text-[#f6ebdd] ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {room.title}
      </p>
    </>
  );
}

function LoadingRoom({ room }: { room: RoomContent }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#10101a] px-6 text-center text-[#f6ebdd]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c99b52]">
        {room.eyebrow}
      </p>
      <p className="font-display text-3xl">{room.title}</p>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#10101a] px-6 text-center text-[#f6ebdd]">
      <div className="max-w-sm space-y-3">
        <p className="font-display text-3xl">WebGL is unavailable</p>
        <p className="text-sm leading-6 text-[#f6ebdd]/70">
          This experience needs WebGL. Enable hardware acceleration or try a
          current browser, then reload the page.
        </p>
      </div>
    </div>
  );
}
