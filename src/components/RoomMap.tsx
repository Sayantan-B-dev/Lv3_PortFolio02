"use client";

import { useEffect, useRef } from "react";
import { CONTENT } from "@/content/config";
import { ROOMS, ROOM_ORDER, type RoomId } from "@/content/rooms";

type RoomMapProps = {
  current: RoomId;
  onSelect: (room: RoomId) => void;
  onClose: () => void;
};

/** Full-screen room map; every node teleports straight to that room. */
export function RoomMap({ current, onSelect, onClose }: RoomMapProps) {
  const panelRef = useRef<HTMLElement>(null);
  const strings = CONTENT.ui.map;

  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLButtonElement>(
      "button[aria-current]",
    );
    (first ?? panelRef.current)?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07070d]/78 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={strings.title}
        className="glass w-full max-w-2xl rounded-lg p-5 outline-none sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[#c9b8a6]/80">
              {strings.eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#f6ebdd] sm:text-2xl">
              {strings.title}
            </h2>
            <p className="mt-1 text-xs text-[#c9b8a6]/80">{strings.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.close}
            className="rounded-md border border-[#c9b8a6]/25 px-3 py-2 text-xs text-[#f6ebdd] transition hover:border-[#c9b8a6]/60 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9b8a6]"
          >
            Esc
          </button>
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROOM_ORDER.map((id, index) => {
            const room = ROOMS[id];
            const active = id === current;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={active ? "location" : undefined}
                  className={`group flex h-full w-full flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9b8a6] ${
                    active
                      ? "border-[#e6c8a3]/70 bg-[#e6c8a3]/15"
                      : "border-[#c9b8a6]/18 bg-black/20 hover:border-[#c9b8a6]/55 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[#c9b8a6]/35 text-[0.65rem] font-bold text-[#f6ebdd]"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold leading-tight text-[#f6ebdd]">
                    {room.title}
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[#c9b8a6]/75">
                    {active ? strings.youAreHere : strings.travel}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
