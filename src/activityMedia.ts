export type ActivityPhoto = {
  src: string
  alt: string
  kind: "photo" | "poster"
  source?: string
}

export const maxActivityPhotos = 30
export const maxActivities = 24
export const builtInActivityIds = [
  "workshops",
  "industrial-visits",
  "leadership",
  "tournaments",
  "health-camp",
  "tours",
] as const

export const activityIconOptions = [
  { id: "chart", label: "Chart · Seminars & research" },
  { id: "briefcase", label: "Briefcase · Industry & banking" },
  { id: "people", label: "People · Leadership & career" },
  { id: "flag", label: "Flag · Sports & competitions" },
  { id: "heart", label: "Heart · Community & health" },
  { id: "pin", label: "Pin · Tours & excursions" },
  { id: "target", label: "Target · Skill building" },
  { id: "handshake", label: "Handshake · Networking & alumni" },
  { id: "clock", label: "Clock · Annual programmes" },
] as const

export type ActivityMedia = {
  label: string
  image: string
  alt: string
  imageKind: "photo" | "poster"
  imageSource: string
  additionalImages?: readonly ActivityPhoto[]
  gallery?: readonly ActivityPhoto[]
}

export type ClubActivity = ActivityMedia & {
  id: string
  category: string
  title: string
  text: string
  icon: string
  enabled?: boolean
  gallery?: ActivityPhoto[]
}

export const presetClubActivities: readonly ClubActivity[] = [
  {
    id: "case-debate",
    category: "Learning",
    label: "Case & debate competitions",
    title: "Sharpen your analytical thinking.",
    text: "Economics case competitions, policy debates, and analytical challenges that test ideas in practice.",
    icon: "target",
    enabled: true,
    image: "",
    imageKind: "photo",
    imageSource: "",
    alt: "Economics & Banking Club case and debate competitions",
  },
  {
    id: "career-grooming",
    category: "Growth",
    label: "Corporate grooming & career",
    title: "Step into the professional world.",
    text: "CV clinics, mock interviews, corporate etiquette, and banking career sessions led by industry practitioners.",
    icon: "handshake",
    enabled: true,
    image: "/images/activities/corporate-grooming.webp",
    imageKind: "poster",
    imageSource:
      "https://www.facebook.com/122207097422536052/posts/122207414948536052",
    alt: "Official Corporate Grooming workshop poster from the IIUC Economics & Banking Club",
  },
  {
    id: "festivals",
    category: "Community",
    label: "Festivals & celebrations",
    title: "Moments that bring the department together.",
    text: "Flagship departmental festivals like EB Day and EB Winter Fest that unite students, faculty, and alumni.",
    icon: "clock",
    enabled: true,
    image: "",
    imageKind: "photo",
    imageSource: "",
    alt: "Economics & Banking Club festivals and celebrations",
  },
  {
    id: "farewell-orientation",
    category: "Community",
    label: "Orientation & farewell",
    title: "Welcoming new batches, honouring graduates.",
    text: "Freshers' receptions, farewell felicitations, and batch gatherings that celebrate every chapter at IIUC.",
    icon: "people",
    enabled: true,
    image: "",
    imageKind: "photo",
    imageSource: "",
    alt: "Economics & Banking Club orientation and farewell programmes",
  },
]

export function resolveActivities(
  defaults: readonly ClubActivity[],
  configured?: readonly ClubActivity[],
  includeDisabled = false,
): ClubActivity[] {
  const fallbackById = new Map(defaults.map((item) => [item.id, item]))
  const source = configured
    ? configured.map((item) => {
        const fallback = fallbackById.get(item.id)
        return {
          ...fallback,
          ...item,
          enabled: item.enabled !== false,
          additionalImages: item.additionalImages ?? fallback?.additionalImages,
        }
      })
    : defaults.map((item) => ({ ...item, enabled: item.enabled !== false }))
  return includeDisabled
    ? source
    : source.filter(
        (item) =>
          item.enabled !== false &&
          Boolean(item.label.trim() && item.title.trim()),
      )
}

