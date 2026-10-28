# DESIGN.md â€” Visual Direction

## 1. Art direction

**A cozy, cinematic anime-inspired room with believable 3D materials.** The result should feel like stepping into a beautifully lit illustrated world: expressive colours and clean silhouettes from anime backgrounds, but grounded with natural light falloff, material texture, soft shadows, and restrained reflections.

Do not make the scene a flat cartoon, and do not chase photorealism so hard that the room loses its charm. Aim for stylized semi-realism: intentional shapes, slightly idealized proportions, painterly colour choices, and physically plausible light.

The rooms should feel like chapters in one story. Their colours and decoration can change, but they share a consistent camera scale, door language, picture-frame system, material quality, and lighting finish.

## 2. Visual priorities

Use this priority order when making trade-offs:

1. The story is instantly clear: the current room, its title, and the next door destination are easy to understand.
2. The room feels like a place, not a flat UI screenshot: walls, floor, depth, shadows, and readable perspective.
3. Personal content is the emotional focus: photos and messages should be more noticeable than decorative clutter.
4. Lighting and materials create atmosphere.
5. Motion and effects support the room instead of competing with it.
6. Performance stays smooth on an ordinary laptop and a modern phone.

Do not sacrifice the first three priorities for a glow, particle, or reflection effect.

## 3. Shared visual language

### Shapes

- Use simple architectural geometry with softened corners and selective bevels where they add warmth.
- Picture frames should share a consistent family: slim trim, a subtle inner mat, and a clean photo opening.
- The door is the main interactive object. Make its silhouette and label easy to read at a glance.
- Avoid scattering too many floating objects around the room. Keep clear negative space around titles, pictures, and doorways.

### Materials

- Walls: matte or lightly textured plaster with gentle colour variation.
- Floor: wood, warm stone, or a stylized finish with a broad, soft highlight; it should not look like a mirror.
- Frames and door details: painted wood, muted brass, or other warm accents.
- Glass: only where it helps the design. Use it sparingly because transparency and transmission can be expensive and visually noisy.
- Cloth, paper, and printed photos: mostly diffuse, with subtle surface response rather than plastic shine.

Use `MeshStandardMaterial` for most surfaces. Reserve more expensive physical-material features for a few visible accents. A convincing lighting setup will do more for the look than applying a complicated material to every object.

## 4. Palette system

These are starting tokens, not restrictions. Keep colours low-noise and let room-specific accents provide identity.

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#25233A` | Main text, dark trim, deep shadow colours |
| `warm-paper` | `#F4E9D8` | Photo mats, message cards, light wall accents |
| `soft-cream` | `#F6EBDD` | General warm highlights |
| `wood` | `#8A5B43` | Floor and warm timber |
| `brass` | `#C99B52` | Fine frame and door accents, used sparingly |
| `lavender` | `#B9A7D9` | Journey and certificate accents |
| `gateway-sage` | `#C7E0D8` | Gateway contact accents |
| `blue-shadow` | `#526B93` | Cool fill and evening tones |

Avoid pure white lighting and pure black shadows everywhere. Warm lights and cool shadow tones help the scene feel illustrated without losing depth.

## 5. Room-by-room direction

All rooms share one cylindrical shell, one door language and one frame system. Home is sealed; themed rooms show four curved windows onto their own space backdrop.

### Home

**Mood:** a warm personal hub; calm, grounded and immediately navigable.

- Use a deeper blue-violet or muted teal background with warm wood and restrained brass accents.
- Seven labelled doors sit around the wall: one recentres the view, six open the portfolio rooms.
- Place ten cat figures on the floor; they wander without clipping the player, furniture, walls or each other. A nearby cat plays a short yipee and swaps to the animated pet model when clicked or tapped.
- Keep the table, bookcase and doors uncrowded. Home has no picture frames.

### The Architect

**Mood:** an introduction at golden hour; composed, personal and quietly confident.

