type Json = Record<string, unknown>
type Photo = {
  id: string
  url: string
  preview: boolean
}
type Post = {
  id: string
  message: string
  createdAt: string
  url: string
  images: Photo[]
}
type Metadata = Omit<Post, "images"> & { preview: string | null }
type Job = {
  node: string
  edge: "posts" | "attachments" | "subattachments"
  after?: string
  post?: Metadata
}
type Batch = {
  posts: Post[]
  nextCursor: string | null
  complete: boolean
  partial: boolean
  postsScanned: number
  requestsScanned: number
  photosFound: number
  warnings: string[]
}
type Run = {
  id: string
  revision: number
  pageId: string
  expiresAt: number
  jobs: Job[]
  seenPosts: string[]
  seenJobs: string[]
  seenPhotos: string[]
  partial: boolean
  lastCursor?: string
  lastBatch?: Batch
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
  storeImage: (
    bytes: Uint8Array,
    type: string,
    filename: string,
  ) => Promise<string>
  fetch?: typeof fetch
  now?: () => number
}

const version = "v26.0"
const runLifetime = 30 * 60 * 1000
const photoLifetime = 24 * 60 * 60 * 1000
const maxImageBytes = 5 * 1024 * 1024
const record = (value: unknown): value is Json =>
  !!value && typeof value === "object" && !Array.isArray(value)
const cursorPattern = /^[A-Za-z0-9_+/=-]{1,4096}$/
const handlePattern = /^[a-f0-9-]{36}\.\d{1,7}$/
const photoPattern = /^\d+_\d+-[a-f0-9]{24}$/

export class FacebookArchiveError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 409 | 413 | 429 | 502 | 503 = 502,
  ) {
    super(message)
  }
}

function safeUrl(value: unknown, image = false): string | null {
  if (typeof value !== "string" || value.length > 6000) return null
  try {
    const url = new URL(value)
    const allowed = image
      ? url.hostname.endsWith(".fbcdn.net") ||
        url.hostname.endsWith(".fbsbx.com")
      : ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(
          url.hostname,
        )
    return url.protocol === "https:" &&
      allowed &&
      !url.username &&
      !url.password &&
      ![...url.searchParams.keys()].some((key) => /token|secret/i.test(key))
      ? url.href
      : null
  } catch {
    return null
  }
}

async function digest(value: string | Uint8Array) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

function caption(value: unknown, token: string) {
  return typeof value === "string"
    ? value
        .split(token)
        .join("[redacted]")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .slice(0, 4000)
    : ""
}

/** Parse continuation metadata only. Never fetch, persist or return Graph's paging URL. */
function continuation(
  connection: Json,
  fallback: Job,
  token: string,
  nested = false,
): Job | null {
  if (!record(connection.paging) || !connection.paging.next) return null
  const paging = connection.paging
  let after = record(paging.cursors) ? paging.cursors.after : undefined
  let node = fallback.node
  let edge = fallback.edge
  if (nested) {
    if (typeof paging.next !== "string")
      throw new FacebookArchiveError(
        "Facebook returned an unreadable album continuation.",
      )
    const url = new URL(paging.next)
    const match = url.pathname.match(
      /^\/v\d+\.\d+\/(\d+(?:_\d+)?)\/(attachments|subattachments)$/,
    )
    if (
      url.origin !== "https://graph.facebook.com" ||
      !match ||
      url.username ||
      url.password
    ) {
      throw new FacebookArchiveError(
        "Facebook returned an unsupported album continuation.",
      )
    }
    node = match[1]
    edge = (match[2] as Job["edge"])
    after ??= url.searchParams.get("after")
  }
  if (
    typeof after !== "string" ||
    !cursorPattern.test(after) ||
    after.includes(token)
  ) {
    throw new FacebookArchiveError(
      "Facebook returned an unreadable continuation. The history scan is not complete.",
    )
  }
  return { ...fallback, node, edge, after }
}

