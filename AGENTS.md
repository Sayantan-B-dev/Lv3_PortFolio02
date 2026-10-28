# AGENTS.md — Project Working Rules

These rules apply to coding agents and human contributors. The goal is a personal, polished 3D portfolio built with the simplest reliable solution, not a framework showcase.

## 1. Before changing code

- Inspect the repository, `package.json`, existing conventions, and current tests before editing anything.
- Preserve working code. Do not replace the project structure or rewrite whole files merely to match a suggested layout.
- Identify the smallest complete feature being requested. Make that feature work before adding enhancements.
- If a requirement is ambiguous but a safe, reversible default is available, choose it and document the assumption briefly instead of blocking progress with avoidable questions.
- Do not work ahead into future milestones unless explicitly requested.
- Keep the user-facing update factual: what changed, what was tested, and what remains.

## 2. Decision standard: simple, high-value, maintainable

Before adding a dependency, abstraction, helper layer, or effect, compare the simplest workable option with the more complex option. Choose the low-cost, high-output path unless the complex option solves a concrete problem that is already present.

- Prefer plain React components, clear props, a small content object, and CSS over elaborate abstractions.
- Avoid premature generic systems, factories, plugin architectures, event buses, custom shader frameworks, and one-off hooks that do not earn their existence.
- Next.js App Router and Tailwind CSS are already part of the scaffold. Do not add another router, CSS framework, state library, physics engine, form library, GSAP, or post-processing package unless a concrete feature needs one.
- Do not add multiple files for a one-line value without a real reason.
- Do not add comments that merely repeat what the code already says. Comment intent, constraints and non-obvious choices.

## 3. Scope and frontend-only architecture

- This is a frontend-only Next.js app. Keep it statically prerenderable: no backend, database, authentication, API routes/route handlers, server actions, CMS, environment secrets, or server framework unless the user explicitly changes the requirement.
- Keep `src/app/layout.tsx` and `src/app/page.tsx` as server components. Put Three.js, R3F, and any browser-only code in components marked `"use client"`; do not mark the whole app as client.
- Render every room on the single `/` page. Do not create one Next.js route per room.
- The seven room modules in `src/rooms/` remain independently editable: `HomeRoom`, `ArchitectRoom`, `GalleryRoom`, `CoreRoom`, `JourneyRoom`, `PlaygroundRoom`, `GatewayRoom`.
- Reuse common building blocks for room shells, doors, frames and wall text.
- Keep changeable room content and asset paths in `src/content/`. Content changes must not force geometry or navigation changes.
- Keep the navigation graph explicit: `home -> architect -> gallery -> core -> journey -> playground -> gateway -> architect`; the themed door asks Home or Next, and the gateway wraps back to architect.
- The door's displayed destination and actual destination must derive from the same data, not duplicated strings.
- Keep one visible door per room. Home has seven doors; a themed room has one door that offers Home or the next room.
- Keep one persistent React Three Fiber `Canvas` inside a client-only boundary. Change the active room within the scene rather than remounting the whole canvas.
- The profile avatar is the one exception: a tiny second canvas for the rotating model preview, kept outside the room scene so it cannot disturb pointer lock or room pointer events.
- Never import `three`, R3F, or the scene components into a server component.
- If deployed as static files, use `output: 'export'` and keep image and asset URLs compatible.

### Current implementation map

