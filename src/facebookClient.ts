export const facebookPageUrl = "https://www.facebook.com/451695514683833"
export const facebookRefreshInterval = 5 * 60 * 1000

export type FacebookPost = {
  id: string
  message: string
  createdAt: string
  url: string
  image: string | null
  mediaType: "image" | "video" | "text"
}

export type FacebookFeed = {
  posts: FacebookPost[]
  pageUrl: string
  updatedAt: string | null
  stale: boolean
}

function isPublicUrl(value: unknown, image = false): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    const allowed = image
      ? url.hostname.endsWith(".fbcdn.net") ||
        url.hostname.endsWith(".fbsbx.com")
      : [
          "facebook.com",
          "www.facebook.com",
          "m.facebook.com",
          "fb.watch",
        ].includes(url.hostname)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      allowed &&
      ![...url.searchParams.keys()].some((key) => /token|appsecret/i.test(key))
    )
  } catch {
    return false
  }
}

export async function readFacebookFeed(
  serverUrl: string,
  publicKey: string,
  signal?: AbortSignal,
): Promise<FacebookFeed> {
  const response = await fetch(`${serverUrl}/public/facebook`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${publicKey}` },
    signal: signal ?? AbortSignal.timeout(15000),
  })
  if (!response.ok)
    throw new Error("Facebook updates are temporarily unavailable.")
  const body = await response.json()
  const posts = Array.isArray(body?.posts)
    ? body.posts.map((post: unknown) => {
        if (!post || typeof post !== "object") return post
        const record = post as Record<string, unknown>
        // Older deployed backends do not include mediaType yet. Keep their
        // image and text posts visible while waiting for the backend rollout.
        if (record.mediaType !== undefined) return record
        return {
          ...record,
          mediaType: record.image === null ? "text" : "image",
        }
      })
    : body?.posts
  if (
    !body ||
    !Array.isArray(posts) ||
    posts.length > 6 ||
    !isPublicUrl(body.pageUrl) ||
    typeof body.stale !== "boolean" ||
    typeof body.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(body.updatedAt)) ||
    !posts.every(
      (post: FacebookPost) =>
        post &&
        typeof post.id === "string" &&
        /^\d+_\d+$/.test(post.id) &&
        typeof post.message === "string" &&
        post.message.length <= 320 &&
        typeof post.createdAt === "string" &&
        Number.isFinite(Date.parse(post.createdAt)) &&
        isPublicUrl(post.url) &&
        (post.image === null || isPublicUrl(post.image, true)) &&
        ["image", "video", "text"].includes(post.mediaType),
    )
  ) {
    throw new Error("Facebook updates could not be loaded.")
  }
  return { ...body, posts } as FacebookFeed
}
