import { LINKS, PROFILE as DEFAULT_PROFILE } from "./portfolio";

function env(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function envNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Public identity for the 3D portfolio. Every field can be overridden at build
 * time through NEXT_PUBLIC_* values; the committed defaults keep the site
 * complete without a local env file.
 */
export const PROFILE = {
  name: env(process.env.NEXT_PUBLIC_PROFILE_NAME, DEFAULT_PROFILE.name),
  role: env(process.env.NEXT_PUBLIC_PROFILE_ROLE, DEFAULT_PROFILE.role),
  stack: env(process.env.NEXT_PUBLIC_PROFILE_STACK, DEFAULT_PROFILE.stack),
  email: env(process.env.NEXT_PUBLIC_PROFILE_EMAIL, DEFAULT_PROFILE.email),
  location: env(process.env.NEXT_PUBLIC_PROFILE_LOCATION, DEFAULT_PROFILE.location),
  github: env(process.env.NEXT_PUBLIC_PROFILE_GITHUB, LINKS.github),
  linkedin: env(process.env.NEXT_PUBLIC_PROFILE_LINKEDIN, LINKS.linkedin),
  fiverr: env(process.env.NEXT_PUBLIC_PROFILE_FIVERR, LINKS.fiverr),
  site: env(process.env.NEXT_PUBLIC_SITE_URL, LINKS.site),
  yearsCoding: envNumber(process.env.NEXT_PUBLIC_YEARS_CODING, 3),
  projectsShipped: envNumber(process.env.NEXT_PUBLIC_PROJECTS_SHIPPED, 3),
} as const;

export const PROFILE_STATS = [
  { value: String(PROFILE.projectsShipped), label: "Projects shipped" },
  { value: `${PROFILE.yearsCoding}+`, label: "Years coding" },
  { value: PROFILE.location, label: "Based in" },
] as const;
