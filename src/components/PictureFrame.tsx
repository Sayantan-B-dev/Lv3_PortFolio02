"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CanvasTexture,
  LinearFilter,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector3,
  VideoTexture,
  type Mesh,
} from "three";
import { Model } from "./Model";
import { WallText } from "./WallText";
import { getImageTexture, getVideoUrl } from "@/scene/assets";
import { MODELS } from "@/content/models";

const VIDEO_EXTENSIONS = /\.(mp4|webm|m4v|mov)$/i;
function isVideoUrl(url: string) {
  return VIDEO_EXTENSIONS.test(url.split("?")[0]);
}

type PictureFrameProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  tone: string;
  trim: string;
  size?: [number, number];
  image?: string;
  caption?: string;
  /** Opens this link when the frame is clicked instead of pinning the caption. */
  href?: string;
  onOpenLink?: (href: string) => void;
};

/** Captions only appear once the visitor is close enough to read them. */
const CAPTION_RANGE = 4.2;
// A drag across the frame (touch look) should not toggle the caption.
const TAP_TOLERANCE = 6;
// The caption sheet takes the lower half of the photo.
const CAPTION_HEIGHT_RATIO = 0.5;

const FRAME_MODEL = MODELS.frame;

/**
 * Neighbouring frames butt up against each other on the gallery wall. Fading
 * each photo out at its own border stops the seam between two pictures from
 * reading as one joined image.
 */
let edgeFade: CanvasTexture | null = null;

function getEdgeFade() {
  if (edgeFade) return edgeFade;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.22,
    size / 2,
    size / 2,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(24, 16, 26, 0)");
  gradient.addColorStop(0.72, "rgba(24, 16, 26, 0.16)");
  gradient.addColorStop(1, "rgba(24, 16, 26, 0.34)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  edgeFade = new CanvasTexture(canvas);
  edgeFade.colorSpace = SRGBColorSpace;
  return edgeFade;
}

type PhotoBoundaryProps = {
  children: ReactNode;
};

/**
 * A failed photo must not take the room down with it: the boundary drops the
 * photo and the frame keeps showing its flat placeholder colour.
 */
class PhotoBoundary extends Component<PhotoBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A still photo comes from the shared loader; a frame never loads its own copy. */
function usePhotoTexture(url: string) {
  const source = getImageTexture(url);
  return useMemo(() => (isVideoUrl(url) ? null : source), [source, url]);
}

type FrameVideo = {
  texture: VideoTexture;
  /** Known only once the clip reports its size. */
  aspect: number;
};

/**
 * An animated frame plays as a short looping clip rather than a GIF: the browser
 * decodes it in hardware and three uploads each frame, which behaves the same on
 * every phone, where a GIF used as a texture source often freezes on one frame.
 * The element is parked in the page like the cinema screen's video, because a
 * media element that is never in the document can stop delivering frames.
 */
function useVideoTexture(url: string): FrameVideo | null {
  const enabled = isVideoUrl(url);
  const [video, setVideo] = useState<FrameVideo | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const element = document.createElement("video");
    element.src = getVideoUrl(url);
    element.loop = true;
    element.muted = true;
    element.playsInline = true;
    element.preload = "auto";
    element.setAttribute("playsinline", "");
    element.setAttribute("muted", "");
    element.style.cssText =
      "position:fixed;left:-8px;bottom:-8px;width:2px;height:2px;opacity:0.01;pointer-events:none";
    document.body.appendChild(element);

    const texture = new VideoTexture(element);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;

    const play = () => {
      void element.play().catch(() => undefined);
    };
    const publishAspect = () => {
      if (!element.videoWidth || !element.videoHeight) return;
      setVideo({
        texture,
        aspect: element.videoWidth / element.videoHeight,
      });
    };

    // A phone that refuses the autoplay (low power mode, strict policy) starts
    // the clip on the next touch or key press instead.
    play();
    window.addEventListener("pointerdown", play);
    window.addEventListener("keydown", play);
    element.addEventListener("loadedmetadata", publishAspect);
    publishAspect();

    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      element.removeEventListener("loadedmetadata", publishAspect);
      element.pause();
      element.remove();
      element.removeAttribute("src");
      element.load();
      texture.dispose();
    };
  }, [enabled, url]);

  return video;
}

