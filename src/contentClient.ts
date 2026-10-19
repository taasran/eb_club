export type SiteContent = {
  heroTitle: string
  heroDescription: string
  campusImage: string
  events: ClubEvent[]
  executives: { name: string; designation: string; studentId: string; batch: string; image: string; quote?: string; imageZoom?: number; imageX?: number; imageY?: number }[]
  leadership: Record<string, { name: string; designation: string; session: string; image: string }[]>
  archiveYears: { year: string; members: { name: string; designation: string; studentId: string; batch: string }[] }[]
  // Optional so content saved before these sections existed stays valid.
  legacy?: LegacyMilestone[]
  // Keyed by activity id, e.g. "workshops" or "tours".
  activityImages?: Record<string, string>
  contactEmail?: string
  linkedinUrl?: string
}

export const eventStatuses = ["Upcoming", "Registration Open", "Coming Soon", "Completed"] as const
export type EventStatus = (typeof eventStatuses)[number]
export type ClubEvent = {
  title: string
  type: string
  status?: EventStatus
  date?: string
  venue?: string
  deadline?: string
}
export type LegacyMilestone = { year: string; title: string; text: string; image: string; highlights?: string[] }

type AdminRequest = (path: string, init?: RequestInit) => Promise<Response>

// JSONB may reorder object keys; array order must still be preserved.
export function contentSnapshot(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
      : item)
}

export async function readContent(serverUrl: string, publicKey: string, signal?: AbortSignal): Promise<SiteContent | null> {
  const response = await fetch(`${serverUrl}/public/content`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${publicKey}` },
    signal: signal ?? AbortSignal.timeout(15000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? `Content could not be loaded (HTTP ${response.status}).`)
  if (!body || !Object.prototype.hasOwnProperty.call(body, "content") ||
    (body.content !== null && (typeof body.content !== "object" || Array.isArray(body.content)))) {
    throw new Error("The content API returned an invalid response. Deploy the latest backend.")
  }
  return body.content
}

export async function publishContent(
  request: AdminRequest, serverUrl: string, publicKey: string, content: SiteContent,
): Promise<void> {
  const response = await request("/admin/content", { method: "PUT", body: JSON.stringify({ content }) })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.ok !== true) {
    throw new Error(body?.error ?? `Content could not be saved (HTTP ${response.status}).`)
  }
  const published = await readContent(serverUrl, publicKey)
  if (contentSnapshot(published) !== contentSnapshot(content)) {
    throw new Error("The public website did not return your saved changes. Your edits are still open; retry saving and check the backend deployment.")
  }
}

export default readContent
