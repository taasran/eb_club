import { useEffect, useState } from "react"
import { readContent, type SiteContent } from "./contentClient"
import { serverUrl, publicAnonKey } from "./supabase"

export const contentUpdatedEvent = "eb-content-published"
export const contentUpdatedKey = "eb-content-updated"

export function announceContentUpdate() {
  window.dispatchEvent(new Event(contentUpdatedEvent))
  try {
    localStorage.setItem(contentUpdatedKey, `${Date.now()}-${Math.random()}`)
  } catch {
    /* Focus and interval refresh still work when storage is unavailable. */
  }
}

export function useSiteContentState() {
  const [content, setContent] = useState<Partial<SiteContent>>({})
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    const refresh = () => {
      controller?.abort()
      const current = new AbortController()
      controller = current
      void readContent(serverUrl, publicAnonKey, current.signal)
        .then((saved) => {
          if (active && !current.signal.aborted) {
            setContent(saved ?? {})
            setStatus("ready")
          }
        })
        .catch(() => {
          if (active && !current.signal.aborted) setStatus("error")
          // Keep the last successful content during connection failures.
        })
    }
    const refreshVisible = () => {
      if (!document.hidden) refresh()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === contentUpdatedKey) refreshVisible()
    }
    refresh()
    window.addEventListener("focus", refreshVisible)
    window.addEventListener(contentUpdatedEvent, refreshVisible)
    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", refreshVisible)
    const timer = window.setInterval(refreshVisible, 30000)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshVisible)
      window.removeEventListener(contentUpdatedEvent, refreshVisible)
      window.removeEventListener("storage", onStorage)
      document.removeEventListener("visibilitychange", refreshVisible)
    }
  }, [])
  return { content, status }
}

export default function useSiteContent() {
  return useSiteContentState().content
}
