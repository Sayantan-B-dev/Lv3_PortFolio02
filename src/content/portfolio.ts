/**
 * Portfolio facts copied from the sibling site's public resume data.
 * Edit here; rooms read this module and never hard-code personal copy.
 */

export type Project = {
  name: string;
  tagline: string;
  github: string;
  live: string;
  tech: readonly string[];
  features: readonly string[];
};

export type TimelineEntry = {
  title: string;
  org: string;
  period: string;
  points: readonly string[];
};

export type Certification = {
  name: string;
  url: string;
  image: string;
};

export type SocialLink = {
  label: string;
  href: string;
  handle?: string;
};

export const PROFILE = {
  name: "Sayantan Bharati",
  firstName: "Sayantan",
  lastName: "Bharati",
  role: "Full Stack Developer",
  stack: "MERN · Python",
  email: "sayantanbharati611@gmail.com",
  location: "Kolkata, India",
  summary:
    "Full Stack Web Developer with experience in the MERN stack and building responsive, user-friendly web applications. Focused on clean, maintainable code, efficient workflows, and practical solutions that make a real difference.",
  quote:
    "Outside code: music producer and sound engineer with 900+ client projects, and counting. Parallelism is a way of life.",
} as const;

export const LINKS = {
  github: "https://github.com/Sayantan-B-dev",
  githubHandle: "@Sayantan-B-dev",
  linkedin: "https://www.linkedin.com/in/sayantanbharati/",
  linkedinHandle: "Sayantan Bharati",
  fiverr: "https://www.fiverr.com/sayantan_dev?public_mode=true",
  fiverrHandle: "Hire me · @sayantan_dev",
  site: "https://sayantanbharati.vercel.app/",
} as const;

export const STATS = [
  { value: "3", label: "Production builds" },
  { value: "40+", label: "API routes designed" },
  { value: "900+", label: "Projects managed" },
  { value: "9.2", label: "Diploma OGPA" },
] as const;

export const FOCUS = [
  "Scalable REST APIs & clean architecture",
  "Secure session & token auth flows",
  "Responsive, user-focused product UIs",
  "WebGL / Canvas interactive effects",
] as const;

export const PROJECTS: readonly Project[] = [
  {
    name: "BlueEye",
    tagline: "Artist Discovery & Booking Platform",
    github: "https://github.com/Sayantan-B-dev/lv3_BlueEye",
    live: "https://blueeyeentertainment.in/",
    tech: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "MongoDB",
      "Mongoose",
      "Redis",
      "NextAuth",
      "Tailwind CSS 4",
      "ImageKit",
      "WebGL / OGL",
    ],
    features: [
      "Custom WebGL/OGL visual effects and interactive backgrounds",
      "SEO: JSON-LD structured data, dynamic OG images, ISR caching, automated sitemaps",
      "Admin suite with full CRUD, bulk CSV import & OTP-verified bulk delete via Resend",
      "Multi-step booking with 30-min cooldown, Redis caching, direct WhatsApp contact",
    ],
  },
  {
    name: "LnkZoo",
    tagline: "Community Link Discovery Platform",
    github: "https://github.com/Sayantan-B-dev/Lv3_LnkZoo",
    live: "https://lnkzoo.vercel.app/",
    tech: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "PostgreSQL (Neon)",
      "D3.js",
      "JWT",
      "Cloudinary",
      "Groq AI",
    ],
    features: [
      "Zero-dependency Canvas particle physics engine (5–300 particles, 60fps, mouse interaction)",
      "Recursive nested comments (10-level depth), hot-feed ranking, leaderboard, follow/block system",
      "OG/JSON-LD/oEmbed parsing, Groq AI tag suggestions, concurrent bulk upload, admin analytics",
      "JWT + Google OAuth, CSRF state, rate limiting, 100% parameterized SQL",
    ],
  },
  {
    name: "Re-Docs",
    tagline: "Full-Stack Knowledge & Note Management Platform",
    github: "https://github.com/Sayantan-B-dev/Lv3_Re-Docs",
    live: "https://re-docs-pi.vercel.app/",
    tech: [
      "MongoDB",
      "Express.js",
      "React (Vite)",
      "Node.js",
      "Tailwind CSS",
      "Cloudinary",
      "Razorpay",
      "Passport.js",
      "mermaid.js",
      "KaTeX",
    ],
    features: [
      "Session-based auth (Passport local + Google OAuth) with profile & social features",
      "Markdown + math notes with synchronized scroll, category/tag system, file uploads",
      "Public/private notes, exports, and a modern responsive UI",
    ],
  },
];

export const EDUCATION: readonly TimelineEntry[] = [
  {
    title: "Diploma in Computer Science & Technology",
    org: "Kingston Educational Institute",
    period: "2024 – 2026",
    points: ["OGPA 9.2: DSA, Python, Java, OS, DBMS, CN, AI/ML, IoT", "Completed"],
  },
  {
    title: "B.Tech in Computer Science and Engineering",
    org: "Brainware University",
    period: "2025 – 2029",
    points: ["Ongoing"],
  },
];

