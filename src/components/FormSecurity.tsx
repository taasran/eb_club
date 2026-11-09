import { useEffect, useRef, useState } from "react"
import AdminControls from "../AdminControls"
import { serverUrl, publicAnonKey } from "../supabase"

const { Div, P, Button } = AdminControls
export type FormGuard = {
  status: "loading" | "off" | "required" | "error"
  token: string
}
type Policy = { required: boolean; siteKey: string | null }
type TurnstileAPI = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

let scriptRequest: Promise<TurnstileAPI> | undefined
const api = () => (window as unknown as { turnstile?: TurnstileAPI }).turnstile

async function loadPolicy(): Promise<Policy> {
  const response = await fetch(`${serverUrl}/public/form-security`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || typeof body?.required !== "boolean" ||
    (body.required && (typeof body.siteKey !== "string" || !body.siteKey))) {
    throw new Error("Form security is unavailable. Refresh the page or try again later.")
  }
  return body as Policy
}

function loadScript(): Promise<TurnstileAPI> {
  const ready = api()
  if (ready) return Promise.resolve(ready)
  if (scriptRequest) return scriptRequest
  scriptRequest = new Promise<TurnstileAPI>((resolve, reject) => {
    const script = document.createElement("script")
    const timer = window.setTimeout(() => fail(), 15000)
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error("The security check could not load. Check your connection and try again."))
    }
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.onload = () => {
      window.clearTimeout(timer)
      const loaded = api()
      if (loaded) resolve(loaded)
      else fail()
    }
    script.onerror = fail
    document.head.appendChild(script)
  }).catch((error) => {
    scriptRequest = undefined
    throw error
  })
  return scriptRequest
}

export default function FormSecurity({
  action,
  resetKey,
  onChange,
}: {
  action: "join" | "newsletter"
  resetKey: number
  onChange: (guard: FormGuard) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onChange)
  callback.current = onChange
  const [message, setMessage] = useState("Checking form security…")
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let widget: string | undefined
    let client: TurnstileAPI | undefined
    callback.current({ status: "loading", token: "" })
    setFailed(false)
    setMessage("Checking form security…")
    const reportError = () => {
      if (cancelled) return
      setFailed(true)
      setMessage("The security check could not be completed. Please retry.")
      callback.current({ status: "error", token: "" })
    }
    void loadPolicy().then(async (policy) => {
      if (cancelled) return
      if (!policy.required) {
        setMessage("")
        callback.current({ status: "off", token: "" })
        return
      }
      client = await loadScript()
      if (cancelled || !container.current) return
      callback.current({ status: "required", token: "" })
      setMessage("Please complete the security check.")
      widget = client.render(container.current, {
        sitekey: policy.siteKey,
        action,
        theme: "auto",
        size: "compact",
        "response-field": false,
        callback: (token: string) => {
          if (cancelled) return
          setMessage("Security check complete.")
          setFailed(false)
          callback.current({ status: "required", token })
        },
        "expired-callback": () => {
          if (cancelled) return
          setMessage("Security check expired. Please verify again.")
          callback.current({ status: "required", token: "" })
        },
        "error-callback": reportError,
        "timeout-callback": reportError,
      })
    }).catch(reportError)
    return () => {
      cancelled = true
      if (widget !== undefined) client?.remove(widget)
    }
  }, [action, resetKey, attempt])

  return (
    <Div className="grid gap-2">
      <Div ref={container} />
      {message && <P className="form-note" role="status">{message}</P>}
      {failed && (
        <Button type="button" className="text-link" onClick={() => setAttempt((value) => value + 1)}>
          Retry security check
        </Button>
      )}
    </Div>
  )
}
