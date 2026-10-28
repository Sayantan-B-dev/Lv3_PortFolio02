"use client";

import { useEffect, useState } from "react";
import { CONTENT } from "@/content/config";

/**
 * True while a touch device is held upright. The room is landscape-only, so
 * this both blocks the scene and tells the visitor what to do.
 */
export function useTouchPortrait() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const orientation = window.matchMedia("(orientation: portrait)");
    const coarse = window.matchMedia("(pointer: coarse)");

    const read = () => setPortrait(coarse.matches && orientation.matches);
    read();

    orientation.addEventListener("change", read);
    coarse.addEventListener("change", read);
    // Older mobile browsers update the media query late after a rotation.
    window.addEventListener("resize", read);

    return () => {
      orientation.removeEventListener("change", read);
      coarse.removeEventListener("change", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  return portrait;
}

/**
 * A phone held upright never mounts the room; rotating it reloads the page
 * (handled by SceneRoot) so the canvas sizes itself to the new viewport.
 */
export function OrientationGate() {
  const copy = CONTENT.ui.rotate;

  return (
    <div
      role="status"
      aria-label={copy.ariaLabel}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[#0d0d16] px-6 py-8 text-center"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        className="h-16 w-16 text-[#c99b52] motion-safe:animate-pulse"
      >
        <rect
          x="16.5"
          y="7.5"
          width="15"
          height="33"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M24 36.5h.02"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M7 24a17 17 0 0 1 4-11M41 24a17 17 0 0 0-4-11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>

      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[#c99b52]">
        {copy.eyebrow}
      </p>
      <p className="max-w-sm font-display text-2xl leading-tight text-[#f6ebdd]">
        {copy.title}
      </p>
      <p className="max-w-xs text-sm leading-6 text-[#f6ebdd]/60">
        {copy.body}
      </p>
      <p className="max-w-xs text-[0.68rem] uppercase tracking-[0.18em] text-[#f6ebdd]/40">
        {copy.reloading}
      </p>
    </div>
  );
}
