# SKILLS.md — Required Packages, References, and Optional Tools

This file is a practical install guide, not a request to install everything listed here. Start with the minimum stack, build the seven-room portfolio loop, and add tools only when a real feature needs them.

## 1. Required runtime packages

This repository is already scaffolded with Next.js (App Router, TypeScript, Tailwind CSS). Do not re-run `create-next-app` over working code; inspect `package.json` and install only what is missing.

```bash
npm install
npm install three @react-three/fiber @react-three/drei
```

The core roles are:

| Package | Why it is here |
| --- | --- |
| `next` | App Router, development server, static prerender, and production build |
| `react`, `react-dom` | UI components and room state; included by the Next.js template |
| `typescript` | Typed room configuration and components; included by the template |
| `tailwindcss` | Styling for the HTML shell and controls; included by the template |
| `three` | WebGL-based 3D rendering |
| `@react-three/fiber` | React renderer for Three.js scenes |
| `@react-three/drei` | Useful helpers such as loaders, text, environment lighting, and preloading |

Use a compatible set of package versions resolved by npm and commit the lockfile. Next.js 16 uses React 19, so let npm resolve current R3F/Drei versions and check their peer dependencies instead of forcing older React 18 builds. Do not copy random old version numbers from tutorials into a current project.

Three.js, R3F, and the room components must live in client components marked `"use client"`. Never import them into `page.tsx` or `layout.tsx`; mount the scene through a small client wrapper, and use `next/dynamic` with `ssr: false` only if the initial bundle or hydration needs it.

## 2. Required lightweight tests

Use Vitest for simple unit tests such as room navigation and content configuration:

```bash
npm install -D vitest
```

Add a `test` script such as `"test": "vitest run"`, then use `npm run test` for a one-off run or `npm run test -- --watch` while developing. Next.js does not provide a test runner, so Vitest is the small local choice.

At the start, test pure configuration and navigation logic. Do not introduce a browser automation stack just to test a small configuration object. Vitest does not need the Next.js server for these tests; keep `rooms.test.ts` framework-agnostic. If component rendering tests are added later, install the React testing packages and a jsdom environment separately.

## 3. Optional testing packages — only when useful

| Tool | Install when | Do not install when |
| --- | --- | --- |
| `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react` | Components have meaningful DOM interactions or accessibility behavior that unit tests should cover | The only current requirement is checking room-link data |
| `@playwright/test` | The page has a stable browser flow and you want repeatable checks for loading, door clicks, and mobile layouts | The first geometry blockout is still changing daily and a quick manual smoke test is enough |
| Browser performance tools built into DevTools | You need to find an actual load-time, memory, or frame-rate bottleneck | You have not built the baseline scene yet |

Install optional tools separately, after the relevant milestone. Prefer one test tool per layer rather than multiple overlapping frameworks.

## 4. Optional visual packages — defer until needed

| Tool | Possible use | Default decision |
| --- | --- | --- |
| `@react-three/postprocessing` | A specific, measured need for a subtle glow, depth-of-field, or colour-grade effect | Do not add for the blockout; first tune lighting, materials, and colour directly |
| GSAP or another timeline library | A genuinely complex, sequenced intro or multi-part transition that is awkward to maintain with a small state and CSS/R3F animation | Start with one fade and a simple camera transition. Add a timeline library only if that stops being clear |
| Physics engine such as Rapier | Real physical movement, collisions, or interactive objects that must behave physically | Not needed for seven portal-connected rooms |
| Global state library | State that becomes genuinely shared and difficult to express with normal React state/context | Use a small active-room state at first |
| Custom shader or toon-outline package | A tested visual requirement that cannot be achieved with geometry, standard materials, and lighting | Do not begin with custom shaders; establish the art direction with normal materials first |

Do not install all of these “just in case.” Each extra package adds compatibility, bundle, and maintenance costs.

## 5. Agent skills and project-specific instructions

No external AI-agent skill is required to build this project. `AGENTS.md` is the source of truth for project rules, architecture, loading, testing, licensing, and commit discipline.

If your coding agent supports custom skills and this workflow becomes repetitive across several projects, one small, reviewed skill named something like `3d-room-workflow` could be useful. It should point back to `AGENTS.md`, require small milestones, check asset licenses, enforce lazy-loading boundaries, and run the small tests. Do not create this extra skill for a single project unless it demonstrably saves work. Agent skill formats and install paths vary between tools, so do not assume a generic skill directory works everywhere.

