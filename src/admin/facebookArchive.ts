import activityPhotos, {
  maxActivityPhotos,
  type ActivityPhoto,
} from "../activityMedia"
import type { SiteContent } from "../contentClient"
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
export function suggestActivity(message: string) {
  const text = message.toLowerCase()
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
      "leadership",
      /corporate grooming|career|leadership|professional development|নেতৃত্ব|ক্যারিয়ার/,
    ],
    [
      "workshops",
      /workshop|seminar|conference|research|debate|কর্মশালা|সেমিনার|গবেষণা|বিতর্ক/,
    ],
  ] as const
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? ""
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

export function appendActivityPhoto(
  content: SiteContent,
  id: string,
  photo: ActivityPhoto,
): SiteContent {
  const activity = activities.find((item) => item.id === id)
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
  return {
    ...content,
    activityGalleries: {
      ...content.activityGalleries,
      [id]: [...current, photo],
    },
  }
}
