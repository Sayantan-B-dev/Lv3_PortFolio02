import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";
import { CONTENT } from "../content/config";

describe("installable PWA", () => {
  it("ships every icon the manifest and metadata reference", () => {
    const publicDir = resolve(process.cwd(), "public");
    const icons = new Set([
      ...CONTENT.site.manifestIcons.map((icon) => icon.src),
      "/favicon-32x32.png",
      "/favicon-16x16.png",
      "/apple-touch-icon.png",
    ]);

    for (const icon of icons) {
      expect(existsSync(resolve(publicDir, icon.slice(1)))).toBe(true);
    }

    // The root favicon lives in the app directory, so Next serves it as a
    // metadata route instead of copying it from public/.
    expect(
      existsSync(resolve(process.cwd(), "src", "app", "favicon.ico")),
    ).toBe(true);
  });

  it("requests fullscreen landscape and a standalone fallback", () => {
    const data = manifest();

    expect(data.start_url).toBe("/");
    expect(data.scope).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.display_override).toContain("fullscreen");
    expect(data.orientation).toBe("landscape");
    expect(data.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("ships an offline shell and a fetch-handling service worker", () => {
    const publicDir = resolve(process.cwd(), "public");
    const worker = readFileSync(resolve(publicDir, "sw.js"), "utf8");

    expect(existsSync(resolve(publicDir, "offline.html"))).toBe(true);
    expect(worker).toContain('addEventListener("install"');
    expect(worker).toContain('addEventListener("activate"');
    expect(worker).toContain('addEventListener("fetch"');
    expect(worker).toContain("/offline.html");
  });
});
