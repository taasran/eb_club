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

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`

export const heroAchievements = [
  "EB Day 2020",
  "EB Winter Fest 2025",
  "Student-led community",
]

export const clubFacts = [
  {
    value: "6",
    label: "Activity formats",
    text: "Tours, tournaments, workshops, visits, health camps, and leadership programmes.",
  },
  {
    value: "1-year",
    label: "Executive terms",
    text: "A new student committee leads the club each year.",
  },
  {
    value: "2",
    label: "Landmark festivals",
    text: "EB Day 2020 and EB Winter Fest 2025.",
  },
]

export const legacyMilestones = [
  {
    year: "2020",
    title: "EB Day 2020",
    text: "A landmark celebration of the Department of Economics & Banking that drew attention across IIUC and set the tone for the club's journey.",
    image: "",
    highlights: [
      "A department-wide celebration of Economics & Banking",
      "Recognised across the IIUC campus",
      "Set the tone for the club's yearly programmes",
    ],
  },
  {
    year: "2023",
    title: "Student development initiatives",
    text: "A stronger focus on skill-building, connecting classroom learning with real-world experience and professional preparation.",
    image: "",
    highlights: [
      "Research and debate workshops",
      "Industrial visits and career-focused sessions",
      "Leadership development programmes",
    ],
  },
  {
    year: "2025",
    title: "EB Winter Fest 2025",
    text: "A festival that brought students, faculty, and friends of the department together, and remains one of the club's most memorable milestones.",
    image: "",
    highlights: [
      "A campus-wide winter celebration",
      "Students, faculty, and friends of the department together",
      "One of the club's most memorable milestones",
    ],
  },
]

export const activityCategories = ["Learning", "Growth", "Community"] as const

export const activities = [
  {
    id: "workshops",
    category: "Learning",
    label: "Seminars & workshops",
    title: "Learning beyond the classroom.",
    text: "Research and debate workshops, seminars, and thoughtful conversations on economics, markets, and banking.",
    icon: "chart",
    image: photo("1503428593586-e225b39bddfe"),
    alt: "Participants writing in notebooks during a workshop",
  },
  {
    id: "industrial-visits",
    category: "Growth",
    label: "Industrial visits",
    title: "See how industry really works.",
    text: "Visits to factories, banks, and offices that connect theory with the way organisations operate every day.",
    icon: "briefcase",
    image: photo("1651525670114-2b8117390b28"),
    alt: "A group of visitors touring a factory floor",
  },
  {
    id: "leadership",
    category: "Growth",
    label: "Leadership programmes",
    title: "Build skills. Find your direction.",
    text: "Leadership development, teamwork, and career-focused sessions that prepare members for what comes next.",
    icon: "people",
    image: photo("1758270705317-3ef6142d306f"),
    alt: "Students working together around a laptop",
  },
  {
    id: "tournaments",
    category: "Community",
    label: "Sports tournaments",
    title: "Cricket, football, and team spirit.",
    text: "Departmental cricket and football tournaments that bring batches together on and off the field.",
    icon: "flag",
    image: photo("1565787154274-c8d076ad34e7"),
    alt: "Students playing cricket on an open field",
  },
  {
    id: "health-camp",
    category: "Community",
    label: "Health camps",
    title: "Caring for our community.",
    text: "Health camps and volunteer initiatives where members give their time to support others.",
    icon: "heart",
    image: photo("1623658045230-605cb00c80d6"),
    alt: "A volunteer checking blood pressure at a health camp",
  },
  {
    id: "tours",
    category: "Community",
    label: "Departmental tours",
    title: "Explore together, return closer.",
    text: "Departmental tours and trips that turn classmates into lifelong friends.",
    icon: "pin",
    image: photo("1706350338997-d57d49a9c83e"),
    alt: "A group of students standing together on a rocky beach",
  },
] as const
