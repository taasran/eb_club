type Quota = {
  scope: string
  limit: number
  windowMs: number
}

/** Global anonymous quotas deliberately do not trust caller-supplied IP headers. */
export function publicQuota(path: string): Quota | null {
  if (path.endsWith("/public/submit"))
    return { scope: "public-submit", limit: 120, windowMs: 3600000 }
  if (path.endsWith("/public/visit"))
    return { scope: "public-visit", limit: 1000, windowMs: 3600000 }
  return null
}

export function adminQuota(path: string, method: string): Quota {
  if (
    path.endsWith("/admin/upload") ||
    path.endsWith("/admin/facebook/import")
  ) {
    return { scope: "admin-images", limit: 30, windowMs: 60000 }
  }
  if (path.endsWith("/admin/facebook/history")) {
    return { scope: "admin-history", limit: 240, windowMs: 60000 }
  }
  return {
    scope: method === "GET" ? "admin-read" : "admin-write",
    limit: method === "GET" ? 120 : 30,
    windowMs: 60000,
  }
}

export class SecurityLimitError extends Error {
  constructor(
    public status: 429 | 503,
    public retryAfter: number,
  ) {
    super(
      status === 429
        ? "Too many requests. Please wait and try again."
        : "Request protection is temporarily unavailable. Please try again later.",
    )
  }
}

type SlotStore = {
  slots(prefix: string): Promise<string[]>
  /** Must use INSERT with a unique primary key; an upsert is not an atomic reservation. */
  reserve(key: string): Promise<boolean>
  prune(before: string): Promise<void>
}

const prefix = "eb:security:rate:"
const stamp = (time: number) => String(time).padStart(13, "0")

/** Shared KV primary-key reservations survive edge-isolate restarts and concurrent requests. */
export function createRequestLimiter(store: SlotStore, now = Date.now) {
  let nextCleanup = 0
  return async (quota: Quota, actor = "anonymous") => {
    const time = now()
    const start = Math.floor(time / quota.windowMs) * quota.windowMs
    const retryAfter = Math.max(
      1,
      Math.ceil((start + quota.windowMs - time) / 1000),
    )
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${quota.scope}:${actor}`),
    )
    const hash = Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
    const bucket = `${prefix}${stamp(start)}:${hash}:`
    try {
      if (time >= nextCleanup) {
        nextCleanup = time + 600000
        // All configured windows are <= one hour. Never prune active quota slots.
        await store.prune(`${prefix}${stamp(time - 7200000)}`)
      }
      const occupied = new Set(await store.slots(bucket))
      if (occupied.size >= quota.limit)
        throw new SecurityLimitError(429, retryAfter)
      let attempts = 0
      for (let slot = 0; slot < quota.limit; slot++) {
        const key = `${bucket}${slot}`
        if (occupied.has(key)) continue
        // Bound contention work; a busy quota fails closed instead of hammering storage.
        if (++attempts > 8) break
        if (await store.reserve(key)) return
      }
      throw new SecurityLimitError(429, retryAfter)
    } catch (error) {
      if (error instanceof SecurityLimitError) throw error
      throw new SecurityLimitError(503, 30)
    }
  }
}

export function validSubmission(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (body.type !== "join" && body.type !== "newsletter") return null
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data))
    return null
  const fields =
    body.type === "join" ? ["name", "email", "studentId", "batch"] : ["email"]
  const input = body.data as Record<string, unknown>
  const data: Record<string, string> = {}
  for (const key of fields) {
    const value = input[key]
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 250 ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      return null
    data[key] = value.trim()
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return null
  data.email = data.email.toLowerCase()
  return { type: body.type, data }
}