export function createCustomActivity(
  existingIds: readonly string[],
  partial?: Partial<ClubActivity>,
): ClubActivity {
  const used = new Set(existingIds.map((id) => id.toLowerCase()))
  const slugBase = (partial?.id || partial?.label || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "activity"
  let id = slugBase
  let suffix = 1
  while (used.has(id)) {
    suffix += 1
    id = `${slugBase}-${suffix}`
  }
  const label = partial?.label ?? "New club activity"
  return {
    id,
    category: partial?.category ?? "Learning",
    label,
    title: partial?.title ?? "Experience economics beyond the classroom.",
    text:
      partial?.text ??
      "Describe how this activity helps members learn, connect, and grow together.",
    icon: partial?.icon ?? "chart",
    enabled: partial?.enabled ?? true,
    image: partial?.image ?? "",
    imageKind: partial?.imageKind ?? "photo",
    imageSource: partial?.imageSource ?? "",
    alt: partial?.alt ?? `Economics & Banking Club ${label.toLowerCase()}`,
    ...(partial?.additionalImages
      ? { additionalImages: [...partial.additionalImages] }
      : {}),
    ...(partial?.gallery ? { gallery: [...partial.gallery] } : {}),
  }
}

export const presetEventTemplates = [
  {
    title: "Economics & Banking Seminar",
    type: "Seminar",
    status: "Upcoming" as const,
    venue: "IIUC Auditorium",
    description:
      "An interactive academic seminar exploring contemporary issues in economics, finance, and policy.",
  },
  {
    title: "Career & Corporate Grooming Workshop",
    type: "Workshop",
    status: "Registration Open" as const,
    venue: "Department of Economics & Banking, IIUC",
    description:
      "Hands-on professional preparation covering communication, interviews, and career readiness.",
  },
  {
    title: "Inter-Batch Case & Debate Competition",
    type: "Competition",
    status: "Upcoming" as const,
    venue: "IIUC Campus",
    description:
      "A lively competition where student teams analyse real economic and banking challenges.",
  },
  {
    title: "Industrial & Banking Visit",
    type: "Industrial visit",
    status: "Coming Soon" as const,
    venue: "Chattogram",
    description:
      "A guided field visit connecting classroom theory with real institutional operations.",
  },
  {
    title: "Departmental Festival & Gathering",
    type: "Festival",
    status: "Coming Soon" as const,
    venue: "IIUC Central Field",
    description:
      "A flagship celebration bringing together students, faculty members, and alumni.",
  },
] as const

export function eventPhotos(event: {
  title?: string
  image?: string
  gallery?: readonly ActivityPhoto[]
}): ActivityPhoto[] {
  if (event.gallery !== undefined) {
    const seen = new Set<string>()
    return event.gallery
      .filter((photo) => {
        const src = photo.src.trim()
        if (!src || seen.has(src)) return false
        seen.add(src)
        return true
      })
      .slice(0, maxActivityPhotos)
  }
  if (event.image?.trim()) {
    return [
      {
        src: event.image.trim(),
        alt: `${event.title?.trim() || "Club event"} — Economics & Banking Club, IIUC`,
        kind: "photo",
      },
    ]
  }
  return []
}

export default function activityPhotos(
  activity: ActivityMedia,
  publishedImage?: string,
  publishedGallery?: readonly ActivityPhoto[],
): ActivityPhoto[] {
  const activeGallery = publishedGallery ?? activity.gallery
  if (activeGallery !== undefined) {
    const seen = new Set<string>()
    return activeGallery
      .filter((photo) => {
        const src = photo.src.trim()
        if (!src || seen.has(src)) return false
        seen.add(src)
        return true
      })
      .slice(0, maxActivityPhotos)
  }
  // Existing admin uploads remain authoritative; do not mix in unrelated defaults.
  if (publishedImage?.trim()) {
    return [
      {
        src: publishedImage.trim(),
        alt: `${activity.label} at the IIUC Economics & Banking Club`,
        kind: "photo",
      },
    ]
  }
  const candidates: ActivityPhoto[] = [
    {
      src: activity.image,
      alt: activity.alt,
      kind: activity.imageKind,
      source: activity.imageSource,
    },
    ...(activity.additionalImages ?? []),
  ]
  const seen = new Set<string>()
  return candidates
    .filter((photo) => {
      const src = photo.src.trim()
      if (!src || seen.has(src)) return false
      seen.add(src)
      return true
    })
    .map((photo) => ({ ...photo, src: photo.src.trim() }))
}
