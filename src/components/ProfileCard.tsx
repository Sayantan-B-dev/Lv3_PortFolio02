"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Box3, MathUtils, Vector3, type Group } from "three";
import { getMergedModel } from "@/scene/assets";
import { CONTENT } from "@/content/config";
import { MODELS } from "@/content/models";
import type { CameraLook } from "@/scene/PlayerControls";

const PLAYER_MODEL = MODELS.player;
const MAX_TILT = 0.9;

type AvatarBoundaryProps = {
  children: ReactNode;
};

class AvatarBoundary extends Component<AvatarBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <AvatarFallback /> : this.props.children;
  }
}

function AvatarFallback() {
  return (
    <mesh>
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial color="#c99b52" roughness={0.35} metalness={0.4} />
    </mesh>
  );
}

type AvatarDrag = { yaw: number; pitch: number };

function AvatarModel({
  lookRef,
  dragRef,
}: {
  lookRef: { current: CameraLook };
  dragRef: { current: AvatarDrag };
}) {
  const group = useRef<Group>(null);
  const reduceMotion = useRef(false);

  // The merged template is shared, so both previews reuse its geometry.
  const model = useMemo(() => getMergedModel(PLAYER_MODEL), []);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  // Normalise the model once so any exported scale fits the preview.
  const fit = useMemo(() => {
    if (!model) return null;

    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const largest = Math.max(size.x, size.y, size.z) || 1;
    return { scale: 0.95 / largest, center };
  }, [model]);

  useFrame(({ clock }) => {
    const avatar = group.current;
    if (!avatar) return;

    // The preview turns with the player: yaw follows the view, pitch tips the
    // model, and a slow idle spin still shows every side of it.
    const spin = reduceMotion.current ? 0 : clock.elapsedTime * 0.4;
    const look = lookRef.current;
    const drag = dragRef.current;

    avatar.rotation.y = look.yaw + drag.yaw + spin;
    avatar.rotation.x =
      MathUtils.clamp(look.pitch, -MAX_TILT, MAX_TILT) * 0.45 + drag.pitch;
  });

  // HMR re-evaluates assets.ts mid-scene, so the cache can be empty. The
  // boundary below turns that into the placeholder gem instead of a crash.
  if (!model || !fit) return null;

  return (
    <group ref={group}>
      <group
        scale={fit.scale}
        position={[
          -fit.center.x * fit.scale,
          -fit.center.y * fit.scale,
          -fit.center.z * fit.scale,
        ]}
      >
        <primitive object={model} dispose={null} />
      </group>
    </group>
  );
}

type ProfileAvatarProps = {
  lookRef: { current: CameraLook };
  /** Defers the model on first paint; the menu asks for it at once. */
  delayMs?: number;
  /** Lets the menu visitor drag the model instead of only watching it spin. */
  interactive?: boolean;
};

export function ProfileAvatar({
  lookRef,
  delayMs = 0,
  interactive = false,
}: ProfileAvatarProps) {
  const [ready, setReady] = useState(delayMs === 0);
  const dragRef = useRef<AvatarDrag>({ yaw: 0, pitch: 0 });
  const dragPointer = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (ready) return;

    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, ready]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    dragPointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const tracked = dragPointer.current;
    if (!tracked || tracked.id !== event.pointerId) return;

    dragRef.current.yaw -= (event.clientX - tracked.x) * 0.012;
    dragRef.current.pitch = MathUtils.clamp(
      dragRef.current.pitch - (event.clientY - tracked.y) * 0.008,
      -0.8,
      0.8,
    );
    tracked.x = event.clientX;
    tracked.y = event.clientY;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointer.current?.id === event.pointerId) dragPointer.current = null;
  };

  return (
    <div
      className={`h-full w-full ${interactive ? "cursor-grab touch-none active:cursor-grabbing" : ""
        }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {ready ? (
        <Canvas
          dpr={[0.5, 0.75]}
          camera={{ position: [0, 0.05, 2.3], fov: 30 }}
          gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 3, 2]} intensity={1.5} />
          <pointLight position={[-2, 1, -1]} intensity={0.8} color="#c99b52" />
          <AvatarBoundary>
            <AvatarModel lookRef={lookRef} dragRef={dragRef} />
          </AvatarBoundary>
        </Canvas>
      ) : (
        <div className="h-full w-full animate-pulse bg-[#1b1b2a]" />
      )}
    </div>
  );
}

type ProfileFactsProps = {
  className?: string;
  /** Stack labels over values in the narrow corner card so nothing truncates. */
  stacked?: boolean;
};

export function ProfileFacts({
  className = "",
  stacked = false,
}: ProfileFactsProps) {
  const labels = CONTENT.ui.profileFacts;
  const row = stacked
    ? "space-y-0.5"
    : "flex items-baseline justify-between gap-2";

  const facts: { label: string; value: string; script?: boolean }[] = [
    { label: labels.name, value: CONTENT.profile.name, script: true },
    { label: labels.role, value: CONTENT.profile.role },
    { label: labels.location, value: CONTENT.profile.location },
    { label: labels.projects, value: String(CONTENT.profile.projectsShipped) },
  ];

  return (
    <dl className={`space-y-1.5 ${className}`}>
      {facts.map((fact) => (
        <div key={fact.label} className={row}>
          <dt className="text-[0.75rem] uppercase tracking-[0.18em] text-[#f6ebdd]/40">
            {fact.label}
          </dt>
          <dd
            className={`break-words text-sm leading-5 text-[#f6ebdd] ${
              fact.script ? "font-script text-lg" : "font-mono"
            } ${stacked ? "" : "min-w-0 truncate text-right"}`}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type ProfileCardProps = {
  cameraLookRef: { current: CameraLook };
  onOpenOptions: () => void;
  /** Touch layout: the model alone is the menu button. */
  compact?: boolean;
};

export function ProfileCard({
  cameraLookRef,
  onOpenOptions,
  compact = false,
}: ProfileCardProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          role="button"
          tabIndex={0}
          aria-label={CONTENT.ui.profileFacts.openMenu}
          onClick={onOpenOptions}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onOpenOptions();
          }}
          className="glass pointer-events-auto flex h-24 w-24 cursor-pointer touch-none items-center justify-center overflow-hidden rounded-lg p-1.5 transition hover:border-[#c99b52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd] active:scale-95"
        >
          <div className="h-full w-full overflow-hidden rounded-md bg-[#0b0b12]/80">
            <ProfileAvatar lookRef={cameraLookRef} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-end gap-2">
      <div className="glass w-full rounded-lg p-3 sm:p-3.5">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[#0b0b12]/80 sm:h-24 sm:w-24 lg:h-28 lg:w-28">
            <ProfileAvatar lookRef={cameraLookRef} delayMs={1200} />
          </div>

          <ProfileFacts
            stacked
            className="min-w-0 flex-1 text-[0.9rem] leading-5"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenOptions}
        className="glass-chip pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-2 text-[0.85rem] font-medium uppercase tracking-[0.14em] text-[#f6ebdd]/75 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd] sm:px-3"
      >
        <kbd className="hidden rounded border border-[#f6ebdd]/25 bg-[#f6ebdd]/10 px-1 py-0.5 font-sans text-[0.75rem] sm:inline">
          {CONTENT.ui.menu.controlList.menuKeys}
        </kbd>
        <span className="sm:hidden">
          {CONTENT.ui.profileFacts.menuMobile}
        </span>
        <span className="hidden sm:inline">
          {CONTENT.ui.profileFacts.menuDesktop}
        </span>
      </button>
    </div>
  );
}
