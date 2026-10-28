import type { SpaceId } from "./models";
import { CERTIFICATIONS, PROJECTS, SKILLS } from "./portfolio";

export type ThemedRoomId =
  | "architect"
  | "gallery"
  | "core"
  | "journey"
  | "playground"
  | "gateway";

export type RoomId = "home" | ThemedRoomId;

export type RoomPalette = {
  wall: string;
  wallAccent: string;
  floor: string;
  ceiling: string;
  trim: string;
  light: string;
  text: string;
};

export type FrameContent = {
  id: string;
  caption: string;
  tone: string;
  /** Still image or looping clip under `/public`. */
  image?: string;
  /** Opens this link when the frame is clicked. */
  href?: string;
  /** Smaller caption shown under the frame in the room. */
  subcaption?: string;
};

export type NoteLink = {
  label: string;
  href: string;
};

export type NoteContent = {
  id: string;
  label: string;
  message: string;
  links?: readonly NoteLink[];
};

/** A physical door on the cylinder wall, positioned by its angle. */
export type DoorSpec = {
  id: string;
  label: string;
  /** Radians around the room; 0 is the front wall, PI the back wall. */
  angle: number;
  destination: RoomId;
  /** Home doors travel directly; a themed door asks Home or Next. */
  mode: "direct" | "choice" | "recenter";
};

export type RoomContent = {
  id: RoomId;
  kind: "home" | "room";
  eyebrow: string;
  title: string;
  intro: string;
  arrivalTitle: string;
  next?: ThemedRoomId;
  palette: RoomPalette;
  /** Null keeps the home room sealed from the outside. */
  space: SpaceId | null;
  /** Angular positions of the curved windows on the cylinder wall. */
  windows: readonly number[];
  doors: readonly DoorSpec[];
  frames: readonly FrameContent[];
  notes: readonly NoteContent[];
  /** The Playground screen; referenced from config instead of the component. */
  video?: string;
};

/** One shared shell for every room, exactly as requested. */
export const SHELL_PALETTE: RoomPalette = {
  wall: "#efe2cf",
  wallAccent: "#c9a37a",
  floor: "#8a5b43",
  ceiling: "#f7efe1",
  trim: "#b8894c",
  light: "#fff2dd",
  text: "#3a2817",
};

export const START_ROOM: RoomId = "home";

export const THEMED_ROOM_ORDER: readonly ThemedRoomId[] = [
  "architect",
  "gallery",
  "core",
  "journey",
  "playground",
  "gateway",
];

export const ROOM_ORDER: readonly RoomId[] = ["home", ...THEMED_ROOM_ORDER];

/** Windows on the side walls; the fourth opening on the right is the cinema balcony. */
const ROOM_WINDOWS = [-1.1, -2.2, 2.2] as const;

const ROOM_TITLES: Record<ThemedRoomId, string> = {
  architect: "The Architect",
  gallery: "The Gallery",
  core: "The Core",
  journey: "The Journey",
  playground: "The Playground",
  gateway: "The Gateway",
};

/** Home has seven doors: one Home/recentre door plus the six destinations. */
const HOME_DOORS: readonly DoorSpec[] = [
  {
    id: "home",
    label: "Home",
    angle: 0,
    destination: "home",
    mode: "recenter",
  },
  ...THEMED_ROOM_ORDER.map((id, index) => ({
    id: `home-${id}`,
    label: ROOM_TITLES[id],
    angle: (Math.PI * 2 * (index + 1)) / 7,
    destination: id,
    mode: "direct" as const,
  })),
];

function themedDoor(id: ThemedRoomId): DoorSpec {
  const index = THEMED_ROOM_ORDER.indexOf(id);
  const next = THEMED_ROOM_ORDER[(index + 1) % THEMED_ROOM_ORDER.length];
  return {
    id: `${id}-door`,
    label: `Next room: ${ROOM_TITLES[next]}`,
    angle: 0,
    destination: next,
    mode: "choice",
  };
}

function projectFrames(): FrameContent[] {
  return [
    {
      id: "gallery-blueeye",
      caption: "BlueEye",
      subcaption: "Artist discovery & booking",
      tone: "#c7d8f0",
      href: PROJECTS[0]?.live,
    },
    {
      id: "gallery-lnkzoo",
      caption: "LnkZoo",
      subcaption: "Community link discovery",
      tone: "#d8c7f0",
      href: PROJECTS[1]?.live,
    },
    {
      id: "gallery-redocs",
      caption: "Re-Docs",
      subcaption: "Knowledge & note management",
      tone: "#f0d8c7",
      href: PROJECTS[2]?.live,
    },
  ];
}

function certificateFrames(): FrameContent[] {
  return CERTIFICATIONS.slice(0, 6).map((cert, index) => ({
    id: `journey-cert-${index + 1}`,
    caption: cert.name,
    subcaption: "Certification",
    tone: "#e7dcf2",
    image: cert.image,
    href: cert.url,
  }));
}

