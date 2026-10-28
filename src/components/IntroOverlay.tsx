"use client";

import { CONTENT } from "@/content/config";

type IntroOverlayProps = {
  visible: boolean;
  /** 0–100. */
  progress: number;
  completed: number;
  total: number;
  current: string;
};

/**
 * The HTML half of the intro: plain markup and CSS shown while every room's
 * models and photos are downloaded. It is the only mandatory wait, so the bar
 * reports real progress and the current file rather than an indeterminate spinner.
 *
 * The bar is split into one segment per file in the preload index, so each
 * completed file lights up its own section instead of a single smooth fill.
 */
export function IntroOverlay({
  visible,
  progress,
  completed,
  total,
  current,
}: IntroOverlayProps) {
  const rounded = Math.min(100, Math.max(0, Math.round(progress)));
  const filledSegments = Math.min(total, completed);
  const segmentCount = total;

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 overflow-y-auto bg-[#0d0d16] px-4 py-5 text-center transition-opacity duration-500 ease-out motion-reduce:transition-none sm:gap-3 sm:px-6 sm:py-6 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-[#c99b52] sm:text-[0.7rem] sm:tracking-[0.34em]">
        Please Wait a Moment.
      </p>
      <p className="max-w-md text-balance font-script text-sm leading-relaxed text-[#f6ebdd]/50 sm:text-base">
        {CONTENT.ui.intro.title}
      </p>

      <div
        className="mt-1 w-full max-w-xs shrink-0 sm:max-w-sm"
        role="progressbar"
        aria-label={CONTENT.ui.intro.ariaLabel}
        aria-valuemin={0}
        aria-valuemax={segmentCount}
        aria-valuenow={completed}
      >
        <div className="flex gap-[3px]">
          {Array.from({ length: segmentCount }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-sm transition-colors duration-150 ease-out ${
                i < filledSegments
                  ? "bg-[#c99b52]"
                  : "bg-[#f6ebdd]/15"
              }`}
              style={{
                flex: 1,
                transitionDelay: i < filledSegments ? `${i * 8}ms` : "0ms",
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f6ebdd]/50">
          <span>{rounded}%</span>
          <span>{CONTENT.ui.intro.assets(completed, total)}</span>
        </div>

        <p className="mt-1 h-4 truncate text-xs text-[#f6ebdd]/40">
          {current ||
            (rounded >= 100
              ? CONTENT.ui.intro.starting
              : CONTENT.ui.intro.preparing)}
        </p>
      </div>
    </div>
  );
}
