import type { SiteContent as Content } from "../contentClient"

export const defaultContent: Content = {
  heroTitle: "Where curious minds meet possibility.",
  heroDescription:
    "A home for the thinkers, changemakers, and future leaders of economics and banking.",
  campusImage:
    "https://images.unsplash.com/photo-1638636214032-581196ffd400?auto=format&fit=crop&w=1400&q=85",
  events: [
    { title: "Economics in a changing world", type: "Proposed seminar" },
    { title: "Your first step into banking", type: "Proposed workshop" },
  ],
  executives: Array.from({ length: 4 }, (_, index) => ({
    name: "Name to be announced",
    designation: [
      "President",
      "Vice President",
      "General Secretary",
      "Treasurer",
    ][index],
    studentId: "",
    batch: "",
    image: "",
  })),
  leadership: {},
  archiveYears: [
    {
      year: "2024–25",
      members: Array.from({ length: 5 }, (_, index) => ({
        name: "Name to be announced",
        designation: [
          "President",
          "Vice President",
          "General Secretary",
          "Treasurer",
          "Organizing Secretary",
        ][index],
        studentId: "",
        batch: "",
      })),
    },
  ],
}

export const leadershipSections = [
  {
    slug: "former-presidents",
    title: "Former Presidents",
    designation: "Former President",
  },
  {
    slug: "former-general-secretaries",
    title: "Former General Secretaries",
    designation: "Former General Secretary",
  },
  {
    slug: "previous-executive-committees",
    title: "Previous Executive Committees",
    designation: "Executive Member",
  },
  {
    slug: "faculty-advisors",
    title: "Faculty Advisors",
    designation: "Faculty Advisor",
  },
]

export type Tab = "visitors" | "inbox" | "home" | "events" | "executives" | "leadership" | "archive" | "team"

type AdminTab = {
  id: Tab
  label: string
  hint: string
  icon: string
}

export const tabs: AdminTab[] = [
  {
    id: "team",
    label: "Team access",
    hint: "Admins & moderators",
    icon: "users",
  },
  {
    id: "visitors",
    label: "Visitors",
    hint: "Daily traffic & top pages",
    icon: "chart",
  },
  {
    id: "inbox",
    label: "Inbox",
    hint: "Join requests & subscribers",
    icon: "inbox",
  },
  {
    id: "home",
    label: "Home page",
    hint: "Hero text & campus photo",
    icon: "home",
  },
  {
    id: "events",
    label: "Events",
    hint: "Upcoming programmes",
    icon: "calendar",
  },
  {
    id: "executives",
    label: "Executive Committee",
    hint: "Current team on home page",
    icon: "users",
  },
  {
    id: "leadership",
    label: "Leadership archive",
    hint: "Former leaders & advisors",
    icon: "award",
  },
  {
    id: "archive",
    label: "Committee archive",
    hint: "Year-wise member records",
    icon: "archive",
  },
]
