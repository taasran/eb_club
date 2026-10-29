type FacebookPost = {
  id: string
  message: string
  createdAt: string
  url: string
  image: string | null
  mediaType: "image" | "video" | "text"
}

type FacebookFeed = {
  posts: FacebookPost[]
  pageUrl: string
  updatedAt: string | null
  stale: boolean
}

type FeedCache = {
  feed: FacebookFeed
  retryAt: number
}

type FacebookFeedFailure = {
  stage: "config" | "request" | "response" | "posts"
  pageIdValid?: boolean
  tokenPresent?: boolean
  httpStatus?: number
  graphCode?: number
  graphSubcode?: number
}

type Dependencies = {
  config: () => {
    pageId?: string
    token?: string
  }
  cache: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
  }
  fetch?: typeof fetch
  now?: () => number
  reportFailure?: (failure: FacebookFeedFailure) => void
}

const refreshInterval = 5 * 60 * 1000
const retryInterval = 60 * 1000
const maxStaleAge = 24 * 60 * 60 * 1000
const defaultPageId = "451695514683833"

function safeUrl(value: unknown, image = false): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const allowed = image
      ? host.endsWith(".fbcdn.net") || host.endsWith(".fbsbx.com")
      : [
          "facebook.com",
          "www.facebook.com",
          "m.facebook.com",
          "fb.watch",
        ].includes(host)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowed ||
      [...url.searchParams.keys()].some((key) => /token|appsecret/i.test(key))
    )
      return null
    return url.href
  } catch {
    return null
  }
}

function englishCaption(value: unknown, token: string): string {
  if (typeof value !== "string") return ""
  const text = value
    .split(token)
    .join("[redacted]")
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim()
  // Keep the website English-only without pretending to translate other captions.
  if (
    [...text.matchAll(/\p{L}/gu)].some(
      ([letter]) => !/\p{Script=Latin}/u.test(letter),
    )
  )
    return ""
  return text.length > 320 ? `${text.slice(0, 317).trimEnd()}...` : text
}

function attachmentPreview(value: unknown, token: string) {
  const pending: unknown[] = [value]
  let image: string | null = null
  let message = ""
  let inspected = 0
  while (pending.length && inspected < 50) {
    const current = pending.shift()
    inspected += 1
    if (!current || typeof current !== "object") continue
    const attachment = current as Record<string, unknown>
    if (attachment.media && typeof attachment.media === "object") {
      const media = attachment.media as Record<string, unknown>
      if (media.image && typeof media.image === "object") {
        image ??= safeUrl((media.image as Record<string, unknown>).src, true)
      }
    }
    message ||= englishCaption(attachment.description, token)
    if (Array.isArray(attachment.data)) {
      pending.push(...attachment.data.slice(0, 50))
    }
    pending.push(attachment.attachments, attachment.subattachments)
  }
  return { image, message }
}

function isVideoMediaType(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.toLowerCase().includes("video") ||
      value.toLowerCase().includes("reel"))
  )
}

function hasVideoMedia(value: unknown): boolean {
  const values: unknown[] = [value]
  let inspected = 0
  while (values.length && inspected < 50) {
    const current = values.shift()
    inspected += 1
    if (!current || typeof current !== "object") continue
    const record = current as Record<string, unknown>
    if (isVideoMediaType(record.media_type) || isVideoMediaType(record.type))
      return true
    if (Array.isArray(record.data)) values.push(...record.data)
    for (const nested of [record.attachments, record.subattachments]) {
      if (!nested || typeof nested !== "object") continue
      const data = (nested as Record<string, unknown>).data
      if (Array.isArray(data)) values.push(...data)
    }
  }
  return false
}

