"use client";

import { CONTENT } from "@/content/config";

type ClickHintProps = {
  label?: string;
};

/** The little mouse glyph used wherever the backdrop resumes the room. */
export function MouseIcon({ className = "h-[19px] w-[13px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 13 19"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="0.7"
        y="0.7"
        width="11.6"
        height="17.6"
        rx="5.8"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M6.5 0.7v5.4" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6.5" cy="4.2" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * The mouse cue outside a panel: it says that the backdrop itself resumes the
 * room, which is the only way back once the pointer has been released.
 */
export function ClickHint({
  label = CONTENT.ui.clickHint.default,
}: ClickHintProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
      <div className="glass-chip flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-[#f6ebdd]/75">
        <MouseIcon />
        {label}
      </div>
    </div>
  );
}