- Three looping clips establish the story: full stack end to end, clean architecture, practical delivery.
- Three notes on the reading table carry the about, focus and toolkit copy.
- Use the warm key light plus soft cool fill; keep the wall copy short.

### The Gallery

**Mood:** a small project gallery; brighter and more graphic than the other rooms.

- Three text plaques present BlueEye, LnkZoo and Re-Docs with live and source links.
- Do not invent screenshots. The type and tone carry the work.
- Keep the back wall uncluttered and the plaques readable from the spawn point.

### The Core

**Mood:** the workshop; technical, precise and warm.

- Three looping clips cover the MERN stack, Next.js and TypeScript, and Python/data.
- Frontend, backend and tools notes sit on the table.
- Keep wall text technical but short enough to read at a glance.

### The Journey

**Mood:** a collected record; softer and more reflective.

- Six certificate frames share a tighter back-wall arc, each opening its verification page.
- Notes cover experience, education and the full certification list.
- Preserve the frame hierarchy: certificates read as evidence, not decoration.

### The Playground

**Mood:** the sandbox; playful, experimental and a little theatrical.

- Five floating cats carry a soft outline and spin when the aimed ray crosses their body. The oiia loop plays only while a cat spins.
- A red button beside the door starts the space cinema; the video streams only after the press and lights the room while it plays.
- Three notes explain the cats, the screen and the intent of the room.

### The Gateway

**Mood:** an open door out; generous, clear and professional.

- Three text plaques open email, GitHub and LinkedIn.
- Notes cover contact, elsewhere and hiring, with links to Fiverr and the rest.
- The themed door wraps back to the Architect, so the loop never dead-ends.

## 6. Lighting

The desired look is cinematic and stylized, not a physically exhaustive lighting simulation.

- Start with one main directional or area-like light that establishes a clear light direction.
- Add gentle ambient/hemi fill so unlit faces and wall pictures do not collapse into black.
- Use a subtle rim or accent light only when it separates the door, frames, or important objects from the background.
- Keep the shell lighting consistent: warm key light, soft cool fill, and per-room accents that establish identity.
- Use contact shadows to ground furniture and frames, but keep shadow maps modest and only cast important shadows.
- Test colour management and tone mapping once with real assets. Do not stack excessive glow, bloom, vignette, chromatic aberration, and film grain.
- Use lighting to establish hierarchy: the title, selected photographs, and door should read before background decoration.

## 7. Reflections and highlights

Reflections should add material richness, not turn every surface glossy.

- Use a small, licensed, self-hosted environment map for image-based reflections and ambient material lighting.
- Put the clearest highlights on metal trim, the door handle, glass accents, or polished frame edges.
- Give floors medium-to-high roughness so highlights are broad and soft. Avoid mirror-like floors unless a room concept specifically calls for one.
- Prefer an environment map for stable, low-cost reflections. Reserve live planar or cube-camera reflections for one clearly justified feature, if any.
- Do not use high-cost transparent/transmissive materials on many objects.
- If a surface looks wrong, first check its roughness, environment map, light direction, and colour management before adding a shader.

## 8. Toon style with realistic depth

Use art direction first, effects second.

- Establish readable silhouettes, deliberate colour blocks, slightly simplified forms, and carefully controlled light/shadow regions.
- Keep some edge definition through material contrast, frame geometry, and lighting.
- Let textures be subtle and scaled appropriately; avoid noisy, high-frequency surface detail on every wall.
- If a more explicit toon ramp or outline effect is later requested, add it as a contained experiment and compare it against the simpler standard-material version. Keep a non-effect fallback and measure performance.
- Do not add a global outline shader or a full post-processing stack at the blockout stage.

## 9. Camera and room composition

