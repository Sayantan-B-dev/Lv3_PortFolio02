"use client";

import type { MouseEvent } from "react";

type DoorChoiceProps = {
  title: string;
  roomTitle: string;
  homeLabel: string;
  nextLabel: string;
  stayLabel: string;
  onHome: () => void;
  onNext?: () => void;
  onStay: () => void;
};

export function DoorChoice({
  title,
  roomTitle,
  homeLabel,
  nextLabel,
  stayLabel,
  onHome,
  onNext,
  onStay,
}: DoorChoiceProps) {
  const keepPanelClicks = (event: MouseEvent<HTMLDivElement>) =>
    event.stopPropagation();

  return (
    <div
      className="absolute inset-0 z-[30] flex items-center justify-center bg-[#0b0b12]/45 p-4 backdrop-blur-md"
      onClick={onStay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={keepPanelClicks}
        className="glass w-full max-w-sm rounded-lg px-5 py-6 text-center text-[#f6ebdd]"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.36em] text-[#c99b52]">
          {roomTitle}
        </p>
        <p className="mt-2 font-script text-3xl leading-none">{title}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onHome}
            className="min-h-11 rounded-md bg-[#c99b52] px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#201a13] transition hover:bg-[#f0c98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
          >
            {homeLabel}
          </button>
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="glass-chip min-h-11 rounded-md px-4 py-2 text-[0.8rem] uppercase tracking-[0.16em] text-[#f6ebdd]/80 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
            >
              {nextLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStay}
            className="min-h-11 rounded-md px-4 py-2 text-[0.75rem] uppercase tracking-[0.16em] text-[#f6ebdd]/50 transition hover:text-[#f6ebdd]"
          >
            {stayLabel}
          </button>
        </div>

        <p className="mt-3 text-[0.7rem] text-[#f6ebdd]/40">
          Esc closes this prompt
        </p>
      </div>
    </div>
  );
}
