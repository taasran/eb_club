import { useState } from "react"
import AdminControls from "../AdminControls"
import { supabase } from "../supabase"
import PasswordField from "./PasswordField"
import ThemeToggle from "../components/ThemeToggle"
import Icon from "../components/Icon"
import AuthAtmosphere from "./AuthAtmosphere"
import {
  adminSignInUrl,
  normalizeAdminEmail,
  registerAccount,
  requestPasswordReset,
} from "./onboarding"

const {
  Main,
  Aside,
  Link,
  Img,
  Span,
  Small,
  Div,
  P,
  H1,
  Em,
  Section,
  Form,
  H2,
  Label,
  Input,
  Button,
} = AdminControls
type AuthResult = {
  ok: boolean
  error?: string
}

export default function AdminAuth({
  onAuthenticated,
  initialStatus = "",
}: {
  onAuthenticated: () => Promise<AuthResult>
  initialStatus?: string
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin")
  const [name, setName] = useState("")
  const [matricId, setMatricId] = useState("")
  const [email, setEmail] = useState("")
  const [batch, setBatch] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(initialStatus)
  const [failed, setFailed] = useState(Boolean(initialStatus))
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [motionPaused, setMotionPaused] = useState(false)

  const changeMode = (next: typeof mode) => {
    setMode(next)
    setMessage("")
    setFailed(false)
    setNeedsConfirmation(false)
    setPassword("")
    setConfirmation("")
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
  return (
    <Main
      className={`admin-shell admin-auth${
        motionPaused ? " auth-motion-paused" : ""
      }`}
    >
      <Aside className="admin-auth-brand">
        <Link href="/" className="admin-brand light">
          <Img src="/images/club-logo.png" alt="" />
          <Span>
            Economics & Banking Club<Small>IIUC · ADMIN</Small>
          </Span>
        </Link>
        <Div className="auth-brand-story">
          <P className="admin-eyebrow light">
            <Span className="auth-live-dot" /> THE CLUB. THE PEOPLE. THE NEXT
            CHAPTER.
          </P>
          <H1>
            Keep the club's story <Em>current.</Em>
          </H1>
          <P>
            Create an account, let the owner review your details, and help keep
            the club moving forward.
          </P>
        </Div>
        <AuthAtmosphere />
        <Div className="auth-brand-footer">
          <Small>
            <Icon name="shield" /> Registration alone never grants dashboard
            access.
          </Small>
          <Button
            type="button"
            className="auth-motion-toggle"
            onClick={() => setMotionPaused((paused) => !paused)}
            aria-label={
              motionPaused
                ? "Resume ambient animation"
                : "Pause ambient animation"
            }
          >
            <Icon name={motionPaused ? "play" : "pause"} />
            {motionPaused ? "Motion off" : "Motion on"}
          </Button>
        </Div>
      </Aside>
      <Section className="admin-auth-form">
        <Div className="auth-toolbar">
          <Link href="/" className="auth-back-link">
            <Icon name="arrow" /> Back to website
          </Link>
          <ThemeToggle />
        </Div>
        <Form
          className="auth-access-card"
          onSubmit={(event) => {
            event.preventDefault()
            void perform(async () => {
              if (mode === "signup") {
                await registerAccount(
                  supabase.auth,
                  { name, matricId, email, batch },
                  password,
                  confirmation,
                )
                setPassword("")
                setConfirmation("")
                setMode("signin")
                setMessage(
                  "Registration submitted. The owner can review your details under Account requests. Wait for approval, and confirm your email if Supabase sends a confirmation. Already registered? Sign in or use Forgot password.",
                )
              } else if (mode === "forgot") {
                await requestPasswordReset(supabase.auth, email)
                setMessage(
                  "If this email has an account, a password-reset email has been requested. Check your inbox and spam folder. Resetting a password does not bypass owner approval.",
                )
              } else {
                const { error } = await supabase.auth.signInWithPassword({
                  email: normalizeAdminEmail(email),
                  password,
                })
                if (error) {
                  setNeedsConfirmation(error.code === "email_not_confirmed")
                  throw new Error(error.message)
                }
                setNeedsConfirmation(false)
                const result = await onAuthenticated()
                if (!result.ok)
                  throw new Error(
                    result.error ?? "Your account is awaiting owner approval.",
                  )
                setPassword("")
              }
            })
          }}
        >
          <Div className="auth-form-symbol">
            <Icon name="shield" />
          </Div>
          <P className="admin-eyebrow">
            CLUB DASHBOARD{" "}
            <Span className="auth-access-label">MEMBER ACCESS</Span>
          </P>
          <H2>
            {mode === "signup"
              ? "Request an account."
              : mode === "forgot"
                ? "Forgot your password?"
                : "Welcome back."}
          </H2>
          <P className="admin-muted">
            {mode === "signup"
              ? "Tell us who you are. The owner will review your request before you can enter."
              : mode === "forgot"
                ? "Enter the email you used when creating your account."
                : "Use the email and password you registered with. New accounts need owner approval."}
          </P>
          {mode === "signup" && (
            <>
              <Label className="admin-field">
                <Span>Full name</Span>
                <Input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Label>
              <Label className="admin-field">
                <Span>Matric ID</Span>
                <Input
                  required
                  maxLength={40}
                  value={matricId}
                  placeholder="e.g. EB253022"
                  onChange={(event) => setMatricId(event.target.value)}
                />
              </Label>
              <Label className="admin-field">
                <Span>Batch</Span>
                <Input
                  required
                  maxLength={50}
                  value={batch}
                  placeholder="e.g. 26th"
                  onChange={(event) => setBatch(event.target.value)}
                />
              </Label>
            </>
          )}
          <Label className="admin-field">
            <Span>Email</Span>
            <Input
              required
              type="email"
              maxLength={250}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Label>
          {mode !== "forgot" && (
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          )}
          {mode === "signup" && (
            <>
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="new-password"
              />
              <P className="admin-muted">
                Use at least 8 characters. Your password is managed by Supabase
                Auth and is never shown to the owner. Profile details are
                self-reported and subject to review.
              </P>
            </>
          )}
          <Button
            type="submit"
            className="admin-btn primary block"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account & request approval"
                : mode === "forgot"
                  ? "Send password-reset email"
                  : "Sign in"}
          </Button>
          {message && (
            <Div
              className={`admin-status ${failed ? "error" : "success"}`}
              role="status"
            >
              {message}
            </Div>
          )}
          {mode === "signin" && (
            <Button
              type="button"
              className="admin-link"
              disabled={busy}
              onClick={() => changeMode("forgot")}
            >
              Forgot password?
            </Button>
          )}
          {needsConfirmation && (
            <Button
              type="button"
              className="admin-btn ghost block"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  const { error } = await supabase.auth.resend({
                    type: "signup",
                    email: normalizeAdminEmail(email),
                    options: { emailRedirectTo: adminSignInUrl },
                  })
                  if (error) throw new Error(error.message)
                  setMessage(
                    "Confirmation email requested. Check your inbox and spam folder.",
                  )
                })
              }
            >
              Resend confirmation email
            </Button>
          )}
          <Div className="admin-divider">
            <Span>
              {mode === "signin" ? "New here?" : "Already have an account?"}
            </Span>
          </Div>
          <Button
            type="button"
            className="admin-btn ghost block"
            disabled={busy}
            onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create account" : "Back to sign in"}
          </Button>
          <P className="auth-security-note">
            <Icon name="shield" /> Secure sign-in. Owner-approved access.
          </P>
        </Form>
        <P className="auth-form-footer">
          Economics & Banking Club <Span>·</Span> IIUC
        </P>
      </Section>
    </Main>
  )
}
