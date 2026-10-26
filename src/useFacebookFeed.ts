import { useEffect, useState } from "react"
import {
  readFacebookFeed,
  facebookRefreshInterval,
  type FacebookFeed,
} from "./facebookClient"
import { serverUrl, publicAnonKey } from "./supabase"

export default function useFacebookFeed() {
  const [state, setState] = useState<{
    feed: FacebookFeed | null
    loading: boolean
    failed: boolean
  }>({ feed: null, loading: true, failed: false })

  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    const refresh = async () => {
      if (controller) return
      const current = new AbortController()
      controller = current
      const timeout = window.setTimeout(() => current.abort(), 15000)
      try {
        const feed = await readFacebookFeed(
          serverUrl,
          publicAnonKey,
          current.signal,
        )
        if (active) setState({ feed, loading: false, failed: false })
      } catch {
        // Preserve the last successful cards on a temporary connection failure.
        if (active)
          setState((previous) => ({
            ...previous,
            loading: false,
            failed: true,
          }))
      } finally {
        window.clearTimeout(timeout)
        controller = undefined
      }
    }
    const refreshVisible = () => {
      if (!document.hidden) void refresh()
    }
    void refresh()
    const timer = window.setInterval(refreshVisible, facebookRefreshInterval)
    window.addEventListener("focus", refreshVisible)
    document.addEventListener("visibilitychange", refreshVisible)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshVisible)
      document.removeEventListener("visibilitychange", refreshVisible)
    }
  }, [])

  return state
}
