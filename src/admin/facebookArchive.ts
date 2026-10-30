import activityPhotos, {
  builtInActivityIds,
  eventPhotos,
  maxActivityPhotos,
  resolveActivities,
  type ActivityPhoto,
} from "../activityMedia"
import { legacyGallery, maxLegacyPhotos, type ClubEvent, type SiteContent } from "../contentClient"
import { activities } from "../data/club"

export type ArchivePhoto = {
  id: string
  url: string
  preview: boolean
}
export type ArchivePost = {
  id: string
  message: string
  createdAt: string
  url: string
  images: ArchivePhoto[]
}
export type ArchiveBatch = {
  posts: ArchivePost[]
  nextCursor: string | null
  complete: boolean
  partial: boolean
  postsScanned: number
  requestsScanned: number
  photosFound: number
  warnings: string[]
}
export type ArchiveRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Response>

function facebookUrl(value: unknown, image = false): value is string {
  if (typeof value !== "string" || value.length > 6000) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ![...url.searchParams.keys()].some((key) => /token|secret/i.test(key)) &&
      (image
        ? url.hostname.endsWith(".fbcdn.net") ||
          url.hostname.endsWith(".fbsbx.com")
        : ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(
            url.hostname,
          ))
    )
  } catch {
    return false
  }
}

export async function readArchive(
  request: ArchiveRequest,
  cursor: string | undefined,
  signal: AbortSignal,
): Promise<ArchiveBatch> {
  const response = await request(
    `/admin/facebook/history${
      cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
    }`,
    { signal },
  )
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Deploy the updated Supabase backend to enable Facebook history. The current server only supports the latest-post feed."
        : (body?.error ??
            "The Page history could not be read. You can continue this scan later."),
    )
  if (
    !body ||
    !Array.isArray(body.posts) ||
    typeof body.complete !== "boolean" ||
    typeof body.partial !== "boolean" ||
    !(
      body.nextCursor === null ||
      /^[a-f0-9-]{36}\.\d{1,7}$/.test(body.nextCursor)
    ) ||
    body.complete !== (body.nextCursor === null) ||
    !["postsScanned", "requestsScanned", "photosFound"].every(
      (key) => Number.isSafeInteger(body[key]) && body[key] >= 0,
    ) ||
    !Array.isArray(body.warnings) ||
    !body.warnings.every(
      (warning: unknown) =>
        typeof warning === "string" && warning.length < 1000,
    ) ||
    !body.posts.every(
      (post: ArchivePost) =>
        post &&
        /^\d+_\d+$/.test(post.id) &&
        typeof post.message === "string" &&
        post.message.length <= 4000 &&
        Number.isFinite(Date.parse(post.createdAt)) &&
        facebookUrl(post.url) &&
        Array.isArray(post.images) &&
        post.images.every(
          (photo) =>
            photo &&
            /^\d+_\d+-[a-f0-9]{24}$/.test(photo.id) &&
            facebookUrl(photo.url, true) &&
            typeof photo.preview === "boolean",
        ),
    )
  ) {
    throw new Error(
      "The archive response was invalid. Deploy the matching backend and try again.",
    )
  }
  return body
}

