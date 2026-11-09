type Configuration = { siteKey?: string; secretKey?: string }
type Action = "join" | "newsletter"

export class TurnstileError extends Error {
  constructor(message: string, public status: 400 | 503 = 400) {
    super(message)
  }
}

export function createTurnstile({
  config,
  request = fetch,
}: {
  config: () => Configuration
  request?: typeof fetch
}) {
  const configuration = () => {
    const { siteKey: rawSiteKey, secretKey: rawSecret } = config()
    const siteKey = rawSiteKey?.trim()
    const secretKey = rawSecret?.trim()
    if (!siteKey && !secretKey) return null
    if (!siteKey || !secretKey || !/^[a-zA-Z0-9_-]{1,256}$/.test(siteKey)) {
      throw new TurnstileError("Form verification is not configured correctly. Please contact the club.", 503)
    }
    return { siteKey, secretKey }
  }
  return {
    publicConfig() {
      const active = configuration()
      return { required: !!active, siteKey: active?.siteKey ?? null }
    },
    async verify(token: unknown, action: Action) {
      const active = configuration()
      // Rate limiting remains active when Turnstile has not been configured.
      if (!active) return
      if (typeof token !== "string" || !token || token.length > 2048) {
        throw new TurnstileError("Please complete the security check and try again.")
      }
      let response: Response
      let result: Record<string, unknown>
      try {
        response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ secret: active.secretKey, response: token }),
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        })
        result = await response.json()
      } catch {
        throw new TurnstileError("Security verification is temporarily unavailable. Please try again.", 503)
      }
      if (!response.ok || !result || typeof result !== "object") {
        throw new TurnstileError("Security verification is temporarily unavailable. Please try again.", 503)
      }
      if (result.success !== true || result.hostname !== "ebclub.iiuc.ac.bd" || result.action !== action) {
        throw new TurnstileError("The security check expired or could not be verified. Please try again.")
      }
    },
  }
}
