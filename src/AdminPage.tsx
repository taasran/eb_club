import { FormEvent, ReactNode, useEffect, useState } from "react"
import EconomicsLoader from "./EconomicsLoader"
import { supabase, serverUrl, publicAnonKey } from "./supabase"
import AdminAccess, { PasswordField } from "./AdminAccess"
import AdminControls from "./AdminControls"
import { readContent, publishContent, type SiteContent } from "./contentClient"
import { announceContentUpdate } from "./useSiteContent"

import {
  defaultContent,
  leadershipSections,
  tabs,
  type Tab,
} from "./admin/config"

const { Button, P, Main, Div, Link } = AdminControls

type Content = SiteContent

const iconPaths: Record<string, ReactNode> = {
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.3 3.5 5.2" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v11h14V9M10 13h4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v4h16v-4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v6H4V6h6" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
}

function AdminIcon({ name }: { name: string }) {
  return (
    <svg
      className="admin-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function ImageField({
  label,
  value,
  onChange,
  onUpload,
  wide,
  size = "800 × 800 px (square)",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onUpload: (file: File | undefined) => void
  wide?: boolean
  size?: string
}) {
  const [showUrl, setShowUrl] = useState(false)
  return (
    <div className={wide ? "admin-image-field wide" : "admin-image-field"}>
      <span className="admin-field-label">{label}</span>
      <div className="admin-image-body">
        <div className="admin-image-preview">
          {value ? <img src={value} alt="" /> : <AdminIcon name="image" />}
        </div>
        <div className="admin-image-actions">
          <label className="admin-btn ghost">
            <AdminIcon name="upload" />{" "}
            {value ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                onUpload(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </label>
          <button
            type="button"
            className="admin-link"
            onClick={() => setShowUrl(!showUrl)}
          >
            <AdminIcon name="link" /> {showUrl ? "Hide link" : "Use image link"}
          </button>
          {value && (
            <button
              type="button"
              className="admin-link danger"
              onClick={() => onChange("")}
            >
              Remove photo
            </button>
          )}
          <small>Recommended: {size} · JPG or PNG, up to 5 MB</small>
        </div>
      </div>
      {showUrl && (
        <input
          className="admin-url-input"
          value={value}
          placeholder="https://…"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="admin-section-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </header>
  )
}

function RemoveButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className="admin-icon-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <AdminIcon name="trash" />
    </button>
  )
}

type VisitDay = {
  date: string
  views: number
  visitors: number
  pages: Record<string, number>
}

const pageNames: Record<string, string> = { "/": "Home page" }
const pageName = (path: string) =>
  pageNames[path] ??
  path
    .replace("/leadership/", "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })

type Submission = {
  id: string
  type: "join" | "newsletter"
  data: Record<string, string>
  createdAt: string
}

const fieldLabels: Record<string, string> = {
  name: "Name",
  email: "Email",
  studentId: "Student ID",
  batch: "Batch",
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function AdminPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [content, setContent] = useState<Content>(defaultContent)
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(defaultContent),
  )
  const [status, setStatus] = useState("")
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">(
    "info",
  )
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminRole, setAdminRole] = useState<"owner" | "admin" | "moderator">(
    "moderator",
  )
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>("visitors")
  const [visitDays, setVisitDays] = useState<VisitDay[]>([])
  const [visitRange, setVisitRange] = useState(30)
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxFilter, setInboxFilter] = useState<"all" | "join" | "newsletter">(
    "all",
  )
  const [inboxQuery, setInboxQuery] = useState("")
  const [leaderSlug, setLeaderSlug] = useState(leadershipSections[0].slug)
  const [yearIndex, setYearIndex] = useState(0)

  const notify = (
    message: string,
    tone: "info" | "success" | "error" = "info",
  ) => {
    setStatus(message)
    setStatusTone(tone)
  }
  const dirty = JSON.stringify(content) !== savedSnapshot

  const request = async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession()
    return fetch(`${serverUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        ...init?.headers,
      },
    })
  }

  const loadVisits = async (days = visitRange) => {
    setVisitsLoading(true)
    const response = await request(`/admin/visits?days=${days}`).catch(
      () => null,
    )
    const body = await response?.json().catch(() => null)
    setVisitsLoading(false)
    if (response?.ok) setVisitDays(body?.days ?? [])
    else notify(body?.error ?? "Unable to load visitor stats.", "error")
  }

  const loadSubmissions = async () => {
    setInboxLoading(true)
    const response = await request("/admin/submissions").catch(() => null)
    const body = await response?.json().catch(() => null)
    setInboxLoading(false)
    if (response?.ok) setSubmissions(body?.submissions ?? [])
    else notify(body?.error ?? "Unable to load the inbox.", "error")
  }

  const deleteSubmission = async (item: Submission) => {
    if (
      !window.confirm(
        `Delete this ${item.type === "join" ? "join request" : "subscriber"}?`,
      )
    )
      return
    const response = await request(`/admin/submissions/${item.id}`, {
      method: "DELETE",
    }).catch(() => null)
    if (response?.ok) {
      setSubmissions((current) =>
        current.filter((entry) => entry.id !== item.id),
      )
      notify("Entry deleted.", "success")
    } else notify("Unable to delete this entry.", "error")
  }

  const exportCsv = (items: Submission[]) => {
    const keys = [
      "type",
      "submitted",
      ...Array.from(new Set(items.flatMap((item) => Object.keys(item.data)))),
    ]
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = items.map((item) =>
      keys
        .map((key) =>
          escape(
            key === "type"
              ? item.type
              : key === "submitted"
                ? item.createdAt
                : (item.data[key] ?? ""),
          ),
        )
        .join(","),
    )
    const blob = new Blob(
      [
        [
          keys.map((key) => escape(fieldLabels[key] ?? key)).join(","),
          ...rows,
        ].join("\n"),
      ],
      { type: "text/csv" },
    )
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `eb-club-submissions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const loadAdmin = async () => {
    try {
      const response = await request("/admin/session")
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        return {
          ok: false,
          error:
            body?.error ??
            (response.status === 404
              ? "The server is still running an old version (admin routes not found). Redeploy the Supabase edge function from Make settings."
              : "Unable to verify admin access. Deploy the Supabase edge function and try again."),
        }
      }
      const session = await response.json().catch(() => null)
      if (!session || !["owner", "admin", "moderator"].includes(session.role)) {
        return {
          ok: false,
          error: "Deploy the latest backend to verify your dashboard role.",
        }
      }
      const savedContent = await readContent(serverUrl, publicAnonKey)
      const next = savedContent
        ? {
            ...defaultContent,
            ...savedContent,
            leadership: savedContent.leadership ?? {},
          }
        : defaultContent
      setContent(next)
      setSavedSnapshot(JSON.stringify(next))
      setAdminEmail(session.email)
      setAdminRole(session.role)
      setIsAdmin(true)
      setTab("visitors")
      if (session.role !== "moderator") void loadSubmissions()
      void loadVisits()
      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load website content."
      notify(message, "error")
      return { ok: false, error: message }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void loadAdmin()
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    notify("Signing in…")
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setBusy(false)
      notify(error.message, "error")
      return
    }
    const admin = await loadAdmin()
    setBusy(false)
    if (admin.ok) notify("Welcome back. You're signed in.", "success")
    else
      notify(`Signed in, but the dashboard is locked: ${admin.error}`, "error")
  }

  const signUp = async () => {
    if (!email || !password) {
      notify("Enter an email and password first.", "error")
      return
    }
    setBusy(true)
    notify("Creating your admin account…")
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    notify(
      error
        ? error.message
        : "Account created. Confirm your email if requested, then sign in.",
      error ? "error" : "success",
    )
  }

  const signOut = async () => {
    if (dirty && !window.confirm("You have unsaved changes. Sign out anyway?"))
      return
    await supabase.auth.signOut()
    setIsAdmin(false)
    setAdminRole("moderator")
    setSubmissions([])
    setPassword("")
    notify("")
  }

  const uploadImage = async (
    file: File | undefined,
    apply: (url: string) => void,
  ) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      notify(
        "That image is larger than 5 MB. Please choose a smaller file.",
        "error",
      )
      return
    }
    notify("Uploading image…")
    const { data } = await supabase.auth.getSession()
    const form = new FormData()
    form.append("file", file)
    try {
      const response = await fetch(`${serverUrl}/admin/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: form,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.url) {
        notify(body?.error ?? "Image upload failed.", "error")
        return
      }
      apply(body.url)
      notify("Image uploaded. Save changes to publish it.", "success")
    } catch (error) {
      notify(`Image upload failed: ${error}`, "error")
    }
  }

  const save = async () => {
    if (busy) return
    const submitted = structuredClone(content)
    setBusy(true)
    notify("Saving changes…")
    try {
      await publishContent(request, serverUrl, publicAnonKey, submitted)
      setSavedSnapshot(JSON.stringify(submitted))
      announceContentUpdate()
      notify(
        "Saved and verified on the public API. Website pages update automatically within 30 seconds.",
        "success",
      )
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to save. Check your connection and try again.",
        "error",
      )
    } finally {
      setBusy(false)
    }
  }

  const discard = () => {
    if (!window.confirm("Discard all unsaved changes?")) return
    setContent(JSON.parse(savedSnapshot))
    notify("Changes discarded.")
  }

  type Person = Content["leadership"][string][number]
  type Executive = Content["executives"][number]
  type Member = Content["archiveYears"][number]["members"][number]
  const updateExecutive = (index: number, patch: Partial<Executive>) =>
    setContent((current) => ({
      ...current,
      executives: current.executives.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  const updateEvent = (
    index: number,
    patch: Partial<Content["events"][number]>,
  ) =>
    setContent((current) => ({
      ...current,
      events: current.events.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  const updatePerson = (slug: string, index: number, patch: Partial<Person>) =>
    setContent((current) => ({
      ...current,
      leadership: {
        ...current.leadership,
        [slug]: (current.leadership[slug] ?? []).map((person, itemIndex) =>
          itemIndex === index ? { ...person, ...patch } : person,
        ),
      },
    }))
  const updateYear = (
    index: number,
    update: (
      year: Content["archiveYears"][number],
    ) => Content["archiveYears"][number],
  ) =>
    setContent((current) => ({
      ...current,
      archiveYears: current.archiveYears.map((year, itemIndex) =>
        itemIndex === index ? update(year) : year,
      ),
    }))
  const updateMember = (
    index: number,
    memberIndex: number,
    patch: Partial<Member>,
  ) =>
    updateYear(index, (year) => ({
      ...year,
      members: year.members.map((member, itemIndex) =>
        itemIndex === memberIndex ? { ...member, ...patch } : member,
      ),
    }))

  const counts: Record<Tab, number> = {
    team: 0,
    visitors: 0,
    inbox: submissions.length,
    home: 0,
    events: content.events.length,
    executives: content.executives.length,
    leadership: Object.values(content.leadership).reduce(
      (total, list) => total + list.length,
      0,
    ),
    archive: content.archiveYears.length,
  }

  const statusBanner = status && (
    <div className={`admin-status ${statusTone}`} role="status">
      {statusTone === "success" && <AdminIcon name="check" />}
      <span>{status}</span>
    </div>
  )

  if (checking)
    return (
      <Main className="admin-shell admin-center">
        <Div className="flex flex-col items-center gap-4">
          <EconomicsLoader label="Opening content studio" />
          <Link
            className="admin-btn ghost"
            href="/downloads/eb-club-source.zip"
            download="eb-club-latest-source.zip"
          >
            <AdminIcon name="download" /> Download latest project code (.zip)
          </Link>
          <P className="admin-muted">
            No sign-in needed for the source download.
          </P>
        </Div>
      </Main>
    )

  if (!isAdmin)
    return (
      <main className="admin-shell admin-auth">
        <aside className="admin-auth-brand">
          <a href="/" className="admin-brand light">
            <img src="/images/club-logo.png" alt="" />
            <span>
              Economics & Banking Club<small>IIUC · ADMIN</small>
            </span>
          </a>
          <div>
            <p className="admin-eyebrow light">CONTENT STUDIO</p>
            <h1>
              Keep the club's story <em>current.</em>
            </h1>
            <p>
              Update the home page, events, executive committee and leadership
              archive — all from one place.
            </p>
          </div>
          <small>Only authorised club admins can make changes.</small>
        </aside>
        <section className="admin-auth-form">
          <form onSubmit={signIn}>
            <p className="admin-eyebrow">OWNER · ADMIN SIGN IN</p>
            <h2>Welcome back.</h2>
            <P className="admin-muted">
              Sign in with your authorised owner, admin or moderator account.
            </P>
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <PasswordField value={password} onChange={setPassword} />
            <button
              className="admin-btn primary block"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <EconomicsLoader variant="inline" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
            {statusBanner}
            <div className="admin-divider">
              <span>First time here?</span>
            </div>
            <Button
              className="admin-btn ghost block"
              type="button"
              onClick={signUp}
              disabled={busy}
            >
              Create account
            </Button>
            <P className="admin-muted">
              Creating an account does not grant dashboard access. Ask the owner
              to authorise your email.
            </P>
            <a
              className="admin-btn primary block"
              href="/downloads/iiuc-eb-club-figma-design.svg"
              download="iiuc-eb-club-figma-design.svg"
            >
              <AdminIcon name="download" /> Download Figma Design (.svg)
            </a>
            <a
              className="admin-btn ghost block"
              href="/downloads/iiuc-eb-club-design-package.zip"
              download="iiuc-eb-club-design-package.zip"
            >
              <AdminIcon name="download" /> Download Design Package (.zip)
            </a>
            <a
              className="admin-btn primary block"
              href="/downloads/eb-club-source.zip"
              download="iiuc-eb-club-full-website.zip"
            >
              <AdminIcon name="download" /> Download latest project code (.zip)
            </a>
            <a className="admin-link center" href="/">
              ← Back to website
            </a>
          </form>
        </section>
      </main>
    )

  const activeTab = tabs.find((item) => item.id === tab)!
  const people = content.leadership[leaderSlug] ?? []
  const leaderSection = leadershipSections.find(
    (item) => item.slug === leaderSlug,
  )!
  const safeYear = Math.min(
    yearIndex,
    Math.max(content.archiveYears.length - 1, 0),
  )
  const year = content.archiveYears[safeYear]

  return (
    <main className="admin-shell admin-app">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <img src="/images/club-logo.png" alt="" />
          <span>
            EB Club<small>CONTENT STUDIO</small>
          </span>
        </a>
        <nav aria-label="Admin sections">
          {tabs
            .filter(
              (item) =>
                (item.id !== "team" || adminRole === "owner") &&
                (item.id !== "inbox" || adminRole !== "moderator"),
            )
            .map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  item.id === tab ? "admin-nav-item active" : "admin-nav-item"
                }
                onClick={() => setTab(item.id)}
                aria-current={item.id === tab ? "page" : undefined}
              >
                <AdminIcon name={item.icon} />
                <span>
                  {item.label}
                  <small>{item.hint}</small>
                </span>
                {counts[item.id] > 0 && <em>{counts[item.id]}</em>}
              </button>
            ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">
            <span>{(adminEmail || "A").charAt(0).toUpperCase()}</span>
            <div>
              {adminRole === "owner"
                ? "Owner"
                : adminRole === "admin"
                  ? "Admin"
                  : "Moderator"}
              <small>{adminEmail || "Admin"}</small>
            </div>
          </div>
          <a className="admin-link" href="/" target="_blank" rel="noreferrer">
            <AdminIcon name="external" /> View website
          </a>
          <a
            className="admin-link"
            href="/downloads/eb-club-source.zip"
            download="iiuc-eb-club-source.zip"
          >
            <AdminIcon name="download" /> Download source ZIP
          </a>
          <button type="button" className="admin-link" onClick={signOut}>
            <AdminIcon name="logout" /> Sign out
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <span>Admin</span>
          <span>/</span>
          <strong>{activeTab.label}</strong>
        </div>

        {tab === "team" && adminRole === "owner" && (
          <AdminAccess request={request} ownerEmail={adminEmail} />
        )}

        {tab === "visitors" &&
          (() => {
            const today = visitDays[visitDays.length - 1]
            const yesterday = visitDays[visitDays.length - 2]
            const totalVisitors = visitDays.reduce(
              (sum, day) => sum + day.visitors,
              0,
            )
            const totalViews = visitDays.reduce(
              (sum, day) => sum + day.views,
              0,
            )
            const peak = Math.max(1, ...visitDays.map((day) => day.visitors))
            const best = visitDays.reduce<VisitDay | undefined>(
              (top, day) => (!top || day.visitors > top.visitors ? day : top),
              undefined,
            )
            const pages = Object.entries(
              visitDays.reduce<Record<string, number>>((all, day) => {
                for (const [path, count] of Object.entries(day.pages))
                  all[path] = (all[path] ?? 0) + count
                return all
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
            const change =
              today && yesterday && yesterday.visitors
                ? Math.round(
                    ((today.visitors - yesterday.visitors) /
                      yesterday.visitors) *
                      100,
                  )
                : null
            return (
              <>
                <SectionHeader
                  eyebrow="VISITORS"
                  title="Website traffic"
                  description="Unique visitors are counted once per browser per day (Bangladesh time)."
                  action={
                    <div className="admin-header-actions">
                      <div className="admin-segment compact">
                        {[7, 30, 90].map((days) => (
                          <button
                            type="button"
                            key={days}
                            className={visitRange === days ? "active" : ""}
                            onClick={() => {
                              setVisitRange(days)
                              void loadVisits(days)
                            }}
                          >
                            {days} days
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => loadVisits()}
                        disabled={visitsLoading}
                      >
                        <AdminIcon name="refresh" />{" "}
                        {visitsLoading ? "Loading…" : "Refresh"}
                      </button>
                    </div>
                  }
                />
                <div className="admin-stats four">
                  <div className="admin-stat highlight">
                    <span>Visitors today</span>
                    <strong>{today?.visitors ?? 0}</strong>
                    {change !== null && (
                      <small className={change >= 0 ? "up" : "down"}>
                        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs
                        yesterday
                      </small>
                    )}
                  </div>
                  <div className="admin-stat">
                    <span>Yesterday</span>
                    <strong>{yesterday?.visitors ?? 0}</strong>
                  </div>
                  <div className="admin-stat">
                    <span>Visitors · {visitRange} days</span>
                    <strong>{totalVisitors}</strong>
                    <small>{totalViews} page views</small>
                  </div>
                  <div className="admin-stat">
                    <span>Daily average</span>
                    <strong>
                      {visitDays.length
                        ? Math.round(totalVisitors / visitDays.length)
                        : 0}
                    </strong>
                    {best && best.visitors > 0 && (
                      <small>
                        Best: {shortDate(best.date)} ({best.visitors})
                      </small>
                    )}
                  </div>
                </div>
                <div className="admin-card">
                  <div className="admin-chart-head">
                    <strong>Daily visitors</strong>
                    <span>
                      <i /> Visitors
                    </span>
                  </div>
                  {visitsLoading && totalVisitors === 0 ? (
                    <div className="admin-loading-block">
                      <EconomicsLoader label="Counting visitors" />
                    </div>
                  ) : totalVisitors === 0 ? (
                    <div className="admin-empty slim">
                      No visits recorded yet. Numbers appear as people open the
                      website.
                    </div>
                  ) : (
                    <div
                      className="admin-chart"
                      role="img"
                      aria-label={`Daily visitors over the last ${visitRange} days`}
                    >
                      {visitDays.map((day, index) => (
                        <div
                          className="admin-bar"
                          key={day.date}
                          title={`${shortDate(day.date)}: ${day.visitors} visitors, ${day.views} views`}
                        >
                          <span
                            style={{
                              height: `${(day.visitors / peak) * 100}%`,
                            }}
                            className={
                              index === visitDays.length - 1 ? "today" : ""
                            }
                          />
                          {(visitDays.length <= 14 ||
                            index % Math.ceil(visitDays.length / 8) === 0 ||
                            index === visitDays.length - 1) && (
                            <small>{shortDate(day.date)}</small>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-grid two">
                  <div className="admin-card">
                    <strong className="admin-card-title">
                      Most visited pages
                    </strong>
                    {pages.length === 0 ? (
                      <small className="admin-muted">No page views yet.</small>
                    ) : (
                      <ul className="admin-page-list">
                        {pages.map(([path, count]) => (
                          <li key={path}>
                            <span>{pageName(path)}</span>
                            <div>
                              <i
                                style={{
                                  width: `${(count / pages[0][1]) * 100}%`,
                                }}
                              />
                            </div>
                            <strong>{count}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="admin-card">
                    <strong className="admin-card-title">Recent days</strong>
                    <ul className="admin-day-list">
                      {[...visitDays]
                        .reverse()
                        .slice(0, 7)
                        .map((day) => (
                          <li key={day.date}>
                            <span>{shortDate(day.date)}</span>
                            <strong>{day.visitors}</strong>
                            <small>{day.views} views</small>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </>
            )
          })()}

        {tab === "inbox" &&
          adminRole !== "moderator" &&
          (() => {
            const joinCount = submissions.filter(
              (item) => item.type === "join",
            ).length
            const query = inboxQuery.trim().toLowerCase()
            const visible = submissions.filter(
              (item) =>
                (inboxFilter === "all" || item.type === inboxFilter) &&
                (!query ||
                  Object.values(item.data).some((value) =>
                    value.toLowerCase().includes(query),
                  )),
            )
            return (
              <>
                <SectionHeader
                  eyebrow="INBOX"
                  title="Website submissions"
                  description="Everything visitors send through the website's forms."
                  action={
                    <div className="admin-header-actions">
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={loadSubmissions}
                        disabled={inboxLoading}
                      >
                        <AdminIcon name="refresh" />{" "}
                        {inboxLoading ? "Loading…" : "Refresh"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => exportCsv(visible)}
                        disabled={!visible.length}
                      >
                        <AdminIcon name="download" /> Export CSV
                      </button>
                    </div>
                  }
                />
                <div className="admin-stats">
                  <div className="admin-stat">
                    <span>Total</span>
                    <strong>{submissions.length}</strong>
                  </div>
                  <div className="admin-stat">
                    <span>Join requests</span>
                    <strong>{joinCount}</strong>
                  </div>
                  <div className="admin-stat">
                    <span>Newsletter subscribers</span>
                    <strong>{submissions.length - joinCount}</strong>
                  </div>
                </div>
                <div className="admin-inbox-tools">
                  <div className="admin-segment">
                    {([
                      ["all", "All"],
                      ["join", "Join requests"],
                      ["newsletter", "Newsletter"],
                    ] as const).map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        className={inboxFilter === id ? "active" : ""}
                        onClick={() => setInboxFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="admin-search"
                    value={inboxQuery}
                    placeholder="Search name, email, ID…"
                    onChange={(event) => setInboxQuery(event.target.value)}
                  />
                </div>
                {inboxLoading && submissions.length === 0 ? (
                  <div className="admin-loading-block">
                    <EconomicsLoader label="Loading inbox" />
                  </div>
                ) : visible.length === 0 ? (
                  <div className="admin-empty">
                    {submissions.length
                      ? "No entries match your filter."
                      : "No submissions yet. They'll appear here as visitors fill in the website's forms."}
                  </div>
                ) : (
                  <div className="admin-stack">
                    {visible.map((item) => (
                      <article
                        className="admin-card admin-submission"
                        key={item.id}
                      >
                        <span className={`admin-badge ${item.type}`}>
                          <AdminIcon
                            name={item.type === "join" ? "users" : "mail"}
                          />
                          {item.type === "join" ? "Join request" : "Newsletter"}
                        </span>
                        <div className="admin-submission-body">
                          <strong>{item.data.name || item.data.email}</strong>
                          <dl>
                            {Object.entries(item.data)
                              .filter(([key]) => key !== "name")
                              .map(([key, value]) => (
                                <div key={key}>
                                  <dt>{fieldLabels[key] ?? key}</dt>
                                  <dd>
                                    {key === "email" ? (
                                      <a href={`mailto:${value}`}>{value}</a>
                                    ) : (
                                      value || "—"
                                    )}
                                  </dd>
                                </div>
                              ))}
                          </dl>
                        </div>
                        <time dateTime={item.createdAt}>
                          {formatDate(item.createdAt)}
                        </time>
                        <RemoveButton
                          label="Delete entry"
                          onClick={() => deleteSubmission(item)}
                        />
                      </article>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

        {tab === "home" && (
          <>
            <SectionHeader
              eyebrow="HOME PAGE"
              title="Hero & campus"
              description="The first thing visitors see when they open the website."
            />
            <div className="admin-card">
              <Field
                label="Hero heading"
                value={content.heroTitle}
                onChange={(value) =>
                  setContent((current) => ({ ...current, heroTitle: value }))
                }
              />
              <Field
                label="Hero description"
                value={content.heroDescription}
                multiline
                onChange={(value) =>
                  setContent((current) => ({
                    ...current,
                    heroDescription: value,
                  }))
                }
              />
            </div>
            <div className="admin-card">
              <ImageField
                wide
                size="1600 × 1200 px (landscape 4:3)"
                label="Campus photo"
                value={content.campusImage}
                onChange={(value) =>
                  setContent((current) => ({ ...current, campusImage: value }))
                }
                onUpload={(file) =>
                  uploadImage(file, (url) =>
                    setContent((current) => ({ ...current, campusImage: url })),
                  )
                }
              />
            </div>
          </>
        )}

        {tab === "events" && (
          <>
            <SectionHeader
              eyebrow="EVENTS"
              title="Upcoming programmes"
              description="The first two events are featured on the home page."
              action={
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      events: [...current.events, { title: "", type: "" }],
                    }))
                  }
                >
                  <AdminIcon name="plus" /> Add event
                </button>
              }
            />
            {content.events.length === 0 && (
              <div className="admin-empty">
                No events yet. Add your first event.
              </div>
            )}
            <div className="admin-stack">
              {content.events.map((item, index) => (
                <div className="admin-card admin-row-card" key={index}>
                  <span className="admin-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="admin-grid two">
                    <Field
                      label="Event title"
                      value={item.title}
                      placeholder="e.g. Economics in a changing world"
                      onChange={(value) => updateEvent(index, { title: value })}
                    />
                    <Field
                      label="Event type"
                      value={item.type}
                      placeholder="e.g. Seminar"
                      onChange={(value) => updateEvent(index, { type: value })}
                    />
                  </div>
                  <RemoveButton
                    label="Remove event"
                    onClick={() =>
                      setContent((current) => ({
                        ...current,
                        events: current.events.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "executives" && (
          <>
            <SectionHeader
              eyebrow="EXECUTIVE COMMITTEE"
              title="Current team"
              description="Shown in order on the home page slider."
              action={
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      executives: [
                        ...current.executives,
                        {
                          name: "",
                          designation: "Executive Member",
                          studentId: "",
                          batch: "",
                          image: "",
                        },
                      ],
                    }))
                  }
                >
                  <AdminIcon name="plus" /> Add executive
                </button>
              }
            />
            <div className="admin-people">
              {content.executives.map((item, index) => (
                <article className="admin-card admin-person" key={index}>
                  <div className="admin-person-head">
                    <span className="admin-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{item.name || "Unnamed"}</strong>
                    <RemoveButton
                      label="Remove executive"
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          executives: current.executives.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    />
                  </div>
                  <ImageField
                    label="Photo"
                    value={item.image}
                    onChange={(value) =>
                      updateExecutive(index, { image: value })
                    }
                    onUpload={(file) =>
                      uploadImage(file, (url) =>
                        updateExecutive(index, { image: url }),
                      )
                    }
                  />
                  <div className="admin-grid two">
                    <Field
                      label="Name"
                      value={item.name}
                      onChange={(value) =>
                        updateExecutive(index, { name: value })
                      }
                    />
                    <Field
                      label="Designation"
                      value={item.designation}
                      onChange={(value) =>
                        updateExecutive(index, { designation: value })
                      }
                    />
                    <Field
                      label="Student ID"
                      value={item.studentId}
                      onChange={(value) =>
                        updateExecutive(index, { studentId: value })
                      }
                    />
                    <Field
                      label="Batch"
                      value={item.batch}
                      onChange={(value) =>
                        updateExecutive(index, { batch: value })
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "leadership" && (
          <>
            <SectionHeader
              eyebrow="LEADERSHIP & COMMITTEES"
              title={leaderSection.title}
              description="Placeholders show on the website until you add people here."
              action={
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() =>
                    setContent((current) => ({
                      ...current,
                      leadership: {
                        ...current.leadership,
                        [leaderSlug]: [
                          ...people,
                          {
                            name: "",
                            designation: leaderSection.designation,
                            session: "",
                            image: "",
                          },
                        ],
                      },
                    }))
                  }
                >
                  <AdminIcon name="plus" /> Add person
                </button>
              }
            />
            <div className="admin-segment" role="tablist">
              {leadershipSections.map((section) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={section.slug === leaderSlug}
                  key={section.slug}
                  className={section.slug === leaderSlug ? "active" : ""}
                  onClick={() => setLeaderSlug(section.slug)}
                >
                  {section.title}
                  <em>{(content.leadership[section.slug] ?? []).length}</em>
                </button>
              ))}
            </div>
            {people.length === 0 && (
              <div className="admin-empty">
                No one added to {leaderSection.title} yet.
              </div>
            )}
            <div className="admin-people">
              {people.map((person, index) => (
                <article className="admin-card admin-person" key={index}>
                  <div className="admin-person-head">
                    <span className="admin-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{person.name || "Unnamed"}</strong>
                    <RemoveButton
                      label="Remove person"
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          leadership: {
                            ...current.leadership,
                            [leaderSlug]: people.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <ImageField
                    label="Photo"
                    value={person.image}
                    onChange={(value) =>
                      updatePerson(leaderSlug, index, { image: value })
                    }
                    onUpload={(file) =>
                      uploadImage(file, (url) =>
                        updatePerson(leaderSlug, index, { image: url }),
                      )
                    }
                  />
                  <div className="admin-grid two">
                    <Field
                      label="Name"
                      value={person.name}
                      onChange={(value) =>
                        updatePerson(leaderSlug, index, { name: value })
                      }
                    />
                    <Field
                      label="Designation"
                      value={person.designation}
                      onChange={(value) =>
                        updatePerson(leaderSlug, index, { designation: value })
                      }
                    />
                  </div>
                  <Field
                    label="Session"
                    value={person.session}
                    placeholder="e.g. 2022–23"
                    onChange={(value) =>
                      updatePerson(leaderSlug, index, { session: value })
                    }
                  />
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "archive" && (
          <>
            <SectionHeader
              eyebrow="COMMITTEE-WISE ARCHIVE"
              title="Year-wise records"
              description="Each session's committee appears as a table on the archive page."
              action={
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() => {
                    setContent((current) => ({
                      ...current,
                      archiveYears: [
                        { year: "New session", members: [] },
                        ...current.archiveYears,
                      ],
                    }))
                    setYearIndex(0)
                  }}
                >
                  <AdminIcon name="plus" /> Add year
                </button>
              }
            />
            <div className="admin-segment">
              {content.archiveYears.map((item, index) => (
                <button
                  type="button"
                  key={index}
                  className={index === safeYear ? "active" : ""}
                  onClick={() => setYearIndex(index)}
                >
                  {item.year || "Untitled"}
                  <em>{item.members.length}</em>
                </button>
              ))}
            </div>
            {!year ? (
              <div className="admin-empty">
                No sessions yet. Add a year to begin.
              </div>
            ) : (
              <div className="admin-card">
                <div className="admin-year-head">
                  <Field
                    label="Session / Year"
                    value={year.year}
                    onChange={(value) =>
                      updateYear(safeYear, (current) => ({
                        ...current,
                        year: value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="admin-link danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove ${year.year || "this session"} and all its members?`,
                        )
                      )
                        setContent((current) => ({
                          ...current,
                          archiveYears: current.archiveYears.filter(
                            (_, index) => index !== safeYear,
                          ),
                        }))
                    }}
                  >
                    <AdminIcon name="trash" /> Remove year
                  </button>
                </div>
                <div className="admin-table" role="table">
                  <div className="admin-table-row head" role="row">
                    <span>Name</span>
                    <span>Student ID</span>
                    <span>Batch</span>
                    <span>Designation</span>
                    <span />
                  </div>
                  {year.members.map((member, memberIndex) => (
                    <div
                      className="admin-table-row"
                      role="row"
                      key={memberIndex}
                    >
                      <input
                        aria-label="Name"
                        value={member.name}
                        placeholder="Name"
                        onChange={(event) =>
                          updateMember(safeYear, memberIndex, {
                            name: event.target.value,
                          })
                        }
                      />
                      <input
                        aria-label="Student ID"
                        value={member.studentId}
                        placeholder="ID"
                        onChange={(event) =>
                          updateMember(safeYear, memberIndex, {
                            studentId: event.target.value,
                          })
                        }
                      />
                      <input
                        aria-label="Batch"
                        value={member.batch}
                        placeholder="Batch"
                        onChange={(event) =>
                          updateMember(safeYear, memberIndex, {
                            batch: event.target.value,
                          })
                        }
                      />
                      <input
                        aria-label="Designation"
                        value={member.designation}
                        placeholder="Designation"
                        onChange={(event) =>
                          updateMember(safeYear, memberIndex, {
                            designation: event.target.value,
                          })
                        }
                      />
                      <RemoveButton
                        label="Remove member"
                        onClick={() =>
                          updateYear(safeYear, (current) => ({
                            ...current,
                            members: current.members.filter(
                              (_, index) => index !== memberIndex,
                            ),
                          }))
                        }
                      />
                    </div>
                  ))}
                  {year.members.length === 0 && (
                    <div className="admin-empty slim">
                      No members in this session yet.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() =>
                    updateYear(safeYear, (current) => ({
                      ...current,
                      members: [
                        ...current.members,
                        { name: "", designation: "", studentId: "", batch: "" },
                      ],
                    }))
                  }
                >
                  <AdminIcon name="plus" /> Add member
                </button>
              </div>
            )}
          </>
        )}

        <div className={dirty ? "admin-savebar dirty" : "admin-savebar"}>
          <div className="admin-savebar-status">
            <i />
            {status ? (
              <span className={`tone-${statusTone}`}>
                {statusTone === "info" && status.endsWith("…") && (
                  <EconomicsLoader variant="inline" />
                )}{" "}
                {status}
              </span>
            ) : (
              <span>
                {dirty ? "You have unsaved changes" : "Everything is saved"}
              </span>
            )}
          </div>
          <div className="admin-savebar-actions">
            {dirty && (
              <button
                type="button"
                className="admin-btn ghost"
                onClick={discard}
                disabled={busy}
              >
                Discard
              </button>
            )}
            <button
              type="button"
              className="admin-btn primary"
              onClick={save}
              disabled={busy || !dirty}
            >
              {busy ? (
                <>
                  <EconomicsLoader variant="inline" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