export const EXPERIENCE: readonly TimelineEntry[] = [
  {
    title: "Freelance Music Producer & Sound Engineer",
    org: "Remote",
    period: "2021 – 2025",
    points: [
      "Managed 900+ end-to-end client projects.",
      "Project management, workflow optimization, and quality control under high-volume deadlines.",
      "Parallel task handling and deep requirement understanding with clients.",
    ],
  },
  {
    title: "Crew Member",
    org: "McDonald's · Kolkata, India",
    period: "2020 – 2021",
    points: [
      "Teamwork, client interaction, time management, and high-volume task handling.",
      "Clear communication in a fast-paced service environment.",
    ],
  },
];

export const CERTIFICATIONS: readonly Certification[] = [
  {
    name: "Job Ready AI Powered Cohort: Web + DSA + Aptitude",
    url: "https://classroom.sheryians.com/certificate/1708853705220236",
    image: "/certificates/job-ready-ai-powered-cohort.webp",
  },
  {
    name: "The Web Developer Bootcamp 2026",
    url: "https://www.udemy.com/certificate/UC-522fc92e-484b-408d-acc9-514fd997ba5c/",
    image: "/certificates/the-web-developer-bootcamp-2026.webp",
  },
  {
    name: "The Complete Python Bootcamp: From Zero to Hero",
    url: "https://www.udemy.com/certificate/UC-c778160d-4e6e-4e6e-a664-f93c1f60d93e/",
    image: "/certificates/the-complete-python-bootcamp.webp",
  },
  {
    name: "The Complete Full-Stack Web Development Bootcamp",
    url: "https://www.udemy.com/certificate/UC-b18c98f0-980b-464b-ad26-f2606cd64bc9/",
    image: "/certificates/the-complete-full-stack-web-development-bootcamp.webp",
  },
  {
    name: "Master the Coding Interview: Data Structures + Algorithms",
    url: "https://www.udemy.com/certificate/UC-bfeb62ba-d794-4786-98b4-7eb78180aed8/",
    image: "/certificates/master-the-coding-interview.webp",
  },
  {
    name: "JavaScript: Understanding the Weird Parts",
    url: "https://www.udemy.com/certificate/UC-4468e243-69e2-4161-a741-a271ac42bd57/",
    image: "/certificates/javascript-understanding-the-weird-parts.webp",
  },
  {
    name: "Complete Python with DSA: LeetCode Exercises",
    url: "https://www.udemy.com/certificate/UC-c2390189-1881-417a-a608-fea04cebf0a8/",
    image: "/certificates/complete-python-with-dsa.webp",
  },
  {
    name: "100 Days of Code: The Complete Python Pro Bootcamp",
    url: "https://www.udemy.com/certificate/UC-d913382c-396c-487e-ab2e-20d6807e1f00/",
    image: "/certificates/100-days-of-code-python.webp",
  },
];

export const LANGUAGES = [
  { name: "Bengali", level: "Native" },
  { name: "English", level: "Advanced" },
  { name: "Hindi", level: "Intermediate" },
] as const;

export const SKILLS = {
  frontend: [
    "HTML",
    "CSS",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Tailwind CSS",
    "Vite",
    "D3.js",
    "WebGL / Canvas",
    "Framer Motion",
  ],
  backend: [
    "Node.js",
    "Express.js",
    "MongoDB",
    "PostgreSQL",
    "REST APIs",
    "Redis",
    "Passport.js",
    "JWT",
    "NextAuth",
    "Google OAuth",
  ],
  tools: [
    "Git",
    "GitHub",
    "Vercel",
    "ImageKit",
    "Render",
    "MongoDB Atlas",
    "Razorpay",
    "Resend",
    "Postman",
    "PHP",
    "MySQL",
    "Nodemailer",
    "Python",
  ],
} as const;

export const HIRING = [
  {
    label: "Availability",
    value: "Open to freelance and full-time Full Stack roles",
  },
  { label: "Reply time", value: "Within a day" },
  { label: "Work style", value: "Remote, worldwide, across time zones" },
  { label: "Based in", value: PROFILE.location },
] as const;

export const SOCIALS: readonly SocialLink[] = [
  { label: "Email", href: `mailto:${PROFILE.email}`, handle: PROFILE.email },
  { label: "GitHub", href: LINKS.github, handle: LINKS.githubHandle },
  { label: "LinkedIn", href: LINKS.linkedin, handle: LINKS.linkedinHandle },
  { label: "Fiverr", href: LINKS.fiverr, handle: LINKS.fiverrHandle },
];

export const PROJECT_TECH_SUMMARY = [
  "MERN",
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Python",
  "MongoDB",
  "PostgreSQL",
  "Redis",
  "WebGL",
] as const;
