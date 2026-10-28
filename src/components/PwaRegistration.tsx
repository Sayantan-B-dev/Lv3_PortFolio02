"use client";

import { useEffect } from "react";

/**
 * Registers the offline cache in production only. The dev server keeps changing
 * chunk URLs, so a service worker there would mostly serve stale code.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .catch(() => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.warn("PWA registration failed", error));
    };

    // Register as soon as the app hydrates, not after `load`, so the worker can
    // start caching the shell and the room files while the intro is loading.
    register();
  }, []);

  return null;
}
