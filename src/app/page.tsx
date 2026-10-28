import SceneRoot from "@/scene/SceneRoot";
import { FullscreenOnTouch } from "@/components/FullscreenOnTouch";
import { PwaRegistration } from "@/components/PwaRegistration";
import { CONTENT } from "@/content/config";
import { getMusicTracks } from "@/content/music";
import { ROOMS, START_ROOM } from "@/content/rooms";

export default function Home() {
  const startRoom = ROOMS[START_ROOM];
  const musicTracks = getMusicTracks();

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#10101a]">
      <h1 className="sr-only">{CONTENT.site.heading}</h1>

      {/* Static first paint: visible before the client canvas mounts. */}
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.42em] text-[#c99b52]">
          {startRoom.eyebrow}
        </p>
        <p className="font-display text-3xl text-[#f6ebdd] sm:text-4xl">
          {startRoom.title}
        </p>
        <p className="text-[0.8rem] uppercase tracking-[0.3em] text-[#f6ebdd]/40">
          {CONTENT.ui.shell.firstPaint}
        </p>
      </div>

      <SceneRoot musicTracks={musicTracks} />
      <FullscreenOnTouch />
      <PwaRegistration />
    </main>
  );
}