- `src/app/page.tsx` is the server entry. It reads the music playlist from `public/music`, renders the static first paint, and mounts the client-only scene.
- `src/scene/SceneRoot.tsx` owns the WebGL check, the single `Canvas`, the asset gate, shader warmup, active-room state, the door-open plus fade transition, the door choice prompt, the menu and pause state, the in-world door prompt and the fallbacks. It also mounts the root music hook and the effect sounds so they survive room changes.
- `src/content/rooms.ts` is the single source of truth for room order, titles, copy, palettes, windows, doors, frame content and notes. `src/content/portfolio.ts` holds the resume facts and links; `src/content/profile.ts` applies the public env overrides; `src/content/config.ts` holds site metadata and UI strings; `src/content/layout.ts` holds circular furniture placements and collision boxes.
- The shell is cylindrical. `src/components/RoomShell.tsx` uses `ROOM_RADIUS = 6`, `ROOM_HEIGHT = 4.5` and `ROOM_SPAWN = [0, 1.7, 2.8]`; angle `0` is the front wall (door) and `π` is the back wall (title and frames). Home is sealed with no windows and no space backdrop.
- Doors are built from boxes in `src/components/Door.tsx` and positioned by angle. A door's local +Z face turns toward the room centre with `rotation.y = angle + π`.
- `src/components/RoomStage.tsx` centers the title and intro on the back wall and lays out frames on a shared back arc: three-frame rooms use a wider spread and larger moulding; certificate rooms use a tighter spread.
- `src/components/PictureFrame.tsx` shows an image or looping clip; with no image it acts as a text plaque whose caption is always visible. A frame with `href` opens that link through `onOpenLink`.
- `src/components/DoorChoice.tsx` is the Home / Next / Stay prompt for a themed door.
- `src/components/NoteCard.tsx` shows a note and its optional links; `src/components/StickyNote.tsx` is the paper note in the room.
- `src/scene/PlayerControls.tsx` keeps walker movement inside the cylinder radius, collides with `FURNITURE[roomId]`, and focuses the nearest door by aim and range. `E` or a click opens the focused door.
- `src/components/WanderingCats.tsx` wanders ten cats inside Home with circular bounds; petting swaps to the animated model. `src/components/FloatingCats.tsx` hangs five cats in Playground with an additive outline and a look-triggered spin.
- `src/components/SpaceTheater.tsx` is the Playground cinema button and screen. The video is `preload="none"` and streams only after a press.
- `src/scene/assets.ts` is the single loader and cache. It reads `public/fetch_file_index.json`, gates the intro on `shared` plus the landing room, warms the other rooms after reveal, keeps `getAssetTier()` frozen for the page load, and builds blob URLs for clips and music.
- `public/fetch_file_index.json` is generated by `npm run index` from `scripts/build-file-index.mjs`. Keep it in sync with `public/` whenever a preloaded file changes.
- `src/components/ProfileCard.tsx` is the bottom-right card (name, role, location, projects) with the player preview. `ProfileFacts` is reused by the menu. There is no live-age or cake counter.
- `src/components/OptionsDialog.tsx` is the Esc menu: profile preview, settings and controls. `src/components/MusicControls.tsx` is the root-music footer.
- `src/components/PauseOverlay.tsx` is the click-to-interact state; `src/components/ClickHint.tsx` is the backdrop cue.
- `src/components/StatsMonitor.tsx` samples three's counters once a second through `renderMetrics.ts`, never per frame.
- `src/components/IntroOverlay.tsx` reports real byte progress and the current file until the scene is warm.
- On touch, `OrientationGate.tsx`, `FullscreenOnTouch.tsx`, `TouchJoystick.tsx` and direct taps drive the room. The stats card is hidden on touch.
- `src/app/manifest.ts`, `src/components/PwaRegistration.tsx`, `public/sw.js`, `public/offline.html` and `src/components/InstallApp.tsx` make the site installable and offline-capable. `public/assets/source/` is a source folder only and is not served through the asset index.
- The typeface is one self-hosted family, Montenegrin Gothic One, from `public/fonts/`.
- Tests live in `src/tests/`: `rooms.test.ts` covers navigation, content, asset paths, the preload index and media; `profile.test.ts` covers profile defaults and stats; `pwa.test.ts` covers the install shell.

## 4. Loading and graceful failure

1. Render the HTML/CSS shell immediately.
2. Show the intro and real progress before mounting the WebGL canvas.
3. Read the checked-in file index once, then load `shared` plus the landing room through the shared loader.
4. Report completed files, total files and the current file; never fake progress.
5. Cap oversized model textures at runtime while keeping authored maps.
6. Warm shaders and paint frames behind the intro.
7. Warm the other rooms at low concurrency after the reveal, in door order.
8. Leave the scene functional if one decorative asset is slow, missing or invalid.