function isVideoPermalink(value: unknown): boolean {
  const url = safeUrl(value)
  return Boolean(url && /\/(?:reel|reels|videos)\//i.test(new URL(url).pathname))
}

function normalizePosts(
  data: unknown[],
  pageId: string,
  token: string,
): FacebookPost[] {
  const posts: FacebookPost[] = []
  const seen = new Set<string>()
  for (const value of data) {
    if (!value || typeof value !== "object") continue
    const post = value as Record<string, unknown>
    if (
      typeof post.id !== "string" ||
      !new RegExp(`^${pageId}_[0-9]+$`).test(post.id) ||
      typeof post.created_time !== "string" ||
      !Number.isFinite(Date.parse(post.created_time)) ||
      seen.has(post.id)
    )
      continue
    seen.add(post.id)
    const preview = attachmentPreview(post.attachments, token)
    const image = safeUrl(post.full_picture, true) ?? preview.image
    posts.push({
      id: post.id,
      message: englishCaption(post.message, token) || preview.message,
      createdAt: new Date(post.created_time).toISOString(),
      url: safeUrl(post.permalink_url) ?? `https://www.facebook.com/${post.id}`,
      image,
      mediaType: isVideoMediaType(post.type) ||
        hasVideoMedia(post.attachments) ||
        isVideoPermalink(post.permalink_url)
        ? "video"
        : image
          ? "image"
          : "text",
    })
  }
  return posts
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
}

/** Only allowlisted public post fields reach storage or the browser; never Graph paging/tokens. */
export function createFacebookFeed(dependencies: Dependencies) {
  const request = dependencies.fetch ?? globalThis.fetch
  const now = dependencies.now ?? Date.now
  const enrichSharedPost = async (post: FacebookPost, token: string) => {
    if (post.image || post.mediaType === "video") return post
    try {
      // Shared albums may omit full_picture. Read their preview separately so
      // attachment permissions/deprecations cannot break the basic feed.
      const url = new URL(`https://graph.facebook.com/v26.0/${post.id}/attachments`)
      url.searchParams.set(
        "fields",
        "media,description,subattachments{media,description}",
      )
      const response = await request(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      })
      if (!response.ok) return post
      const body = await response.json()
      if (!body || body.error || !Array.isArray(body.data)) return post
      const preview = attachmentPreview(body, token)
      return {
        ...post,
        image: preview.image,
        message: post.message || preview.message,
        mediaType: preview.image ? "image" as const : post.mediaType,
      }
    } catch {
      // No raw Graph response, target URL or paging URL is stored or forwarded.
      return post
    }
  }
  const reportFailure = (failure: FacebookFeedFailure) => {
    try {
      if (dependencies.reportFailure) {
        dependencies.reportFailure(failure)
      } else {
        console.warn("Facebook feed unavailable", failure)
      }
    } catch {
      // Diagnostics must never interrupt the feed's fallback behavior.
    }
  }
  const pending = new Map<string, Promise<{
    feed: FacebookFeed
    status: 200 | 503
  }>>()

  return async function getFacebookFeed() {
    const config = dependencies.config()
    const pageId = config.pageId?.trim()
    const token = config.token?.trim()
    const validId = typeof pageId === "string" && /^[0-9]{5,30}$/.test(pageId)
    const empty: FacebookFeed = {
      posts: [],
      pageUrl: `https://www.facebook.com/${validId ? pageId : defaultPageId}`,
      updatedAt: null,
      stale: false,
    }
    if (!validId || !token) {
      reportFailure({
        stage: "config",
        pageIdValid: validId,
        tokenPresent: Boolean(token),
      })
      return { feed: empty, status: 503 as const }
    }
    const key = `eb:facebook:v2:${pageId}`
    const inFlight = pending.get(key)
    if (inFlight) return inFlight

    const refresh = async () => {
      let cached: FeedCache | null = null
      try {
        const value = (await dependencies.cache.get(key)) as FeedCache | null
        if (
          value?.feed &&
          Array.isArray(value.feed.posts) &&
          value.feed.pageUrl === empty.pageUrl &&
          Number.isFinite(value.retryAt)
        )
          cached = value
      } catch {
        /* A cache outage must not prevent a live Facebook read. */
      }
      const timestamp = now()
      const savedAt = Date.parse(cached?.feed.updatedAt ?? "")
      const usable =
        Number.isFinite(savedAt) && timestamp - savedAt < maxStaleAge
      if (cached && cached.retryAt > timestamp) {
        return {
          feed: usable ? cached.feed : empty,
          status: usable ? 200 as const : 503 as const,
        }
      }

      let next: FeedCache
      let stage: FacebookFeedFailure["stage"] = "request"
      let httpStatus: number | undefined
      let graphCode: number | undefined
      let graphSubcode: number | undefined
      try {
        const fetchPosts = async (fields: string) => {
          const url = new URL(`https://graph.facebook.com/v26.0/${pageId}/posts`)
          url.searchParams.set("fields", fields)
          url.searchParams.set("limit", "6")
          stage = "request"
          const response = await request(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
            redirect: "error",
          })
          httpStatus = response.status
          stage = "response"
          return { response, body: await response.json() }
        }
        const basicFields =
          "id,message,created_time,permalink_url,full_picture"
        const { response, body } = await fetchPosts(basicFields)
        graphCode = Number.isSafeInteger(body?.error?.code)
          ? body.error.code
          : undefined
        graphSubcode = Number.isSafeInteger(body?.error?.error_subcode)
          ? body.error.error_subcode
          : undefined
        if (!response.ok || !body || body.error || !Array.isArray(body.data))
          throw new Error("Invalid Facebook response.")
        // Do not replace a good cache with an unexpectedly malformed non-empty response.
        stage = "posts"
        const posts = normalizePosts(body.data, pageId, token)
        if (body.data.length && !posts.length)
          throw new Error("Invalid Facebook posts.")
        const enrichedPosts = await Promise.all(
          posts.map((post) => enrichSharedPost(post, token)),
        )
        next = {
          feed: {
            ...empty,
            posts: enrichedPosts,
            updatedAt: new Date(timestamp).toISOString(),
          },
          retryAt: timestamp + refreshInterval,
        }
      } catch {
        // Do not log or forward upstream errors/URLs: these may include credentials.
        reportFailure({
          stage,
          ...(httpStatus !== undefined ? { httpStatus } : {}),
          ...(graphCode !== undefined ? { graphCode } : {}),
          ...(graphSubcode !== undefined ? { graphSubcode } : {}),
        })
        next = {
          feed: usable && cached ? { ...cached.feed, stale: true } : empty,
          retryAt: timestamp + retryInterval,
        }
      }
      try {
        await dependencies.cache.set(key, next)
      } catch {
        /* Live results are still available if persistence is temporarily down. */
      }
      return {
        feed: next.feed,
        status: next.feed.updatedAt ? 200 as const : 503 as const,
      }
    }
    const operation = refresh()
    pending.set(key, operation)
    try {
      return await operation
    } finally {
      pending.delete(key)
    }
  }
}
