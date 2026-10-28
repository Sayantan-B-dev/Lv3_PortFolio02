"use client";

import type { MouseEvent } from "react";
import { CONTENT } from "@/content/config";
import { ClickHint } from "./ClickHint";

type PauseOverlayProps = {
  onResume: () => void;
  onOpenMenu: () => void;
};

export function PauseOverlay({ onResume, onOpenMenu }: PauseOverlayProps) {
  const keepPanelClicks = (event: MouseEvent<HTMLDivElement>) =>
    event.stopPropagation();

  return (
    <div
      className="absolute inset-0 z-[25] flex items-center justify-center bg-[#0b0b12]/35 p-4 backdrop-blur-md"
      onClick={onResume}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={CONTENT.ui.pause.ariaLabel}
        onClick={keepPanelClicks}
        className="glass w-full max-w-xs rounded-lg px-5 py-6 text-center text-[#f6ebdd]"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.36em] text-[#c99b52]">
          {CONTENT.ui.pause.eyebrow}
        </p>
        <p className="mt-2 font-script text-3xl leading-none">
          {CONTENT.ui.pause.title}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#f6ebdd]/55">
          {CONTENT.ui.pause.body}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onResume}
            className="min-h-11 rounded-md bg-[#c99b52] px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#201a13] transition hover:bg-[#f0c98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
          >
            {CONTENT.ui.pause.resume}
          </button>
          <button
            type="button"
            onClick={onOpenMenu}
            className="glass-chip min-h-11 rounded-md px-4 py-2 text-[0.8rem] uppercase tracking-[0.16em] text-[#f6ebdd]/75 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
          >
            {CONTENT.ui.pause.menu}
          </button>
        </div>
      </div>

      <ClickHint />
    </div>
  );
}