export const ROOMS: Record<RoomId, RoomContent> = {
  home: {
    id: "home",
    kind: "home",
    eyebrow: "Welcome",
    title: "Sayantan Bharati",
    intro: "Full Stack Developer · MERN · Python",
    arrivalTitle: "Home",
    palette: SHELL_PALETTE,
    space: null,
    windows: [],
    doors: HOME_DOORS,
    frames: [],
    notes: [
      {
        id: "home-note",
        label: "Seven doors",
        message:
          "One door stays home. The other six lead to a room of this portfolio. Read the labels above each door.",
      },
    ],
  },
  architect: {
    id: "architect",
    kind: "room",
    eyebrow: "Room one",
    title: "The Architect",
    intro: "About, skills, philosophy and the person behind the code.",
    arrivalTitle: "The Architect",
    next: "gallery",
    palette: SHELL_PALETTE,
    space: "space1",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("architect")],
    frames: [
      {
        id: "architect-01",
        caption: "Full stack, end to end",
        subcaption: "About",
        tone: "#d8c4a4",
        image: "/images/frames/architect-1.mp4",
      },
      {
        id: "architect-02",
        caption: "Clean architecture first",
        subcaption: "Philosophy",
        tone: "#9fae9d",
        image: "/images/frames/architect-2.mp4",
      },
      {
        id: "architect-03",
        caption: "Practical solutions, always",
        subcaption: "Approach",
        tone: "#c5a8a0",
        image: "/images/frames/architect-3.mp4",
      },
    ],
    notes: [
      {
        id: "architect-about",
        label: "About me",
        message:
          "I build full-stack MERN applications end-to-end: data models, secure authentication, REST APIs, Redis caching, and pixel-level frontends people enjoy using.",
        links: [
          { label: "GitHub", href: "https://github.com/Sayantan-B-dev" },
          { label: "LinkedIn", href: "https://www.linkedin.com/in/sayantanbharati/" },
        ],
      },
      {
        id: "architect-focus",
        label: "What I focus on",
        message:
          "Scalable REST APIs and clean architecture. Secure session and token auth. Responsive, user-focused product UIs. WebGL and Canvas interactive effects.",
      },
      {
        id: "architect-skills",
        label: "Toolkit",
        message: `Frontend: ${SKILLS.frontend.join(", ")}. Backend: ${SKILLS.backend.join(", ")}. Tools: ${SKILLS.tools.join(", ")}.`,
      },
    ],
  },
  gallery: {
    id: "gallery",
    kind: "room",
    eyebrow: "Room two",
    title: "The Gallery",
    intro: "BlueEye · LnkZoo · Re-Docs. Production work, not tutorials.",
    arrivalTitle: "The Gallery",
    next: "core",
    palette: SHELL_PALETTE,
    space: "space2",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("gallery")],
    frames: projectFrames(),
    notes: PROJECTS.map((project) => ({
      id: `gallery-${project.name.toLowerCase()}`,
      label: project.name,
      message: `${project.tagline}. ${project.features.join(" ")}`,
      links: [
        { label: "Live site", href: project.live },
        { label: "Source", href: project.github },
      ],
    })),
  },
  core: {
    id: "core",
    kind: "room",
    eyebrow: "Room three",
    title: "The Core",
    intro: "MERN, Next.js, Python, databases and WebGL.",
    arrivalTitle: "The Core",
    next: "journey",
    palette: SHELL_PALETTE,
    space: "space3",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("core")],
    frames: [
      {
        id: "core-01",
        caption: "MERN stack",
        subcaption: "MongoDB · Express · React · Node",
        tone: "#c7d8f0",
        image: "/images/frames/core-1.mp4",
      },
      {
        id: "core-02",
        caption: "Next.js 16 & TypeScript",
        subcaption: "App Router · RSC · server actions",
        tone: "#d8c7f0",
        image: "/images/frames/core-2.mp4",
      },
      {
        id: "core-03",
        caption: "Python & data",
        subcaption: "DSA · automation · databases",
        tone: "#f0d8c7",
        image: "/images/frames/core-3.mp4",
      },
    ],
    notes: [
      {
        id: "core-frontend",
        label: "Frontend",
        message: SKILLS.frontend.join(" · "),
      },
      {
        id: "core-backend",
        label: "Backend",
        message: SKILLS.backend.join(" · "),
      },
      {
        id: "core-tools",
        label: "Tools & Ops",
        message: SKILLS.tools.join(" · "),
      },
    ],
  },
  journey: {
    id: "journey",
    kind: "room",
    eyebrow: "Room four",
    title: "The Journey",
    intro: "Work experience, education and certifications.",
    arrivalTitle: "The Journey",
    next: "playground",
    palette: SHELL_PALETTE,
    space: "space4",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("journey")],
    frames: certificateFrames(),
    notes: [
      {
        id: "journey-work",
        label: "Experience",
        message:
          "Freelance music producer and sound engineer (2021–2025): 900+ client projects, workflow optimisation and deadline-driven delivery. Crew member at McDonald's, Kolkata (2020–2021).",
        links: [
          { label: "LinkedIn", href: "https://www.linkedin.com/in/sayantanbharati/" },
        ],
      },
      {
        id: "journey-education",
        label: "Education",
        message:
          "Diploma in Computer Science & Technology, Kingston Educational Institute (2024–2026), OGPA 9.2. B.Tech in Computer Science and Engineering, Brainware University (2025–2029), ongoing.",
      },
      {
        id: "journey-certs",
        label: "Certifications",
        message:
          "Eight completed programmes across full-stack development, Python, JavaScript, DSA and interview preparation. Click any certificate frame to open its verification page.",
        links: CERTIFICATIONS.map((cert) => ({
          label: cert.name,
          href: cert.url,
        })),
      },
    ],
  },
  playground: {
    id: "playground",
    kind: "room",
    eyebrow: "Room five",
    title: "The Playground",
    intro: "Interactive effects, creative coding and experiments.",
    arrivalTitle: "The Playground",
    next: "gateway",
    palette: SHELL_PALETTE,
    space: "space5",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("playground")],
    frames: [
      {
        id: "playground-01",
        caption: "Canvas physics",
        subcaption: "Particles and motion",
        tone: "#e7dcf2",
        image: "/images/frames/playground-1.mp4",
      },
      {
        id: "playground-02",
        caption: "WebGL effects",
        subcaption: "Shader-driven visuals",
        tone: "#d5c7e3",
        image: "/images/frames/playground-2.mp4",
      },
      {
        id: "playground-03",
        caption: "Experiments",
        subcaption: "Small ideas, tested live",
        tone: "#f0e6d4",
        image: "/images/frames/playground-3.mp4",
      },
    ],
    notes: [
      {
        id: "playground-cats",
        label: "Cat minions",
        message:
          "Look at a floating cat to set it spinning. The oiia loop plays while any cat is spinning. The cats live here as a small interactive experiment.",
      },
      {
        id: "playground-screen",
        label: "The screen",
        message:
          "Press the red button beside the door to start the space cinema. The screen lights the room with whatever frame is playing.",
      },
      {
        id: "playground-note",
        label: "More soon",
        message:
          "This room is the sandbox: interactive effects, creative coding and experiments that do not fit anywhere else in the portfolio.",
      },
    ],
    video: "/vid/oiiaoiia.mp4",
  },
  gateway: {
    id: "gateway",
    kind: "room",
    eyebrow: "Room six",
    title: "The Gateway",
    intro: "Contact, GitHub, LinkedIn and hiring information.",
    arrivalTitle: "The Gateway",
    next: "architect",
    palette: SHELL_PALETTE,
    space: "space6",
    windows: ROOM_WINDOWS,
    doors: [themedDoor("gateway")],
    frames: [
      {
        id: "gateway-email",
        caption: "Email",
        subcaption: "Sayantan Bharati",
        tone: "#c7e0d8",
        href: "mailto:sayantanbharati611@gmail.com",
      },
      {
        id: "gateway-github",
        caption: "GitHub",
        subcaption: "@Sayantan-B-dev",
        tone: "#d8d8e0",
        href: "https://github.com/Sayantan-B-dev",
      },
      {
        id: "gateway-linkedin",
        caption: "LinkedIn",
        subcaption: "Sayantan Bharati",
        tone: "#c7d0e0",
        href: "https://www.linkedin.com/in/sayantanbharati/",
      },
    ],
    notes: [
      {
        id: "gateway-contact",
        label: "Get in touch",
        message:
          "Open to freelance projects and full-time Full Stack Developer roles. Based in Kolkata, India, working remotely across time zones. Replies within a day.",
        links: [
          { label: "Email", href: "mailto:sayantanbharati611@gmail.com" },
          { label: "Fiverr", href: "https://www.fiverr.com/sayantan_dev?public_mode=true" },
        ],
      },
      {
        id: "gateway-links",
        label: "Elsewhere",
        message:
          "GitHub for code, LinkedIn for the professional record, Fiverr for freelance work.",
        links: [
          { label: "GitHub", href: "https://github.com/Sayantan-B-dev" },
          { label: "LinkedIn", href: "https://www.linkedin.com/in/sayantanbharati/" },
          { label: "Fiverr", href: "https://www.fiverr.com/sayantan_dev?public_mode=true" },
        ],
      },
      {
        id: "gateway-hiring",
        label: "Hiring",
        message:
          "Available for freelance and full-time Full Stack roles. Stack: MERN, Next.js, TypeScript, Python, PostgreSQL, Redis, WebGL.",
      },
    ],
  },
};

export function getRoom(id: RoomId): RoomContent {
  return ROOMS[id];
}

export function getNextRoom(id: RoomId): RoomContent {
  const next = ROOMS[id].next ?? "architect";
  return ROOMS[next];
}

export function getDoorLabel(id: RoomId): string {
  return ROOMS[id].doors[0]?.label ?? "";
}

