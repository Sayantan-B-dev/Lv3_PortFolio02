"use client";

import { useEffect } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

function isInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/**
 * Phones enter fullscreen on the first real touch, never on load. The same
 * gesture is what lets the browser accept the request and lock landscape.
 * iOS has no element fullscreen, so it simply keeps the existing rotate gate.
 */
export function FullscreenOnTouch() {
  useEffect(() => {
    if (isInstalledApp()) return;

    const coarse = window.matchMedia("(pointer: coarse)");
    let attempted = false;

    const enter = async () => {
      if (attempted || !coarse.matches) return;
      attempted = true;

      const root = document.documentElement as FullscreenRoot;
      const doc = document as FullscreenDocument;
      const request = root.requestFullscreen
        ? () => root.requestFullscreen({ navigationUI: "hide" })
        : root.webkitRequestFullscreen
          ? () => root.webkitRequestFullscreen?.()
          : null;

      const lockLandscape = async () => {
        try {
          await (screen.orientation as LockableOrientation | undefined)?.lock?.(
            "landscape",
          );
        } catch {
          // Orientation lock is best-effort; the rotate gate still covers it.
        }
      };

      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        await lockLandscape();
        return;
      }

      if (!request) return;

      try {
        await request();
      } catch {
        return;
      }

      await lockLandscape();
    };

    document.addEventListener("pointerdown", enter, {
      once: true,
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener("pointerdown", enter, { capture: true });
    };
  }, []);

  return null;
}