function FramePhoto({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const video = useVideoTexture(url);
  const still = usePhotoTexture(url);
  const texture = video?.texture ?? still;

  // A still photo carries its own shape; a clip only reports its size once its
  // metadata has loaded, so the cover-fit waits for that.
  const stillImage = still?.image as
    | { width?: number; height?: number }
    | null
    | undefined;
  const mediaAspect =
    video?.aspect ||
    (stillImage?.width && stillImage.height
      ? stillImage.width / stillImage.height
      : 0);

  // Cover-fit through UVs so the texture is never mutated and the photo fills
  // the opening instead of stretching.
  const geometry = useMemo(() => {
    const next = new PlaneGeometry(width, height);

    if (mediaAspect > 0) {
      const frameAspect = width / height;
      const uv = next.attributes.uv;

      let repeatX = 1;
      let repeatY = 1;

      if (mediaAspect > frameAspect) {
        repeatX = frameAspect / mediaAspect;
      } else {
        repeatY = mediaAspect / frameAspect;
      }

      if (repeatX !== 1 || repeatY !== 1) {
        const offsetX = (1 - repeatX) / 2;
        const offsetY = (1 - repeatY) / 2;

        for (let index = 0; index < uv.count; index += 1) {
          uv.setXY(
            index,
            uv.getX(index) * repeatX + offsetX,
            uv.getY(index) * repeatY + offsetY,
          );
        }
        uv.needsUpdate = true;
      }
    }

    return next;
  }, [mediaAspect, width, height]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const edge = useMemo(() => getEdgeFade(), []);

  if (!texture) return null;

  return (
    <>
      <mesh geometry={geometry} position={[0, 0, 0.08]}>
        <meshStandardMaterial map={texture} roughness={0.74} metalness={0} />
      </mesh>

      {edge ? (
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={edge}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </>
  );
}

export function PictureFrame({
  position,
  rotation = [0, 0, 0],
  tone,
  trim,
  size = [1.1, 1.35],
  image,
  caption,
  href,
  onOpenLink,
}: PictureFrameProps) {
  const [width, height] = size;
  const camera = useThree((state) => state.camera);
  const framePosition = useMemo(() => new Vector3(...position), [position]);
  const [hovered, setHovered] = useState(false);
  const [near, setNear] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [aimed, setAimed] = useState(false);
  const nearRef = useRef(false);
  const hitRef = useRef<Mesh>(null);
  const aimRay = useRef(new Raycaster());
  const aimDirection = useRef(new Vector3());
  const aimedRef = useRef(false);

  // Distance is re-checked on pointer movement instead of every frame, so the
  // scene never pushes React state from the render loop. Pointer movement fires
  // far more often than the answer changes, so only a real change updates state.
  const checkDistance = () => {
    const closeBy =
      camera.position.distanceTo(framePosition) < CAPTION_RANGE;
    if (closeBy === nearRef.current) return;
    nearRef.current = closeBy;
    setNear(closeBy);
  };

  // Hover is mouse-only, so the crosshair also reveals a frame's caption when
  // the visitor is close enough to read it.
  useFrame(() => {
    const hit = hitRef.current;
    if (!hit) return;

    const closeBy =
      camera.position.distanceTo(framePosition) < CAPTION_RANGE;
    let next = false;

    if (closeBy) {
      camera.getWorldDirection(aimDirection.current);
      aimRay.current.set(camera.position, aimDirection.current);
      next = aimRay.current.intersectObject(hit, false).length > 0;
    }

    if (next === aimedRef.current) return;
    aimedRef.current = next;
    setAimed(next);
  });

  const showCaption =
    Boolean(caption) &&
    (!image || pinned || aimed || (near && hovered));
  const captionHeight = height * CAPTION_HEIGHT_RATIO;
  const mouldingWidth = width + 0.3;
  const mouldingHeight = height + 0.3;

  return (
    <group position={position} rotation={rotation}>
      {/* The imported moulding sits behind an inner trim box: the custom frame
          gives the silhouette, the box keeps the photo edge crisp. */}
      <Model
        url={FRAME_MODEL}
        fit="height"
        size={mouldingHeight}
        stretch={[mouldingWidth / (0.88 * (mouldingHeight / 0.605)), 1, 1]}
        tint={trim}
        position={[0, -mouldingHeight / 2, -0.03]}
        shadows={false}
      />

      <mesh castShadow>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.1]} />
        <meshStandardMaterial
          color={trim}
          emissive={hovered ? trim : "#000000"}
          emissiveIntensity={hovered ? 0.14 : 0}
          roughness={0.48}
          metalness={0.26}
        />
      </mesh>

      <mesh position={[0, 0, 0.072]}>
        <planeGeometry args={[width + 0.04, height + 0.04]} />
        <meshStandardMaterial color="#f4e9d8" roughness={0.92} />
      </mesh>

      <mesh position={[0, 0, 0.076]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={tone} roughness={0.88} />
      </mesh>

      {image ? (
        <PhotoBoundary>
          <FramePhoto url={image} width={width} height={height} />
        </PhotoBoundary>
      ) : (
        <mesh position={[0, 0, 0.078]}>
          <circleGeometry args={[Math.min(width, height) * 0.16, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>
      )}

      <group
        position={[0, -height / 2 + captionHeight / 2, 0]}
        visible={showCaption}
      >
        <mesh position={[0, 0, 0.086]}>
          <planeGeometry args={[width, captionHeight]} />
          <meshBasicMaterial
            color="#0d0d16"
            transparent
            opacity={showCaption ? 0.7 : 0}
            depthWrite={false}
          />
        </mesh>

        <WallText
          text={caption ?? ""}
          position={[0, 0, 0.088]}
          size={[width * 0.92, captionHeight * 0.84]}
          fontSize={72}
          fontWeight={500}
          color="#f6ebdd"
          opacity={showCaption ? 0.96 : 0}
        />
      </group>

      {/* Invisible hit plane so the whole frame is one hover target. */}
      <mesh
        ref={hitRef}
        position={[0, 0, 0.09]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          checkDistance();
        }}
        onPointerMove={checkDistance}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > TAP_TOLERANCE) return;
          if (href && onOpenLink) {
            onOpenLink(href);
            return;
          }
          const closeBy =
            camera.position.distanceTo(framePosition) < CAPTION_RANGE;
          nearRef.current = closeBy;
          setNear(closeBy);
          if (closeBy) setPinned((shown) => !shown);
        }}
      >
        <planeGeometry args={[width + 0.22, height + 0.22]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
