import { useEffect, useState } from "react"
import AdminControls from "./AdminControls"

const { Button, Div, P, Strong, Span, Small } = AdminControls
type Account = {
  userId: string
  email: string
  name: string
  matricId: string
  batch: string
  role: "admin" | "moderator" | null
  status: "pending" | "approved" | "removed"
  emailConfirmed: boolean
  createdAt: string
}
type Request = (path: string, init?: RequestInit) => Promise<Response>

export default function AdminAccess({
  request,
  ownerEmail,
}: {
  request: Request
  ownerEmail: string
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filter, setFilter] = useState<"pending" | "approved" | "all">(
    "pending",
  )
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)
  const load = async () => {
    const response = await request("/admin/team")
    const body = await response.json().catch(() => null)
    if (!response.ok)
      throw new Error(body?.error ?? "Unable to load account requests.")
    if (!Array.isArray(body?.accounts))
      throw new Error(
        "Deploy the latest backend to load the new account approval system.",
      )
    setAccounts(body.accounts)
    setLoaded(true)
  }
  const perform = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setMessage("")
    setFailed(false)
    try {
      await action()
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void perform(load)
  }, [])
  const approve = (account: Account, role: "admin" | "moderator") => {
    if (
      !window.confirm(
        `Approve ${account.name || account.email} as ${role}? Review their identity details before continuing.`,
      )
    )
      return
    void perform(async () => {
      const response = await request("/admin/team", {
        method: "PUT",
        body: JSON.stringify({ userId: account.userId, role }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(body?.error ?? "Unable to approve this account.")
      await load()
      setMessage(
        `Approved as ${role}. They can sign in with the email and password they registered. Email confirmation is still required when enabled in Supabase.`,
      )
    })
  }
  const remove = (account: Account) => {
    if (
      !window.confirm(
        `Permanently delete ${account.email}'s Auth account and revoke dashboard access? This cannot be undone. Their posts/content will not be deleted.`,
      )
    )
      return
    void perform(async () => {
      const response = await request(
        `/admin/team/${encodeURIComponent(account.userId)}`,
        { method: "DELETE" },
      )
      const body = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(body?.error ?? "Unable to delete this account.")
      await load()
      setMessage("Account deleted and dashboard access revoked.")
    })
  }
  const pending = accounts.filter(
    (account) => account.status === "pending",
  ).length
  const visible = accounts.filter(
    (account) => filter === "all" || account.status === filter,
  )
  return (
    <Div className="admin-stack">
      <Div className="admin-card">
        <Strong className="admin-card-title">
          Account requests & approvals
        </Strong>
        <P className="admin-muted">
          New users register their name, Matric ID, email, batch and password.
          Review their details here, then approve them as an admin or moderator,
          or delete the account. Passwords are never shown or stored in this
          review list.
        </P>
        <P className="admin-muted">
          Owner · {ownerEmail} — protected. Only the owner can review accounts.
          Profile details are self-reported; verify them before granting access.
        </P>
        <Div className="flex flex-wrap items-center justify-between gap-3">
          <Div
            className="admin-segment"
            role="group"
            aria-label="Account status"
          >
            {(["pending", "approved", "all"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                aria-pressed={filter === option}
                className={filter === option ? "active" : ""}
                onClick={() => setFilter(option)}
              >
                {option === "pending"
                  ? `Pending (${pending})`
                  : option === "approved"
                    ? "Approved"
                    : "All accounts"}
              </Button>
            ))}
          </Div>
          <Button
            type="button"
            className="admin-btn ghost"
            disabled={busy}
            onClick={() => void perform(load)}
          >
            {busy ? "Loading…" : "Refresh requests"}
          </Button>
        </Div>
      </Div>
      {message && (
        <Div
          className={`admin-status ${failed ? "error" : "success"}`}
          role="status"
        >
          {message}
        </Div>
      )}
      {loaded && visible.length === 0 && (
        <Div className="admin-empty">
          {filter === "pending"
            ? "No pending requests. New registrations will appear here."
            : "No accounts in this view."}
        </Div>
      )}
      {visible.map((account) => (
        <Div className="admin-card" key={account.userId}>
          <Div className="flex flex-wrap items-center justify-between gap-3">
            <Strong className="admin-card-title">
              {account.name || "Existing account"}
            </Strong>
            <Span className="admin-badge">
              {account.status === "approved"
                ? `Approved · ${account.role}`
                : account.status === "removed"
                  ? "Access removed · deletion needs retry"
                  : "Pending owner approval"}
            </Span>
          </Div>
          <Div className="admin-grid two">
            <P className="admin-muted">
              <Strong>Email</Strong>
              <Span className="block break-words">{account.email}</Span>
            </P>
            <P className="admin-muted">
              <Strong>Matric ID</Strong>
              <Span className="block">
                {account.matricId || "Not provided (existing account)"}
              </Span>
            </P>
            <P className="admin-muted">
              <Strong>Batch</Strong>
              <Span className="block">
                {account.batch || "Not provided (existing account)"}
              </Span>
            </P>
            <P className="admin-muted">
              <Strong>Email verification</Strong>
              <Span className="block">
                {account.emailConfirmed ? "Confirmed" : "Confirmation pending"}
              </Span>
            </P>
          </Div>
          <Small className="admin-muted">
            Registered {new Date(account.createdAt).toLocaleString()}
          </Small>
          <Div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="admin-btn primary"
              disabled={
                busy ||
                (account.status === "approved" && account.role === "admin")
              }
              onClick={() => approve(account, "admin")}
            >
              {account.status === "approved"
                ? "Set as admin"
                : "Approve as admin"}
            </Button>
            <Button
              type="button"
              className="admin-btn ghost"
              disabled={
                busy ||
                (account.status === "approved" && account.role === "moderator")
              }
              onClick={() => approve(account, "moderator")}
            >
              {account.status === "approved"
                ? "Set as moderator"
                : "Approve as moderator"}
            </Button>
            <Button
              type="button"
              className="admin-link danger"
              disabled={busy}
              onClick={() => remove(account)}
            >
              {account.status === "pending"
                ? "Reject & delete account"
                : "Delete account"}
            </Button>
          </Div>
        </Div>
      ))}
    </Div>
  )
}
