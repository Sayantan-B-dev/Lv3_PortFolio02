"use client";

import { useEffect } from "react";
import type { NoteContent } from "@/content/rooms";

type NoteCardProps = {
  note: NoteContent;
  onClose: () => void;
  onOpenLink: (href: string) => void;
};

/**
 * The message of a sticky note, read as a card. The pointer is free while this
 * is open, so the corner button is the real way out; Esc closes it too.
 */
export function NoteCard({ note, onClose, onOpenLink }: NoteCardProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0b12]/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-card-label"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="glass relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-lg p-5 pr-14 text-[#f6ebdd] sm:p-6 sm:pr-14">
        <button
          type="button"
          aria-label="Close note"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#f6ebdd]/20 text-lg leading-none text-[#f6ebdd]/80 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
        >
          ×
        </button>

        <p
          id="note-card-label"
          className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#c99b52]"
        >
          {note.label}
        </p>
        <p className="mt-3 min-h-0 overflow-y-auto overscroll-contain font-display text-base leading-7 text-[#f6ebdd]/90">
          {note.message}
        </p>

        {note.links?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {note.links.map((link) => (
              <button
                key={`${link.label}-${link.href}`}
                type="button"
                onClick={() => onOpenLink(link.href)}
                className="min-h-10 rounded-md border border-[#f6ebdd]/20 px-3 py-2 text-[0.75rem] uppercase tracking-[0.14em] text-[#f6ebdd]/80 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
              >
                {link.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
