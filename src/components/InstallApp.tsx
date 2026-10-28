"use client";

import { useEffect, useState } from "react";
import { CONTENT } from "@/content/config";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// The browser fires this once, often before the menu is opened. Keep the event
// at module scope so the menu can still offer it later.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let promptInstalled = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function clearPrompt() {
  deferredPrompt = null;
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    promptInstalled = true;
    clearPrompt();
  });
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return (
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)
  );
}

export function InstallApp() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [installed, setInstalled] = useState(
    () => promptInstalled || isStandalone(),
  );
  const [ios] = useState(isIos);

  useEffect(() => {
    const update = () => {
      setPromptEvent(deferredPrompt);
      if (promptInstalled || isStandalone()) setInstalled(true);
    };

    listeners.add(update);

    return () => {
      listeners.delete(update);
    };
  }, []);

  if (installed || (!promptEvent && !ios)) return null;

  if (ios) {
    return (
      <p className="rounded-md border border-[#f6ebdd]/15 bg-[#f6ebdd]/5 px-3 py-2 text-xs leading-5 text-[#f6ebdd]/65">
        {CONTENT.ui.menu.installIosHint}
      </p>
    );
  }

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    clearPrompt();
  };

  return (
    <div>
      <button
        type="button"
        onClick={install}
        className="min-h-11 w-full rounded-md border border-[#c99b52]/40 bg-[#c99b52]/10 px-4 py-2 text-[0.8rem] uppercase tracking-[0.16em] text-[#f6ebdd] transition hover:border-[#c99b52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
      >
        {CONTENT.ui.menu.install}
      </button>
      <p className="mt-1.5 text-[0.7rem] leading-4 text-[#f6ebdd]/55">
        {CONTENT.ui.menu.installHint}
      </p>
    </div>
  );
}
