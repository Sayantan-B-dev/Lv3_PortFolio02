"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MusicTrack } from "@/content/music";
import { getMusicPlaybackUrl, preloadMusic } from "./assets";

const DEFAULT_VOLUME = 0.52;
const EMPTY_TRACK: MusicTrack = { title: "No music loaded", url: "" };

export type MusicState = {
  track: MusicTrack;
  playing: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  previous: () => void;
  next: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (value: number) => void;
  seek: (value: number) => void;
};

/**
 * Root music: one playlist kept alive across room changes. Playback is wanted
 * by default, but browsers only allow it once the visitor has interacted.
 */
export function useMusic(
  tracks: readonly MusicTrack[],
  ready: boolean,
): MusicState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef("");
  const wantsPlay = useRef(true);
  const mutedRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const nextRef = useRef<() => void>(() => {});
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const attemptPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src || !audio.paused) return;

    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const next = useCallback(() => {
    wantsPlay.current = true;
    setIndex((current) =>
      tracks.length > 0 ? (current + 1) % tracks.length : 0,
    );
  }, [tracks.length]);

  const previous = useCallback(() => {
    wantsPlay.current = true;
    setIndex((current) =>
      tracks.length > 0
        ? (current - 1 + tracks.length) % tracks.length
        : 0,
    );
  }, [tracks.length]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      wantsPlay.current = false;
      audio.pause();
      setPlaying(false);
      return;
    }

    wantsPlay.current = true;
    attemptPlay();
  }, [attemptPlay]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    mutedRef.current = audio.muted;
    setMuted(audio.muted);
  }, []);

  const setVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    const nextVolume = Math.min(1, Math.max(0, value));
    volumeRef.current = nextVolume;
    setVolumeState(nextVolume);

    if (audio) audio.volume = nextVolume;
  }, []);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const limit = Number.isFinite(audio.duration) ? audio.duration : 0;
    const nextTime = Math.min(limit, Math.max(0, value));
    audio.currentTime = nextTime;
    setCurrentTime(Math.floor(nextTime));
  }, []);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volumeRef.current;
    audio.muted = mutedRef.current;

    const publishDuration = () => {
      const value = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(Math.round(value));
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => nextRef.current();
    const handleVolume = () => {
      mutedRef.current = audio.muted;
      setMuted(audio.muted);
    };
    const handleTime = () => {
      const value = Math.floor(audio.currentTime);
      setCurrentTime((current) => (current === value ? current : value));
    };
    const handleCanPlay = () => {
      if (wantsPlay.current && audio.paused) attemptPlay();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("volumechange", handleVolume);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("durationchange", publishDuration);
    audio.addEventListener("loadedmetadata", publishDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audioRef.current = audio;

    const start = () => {
      if (wantsPlay.current) attemptPlay();
    };

    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("volumechange", handleVolume);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("durationchange", publishDuration);
      audio.removeEventListener("loadedmetadata", publishDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      audioRef.current = null;
    };
  }, [attemptPlay]);

  useEffect(() => {
    if (!ready) return;

    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track) return;

    const url = getMusicPlaybackUrl(track.url);
    if (sourceRef.current !== url) {
      sourceRef.current = url;
      audio.src = url;
      setCurrentTime(0);
      setDuration(0);
    }

    if (!wantsPlay.current) return;
    attemptPlay();
  }, [ready, index, tracks, attemptPlay]);

  useEffect(() => {
    if (!ready || !playing || tracks.length < 2) return;

    const urls = new Set<string>();
    for (const offset of [1, 2]) {
      const track = tracks[(index + offset) % tracks.length];
      if (track) urls.add(track.url);
    }
    void preloadMusic([...urls]);
  }, [ready, playing, index, tracks]);

  return {
    track: tracks[index] ?? EMPTY_TRACK,
    playing,
    muted,
    volume,
    currentTime,
    duration,
    previous,
    next,
    togglePlay,
    toggleMute,
    setVolume,
    seek,
  };
}