Never bulk-install unreviewed skills or run an install command from an unknown repository. Treat agent skills as executable project guidance: review their source, requested permissions, scripts, and changes before installing.

## 6. Official implementation references

Read the relevant page when implementing that feature; there is no need to read every page up front.

### Next.js, React, and asset loading

- [Next.js public folder](https://nextjs.org/docs/app/api-reference/file-conventions/public-folder) — how `public/` files map to root-relative URLs.
- [Next.js image component](https://nextjs.org/docs/app/api-reference/components/image) — HTML image handling, including static-export caveats.
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading) — `next/dynamic`, client components, and `ssr: false` for the 3D scene.
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) — `output: 'export'` limits and image configuration.
- [React `lazy`](https://react.dev/reference/react/lazy) — load a component's code on first use. Use only when code splitting is worthwhile.
- [React `Suspense`](https://react.dev/reference/react/Suspense) — choose small boundaries so one asset does not block the whole room.

### Three.js and React Three Fiber

- [React Three Fiber documentation](https://r3f.docs.pmnd.rs/) — scene construction and React integration.
- [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) — reuse resources and avoid state updates in frame loops.
- [R3F scaling performance](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx) — caching and sharing geometry/materials.
- [Drei `useGLTF`](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf) — loading and preloading `.glb`/glTF models.
- [Drei `useTexture`](https://drei.docs.pmnd.rs/loaders/texture-use-texture) — loading textures with the shared loader cache.
- [Drei `Preload`](https://drei.docs.pmnd.rs/performances/preload) — optional renderer/material precompilation; consider only if first-use shader compilation causes visible stutter.
- [Drei `Environment`](https://drei.docs.pmnd.rs/staging/environment) — environment maps for material lighting and reflections. In production, prefer a licensed, self-hosted environment file over a demo preset that depends on a remote CDN.
- [Three.js `GLTFLoader`](https://threejs.org/docs/pages/GLTFLoader.html) — official glTF/GLB loader support.
- [Three.js `MeshPhysicalMaterial`](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) — physically based material properties and their performance trade-offs.
- [Three.js texture manual](https://threejs.org/manual/pages/textures.html) — texture loading and texture considerations.

### Tests and modelling

- [Vitest guide](https://vitest.dev/guide/) — quick unit tests using Vite's environment.
- [Playwright documentation](https://playwright.dev/docs/intro) — optional end-to-end testing when a stable browser flow exists.
- [Blender](https://www.blender.org/) — optional modelling and export tool for custom `.glb` assets. It is not required for the blockout.

## 7. 3D assets and texture sources

Start with only the assets you can actually use. Keep a small asset log with the file name, source URL, license, and any attribution requirement.

- [Poly Haven](https://polyhaven.com/) — textures, HDRIs, and 3D assets; its library is published as CC0. Confirm the specific asset page and retain the source in your project notes.
- [ambientCG](https://ambientcg.com/) — PBR materials and textures published under CC0. Use appropriately sized downloads instead of the largest available maps by default.
- [Sketchfab](https://sketchfab.com/) — broad model selection; download availability and licenses vary by individual model. Check the model page before using or modifying an asset.
- [Blender](https://www.blender.org/) — make or clean up simple picture frames, door models, and decorations when needed.
- [Three.js model loading guide](https://threejs.org/manual/pages/loading-3d-models.html) — common glTF loading and troubleshooting guidance.

Asset rules:

- Use `.glb`/glTF for web-ready 3D models where practical.
- Keep third-party models low in polygon count and remove unused content before export.
- Resize photo textures for their screen size; use WebP or JPEG for photos and PNG for genuine transparency.
- Self-host production textures and environment maps. Do not rely on a demo CDN for a critical room asset.
- Keep a valid license or attribution notice when required. Do not add watermarks to user-created images.

## 8. Minimal workflow

1. Start from the scaffolded Next.js app and install only the missing 3D packages.
2. Build the room shells in client components under the single `/` page and verify the navigation loop.
3. Add Vitest and test the loop/configuration.
4. Add placeholder frames and wall text.
5. Add content-driven image loading with local fallbacks.
6. Add the all-room intro preload with real progress before the first reveal.
7. Add optimized custom textures and models.
8. Enable `output: 'export'` and verify asset paths if the site is deployed as static files.
9. Measure performance before considering optional effects or packages.

This sequence keeps the project small while leaving room for a high-quality result.


