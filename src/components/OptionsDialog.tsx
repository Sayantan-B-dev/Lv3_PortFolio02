"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CONTENT } from "@/content/config";
import type { RoomContent } from "@/content/rooms";
import type { CameraLook } from "@/scene/PlayerControls";
import type { QualityLevel } from "@/scene/SceneRoot";
import { MouseIcon } from "./ClickHint";
import { InstallApp } from "./InstallApp";
import { MusicControls } from "./MusicControls";
import { ProfileAvatar, ProfileFacts } from "./ProfileCard";

type OptionsDialogProps = {
  room: RoomContent;
  open: boolean;
  sensitivity: number;
  moveSpeed: number;
  fov: number;
  quality: QualityLevel;
  coarsePointer: boolean;
  cameraLookRef: { current: CameraLook };
  musicTitle: string;
  musicPlaying: boolean;
  musicMuted: boolean;
  musicVolume: number;
  musicCurrentTime: number;
  musicDuration: number;
  onMusicPrevious: () => void;
  onMusicTogglePlay: () => void;
  onMusicNext: () => void;
  onMusicToggleMute: () => void;
  onMusicVolumeChange: (value: number) => void;
  onMusicSeek: (value: number) => void;
  onSensitivityChange: (value: number) => void;
  onMoveSpeedChange: (value: number) => void;
  onFovChange: (value: number) => void;
  onQualityChange: (value: QualityLevel) => void;
  onRecentre: () => void;
  onReset: () => void;
  onClose: () => void;
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-[#f6ebdd]/25 bg-[#f6ebdd]/10 px-1.5 py-0.5 font-sans text-[0.8rem] text-[#f6ebdd]">
      {children}
    </kbd>
  );
}

