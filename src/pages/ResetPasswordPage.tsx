import { useEffect, useState } from "react"
import AdminControls from "../AdminControls"
import { supabase } from "../supabase"
import PasswordField from "../admin/PasswordField"
import ThemeToggle from "../components/ThemeToggle"
import { saveResetPassword } from "../admin/onboarding"

const { Main, Section, P, H2, Form, Button, Div, Link } = AdminControls

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => {
    let active = true
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        setValid(!error && Boolean(data.session))
        setChecking(false)
        if (error || !data.session)
          setMessage(
            "This reset link is invalid or expired. Request a new link from Forgot password.",
          )
      })
      .catch(() => {
        if (active) {
          setChecking(false)
          setMessage("Unable to check this reset link. Please try again.")
        }
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <Main className="admin-page">
      <Section className="admin-login">
        <ThemeToggle className="recovery-theme" />
        <P className="admin-eyebrow">ACCOUNT RECOVERY</P>
        <H2>Set a new password.</H2>
        <P className="admin-muted">
          This changes your own password, not your dashboard approval or role.
        </P>
        {checking ? (
          <P role="status">Checking your reset link…</P>
        ) : done ? (
          <Div className="admin-status success" role="status">
            Password updated. Return to sign in with your new password.
          </Div>
        ) : (
          valid && (
            <Form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (busy) return
                setBusy(true)
                setMessage("")
                void saveResetPassword(supabase.auth, password, confirmation)
                  .then(async () => {
                    setDone(true)
                    setPassword("")
                    setConfirmation("")
                    await supabase.auth.signOut({ scope: "local" })
                  })
                  .catch((error) =>
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Unable to reset password.",
                    ),
                  )
                  .finally(() => setBusy(false))
              }}
            >
              <PasswordField
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-new-password"
                label="Confirm password"
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="new-password"
              />
              <Button
                className="admin-btn primary block"
                disabled={busy}
                type="submit"
              >
                {busy ? "Updating…" : "Update password"}
              </Button>
            </Form>
          )
        )}
        {message && (
          <P className="admin-status error" role="status">
            {message}
          </P>
        )}
        <Link className="admin-btn ghost block" href="/admin">
          Back to sign in
        </Link>
      </Section>
    </Main>
  )
}
