import { useEffect, useState } from "react"
import AdminControls from "../AdminControls"

const { Button, Div, P, Strong, Span, Small } = AdminControls
type Entry = {
  id: string
  at: string
  actor: string
  actorName: string
  role: string
  action: string
  area: string
  details: string[]
}
type Request = (path: string, init?: RequestInit) => Promise<Response>

export default function ActivityLog({ request }: { request: Request }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [who, setWho] = useState("all")
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const load = async () => {
    setBusy(true)
    setError("")
    try {
      const response = await request("/admin/activity")
      const body = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(body?.error ?? "Unable to load the activity log.")
      if (!Array.isArray(body?.entries))
        throw new Error("Deploy the latest backend to enable the activity log.")
      setEntries(body.entries)
      setLoaded(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const people = Array.from(new Set(entries.map((entry) => entry.actor)))
  const visible = entries.filter((entry) => who === "all" || entry.actor === who)
  return (
    <Div className="admin-stack">
      <Div className="admin-card">
        <Strong className="admin-card-title">Activity log</Strong>
        <P className="admin-muted">
          Every saved change, upload, inbox deletion and access decision is
          recorded with who did it, when, and what changed. Only the owner can
          see this page. Changes made before the log was deployed are not listed.
        </P>
        <Div className="flex flex-wrap items-center justify-between gap-3">
          <select
            className="admin-input"
            value={who}
            onChange={(event) => setWho(event.target.value)}
            aria-label="Filter by team member"
          >
            <option value="all">Everyone</option>
            {people.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="admin-btn ghost"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </Div>
      </Div>
      {error && (
        <Div className="admin-status error" role="status">
          {error}
        </Div>
      )}
      {loaded && visible.length === 0 && (
        <Div className="admin-empty">No activity recorded yet.</Div>
      )}
      {visible.map((entry) => (
        <Div className="admin-card" key={entry.id}>
          <Div className="flex flex-wrap items-center justify-between gap-3">
            <Strong className="admin-card-title">{entry.action}</Strong>
            <Span className="admin-badge">{entry.area}</Span>
          </Div>
          <P className="admin-muted">
            <Strong>{entry.actorName || entry.actor}</Strong> ·{" "}
            {entry.role === "owner"
              ? "Owner"
              : entry.role === "admin"
                ? "Admin"
                : "Moderator"}{" "}
            · {entry.actor}
          </P>
          {entry.details.length > 0 && (
            <ul className="admin-muted" style={{ paddingLeft: "1.1rem", listStyle: "disc" }}>
              {entry.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
          <Small className="admin-muted">
            {new Date(entry.at).toLocaleString()}
          </Small>
        </Div>
      ))}
    </Div>
  )
}
