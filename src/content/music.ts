import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export type MusicTrack = {
  title: string;
  url: string;
};

const AUDIO_EXTENSION = /\.(mp3|ogg|wav|m4a|aac|flac)$/i;
const TRACK_NUMBER = /[-_]\d{4,}$/;
const MUSIC_DIRECTORY = resolve(process.cwd(), "public", "music");

function titleFromFile(fileName: string) {
  return fileName
    .replace(AUDIO_EXTENSION, "")
    .replace(TRACK_NUMBER, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Reads the whole public/music folder at build/start time, so adding a track
 * does not need a code change. Static exports capture this list when built.
 */
export function getMusicTracks(): readonly MusicTrack[] {
  if (!existsSync(MUSIC_DIRECTORY)) return [];

  return readdirSync(MUSIC_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isFile() && AUDIO_EXTENSION.test(entry.name))
    .map((entry) => ({
      title: titleFromFile(entry.name),
      url: `/music/${encodeURIComponent(entry.name)}`,
    }))
    .sort((first, second) =>
      first.url.localeCompare(second.url, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}