- Start with a fixed interior camera at a believable standing eye level. The first view should show the room title/content and the door without requiring exploration.
- Keep the initial camera motion minimal. A subtle settle or short transition is enough.
- A limited look-around interaction may be added later, but it must not make the door hard to find or move important text out of view.
- Keep wall pictures aligned to the wall plane, with consistent spacing and margins. Test their size from the actual camera angle, not only from a front-facing editor view.
- Use the camera frustum as a layout constraint: wall content near edges may need extra margins because perspective can make it hard to read.
- Do not introduce first-person walking, physics, and collision just to make the scene feel 3D. The initial concept is an interior viewpoint with clickable portal navigation.

## 10. Wall text and photographs

- Keep the primary title large and short.
- Start the front-wall title and intro near the left wall with clear padding, and keep their right edge well clear of the door and its trim.
- Use smaller text only for captions, names, dates, and brief messages that remain readable at the intended resolution.
- Long notes open as a focused card rather than being squeezed onto a wall.
- Use the same reusable picture-frame component so replacing a photo does not alter the geometry.
- Keep the caption on the photo itself: a low scrim at the bottom edge that appears on hover once the visitor is close enough to read it, and on tap for touch screens.
- Keep image crop/fit configurable. Use consistent frame ratios unless the photograph makes another ratio clearly better.
- Show a tasteful placeholder while an image loads. A failed picture should not make the frame disappear.
- Use descriptive filenames and alt text where the content is represented in HTML. Avoid adding invented personal details or generic filler messages.
- Typography is a single typeface across the project â€” **Montenegrin Gothic One**, self-hosted in `public/fonts/` and declared in `globals.css`, then preloaded in `layout.tsx`. Every font utility (`font-sans`, `font-display`, `font-mono`, `font-script`) resolves to it, and 3D wall and caption text draws from the same family; text carries a small drop shadow so light copy stays readable over bright walls.
- Overlays (menu, pause prompt, profile card, HUD chips) use frosted glass: translucent dark fill, backdrop blur, thin light border and a soft inner highlight. Corners stay sharp â€” panels `rounded-lg`, buttons and chips `rounded-md` â€” not pill-shaped.

## 11. Door interaction and transitions

- Each room has one visible, obvious, clickable door.
- The door's label must match the destination configured in the room data.
- Make the interaction work with a pointer, touch, and keyboard. Include a visible hover/focus response.
- Let the door swing on its hinge as the visitor enters with the door sound, then use one short fade for the room change. Skip the hinge animation under reduced motion.
- Keep viewer preferences (look sensitivity, WASD speed, field of view), the profile card and the short room message in one menu. It opens on first load and on `Esc`. Closing it leaves the room paused behind a centred â€œClick to interactâ€ prompt: the browser refuses a fresh pointer lock requested from the same `Esc` press, so the click is the reliable way back in. A quiet walk loop overlays the root music only while the player's horizontal movement actually changes position, so walls and furniture do not produce footsteps.
- Keep the next room title or destination visible enough to orient the visitor after the transition.
- Do not make a long, silent intro or image crawl mandatory before users can continue. The one intentional wait is the intro preload of the core assets plus the landing room; it must show real progress and reveal the room as soon as they are warm.
- Respect reduced-motion preferences by shortening or disabling non-essential movement.

## 12. Intro and loading reveal

The intro is the one blocking wait, and it loads only the core assets plus the room the visitor lands in:

1. Show the server-rendered HTML/CSS intro immediately.
2. Read the checked-in file index once and preload the `core` scope plus the landing room through one shared module.
3. Show completed files, total files and the current file; never fake progress.
4. Cap oversized textures at runtime while keeping every authored map, then release replaced decoded originals.
5. Compile shaders and paint a few frames behind the intro.
6. Reveal the room once it is warm, then warm the other rooms in the background, at low concurrency and in door order.
7. When a door points at a room that is still warming, the door waits and shows that room's real progress instead of starting a fetch inside the transition.

