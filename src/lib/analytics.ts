import { serverUrl, publicAnonKey } from "../supabase"

// A browser-local daily estimate, not audited unique-person analytics.
let visitTracked = false

export default function trackVisit() {
  if (visitTracked) return
  visitTracked = true
  if (
    typeof window === "undefined" ||
    window.location.pathname.startsWith("/admin")
  )
    return
  const today = new Date(Date.now() + 6 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)
  let newVisitor = false
  try {
    newVisitor = localStorage.getItem("eb-last-visit") !== today
    localStorage.setItem("eb-last-visit", today)
  } catch {
    /* storage unavailable */
  }
  fetch(`${serverUrl}/public/visit`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ newVisitor, path: window.location.pathname }),
  }).catch(() => undefined)
}