export function mergeArchivePosts(
  previous: ArchivePost[],
  next: ArchivePost[],
) {
  const posts = new Map(previous.map((post) => [post.id, post]))
  for (const post of next) {
    const images = new Map(
      (posts.get(post.id)?.images ?? []).map((photo) => [photo.id, photo]),
    )
    for (const photo of post.images) images.set(photo.id, photo)
    posts.set(post.id, { ...post, images: [...images.values()] })
  }
  return [...posts.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

/** Suggestions require an administrator's review; nothing is auto-published. */
export function suggestActivity(
  message: string,
  availableActivities: readonly {
    id: string
    label: string
    title?: string
  }[] = activities,
) {
  const text = message.toLowerCase()
  const availableIds = new Set(availableActivities.map((item) => item.id))
  const rules = [
    ["health-camp", /health camp|medical camp|blood donat|স্বাস্থ্য|রক্তদান|চিকিৎসা/],
    [
      "tournaments",
      /cricket|football|tournament|sports|ক্রিকেট|ফুটবল|টুর্নামেন্ট|ক্রীড়া/,
    ],
    [
      "industrial-visits",
      /industrial (visit|tour)|factory (visit|tour)|bank visit|শিল্প\s*(সফর|ভ্রমণ)|কারখানা/,
    ],
    [
      "tours",
      /picnic|departmental tour|study tour|excursion|বনভোজন|পিকনিক|শিক্ষা\s*সফর/,
    ],
    [
      "career-grooming",
      /corporate grooming|cv clinic|mock interview|etiquette|ক্যারিয়ার/,
    ],
    [
      "case-debate",
      /case competition|debate|policy debate|বিতর্ক/,
    ],
    [
      "festivals",
      /winter fest|eb day|festival|fest\b|উৎসব/,
    ],
    [
      "farewell-orientation",
      /farewell|felicitation|orientation|reception|freshers|বিদায়ী|নবীনবরণ/,
    ],
    [
      "leadership",
      /corporate grooming|career|leadership|professional development|নেতৃত্ব|ক্যারিয়ার/,
    ],
    [
      "workshops",
      /workshop|seminar|conference|research|debate|কর্মশালা|সেমিনার|গবেষণা|বিতর্ক/,
    ],
  ] as const
  const matchedRule = rules.find(
    ([id, pattern]) => availableIds.has(id) && pattern.test(text),
  )?.[0]
  if (matchedRule) return matchedRule
  for (const item of availableActivities) {
    const words = item.label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !["club", "with", "from"].includes(word))
    if (words.some((word) => text.includes(word))) return item.id
  }
  return ""
}

export async function importArchivePhoto(
  request: ArchiveRequest,
  photoId: string,
): Promise<ActivityPhoto> {
  const response = await request("/admin/facebook/import", {
    method: "POST",
    body: JSON.stringify({ photoId }),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      body?.error ?? "The photo could not be copied to club storage.",
    )
  const photo = body?.photo
  if (
    !photo ||
    typeof photo.src !== "string" ||
    !/^https:\/\//.test(photo.src) ||
    !facebookUrl(photo.source) ||
    typeof photo.alt !== "string" ||
    photo.kind !== "photo"
  ) {
    throw new Error("The image import returned an invalid response.")
  }
  return photo
}

export function setActivityGallery(
  content: SiteContent,
  id: string,
  photos: ActivityPhoto[],
): SiteContent {
  const nextPhotos = photos.slice(0, maxActivityPhotos)
  const isBuiltIn = (builtInActivityIds as readonly string[]).includes(id)
  const nextActivities = content.activities?.map((item) =>
    item.id === id ? { ...item, gallery: nextPhotos } : item,
  )
  if (isBuiltIn) {
    return {
      ...content,
      ...(nextActivities ? { activities: nextActivities } : {}),
      activityGalleries: {
        ...content.activityGalleries,
        [id]: nextPhotos,
      },
    }
  }
  const list = resolveActivities(activities, content.activities, true)
  if (!list.some((item) => item.id === id)) return content
  return {
    ...content,
    activities: list.map((item) =>
      item.id === id ? { ...item, gallery: nextPhotos } : item,
    ),
  }
}

export function appendActivityPhoto(
  content: SiteContent,
  id: string,
  photo: ActivityPhoto,
): SiteContent {
  const list = resolveActivities(activities, content.activities, true)
  const activity = list.find((item) => item.id === id)
  if (!activity) return content
  const current = activityPhotos(
    activity,
    content.activityImages?.[id],
    content.activityGalleries?.[id],
  )
  if (
    current.length >= maxActivityPhotos ||
    current.some((item) => item.src === photo.src)
  )
    return content
  return setActivityGallery(content, id, [...current, photo])
}

export function setEventGallery(
  content: SiteContent,
  eventIndex: number,
  photos: ActivityPhoto[],
): SiteContent {
  if (eventIndex < 0 || eventIndex >= content.events.length) return content
  const nextPhotos = photos.slice(0, maxActivityPhotos)
  return {
    ...content,
    events: content.events.map((item, index) =>
      index === eventIndex
        ? {
            ...item,
            gallery: nextPhotos,
            image: nextPhotos[0]?.src ?? "",
          }
        : item,
    ),
  }
}

export function appendEventPhoto(
  content: SiteContent,
  eventIndex: number,
  photo: ActivityPhoto,
): SiteContent {
  const event = content.events[eventIndex]
  if (!event) return content
  const current = eventPhotos(event)
  if (
    current.length >= maxActivityPhotos ||
    current.some((item) => item.src === photo.src)
  )
    return content
  return setEventGallery(content, eventIndex, [...current, photo])
}

export function summarizePostAsEvent(
  post: Pick<ArchivePost, "message" | "createdAt">,
): Pick<ClubEvent, "title" | "type" | "status" | "date" | "venue" | "description"> {
  const cleaned = post.message
    .replace(/\s+/g, " ")
    .trim()
  const firstSentence = cleaned
    .split(/(?<=[.!?])\s+|\n+/)[0]
    ?.trim()
    .slice(0, 80)
  const lower = cleaned.toLowerCase()
  const type = /workshop|grooming/.test(lower)
    ? "Workshop"
    : /seminar|conference|icbm/.test(lower)
      ? "Seminar"
      : /tour|visit/.test(lower)
        ? "Tour & visit"
        : /tournament|cricket|football|sports/.test(lower)
          ? "Tournament"
          : /fest|day|farewell|orientation/.test(lower)
            ? "Club programme"
            : "Club event"
  const formattedDate = Number.isFinite(Date.parse(post.createdAt))
    ? new Date(post.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : ""
  return {
    title: firstSentence || `${type} · EB Club IIUC`,
    type,
    status: "Completed",
    date: formattedDate,
    venue: "IIUC campus",
    description: cleaned.slice(0, 360),
  }
}

export function createEventFromArchivePost(
  content: SiteContent,
  post: ArchivePost,
  photo: ActivityPhoto,
): SiteContent {
  const summary = summarizePostAsEvent(post)
  const newEvent: ClubEvent = {
    ...summary,
    deadline: "",
    image: photo.src,
    gallery: [photo],
  }
  return {
    ...content,
    events: [newEvent, ...content.events],
  }
}

export function setLegacyGallery(
  content: SiteContent,
  milestoneIndex: number,
  photos: ActivityPhoto[],
): SiteContent {
  if (!content.legacy?.[milestoneIndex]) return content
  const seen = new Set<string>()
  const gallery = photos.filter((photo) => {
    if (!photo.src.trim() || seen.has(photo.src.trim())) return false
    seen.add(photo.src.trim())
    return true
  }).slice(0, maxLegacyPhotos)
  return {
    ...content,
    legacy: content.legacy.map((item, index) =>
      index === milestoneIndex
        ? { ...item, gallery, images: gallery.map((photo) => photo.src), image: gallery[0]?.src ?? "" }
        : item,
    ),
  }
}

export function appendLegacyPhoto(
  content: SiteContent,
  milestoneIndex: number,
  photo: ActivityPhoto,
): SiteContent {
  const milestone = content.legacy?.[milestoneIndex]
  if (!milestone) return content
  return setLegacyGallery(content, milestoneIndex, [...legacyGallery(milestone), photo])
}

export function createLegacyFromArchivePost(
  content: SiteContent,
  post: ArchivePost,
  photo: ActivityPhoto,
): SiteContent {
  // Keep original-language captions in the private review UI, not the English public site.
  const english = [...post.message.matchAll(/\p{L}/gu)].every(
    ([letter]) => /\p{Script=Latin}/u.test(letter),
  )
  const summary = english ? summarizePostAsEvent(post) : null
  return {
    ...content,
    legacy: [
      {
        year: Number.isFinite(Date.parse(post.createdAt))
          ? String(new Date(post.createdAt).getUTCFullYear())
          : "",
        title: summary?.title || "New club milestone",
        text: summary?.description || "",
        highlights: [],
        image: photo.src,
        images: [photo.src],
        gallery: [photo],
      },
      ...(content.legacy ?? []),
    ],
  }
}
