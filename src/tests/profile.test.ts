import { describe, expect, it } from "vitest";
import { PROFILE, PROFILE_STATS } from "../content/profile";
import { LINKS, PROFILE as DEFAULT_PROFILE } from "../content/portfolio";

describe("profile defaults", () => {
  it("ships a complete identity without an env file", () => {
    expect(PROFILE.name.trim().length).toBeGreaterThan(0);
    expect(PROFILE.role.trim().length).toBeGreaterThan(0);
    expect(PROFILE.stack.trim().length).toBeGreaterThan(0);
    expect(PROFILE.email).toContain("@");
    expect(PROFILE.location.trim().length).toBeGreaterThan(0);
  });

  it("falls back to the committed links", () => {
    expect(PROFILE.github).toBe(LINKS.github);
    expect(PROFILE.linkedin).toBe(LINKS.linkedin);
    expect(PROFILE.fiverr).toBe(LINKS.fiverr);
    expect(PROFILE.site).toBe(LINKS.site);
  });

  it("uses the same name as the portfolio content", () => {
    expect(PROFILE.name).toBe(DEFAULT_PROFILE.name);
  });
});

describe("profile stats", () => {
  it("reports projects, years and location", () => {
    expect(PROFILE_STATS.map((stat) => stat.label)).toEqual([
      "Projects shipped",
      "Years coding",
      "Based in",
    ]);
    expect(PROFILE_STATS[0].value).toBe(String(PROFILE.projectsShipped));
    expect(PROFILE_STATS[1].value).toBe(`${PROFILE.yearsCoding}+`);
    expect(PROFILE_STATS[2].value).toBe(PROFILE.location);
  });

  it("keeps the numeric counters sane", () => {
    expect(PROFILE.projectsShipped).toBeGreaterThanOrEqual(0);
    expect(PROFILE.yearsCoding).toBeGreaterThan(0);
  });
});
