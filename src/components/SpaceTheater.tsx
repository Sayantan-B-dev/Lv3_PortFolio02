"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  LinearFilter,
  MathUtils,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  VideoTexture,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
  type Texture,
} from "three";
import { CONTENT } from "@/content/config";
import { WallText } from "./WallText";

/** A tenth below the authored level, so the show sits under the root music. */
const VIDEO_VOLUME = 0.9;
/** The downscaled room-3 plaster dresses the pillar and its base. */
const PILLAR_TEXTURE_URL = "/wall-textures/room3.jpg";

/** The alarm panel sits on a stand at the dead center of the room. */
const PANEL: [number, number, number] = [0, 1.1, 0];
/** Reachable from anywhere in the room now that the panel is central. */
const PRESS_RANGE = 6.5;
/** Rest height of the button puck; a press sinks it into the base. */
const BUTTON_Y = 1.12;
const PRESS_DEPTH = 0.045;
// A drag (look on touch, mouse look on desktop) must not press the button.
const TAP_TOLERANCE = 6;

/**
 * The screen floats in the space past the side window, so it is visible from
 * the room without living inside the cylinder.
 */
const SCREEN_ANGLE = 1.1;
const SCREEN_DISTANCE = 11;
const SCREEN_POSITION: [number, number, number] = [
  Math.sin(SCREEN_ANGLE) * SCREEN_DISTANCE,
  3.3,
  Math.cos(SCREEN_ANGLE) * SCREEN_DISTANCE,
];
const SCREEN_WIDTH = 8;
const SCREEN_HEIGHT = 4.5;

/**
 * The picture lights the room. Nothing casts shadows, so one light placed just
 * outside the glass already reaches the whole room.
 */
const LIGHT_POSITION: [number, number, number] = [
  Math.sin(SCREEN_ANGLE) * 8,
  3.4,
  Math.cos(SCREEN_ANGLE) * 8,
];
const LIGHT_INTENSITY = 58;
/** Sampled this often and this small: the eased colour hides the low rate. */
const SAMPLE_INTERVAL = 0.25;
const SAMPLE_WIDTH = 16;
const SAMPLE_HEIGHT = 9;

type SpaceTheaterProps = {
  videoUrl: string;
  /** Lets the app step the root music aside while the movie has the sound. */
  onPlayingChange?: (playing: boolean) => void;
};

/**
 * A red button beside the playground door starts a looping film on a screen
 * hanging in the space outside the balcony glass. The screen's own picture
 * drives the light in the room, so it takes on the colour of whatever is on it.
 */