Keep the HTML shell server-rendered by Next.js and the 3D layer client-only. A visitor should see an intentional background and loading state before the WebGL scene hydrates. Keep the intro as a separate, replaceable module. It must not become entangled with room geometry or room content. The active tier is chosen once per page load: Save-Data, a 2G/3G connection or a coarse pointer selects the reduced `-low.glb` exports, and the index marks those entries `low` while files without a reduced version are `both`. The intro and the background warmers never fetch the other tier.

## 13. Responsive and performance expectations

- The scene should adapt to wide screens and narrow phone screens without clipping core navigation.
- Keep the door activation area generous even if the visual handle is small.
- Keep page metadata, headings, and essential help text in server-rendered HTML; the 3D scene is a client enhancement, not the only way to understand the page.
- If the door is rendered only in WebGL, add an HTML control or overlay label for keyboard and assistive access instead of relying on a canvas hit target alone.
- Use Tailwind for the HTML shell and controls; keep material and appearance decisions in Three.js materials.
- Scale texture dimensions to visible size; a wall photograph does not need a massive source image when it occupies a modest part of the viewport.
- Share materials/geometries, limit live shadows, and do not render unused detailed rooms.
- If frame rate drops, simplify in this order: shadows, reflection complexity, texture sizes, decorative object count, and then optional effects.
- Keep the scene attractive even when optional post-processing is disabled.
- Test at least one mobile-sized viewport and one desktop-sized viewport before calling the visual pass complete.

## 14. Visual acceptance checklist

- [ ] The scene reads as an anime-inspired, softly realistic 3D environment.
- [ ] The seven rooms feel related but have distinct emotional palettes.
- [ ] The first room appears before decorative content finishes loading.
- [ ] Photos and text are the visual focus; decorations stay secondary.
- [ ] The door is obvious, operable, and labelled with the correct destination.
- [ ] Lighting adds depth without hiding important content.
- [ ] Reflections are selective and believable, not mirror-like everywhere.
- [ ] The experience remains usable at phone-sized dimensions.
- [ ] The scene still works if non-essential effects and assets are unavailable.

## 15. Next.js presentation notes

- `layout.tsx` and `page.tsx` stay server-rendered. Put WebGL and room interaction in client components so the first HTML paint remains cheap and reliable.
- Keep first-paint styling (background, loading copy, fallback) in plain HTML/CSS/Tailwind; do not depend on the canvas mounting to look finished.
- The 3D scene may hydrate a moment after the shell. Avoid large layout shifts when it appears.
- Static deployment is the default assumption. Self-host fonts, textures, models, and environment maps under `public/` and keep their URLs compatible with `basePath`.
- The site is installable as a PWA: `src/app/manifest.ts` declares landscape fullscreen with a standalone fallback, `public/sw.js` caches the shell and opened rooms for offline use, and `src/components/InstallApp.tsx` offers the browser prompt in the menu. Registration is production-only so the dev server never serves stale chunks.
- On a coarse pointer, `src/components/FullscreenOnTouch.tsx` requests fullscreen and a landscape orientation lock from the first real touch, never on page load. An installed PWA skips the request, and the room skips its orientation reload while fullscreen is active so the one-shot gesture is not lost.
- Page title and description belong in Next.js metadata. They should describe the experience in plain language, with no AI branding.

## 16. Implementation architecture
## 16. Implementation architecture

The first milestone is a single-route Next.js app. The page is server-rendered; the 3D room is a client-only layer with an HTML overlay for navigation, status, and fallbacks.

