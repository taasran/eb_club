import { supabase } from "../supabase"
import { adminSignInUrl } from "./onboarding"

// The Make dev server serves the same protected endpoint (see vite.config.ts),
// so the preview downloads current code; production uses the Netlify function.
// `env` is absent when Node tests import this module outside Vite.
const endpoint = import.meta.env?.DEV
  ? "/.netlify/functions/project-source"
  : new URL("/api/project-source", adminSignInUrl).toString()

export async function requestProjectSource(
  metadata = false,
): Promise<Response> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session)
    throw new Error(
      "Sign in as an approved admin or moderator to download project code.",
    )
  const response = await fetch(`${endpoint}${metadata ? "?metadata=1" : ""}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  })
  if (
    !response.ok ||
    !response.headers
      .get("content-type")
      ?.includes(metadata ? "application/json" : "application/zip")
  ) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error ??
        "The protected download service is not ready. Deploy the latest frontend and Netlify function first.",
    )
  }
  return response
}

export async function downloadProjectSource() {
  const response = await requestProjectSource()
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = "eb-club-latest-source.zip"
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
