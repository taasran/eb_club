// Fallback copy shown before any content has been published through the admin.
// These are placeholders, not verified club records.

export const committee = [
  [
    "President",
    "Guiding the club’s vision and bringing our community together.",
  ],
  [
    "Vice President",
    "Supporting the team and turning shared ideas into action.",
  ],
  [
    "General Secretary",
    "Keeping our activities, communication, and plans connected.",
  ],
  [
    "Treasurer",
    "Supporting responsible planning and club resource management.",
  ],
  [
    "Joint Secretary",
    "Helping coordinate initiatives and everyday club operations.",
  ],
  [
    "Organizing Secretary",
    "Creating meaningful events and experiences for our members.",
  ],
  ...Array.from({ length: 24 }, (_, index) => [
    `Executive slot ${String(index + 7).padStart(2, "0")}`,
    "Role and profile details to be announced.",
  ]),
]

const createArchiveProfiles = (designations: string[]) =>
  designations.map((designation, index) => ({
    name: "Name to be announced",
    designation,
    session: "Session to be announced",
    index: index + 1,
  }))

export const archivePages = [
  {
    slug: "former-presidents",
    title: "Former Presidents",
    description:
      "A record of the club presidents whose leadership helped shape our community.",
    profiles: createArchiveProfiles([
      "Former President",
      "Former President",
      "Former President",
      "Former President",
      "Former President",
    ]),
  },
  {
    slug: "former-general-secretaries",
    title: "Former General Secretaries",
    description:
      "A record of the general secretaries who kept the club’s work and communication moving forward.",
    profiles: createArchiveProfiles([
      "Former General Secretary",
      "Former General Secretary",
      "Former General Secretary",
      "Former General Secretary",
      "Former General Secretary",
    ]),
  },
  {
    slug: "previous-executive-committees",
    title: "Previous Executive Committees",
    description:
      "A year-by-year archive of the executive teams who served the club.",
    profiles: createArchiveProfiles([
      "President",
      "Vice President",
      "General Secretary",
      "Treasurer",
      "Executive Member",
    ]),
  },
  {
    slug: "faculty-advisors",
    title: "Faculty Advisors",
    description:
      "The faculty members whose guidance supports the club’s direction and growth.",
    profiles: createArchiveProfiles([
      "Faculty Advisor",
      "Faculty Advisor",
      "Faculty Advisor",
      "Faculty Advisor",
      "Faculty Advisor",
    ]),
  },
  {
    slug: "committee-wise-archive",
    title: "Committee-wise Archive",
    description:
      "Explore the club’s leadership history by committee and academic term.",
    profiles: createArchiveProfiles([
      "Committee Chair",
      "Committee Secretary",
      "Finance Coordinator",
      "Organizing Coordinator",
      "Committee Member",
    ]),
  },
]

export const leadershipTopics = [
  { title: "Current Executive Committee", to: "/#executives" },
  ...archivePages.map((page) => ({
    title: page.title,
    to: `/leadership/${page.slug}`,
  })),
]

export const defaultArchiveYears = [
  "2024–25",
  "2023–24",
  "2022–23",
  "2021–22",
  "2020–21",
].map((year) => ({
  year,
  members: [
    "President",
    "Vice President",
    "General Secretary",
    "Treasurer",
    "Organizing Secretary",
  ].map((designation) => ({
    designation,
    name: "Name to be announced",
    id: "ID to be announced",
    batch: "Batch to be announced",
  })),
}))

export const aboutTopics = [
  {
    title: "Club History & Background",
    id: "club-history",
    text: "The Economics & Banking Club brings together students of the Department of Economics & Banking at IIUC. The official founding date, history, and milestones will be added once confirmed by the club.",
  },
  {
    title: "Vision, Mission & Objectives",
    id: "club-vision",
    text: "Our website highlights learning beyond the classroom, connecting students, and developing leadership. The club’s officially approved vision, mission, and objectives will be published here once provided.",
  },
  {
    title: "Club Constitution",
    id: "club-constitution",
    text: "The official club constitution is not yet available on this website. The approved document will be added here when provided by the club administration.",
  },
  {
    title: "Rules & Regulations",
    id: "club-rules",
    text: "Official membership requirements, participation guidelines, and club rules will be published after confirmation by the club administration.",
  },
  { title: "Club Activities", id: "activities" },
  { title: "Organizational Structure", id: "executives" },
  {
    title: "Faculty Advisor & Club Administration",
    id: "club-administration",
    text: "Faculty advisor names, administrative responsibilities, and official contact details will be added once confirmed by the Department of Economics & Banking.",
  },
]

export const activities = [
  {
    category: "Learning",
    title: "Ideas that go beyond the classroom.",
    text: "Explore economic issues, financial markets, and the world of banking through seminars and thoughtful conversations.",
    icon: "chart",
    label: "Seminars & discussions",
  },
  {
    category: "Growth",
    title: "Build skills. Find your direction.",
    text: "Connect theory with practice through skill-building workshops, case studies, and career-focused learning.",
    icon: "briefcase",
    label: "Workshops & career development",
  },
  {
    category: "Community",
    title: "Better together, by design.",
    text: "Meet like-minded students, exchange perspectives, and create meaningful experiences with your campus community.",
    icon: "people",
    label: "Networking & club life",
  },
]