```text
src/app/page.tsx                  server component, hidden page heading, static shell
  +- src/scene/SceneRoot.tsx      "use client"; WebGL check, Canvas, active room, door choice
       +- src/rooms/              HomeRoom / ArchitectRoom / GalleryRoom / CoreRoom /
       ¦                          JourneyRoom / PlaygroundRoom / GatewayRoom
       ¦    +- RoomStage         shared title, intro, circular frame arc, and doors
       ¦         +- RoomShell     cylinder wall, floor, ceiling, openings, space backdrop
       ¦         +- WallText      local canvas texture, no remote font
       ¦         +- PictureFrame  image/clip, text plaque, hover or aimed caption, links
       ¦         +- SpaceTheater  Playground button, space screen, picture-driven lights
       ¦         +- Door          procedural door, destination label, hinge swing
       +- src/scene/assets.ts     scoped index, per-room readiness, texture cap, caches
       +- IntroOverlay            HTML intro and real asset progress until the scene is warm
       +- DoorChoice              Home / Next / Stay prompt for a themed door
       +- OptionsDialog           Esc menu: profile, settings, controls, music
       +- PauseOverlay            paused prompt: blurred room, click to interact, menu shortcut
       +- ProfileCard             name, role, location, projects, camera-following model, menu
       +- HTML overlay            header, progress, door prompt, status

src/content/rooms.ts              room data and navigation graph
src/tests/rooms.test.ts           loop, label, content and asset checks
```

**Data flow:** `content/rooms.ts` defines `home -> architect -> gallery -> core -> journey -> playground -> gateway -> architect` and each room's content. `SceneRoot` owns the active room. A themed door's `next` room and the gateway wrap come from the same data as the displayed label, so the visible choice and the actual choice cannot drift. Home doors travel directly; themed doors open the Home / Next prompt.

**Loading and failure:** the server renders the page shell. `SceneRoot` checks WebGL in the browser, preloads `shared` assets plus the landing room through `scene/assets.ts` while the intro reports real progress, compiles shaders, then mounts the Canvas and reveals the room. The remaining rooms warm in the background at low concurrency; a door whose room is still warming waits with that room's progress. If WebGL is missing, the page shows a plain HTML fallback. A failed model or photo costs one prop, never the room. The door is reached in the room itself: click it, or walk close and press `E` once the prompt appears.

**Root music:** `content/music.ts` scans every audio file in `public/music` at build/start time and sorts it alphabetically; the page passes that playlist to the scene. `scene/assets.ts` caches a blob URL for each downloaded track, and `scene/useMusic.ts` asks it for only the next two tracks while one plays, so the intro never waits for music and the first track streams in on demand. `scene/useSfx.ts` owns the looping oiia track, the walking loop, and the pet, book-opening and door effects. The playground screen brings its own audio; the root playlist steps aside while it plays.

**Space cinema:** the Playground carries a red button beside the door. Aiming at it and clicking (or tapping it) starts `public/vid/oiiaoiia.mp4` on a screen hanging past the balcony glass, looping with its own audio track; the same button pauses it. The element and its `VideoTexture` are built on the first press with `preload="none"`, so pressing the button — not the intro — pays for the file. One point light samples the playing frame for colour and brightness, so the room reads as a cinema in space.

**Touch controls:** an upright phone gets the rotate panel instead of the room. In landscape, `TouchJoystick` gives a left walk stick and a right look stick, and every interaction is a direct tap on the object: notes, frames, the cinema button and the door. A coarse pointer starts from look sensitivity 1.00× and walk speed 4 m/s. The Home cats change when the crosshair rests on them without a tap, while each cat keeps a two-second cooldown.

**Content changes:** copy, captions, palettes, text colours, image paths and destinations belong in `rooms.ts`, not in the room geometry. Frame layout lives in `RoomStage`; shared placement and collision belong in `content/layout.ts`. Each frame may carry an `image` path served from `public/`; it enters the shared preload pass and keeps showing its flat placeholder colour if the file is missing. Animated frames ship as short `.mp4` clips and play through a `VideoTexture` on an element parked in the page. Certificate and project frames may carry `href` and open their link through `onOpenLink`.

**Checks:** `npm run test` covers the navigation loop, door labels, room content, asset paths, the preload index, profile stats, the PWA shell and the full music folder; `npm run lint` and `npm run build` cover types, the client/server boundary, and static prerendering.
