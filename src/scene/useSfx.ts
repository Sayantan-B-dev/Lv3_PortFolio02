"use client";

import { useCallback, useEffect, useRef } from "react";

const OIIA_URL = "/sfx/oiia-oiia-sound.mp3";
const PET_URL = "/sfx/chikns-cute-yipee.mp3";
const WALK_URL = "/sfx/cs2-walking-sfx.mp3";
const DOOR_URL = "/sfx/fnaf-4-door-opening.mp3";
const BOOK_URL = "/sfx/book-opening.mp3";

function replay(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

export function useSfx() {
  const oiiaRef = useRef<HTMLAudioElement | null>(null);
  const petRef = useRef<HTMLAudioElement | null>(null);
  const walkRef = useRef<HTMLAudioElement | null>(null);
  const doorRef = useRef<HTMLAudioElement | null>(null);
  const bookRef = useRef<HTMLAudioElement | null>(null);
  const oiiaActive = useRef(false);
  const walkingActive = useRef(false);

  useEffect(() => {
    const oiia = new Audio(OIIA_URL);
    oiia.preload = "auto";
    oiia.loop = true;
    oiia.volume = 0.72;

    const pet = new Audio(PET_URL);
    pet.preload = "auto";
    pet.volume = 0.78;

    const walk = new Audio(WALK_URL);
    walk.preload = "auto";
    walk.loop = true;
    walk.volume = 0.55;

    const door = new Audio(DOOR_URL);
    door.preload = "auto";
    door.volume = 0.54;

    const book = new Audio(BOOK_URL);
    book.preload = "auto";
    book.volume = 0.7;

    oiiaRef.current = oiia;
    petRef.current = pet;
    walkRef.current = walk;
    doorRef.current = door;
    bookRef.current = book;
    if (walkingActive.current) void walk.play().catch(() => {});

    return () => {
      oiia.pause();
      pet.pause();
      walk.pause();
      door.pause();
      book.pause();
      oiiaRef.current = null;
      petRef.current = null;
      walkRef.current = null;
      doorRef.current = null;
      bookRef.current = null;
    };
  }, []);

  const setOiiaActive = useCallback((active: boolean) => {
    if (oiiaActive.current === active) return;

    oiiaActive.current = active;
    const audio = oiiaRef.current;
    if (!audio) return;

    if (active) {
      replay(audio);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const setWalkingActive = useCallback((active: boolean) => {
    if (walkingActive.current === active) return;

    walkingActive.current = active;
    const audio = walkRef.current;
    if (!audio) return;

    if (active) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const playPet = useCallback(() => replay(petRef.current), []);
  const playDoor = useCallback(() => replay(doorRef.current), []);
  const playBook = useCallback(() => replay(bookRef.current), []);

  return {
    setOiiaActive,
    setWalkingActive,
    playPet,
    playDoor,
    playBook,
  };
}
