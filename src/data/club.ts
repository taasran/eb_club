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
    title: "About Us",
    id: "about-us",
    text: "IIUC Economics & Banking Club is a vibrant platform for students of the Department of Economics & Banking. Through learning, co-curricular activities, and collaboration, we help members build confidence and capability.",
  },
  {
    title: "Our Mission",
    id: "our-mission",
    text: "Our mission is to create meaningful opportunities for student skill-building, leadership, and career development. Through practical learning, teamwork, and professional preparation, we help members get ready for what comes next.",
  },
  {
    title: "Our Vision",
    id: "our-vision",
    text: "We aspire to become an inspiring community that develops informed, innovative, and responsible young leaders in economics and banking.",
  },
  {
    title: "Our Activities",
    id: "our-activities",
    text: "From tours, tournaments, workshops, industrial visits, and health camps to seminars and social initiatives, our activities give members meaningful ways to learn, connect, and participate.",
  },
  {
    title: "Our Legacy",
    id: "our-legacy",
    text: "EB Day 2020, EB Winter Fest 2025, and many other milestones mark our journey. Every initiative inspires new members to dream bigger, take part, and build something meaningful together.",
  },
]

export const activities = [
  {
    category: "Learning",
    title: "Learning beyond the classroom.",
    text: "Explore economics, financial markets, and banking through seminars, workshops, and thoughtful conversations.",
    icon: "chart",
    label: "Seminars & workshops",
  },
  {
    category: "Growth",
    title: "Build skills. Find your direction.",
    text: "Connect theory with real-world experience through industrial visits, case studies, and career-focused initiatives.",
    icon: "briefcase",
    label: "Career & industry",
  },
  {
    category: "Community",
    title: "Better together, by design.",
    text: "Create meaningful campus experiences through tours, tournaments, health camps, and community celebrations.",
    icon: "people",
    label: "Community & events",
  },
]
