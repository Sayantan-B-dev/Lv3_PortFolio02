"use client";

import { useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  AdditiveBlending,
  AnimationMixer,
  BackSide,
  Group,
  MeshBasicMaterial,
  type Mesh,
} from "three";
import type { PrepareOptions } from "./modelUtils";
import { getModelAnimations, getPreparedModel } from "@/scene/assets";

export type { PrepareOptions } from "./modelUtils";

type ModelBoundaryProps = {
  children: ReactNode;
};

// A missing or broken file must cost one prop, never the room.
class ModelBoundary extends Component<ModelBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type ModelProps = PrepareOptions & {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Plays the file's first animation, if it has one. */
  animate?: boolean;
  /** Draws a translucent additive rim around the original-coloured model. */
  outline?: string;
};

function LoadedModel({
  url,
  position,
  rotation,
  animate = false,
  outline,
  ...options
}: ModelProps) {
  const {
    size,
    fit,
    tint,
    emissive,
    emissiveIntensity,
    hide,
    merge,
    shadows,
    stretch,
    repeat,
  } = options;
  const [stretchX, stretchY, stretchZ] = stretch ?? [1, 1, 1];
  const [repeatX, repeatY] = repeat ?? [1, 1];
  const mixerRef = useRef<AnimationMixer | null>(null);

  const model = useMemo(
    () =>
      getPreparedModel(url, {
        size,
        fit,
        tint,
        emissive,
        emissiveIntensity,
        hide,
        merge,
        shadows,
        stretch: [stretchX, stretchY, stretchZ],
        repeat: [repeatX, repeatY],
      }),
    [
      url,
      size,
      fit,
      tint,
      emissive,
      emissiveIntensity,
      hide,
      merge,
      shadows,
      stretchX,
      stretchY,
      stretchZ,
      repeatX,
      repeatY,
    ],
  );

  const animations = useMemo(() => getModelAnimations(url), [url]);

  const outlineShells = useMemo(() => {
    if (!outline || !model) return null;

    const group = new Group();
    const materials: MeshBasicMaterial[] = [];
    const shells = [
      { scale: 1.035, opacity: 0.62 },
      { scale: 1.075, opacity: 0.16 },
    ];

    for (const shellConfig of shells) {
      const material = new MeshBasicMaterial({
        color: outline,
        side: BackSide,
        transparent: true,
        opacity: shellConfig.opacity,
        depthWrite: false,
        toneMapped: false,
        blending: AdditiveBlending,
      });
      const shell = model.clone(true);
      shell.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.isMesh) mesh.material = material;
      });
      shell.scale.multiplyScalar(shellConfig.scale);
      group.add(shell);
      materials.push(material);
    }

    return { group, materials };
  }, [model, outline]);

  useEffect(() => {
    if (!model || !animate || animations.length === 0) return;

    const mixer = new AnimationMixer(model);
    for (const clip of animations) {
      mixer.clipAction(clip).reset().play();
    }
    mixerRef.current = mixer;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      mixerRef.current = null;
    };
  }, [animate, animations, model]);

  useEffect(() => {
    return () => {
      for (const material of outlineShells?.materials ?? []) material.dispose();
    };
  }, [outlineShells]);

  useFrame((_, delta) => {
    mixerRef.current?.update(Math.min(delta, 0.05));
  });

  // HMR re-evaluates assets.ts mid-scene, so the cache can be empty. A missing
  // model is one prop: the boundary swallows it and the room keeps rendering.
  if (!model) return null;

  // The wrapper carries the placement: setting position on the primitive itself
  // would overwrite the centring transform prepareModel just baked in.
  return (
    <group position={position} rotation={rotation}>
      {outlineShells ? (
        <primitive object={outlineShells.group} dispose={null} />
      ) : null}
      <primitive object={model} dispose={null} />
    </group>
  );
}

export function Model(props: ModelProps) {
  return (
    <ModelBoundary>
      <LoadedModel {...props} />
    </ModelBoundary>
  );
}