export function SpaceTheater({
  videoUrl,
  onPlayingChange,
}: SpaceTheaterProps) {
  const camera = useThree((state) => state.camera);
  const [aimed, setAimed] = useState(false);
  const [playing, setPlaying] = useState(false);
  /** True once the first decoded frame is on the screen. */
  const [showing, setShowing] = useState(false);
  const [texture, setTexture] = useState<Texture | null>(null);

  const aimedRef = useRef(false);
  const playingRef = useRef(false);
  const showingRef = useRef(false);
  const reduceMotion = useRef(false);
  const hitRef = useRef<Mesh>(null);
  const pillarMatRef = useRef<MeshStandardMaterial>(null);
  const baseMatRef = useRef<MeshStandardMaterial>(null);
  const buttonMatRef = useRef<MeshStandardMaterial>(null);
  const buttonMeshRef = useRef<Mesh>(null);
  /** 0–1 press displacement, spring-driven in useFrame (no state per frame). */
  const pressRef = useRef(0);
  const pressVelRef = useRef(0);
  const pressHoldRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<VideoTexture | null>(null);
  const lightRef = useRef<PointLight>(null);
  const ray = useRef(new Raycaster());
  const direction = useRef(new Vector3());
  const sinceSample = useRef(0);
  /** How hard the light burns, from the last sampled frame. */
  const level = useRef(0);
  const sampler = useRef<{
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null>(null);
  const accent = useMemo(() => new Color("#f6ebdd"), []);
  const target = useMemo(() => new Color(), []);
  const center = useMemo(() => new Vector3(...PANEL), []);
  const change = useRef(onPlayingChange);

  // One shared plaster map for the pillar and its base, loaded on demand so it
  // stays out of the intro total. The repeat keeps one tile readable up close.
  const pillarMap = useMemo(() => {
    const texture = new TextureLoader().load(PILLAR_TEXTURE_URL);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }, []);

  useEffect(() => () => pillarMap.dispose(), [pillarMap]);

  useEffect(() => {
    change.current = onPlayingChange;
  }, [onPlayingChange]);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    change.current?.(playing);
  }, [playing]);

  /**
   * The video only exists once the button is pressed, so the file is fetched on
   * demand instead of during the intro. `preload` stays at `none`: the element
   * downloads nothing until `play()` is called, and from then on the browser
   * streams it in chunks and starts the picture as soon as it has a few seconds
   * ahead, rather than waiting for the whole 13 MB file.
   */
  const ensureVideo = useCallback(() => {
    if (videoRef.current) return videoRef.current;

    const video = document.createElement("video");
    video.src = videoUrl;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.volume = VIDEO_VOLUME;
    video.setAttribute("playsinline", "");
    // A video that is never rendered stops delivering frames to the texture in
    // some browsers, so it stays in the document, parked out of sight.
    video.style.cssText =
      "position:fixed;left:-8px;bottom:-8px;width:2px;height:2px;opacity:0.01;pointer-events:none";
    document.body.appendChild(video);

    const nextTexture = new VideoTexture(video);
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.minFilter = LinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.generateMipmaps = false;

    // A codec or network failure drops the screen and leaves the button ready
    // for another try instead of showing a black rectangle.
    video.addEventListener("error", () => {
      video.pause();
      video.remove();
      textureRef.current?.dispose();
      textureRef.current = null;
      videoRef.current = null;
      playingRef.current = false;
      showingRef.current = false;
      setPlaying(false);
      setShowing(false);
      setTexture(null);
    });

    videoRef.current = video;
    textureRef.current = nextTexture;
    setTexture(nextTexture);
    return video;
  }, [videoUrl]);

  const start = useCallback(() => {
    const video = ensureVideo();
    playingRef.current = true;
    // The press is the gesture that unlocks sound. A browser that still refuses
    // gets the picture without the song rather than nothing at all.
    video.muted = false;
    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        video.muted = true;
        void video.play().catch(() => undefined);
      });
    }
    setPlaying(true);
  }, [ensureVideo]);

  const stop = useCallback(() => {
    // Pausing is what stops the browser buffering ahead; the frames it already
    // holds stay, so starting the show again is instant.
    videoRef.current?.pause();
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    // Kick the press animation: hold down briefly, then let useFrame spring it
    // back with a small overshoot.
    pressHoldRef.current = 0.08;
    pressVelRef.current = 0;
    if (playingRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        // Detach before clearing the source, so no late error event can reach
        // state that is already going away.
        video.remove();
        video.removeAttribute("src");
        video.load();
      }
      textureRef.current?.dispose();
      videoRef.current = null;
      textureRef.current = null;
      playingRef.current = false;
      showingRef.current = false;
      // The room is going away, so the root music has to come back.
      change.current?.(false);
    },
    [],
  );

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const hit = hitRef.current;

    if (hit) {
      let next = false;

      // The ray is only cast once the panel is close enough to reach.
      if (camera.position.distanceTo(center) < PRESS_RANGE) {
        camera.getWorldDirection(direction.current);
        ray.current.set(camera.position, direction.current);
        next = ray.current.intersectObject(hit, false).length > 0;
      }

      if (next !== aimedRef.current) {
        aimedRef.current = next;
        setAimed(next);
      }
    }

    // The pillar and its base share one slow gold breath.
    const glow = reduceMotion.current
      ? 0.4
      : 0.3 + 0.16 * (0.5 + 0.5 * Math.sin(time * 1.4));
    if (pillarMatRef.current) pillarMatRef.current.emissiveIntensity = glow;
    if (baseMatRef.current) baseMatRef.current.emissiveIntensity = glow;

    // The press: hold at full depth, then a stiff spring back to rest with a
    // touch of overshoot, so the puck feels like a real mechanical button.
    pressHoldRef.current = Math.max(0, pressHoldRef.current - step);
    const pressTarget = pressHoldRef.current > 0 ? 1 : 0;
    pressVelRef.current +=
      ((pressTarget - pressRef.current) * 520 - pressVelRef.current * 20) *
      step;
    pressRef.current += pressVelRef.current * step;

    const buttonMesh = buttonMeshRef.current;
    if (buttonMesh) {
      buttonMesh.position.y = BUTTON_Y - PRESS_DEPTH * pressRef.current;
    }

    // The button faces up and pulses; waiting blinks faster until the picture.
    // A press flashes it brighter for the length of the animation.
    const button = buttonMatRef.current;
    if (button) {
      let resting: number;
      if (playingRef.current) {
        resting = showingRef.current
          ? 1.1
          : 0.7 + 0.5 * Math.sin(time * 9);
      } else {
        resting = reduceMotion.current
          ? 0.8
          : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4.4));
      }
      button.emissiveIntensity =
        resting + Math.max(0, pressRef.current) * 0.9;
    }

    const light = lightRef.current;
    const video = videoRef.current;
    if (!light) return;

    if (!playingRef.current || !video || video.readyState < 2) {
      light.intensity = 0;
      return;
    }

    if (!showingRef.current) {
      showingRef.current = true;
      setShowing(true);
    }

    // The colour is read a few times a second, but the light is driven every
    // frame, so the flicker stays a flicker instead of a four-hertz strobe.
    light.intensity =
      LIGHT_INTENSITY * level.current * (0.94 + 0.12 * Math.sin(time * 21));

    sinceSample.current += step;
    if (sinceSample.current < SAMPLE_INTERVAL) return;
    sinceSample.current = 0;

    if (!sampler.current) {
      const canvas = document.createElement("canvas");
      canvas.width = SAMPLE_WIDTH;
      canvas.height = SAMPLE_HEIGHT;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) sampler.current = { canvas, context };
    }

    const reader = sampler.current;
    if (!reader) return;

    reader.context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = reader.context.getImageData(
      0,
      0,
      SAMPLE_WIDTH,
      SAMPLE_HEIGHT,
    );
    const pixels = data.length / 4;
    let red = 0;
    let green = 0;
    let blue = 0;

    for (let index = 0; index < data.length; index += 4) {
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
    }

    red /= pixels;
    green /= pixels;
    blue /= pixels;

    // Hue comes from the frame itself, so a warm scene reads warm; the
    // brightness of the frame decides how hard the room is lit.
    const peak = Math.max(red, green, blue, 1);
    const luma = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    target.setRGB(red / peak, green / peak, blue / peak);
    accent.lerp(target, Math.min(1, step * 8));

    level.current = MathUtils.clamp(0.3 + 1.15 * luma, 0, 1.6);
    light.color.copy(accent);
  });

  // Locked pointer clicks land on the crosshair, so the aim decides: claim the
  // click before the door or the seat hint hears it.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (!aimedRef.current) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    };

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [toggle]);

  const prompt = playing
    ? {
        coarse: CONTENT.ui.prompts.cinemaStopCoarse,
        fine: CONTENT.ui.prompts.cinemaStopFine,
      }
    : {
        coarse: CONTENT.ui.prompts.cinemaCoarse,
        fine: CONTENT.ui.prompts.cinemaFine,
      };

  return (
    <>
      {/* The screen's one light hangs between the glass and the picture and only
          ever carries the picture's colour. It is mounted up front, so nothing
          recompiles shaders the moment the button is pressed. */}
      <pointLight
        ref={lightRef}
        position={LIGHT_POSITION}
        intensity={0}
        distance={30}
        decay={1.4}
      />

      {/* Dark, softly glowing plaster pillar at the centre of the room. */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.24, 0.27, 1.0, 32]} />
        <meshStandardMaterial
          ref={pillarMatRef}
          map={pillarMap}
          color="#3a3444"
          emissive="#c99b52"
          emissiveMap={pillarMap}
          emissiveIntensity={0.4}
          roughness={0.72}
          metalness={0.15}
        />
      </mesh>

      {/* Wider base plate on top, dressed in the same plaster. */}
      <mesh position={[0, 1.04, 0]}>
        <cylinderGeometry args={[0.36, 0.3, 0.09, 32]} />
        <meshStandardMaterial
          ref={baseMatRef}
          map={pillarMap}
          color="#3a3444"
          emissive="#c99b52"
          emissiveMap={pillarMap}
          emissiveIntensity={0.4}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>

      {/* The red button sits on the base with its face up toward the ceiling. */}
      <mesh ref={buttonMeshRef} position={[0, BUTTON_Y, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.07, 32]} />
        <meshStandardMaterial
          ref={buttonMatRef}
          color="#d8332a"
          emissive="#ff2f1f"
          emissiveIntensity={0.7}
          roughness={0.32}
          metalness={0.12}
        />
      </mesh>

      {/* Small plaque on the pillar face so the label hugs the curve. */}
      <mesh position={[0, 0.55, 0.245]}>
        <boxGeometry args={[0.3, 0.13, 0.02]} />
        <meshStandardMaterial color="#1a1518" roughness={0.5} metalness={0.3} />
      </mesh>

      <WallText
        text={CONTENT.ui.cinema.label}
        position={[0, 0.55, 0.257]}
        size={[0.26, 0.1]}
        fontSize={64}
        fontWeight={700}
        color="#f6ebdd"
        opacity={0.92}
      />

      <group position={PANEL}>
        {/* One hit target for the whole pillar, so aiming stays forgiving. */}
        <mesh
          ref={hitRef}
          position={[0, -0.4, 0]}
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta > TAP_TOLERANCE) return;
            if (camera.position.distanceTo(center) >= PRESS_RANGE) return;
            toggle();
          }}
        >
          <boxGeometry args={[0.7, 1.5, 0.7]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {aimed ? (
          <Html
            position={[0, 0.34, 0]}
            center
            zIndexRange={[10, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="glass-chip whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tracking-wide text-[#f6ebdd]">
              <span className="pointer-coarse:hidden">{prompt.fine}</span>
              <span className="hidden pointer-coarse:inline">{prompt.coarse}</span>
            </div>
          </Html>
        ) : null}
      </group>

      {playing && showing && texture ? (
        <group
          position={SCREEN_POSITION}
          rotation={[0, SCREEN_ANGLE + Math.PI, 0]}
        >
          {/* A dark surround keeps the picture reading as a screen rather than
              a card floating in the sky. It stays unlit: a bezel does not need
              every light in the room evaluated across its face. */}
          <mesh position={[0, 0, -0.09]}>
            <boxGeometry args={[SCREEN_WIDTH + 0.5, SCREEN_HEIGHT + 0.5, 0.12]} />
            <meshBasicMaterial color="#0b0b12" />
          </mesh>

          <mesh>
            <planeGeometry args={[SCREEN_WIDTH, SCREEN_HEIGHT]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
    </>
  );
}