type SliderRowProps = {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: SliderRowProps) {
  return (
    <label className="block text-xs">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[#f6ebdd]/80">{label}</span>
        <span className="font-mono text-[0.8rem] text-[#f6ebdd]/55">
          {display}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-6 w-full accent-[#c99b52]"
      />
    </label>
  );
}

const QUALITY_OPTIONS: QualityLevel[] = ["low", "balanced", "high"];

const secondaryButton =
  "min-h-11 rounded-md border border-[#f6ebdd]/20 px-4 py-2 text-[0.8rem] uppercase tracking-[0.16em] text-[#f6ebdd]/75 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]";

export function OptionsDialog({
  room,
  open,
  sensitivity,
  moveSpeed,
  fov,
  quality,
  coarsePointer,
  cameraLookRef,
  musicTitle,
  musicPlaying,
  musicMuted,
  musicVolume,
  musicCurrentTime,
  musicDuration,
  onMusicPrevious,
  onMusicTogglePlay,
  onMusicNext,
  onMusicToggleMute,
  onMusicVolumeChange,
  onMusicSeek,
  onSensitivityChange,
  onMoveSpeedChange,
  onFovChange,
  onQualityChange,
  onRecentre,
  onReset,
  onClose,
}: OptionsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const controls = CONTENT.ui.menu.controlList;

  return (
    <div
      className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-[#0b0b12]/40 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
        onClick={(event) => event.stopPropagation()}
        className="glass relative my-auto w-full max-w-5xl rounded-lg p-4 text-[#f6ebdd] outline-none sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={CONTENT.ui.menu.close}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#f6ebdd]/20 text-xl leading-none text-[#f6ebdd]/80 transition hover:border-[#c99b52] hover:text-[#f6ebdd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebdd]"
        >
          ×
        </button>

        <header className="pr-12">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4em] text-[#c99b52]">
            {room.eyebrow}
          </p>
          <h2
            id="options-title"
            className={`mt-2 font-display ${coarsePointer ? "text-2xl" : "text-3xl"}`}
          >
            {room.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#f6ebdd]/70">
            {room.intro}
          </p>
        </header>

        <div className="mt-5 grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[#f6ebdd]/10">
          <section aria-labelledby="options-profile" className="md:pr-6">
            <h3
              id="options-profile"
              className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-[#c99b52]"
            >
              {CONTENT.ui.menu.profile}
            </h3>

            <div className="mt-3 flex flex-col items-center gap-3">
              <div
                className={`shrink-0 overflow-hidden rounded-md bg-[#0b0b12]/80 ${
                  coarsePointer ? "h-36 w-36" : "h-48 w-48 sm:h-56 sm:w-56"
                }`}
              >
                <ProfileAvatar lookRef={cameraLookRef} interactive />
              </div>
              <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[#f6ebdd]/35">
                {CONTENT.ui.menu.dragAvatar}
              </p>
              <ProfileFacts className="w-full max-w-56 text-sm leading-5" />
            </div>
          </section>

          <section aria-labelledby="options-settings" className="md:px-6">
            <h3
              id="options-settings"
              className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-[#c99b52]"
            >
              {CONTENT.ui.menu.settings}
            </h3>

            <div className="mt-3 space-y-4">
              <SliderRow
                label={CONTENT.ui.menu.lookSensitivity}
                value={sensitivity}
                display={`${sensitivity.toFixed(2)}×`}
                min={0.25}
                max={2.5}
                step={0.05}
                onChange={onSensitivityChange}
              />
              <SliderRow
                label={
                  coarsePointer
                    ? CONTENT.ui.menu.walkSpeedCoarse
                    : CONTENT.ui.menu.wasdSpeed
                }
                value={moveSpeed}
                display={`${moveSpeed.toFixed(1)} m/s`}
                min={1.2}
                max={6}
                step={0.1}
                onChange={onMoveSpeedChange}
              />
              <SliderRow
                label={CONTENT.ui.menu.fieldOfView}
                value={fov}
                display={`${fov}°`}
                min={40}
                max={90}
                step={1}
                onChange={onFovChange}
              />

              <div className="text-xs">
                <span className="text-[#f6ebdd]/80">
                  {CONTENT.ui.menu.quality}
                </span>
                <div
                  role="group"
                  aria-label={CONTENT.ui.menu.quality}
                  className="mt-2 grid grid-cols-3 gap-1 rounded-md border border-[#f6ebdd]/15 p-1"
                >
                  {QUALITY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onQualityChange(option)}
                      aria-pressed={quality === option}
                      className={`min-h-9 rounded-sm px-2 text-[0.72rem] uppercase tracking-[0.12em] transition ${
                        quality === option
                          ? "bg-[#c99b52] text-[#201a13]"
                          : "text-[#f6ebdd]/65 hover:text-[#f6ebdd]"
                      }`}
                    >
                      {CONTENT.ui.menu.qualityLevels[option]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRecentre}
                className={secondaryButton}
              >
                {CONTENT.ui.menu.recentre}
              </button>
              <button type="button" onClick={onReset} className={secondaryButton}>
                {CONTENT.ui.menu.reset}
              </button>
            </div>

            <div className="mt-4 empty:hidden">
              <InstallApp />
            </div>
          </section>

          <section aria-labelledby="options-controls" className="md:pl-6">
            <h3
              id="options-controls"
              className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-[#c99b52]"
            >
              {CONTENT.ui.menu.controls}
            </h3>

            {coarsePointer ? (
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#f6ebdd]/70">
                {Object.values(CONTENT.ui.menu.touchControls).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#f6ebdd]/70">
                <li>
                  <Kbd>{controls.walkKeys}</Kbd> {controls.walk} ·{" "}
                  <Kbd>{controls.runKeys}</Kbd> {controls.run}
                </li>
                <li>
                  <Kbd>{controls.jumpKeys}</Kbd> {controls.jump}
                </li>
                <li>
                  <Kbd>{controls.lookKeys}</Kbd> {controls.look} ·{" "}
                  {controls.lookFine}
                </li>
                <li>
                  <Kbd>{controls.enterKeys}</Kbd> {controls.enter}
                </li>
                <li>
                  <Kbd>{controls.interactKeys}</Kbd> {controls.interact}
                </li>
                <li>
                  <Kbd>{controls.noteKeys}</Kbd> {controls.note}
                </li>
                <li>
                  <Kbd>{controls.menuKeys}</Kbd> {controls.menu}
                </li>
              </ul>
            )}

            <p className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-md border border-[#c99b52]/30 bg-[#c99b52]/10 px-3 py-2 text-center text-xs font-medium tracking-wide text-[#f6ebdd]">
              {coarsePointer ? (
                CONTENT.ui.menu.tapOutside
              ) : (
                <>
                  <MouseIcon className="h-4 w-3 text-[#f6ebdd]/80" />
                  {CONTENT.ui.menu.clickOutside} ·{" "}
                  <Kbd>{controls.menuKeys}</Kbd>{" "}
                  {CONTENT.ui.menu.closeWithEsc}
                </>
              )}
            </p>
          </section>
        </div>

        <footer className="mt-5 border-t border-[#f6ebdd]/10 pt-4">
          <MusicControls
            title={musicTitle}
            playing={musicPlaying}
            muted={musicMuted}
            volume={musicVolume}
            currentTime={musicCurrentTime}
            duration={musicDuration}
            onPrevious={onMusicPrevious}
            onTogglePlay={onMusicTogglePlay}
            onNext={onMusicNext}
            onToggleMute={onMusicToggleMute}
            onVolumeChange={onMusicVolumeChange}
            onSeek={onMusicSeek}
          />
        </footer>
      </div>
    </div>
  );
}
