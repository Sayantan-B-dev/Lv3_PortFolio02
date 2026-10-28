"use client";

import type { ReactNode } from "react";
import { CONTENT } from "@/content/config";

type MusicControlsProps = {
  title: string;
  playing: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onSeek: (value: number) => void;
};

const buttonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f6ebdd]/20 text-[#f6ebdd]/75 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd] disabled:opacity-40";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="currentColor"
    >
      {children}
    </svg>
  );
}

function PreviousIcon() {
  return (
    <Icon>
      <path d="M6 5h2v14H6zM18 5v14l-9-7z" />
    </Icon>
  );
}

function NextIcon() {
  return (
    <Icon>
      <path d="M16 5h2v14h-2zM6 5v14l9-7z" />
    </Icon>
  );
}

function PlayIcon() {
  return (
    <Icon>
      <path d="M8 5v14l11-7z" />
    </Icon>
  );
}

function PauseIcon() {
  return (
    <Icon>
      <path d="M7 5h4v14H7zM14 5h4v14h-4z" />
    </Icon>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <Icon>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      {muted ? (
        <path d="M16.2 9.2l4.6 5.6-1.5 1.2-4.6-5.6z" />
      ) : (
        <path d="M16 8.2c1.4 1 2.2 2.3 2.2 3.8s-.8 2.8-2.2 3.8l-1-1.3c1-.6 1.5-1.5 1.5-2.5s-.5-1.9-1.5-2.5z" />
      )}
    </Icon>
  );
}

function clock(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicControls({
  title,
  playing,
  muted,
  volume,
  currentTime,
  duration,
  onPrevious,
  onTogglePlay,
  onNext,
  onToggleMute,
  onVolumeChange,
  onSeek,
}: MusicControlsProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2 text-center">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#c99b52]">
        {CONTENT.ui.music.title}
      </p>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className={buttonClass}
          aria-label={CONTENT.ui.music.previous}
        >
          <PreviousIcon />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className={buttonClass}
          aria-label={
            playing ? CONTENT.ui.music.pause : CONTENT.ui.music.play
          }
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={onNext}
          className={buttonClass}
          aria-label={CONTENT.ui.music.next}
        >
          <NextIcon />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          className={buttonClass}
          aria-label={
            muted ? CONTENT.ui.music.unmute : CONTENT.ui.music.mute
          }
          aria-pressed={muted}
        >
          <SpeakerIcon muted={muted} />
        </button>
      </div>

      <p
        aria-live="polite"
        className="w-full truncate text-[0.8rem] text-[#f6ebdd]/65"
      >
        {title}
      </p>

      <div className="flex w-full items-center gap-2 font-mono text-[0.68rem] text-[#f6ebdd]/55">
        <span className="w-8 text-right">{clock(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={1}
          value={Math.min(currentTime, Math.max(1, duration))}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label={CONTENT.ui.music.playback}
          className="h-5 min-w-0 flex-1 accent-[#c99b52]"
        />
        <span className="w-8 text-left">{clock(duration)}</span>
      </div>

      <label className="flex w-full items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#f6ebdd]/45">
        <span className="w-14 text-left">{CONTENT.ui.music.volume}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label={CONTENT.ui.music.volumeAria}
          className="h-5 min-w-0 flex-1 accent-[#c99b52]"
        />
        <span className="w-8 text-right font-mono text-[0.68rem] tracking-normal text-[#f6ebdd]/60">
          {Math.round(volume * 100)}%
        </span>
      </label>
    </div>
  );
}
