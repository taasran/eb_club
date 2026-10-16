import { useEffect, useState } from "react";
import AdminControls from "./AdminControls";

const { Button, Input, Label, Span, Div, Form, P, Strong } = AdminControls;
type Member = { email: string; role: "admin" | "moderator" };
type Request = (path: string, init?: RequestInit) => Promise<Response>;

export function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return <Div className="admin-field">
    <Label htmlFor="admin-password" className="admin-field-label">Password</Label>
    <Div className="flex items-center gap-2">
      <Input id="admin-password" type={visible ? "text" : "password"} value={value}
        autoComplete="current-password" onChange={event => onChange(event.target.value)}
        placeholder="Enter your password" required />
      <Button type="button" className="admin-btn ghost" aria-controls="admin-password"
        aria-pressed={visible} aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible(current => !current)}>{visible ? "Hide" : "Show"}</Button>
    </Div>
  </Div>;
}

export default function AdminAccess({ request, ownerEmail }: { request: Request; ownerEmail: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("moderator");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const load = async () => {
    const response = await request("/admin/team");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to load team access.");
    setMembers(body.members);
    setLoaded(true);
  };
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage(""); setError(false);
    try { await action(); }
    catch (error) { setError(true); setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    void perform(load);
  }, []);
  return <Div className="admin-stack">
    <Div className="admin-card">
      <Strong className="admin-card-title">Team access</Strong>
      <P className="admin-muted">Only you, the owner, can grant or revoke access. Admins can manage content and the private inbox. Moderators can edit website content and view traffic, but cannot access the inbox or manage the team.</P>
      <P className="admin-muted">Owner · {ownerEmail} — protected; cannot be removed.</P>
    </Div>
    <Form className="admin-card" onSubmit={event => {
      event.preventDefault();
      void perform(async () => {
        const response = await request("/admin/team", { method: "PUT", body: JSON.stringify({ email, role }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to grant access.");
        await load(); setEmail(""); setMessage("Access saved. They can sign in using this email after confirming their account.");
      });
    }}>
      <Label className="admin-field"><Span>Email address</Span>
        <Input type="email" required autoComplete="off" value={email} maxLength={250}
          placeholder="teammate@example.com" onChange={event => setEmail(event.target.value)} />
      </Label>
      <Div className="admin-segment" role="group" aria-label="Team role">
        {(["admin", "moderator"] as const).map(option =>
          <Button type="button" key={option} className={role === option ? "active" : ""}
            aria-pressed={role === option} onClick={() => setRole(option)}>{option === "admin" ? "Admin" : "Moderator"}</Button>)}
      </Div>
      <P className="admin-muted">Adding an existing email updates its role. This grants access only—not an account or an email invitation. Your teammate must create an account on the sign-in page and confirm their own email. Do not share passwords.</P>
      <Button className="admin-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Grant / update access"}</Button>
    </Form>
    {message && <Div className={`admin-status ${error ? "error" : "success"}`} role="status">{message}</Div>}
    <Div className="admin-card">
      <Button type="button" className="admin-btn ghost" disabled={busy}
        onClick={() => void perform(load)}>{loaded ? "Refresh team list" : "Load team list"}</Button>
      {loaded && members.length === 0 && <P className="admin-muted">No additional admins or moderators yet.</P>}
      {members.map(member => <Div className="flex flex-wrap items-center justify-between gap-3" key={member.email}>
        <Div className="min-w-0 break-words"><Strong>{member.email}</Strong><P className="admin-muted">{member.role === "admin" ? "Admin" : "Moderator"}</P></Div>
        <Button type="button" className="admin-btn ghost" disabled={busy}
          aria-label={`Remove access for ${member.email}`}
          onClick={() => {
            if (!window.confirm(`Remove dashboard access for ${member.email}?`)) return;
            void perform(async () => {
              const response = await request(`/admin/team/${encodeURIComponent(member.email)}`, { method: "DELETE" });
              const body = await response.json();
              if (!response.ok) throw new Error(body.error ?? "Unable to remove access.");
              await load(); setMessage("Access removed. Further admin requests from this account will be denied.");
            });
          }}>Remove access</Button>
      </Div>)}
    </Div>
  </Div>;
}
