import { createWriteStream } from "node:fs";
import { statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

/** [type, scope, tier, url, niceName] */
const entries = [
  ["model", "shared", "both", "/models/floor.glb", "Floor"],
  ["model", "shared", "both", "/models/rug.glb", "Rug"],
  ["model", "shared", "both", "/models/ceiling-tiles.glb", "Ceiling tiles"],
  ["model", "shared", "both", "/models/frame.glb", "Picture frame"],
  ["model", "shared", "high", "/models/player.glb", "Player"],
  ["model", "shared", "low", "/models/player-low.glb", "Player (low)"],
  ["model", "shared", "both", "/models/bookcase.glb", "Bookcase"],
  ["model", "shared", "high", "/models/classic-table.glb", "Reading table"],
  ["model", "shared", "low", "/models/classic-table-low.glb", "Reading table (low)"],
  ["model", "shared", "both", "/models/chair.glb", "Reading chair"],
  ["model", "shared", "high", "/models/books.glb", "Book stack"],
  ["model", "shared", "low", "/models/books-low.glb", "Book stack (low)"],
  ["model", "shared", "high", "/models/victorian-table.glb", "Coffee table"],
  ["model", "shared", "low", "/models/victorian-table-low.glb", "Coffee table (low)"],
  ["model", "shared", "both", "/models/cake-table.glb", "Round table"],
  ["image", "shared", "both", "/wall-textures/room1.jpg", "Plaster wall"],
  ["image", "shared", "both", "/wall-textures/room3.jpg", "Cinema pillar plaster"],
  ["image", "shared", "both", "/profile/me.webp", "Profile photo"],

  ["model", "home", "both", "/models/cat-box.glb", "Cat box"],
  ["model", "home", "both", "/models/limca-cat.glb", "Limca cat"],

  ["model", "architect", "both", "/models/space1.glb", "Architect backdrop"],
  ["video", "architect", "both", "/images/frames/architect-1.mp4", "Architect loop 1"],
  ["video", "architect", "both", "/images/frames/architect-2.mp4", "Architect loop 2"],
  ["video", "architect", "both", "/images/frames/architect-3.mp4", "Architect loop 3"],

  ["model", "gallery", "both", "/models/space2.glb", "Gallery backdrop"],

  ["model", "core", "both", "/models/space3.glb", "Core backdrop"],
  ["video", "core", "both", "/images/frames/core-1.mp4", "Core loop 1"],
  ["video", "core", "both", "/images/frames/core-2.mp4", "Core loop 2"],
  ["video", "core", "both", "/images/frames/core-3.mp4", "Core loop 3"],

  ["model", "journey", "both", "/models/space4.glb", "Journey backdrop"],
  ["image", "journey", "both", "/certificates/job-ready-ai-powered-cohort.webp", "Certificate: Job Ready AI"],
  ["image", "journey", "both", "/certificates/the-web-developer-bootcamp-2026.webp", "Certificate: Web Developer Bootcamp"],
  ["image", "journey", "both", "/certificates/the-complete-python-bootcamp.webp", "Certificate: Python Bootcamp"],
  ["image", "journey", "both", "/certificates/the-complete-full-stack-web-development-bootcamp.webp", "Certificate: Full-Stack Bootcamp"],
  ["image", "journey", "both", "/certificates/master-the-coding-interview.webp", "Certificate: Coding Interview"],
  ["image", "journey", "both", "/certificates/javascript-understanding-the-weird-parts.webp", "Certificate: JavaScript"],

  ["model", "playground", "both", "/models/space5.glb", "Playground backdrop"],
  ["model", "playground", "both", "/models/cat.glb", "Floating cat"],
  ["video", "playground", "both", "/images/frames/playground-1.mp4", "Playground loop 1"],
  ["video", "playground", "both", "/images/frames/playground-2.mp4", "Playground loop 2"],
  ["video", "playground", "both", "/images/frames/playground-3.mp4", "Playground loop 3"],

  ["model", "gateway", "both", "/models/space6.glb", "Gateway backdrop"],
];

function sizeLabel(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

const files = entries
  .map(([type, scope, tier, url, niceName]) => {
    const bytes = statSync(join(publicDir, url.replace(/^\//, ""))).size;
    return { type, scope, tier, url, niceName, size: bytes, sizeLabel: sizeLabel(bytes) };
  })
  .sort((a, b) => b.size - a.size)
  .map((file, index) => ({ index, ...file }));

const json = `${JSON.stringify(
  {
    version: 5,
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    files,
  },
  null,
  2,
)}\n`;

const out = createWriteStream(join(publicDir, "fetch_file_index.json"));
out.end(json);
out.on("finish", () => {
  console.log(`Wrote ${files.length} files to public/fetch_file_index.json`);
});