Specific rules:

- Do not put every image and every room under one large `Suspense` boundary.
- The intro is the only intentional blocking wait, and it covers only `shared` plus `home`.
- Door transitions never start a fetch; wait with visible progress if the destination is warming.
- Use the shared loader/cache in `src/scene/assets.ts`, never a loader per render.
- Use root-relative asset URLs; route them through one small helper if `basePath` is introduced.
- Do not show raw stack traces to visitors.
- Self-host any environment map; do not auto-load remote demo HDRIs.

## 5. 3D performance rules

- Reuse geometry and materials for repeated frames, trim and decorations.
- Do not call React state setters from `useFrame`.
- Use a small number of lights. No light casts shadows in this project.
- Prefer `MeshStandardMaterial`; reserve physical materials for accents.
- Avoid full-screen post-processing unless measured.
- Compress models and textures; keep the `-low` exports in sync.
- Test a mobile-sized landscape viewport before adding another effect.
- Respect `prefers-reduced-motion`.

## 6. Visual and content integrity

- Follow `DESIGN.md`: stylized, believable materials and lighting rather than flat cartoon visuals alone.
- Typography is one typeface, Montenegrin Gothic One, self-hosted from `public/fonts/`.
- Overlays use `.glass` / `.glass-chip`, `rounded-lg` panels and `rounded-md` buttons.
- Keep wall text readable at the intended camera distance and keep the back wall uncluttered.
- Do not invent personal facts, projects, achievements, testimonials or quotes. Use the supplied resume content and neutral placeholders for anything missing.
- Do not add AI labels, signatures, watermarks, model badges or hidden AI tags.
- Set metadata with the Next.js Metadata API from `CONTENT.site`.
- Preserve required third-party license notices.

## 7. Accessibility and interaction

- Keep one guarded pointer-lock path in `PlayerControls`: request the lock on the listened element, skip requests while locked or during the post-Esc cooldown, and let a click on the room be that request.
- The door works with mouse, keyboard and touch.
- Provide visible hover/focus states and a door label; do not rely on colour alone.
- Keep clickable targets large enough to use comfortably.
- If WebGL is unavailable, show the plain fallback.
- Keep navigation usable while decorative assets are still loading.

## 8. Tiny tests, every time

Do not run `npm run lint` or `npm run build` on your own initiative: the user runs those. Implement what was asked and stop. Run them only when the user reports a problem or explicitly asks.

Run a small, relevant test for each feature group:

- Navigation/config: `npm run test`.
- Door transition: manual smoke test of the themed loop and the gateway wrap.
- Content changes: verify paths, titles, and one missing-asset path.
- Loading/visual changes: check the console and the reveal.
- Client/server boundary changes: confirm `/` still prerenders.
- Dependency/config changes: run `npm run lint` and `npm run build`.

Never claim a test, build or browser check ran unless it actually ran.

## 9. Git and commit policy

Do not create commits unless the user or the repository workflow explicitly asks. When commits are requested:

- One commit per completed feature or coherent topic.
- Do not commit broken or failing work.
- Use a short, plain message; no emojis, AI tags, co-author tags or marketing language.
- Never include secrets, local env files, build output, caches or machine-specific files.
- Do not rewrite or amend existing commits unless explicitly asked.

## 10. Safe tool and dependency use

- Inspect scripts before running commands; use npm and the committed `package-lock.json`.
- Do not add a dependency unless it solves an identified task. Explain it briefly in the final report.
- Do not run unfamiliar install scripts or pipe remote scripts into a shell.
- Do not introduce analytics, tracking, telemetry, external calls or unneeded network dependencies.
- Do not update unrelated dependencies during a feature change.

## 11. Completion response

After finishing a feature, state:

1. What changed.
2. Which key files changed.
3. Which tests/build checks actually passed.
4. Any known limitation or next step.