export function createFacebookArchive(dependencies: Dependencies) {
  const request = dependencies.fetch ?? globalThis.fetch
  const now = dependencies.now ?? Date.now
  const active = new Map<string, Promise<Batch>>()
  function configuration() {
    const raw = dependencies.config()
    const pageId = raw.pageId?.trim()
    const token = raw.token?.trim()
    if (!pageId || !/^\d+$/.test(pageId) || !token || /\s/.test(token)) {
      throw new FacebookArchiveError(
        "Facebook Page access is not configured on the server.",
        503,
      )
    }
    return { pageId, token }
  }
  async function graph(job: Job, token: string): Promise<Json> {
    const url = new URL(
      `https://graph.facebook.com/${version}/${job.node}/${job.edge}`,
    )
    url.searchParams.set("limit", job.edge === "posts" ? "25" : "100")
    url.searchParams.set(
      "fields",
      job.edge === "posts"
        ? "id,message,created_time,permalink_url,full_picture"
        : "media,type,description,subattachments.limit(100){media,type,description}",
    )
    if (job.after) url.searchParams.set("after", job.after)
    let response: Response
    try {
      response = await request(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw new FacebookArchiveError(
        "Facebook could not be reached. Pause and try continuing the scan later.",
      )
    }
    const body = await response.json().catch(() => null)
    if (
      !response.ok ||
      !record(body) ||
      body.error ||
      !Array.isArray(body.data)
    ) {
      const rateLimited =
        response.status === 429 ||
        (record(body) &&
          record(body.error) &&
          [4, 17, 32, 613].includes(Number(body.error.code)))
      throw new FacebookArchiveError(
        rateLimited
          ? "Facebook's request limit was reached. Wait before continuing this scan."
          : "Facebook could not read this page. Check the Page token and its permissions on the server.",
        rateLimited ? 429 : 502,
      )
    }
    return body
  }

  async function read(owner: string, cursor?: string): Promise<Batch> {
    if (cursor && !handlePattern.test(cursor))
      throw new FacebookArchiveError("Invalid archive cursor.", 400)
    const { pageId, token } = configuration()
    const publicUrl = (value: unknown, image = false) =>
      typeof value === "string" && !value.includes(token)
        ? safeUrl(value, image)
        : null
    const key = `eb:facebook:archive:run:${await digest(owner.toLowerCase())}`
    let run: Run
    if (cursor) {
      const saved = (await dependencies.cache.get(key)) as Run | undefined
      if (
        !saved ||
        saved.pageId !== pageId ||
        saved.expiresAt < now() ||
        !cursor.startsWith(`${saved.id}.`)
      ) {
        throw new FacebookArchiveError(
          "This scan expired or belongs to another account. Start a new scan.",
          409,
        )
      }
      if (cursor === saved.lastCursor && saved.lastBatch) return saved.lastBatch
      if (cursor !== `${saved.id}.${saved.revision}`)
        throw new FacebookArchiveError(
          "This scan has already advanced. Start a new scan if needed.",
          409,
        )
      run = structuredClone(saved)
    } else {
      run = {
        id: crypto.randomUUID(),
        revision: 0,
        pageId,
        expiresAt: now() + runLifetime,
        jobs: [{ node: pageId, edge: "posts" }],
        seenPosts: [],
        seenJobs: [],
        seenPhotos: [],
        partial: false,
      }
    }
    const job = run.jobs.shift()
    if (!job)
      throw new FacebookArchiveError("This scan has already finished.", 409)
    const fingerprint = await digest(
      `${job.node}/${job.edge}/${job.after ?? ""}`,
    )
    if (run.seenJobs.includes(fingerprint))
      throw new FacebookArchiveError(
        "Facebook repeated a page cursor. The scan stopped without claiming completion.",
        409,
      )
    if (
      run.seenJobs.length >= 50000 ||
      run.jobs.length > 2000 ||
      run.seenPhotos.length > 100000
    ) {
      throw new FacebookArchiveError(
        "This archive exceeds the safe scan size. The scan is not complete; use a Page export for the remaining history.",
        409,
      )
    }
    const posts: Post[] = []
    const warnings: string[] = []
    const followups: Job[] = []
    let body: Json | null = null
    try {
      body = await graph(job, token)
    } catch (error) {
      if (
        job.edge === "posts" ||
        (error instanceof FacebookArchiveError && error.status === 429)
      )
        throw error
      warnings.push(
        "An album page could not be read. Its post remains available, but some photos may be missing.",
      )
      run.partial = true
    }
    run.seenJobs.push(fingerprint)
    if (job.edge === "posts" && body) {
      for (const raw of (body.data as unknown[]).slice(0, 25)) {
        if (
          !record(raw) ||
          typeof raw.id !== "string" ||
          !new RegExp(`^${pageId}_\\d+$`).test(raw.id) ||
          typeof raw.created_time !== "string" ||
          !Number.isFinite(Date.parse(raw.created_time)) ||
          run.seenPosts.includes(raw.id)
        )
          continue
        run.seenPosts.push(raw.id)
        const post: Metadata = {
          id: raw.id,
          message: caption(raw.message, token),
          createdAt: new Date(raw.created_time).toISOString(),
          url:
            publicUrl(raw.permalink_url) ??
            `https://www.facebook.com/${raw.id}`,
          preview: publicUrl(raw.full_picture, true),
        }
        posts.push({
          id: post.id,
          message: post.message,
          createdAt: post.createdAt,
          url: post.url,
          images: [],
        })
        if (!/\/(?:videos|reels?)\//i.test(new URL(post.url).pathname)) {
          followups.push({ node: post.id, edge: "attachments", post })
        }
      }
      const next = continuation(body, job, token)
      if (next) followups.push(next)
    } else if (job.post) {
      const post = job.post
      const images: Photo[] = []
      const seen = new Set<string>()
      let containsVideo = false
      let inspected = 0
      const addImage = async (url: string, preview: boolean) => {
        const id = `${post.id}-${(await digest(new URL(url).pathname)).slice(0, 24)}`
        if (seen.has(id)) return
        seen.add(id)
        if (!run.seenPhotos.includes(id)) run.seenPhotos.push(id)
        await dependencies.cache.set(`eb:facebook:archive:photo:${id}`, {
          pageId,
          url,
          source: post.url,
          expiresAt: now() + photoLifetime,
        })
        images.push({ id, url, preview })
      }
      const inspect = async (connection: Json, nested = false, depth = 0) => {
        if (!Array.isArray(connection.data)) return
        if (depth > 8 || inspected > 1000) {
          run.partial = true
          warnings.push(
            "An album exceeded the safe response size. Some photos may be missing.",
          )
          return
        }
        for (const raw of connection.data.slice(0, 100)) {
          inspected += 1
          if (!record(raw)) continue
          if (typeof raw.type === "string" && /video|reel/i.test(raw.type)) {
            containsVideo = true
            continue
          }
          const media =
            record(raw.media) && record(raw.media.image)
              ? publicUrl(raw.media.image.src, true)
              : null
          if (media) await addImage(media, false)
          if (record(raw.subattachments))
            await inspect(raw.subattachments, true, depth + 1)
        }
        try {
          const next = continuation(connection, job, token, nested)
          if (next) followups.push(next)
        } catch {
          warnings.push(
            "An album continuation could not be read. Some photos may be missing.",
          )
          run.partial = true
        }
      }
      if (body) await inspect(body)
      if (
        !images.length &&
        !containsVideo &&
        job.edge === "attachments" &&
        post.preview
      )
        await addImage(post.preview, true)
      posts.push({
        id: post.id,
        message: post.message,
        createdAt: post.createdAt,
        url: post.url,
        images,
      })
    }
    run.jobs.unshift(...followups)
    run.revision += 1
    run.expiresAt = now() + runLifetime
    const batch: Batch = {
      posts,
      nextCursor: run.jobs.length ? `${run.id}.${run.revision}` : null,
      complete: run.jobs.length === 0,
      partial: run.partial,
      postsScanned: run.seenPosts.length,
      requestsScanned: run.seenJobs.length,
      photosFound: run.seenPhotos.length,
      warnings,
    }
    run.lastCursor = cursor
    run.lastBatch = batch
    await dependencies.cache.set(key, run)
    return batch
  }

  return {
    read(owner: string, cursor?: string) {
      const key = owner.toLowerCase()
      const existing = active.get(key)
      if (existing) return existing
      const pending = read(owner, cursor).finally(() => active.delete(key))
      active.set(key, pending)
      return pending
    },
    async importPhoto(id: string) {
      if (!photoPattern.test(id))
        throw new FacebookArchiveError(
          "Choose a photo from the scanned Page archive.",
          400,
        )
      const { pageId, token } = configuration()
      const saved = await dependencies.cache.get(
        `eb:facebook:archive:photo:${id}`,
      )
      if (
        !record(saved) ||
        saved.pageId !== pageId ||
        typeof saved.expiresAt !== "number" ||
        saved.expiresAt < now() ||
        !safeUrl(saved.url, true) ||
        !safeUrl(saved.source) ||
        String(saved.url).includes(token) ||
        String(saved.source).includes(token)
      )
        throw new FacebookArchiveError(
          "This photo reference expired. Scan its post again.",
          409,
        )
      let response: Response
      try {
        response = await request(saved.url as string, {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        })
      } catch {
        throw new FacebookArchiveError(
          "The Facebook image could not be downloaded. Scan its post again.",
        )
      }
      if (!response.ok || !response.body)
        throw new FacebookArchiveError(
          "The Facebook image is no longer available. Scan its post again.",
        )
      if (Number(response.headers.get("content-length")) > maxImageBytes)
        throw new FacebookArchiveError("Choose a photo up to 5 MB.", 413)
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          length += value.length
          if (length > maxImageBytes) {
            await reader.cancel()
            throw new FacebookArchiveError("Choose a photo up to 5 MB.", 413)
          }
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => bytes[index] === byte,
      )
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      const webp =
        length >= 12 &&
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
      if (!png && !jpeg && !webp)
        throw new FacebookArchiveError(
          "Facebook did not return a supported JPG, PNG or WebP image.",
          400,
        )
      const type = png ? "image/png" : jpeg ? "image/jpeg" : "image/webp"
      const filename = `${await digest(bytes)}.${
        png ? "png" : jpeg ? "jpg" : "webp"
      }`
      const src = await dependencies.storeImage(
        bytes,
        type,
        `facebook/${pageId}/${filename}`,
      )
      return {
        src,
        source: saved.source as string,
        kind: "photo" as const,
        alt: "Official club activity photo from Facebook",
      }
    },
  }
}
