export type Theme = "light" | "dark"

export const themeStorageKey = "eb-club-theme"
const themeEvent = "eb-club-theme-change"
let sessionPreference: Theme | null = null

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

function savedTheme(): Theme | null {
  if (sessionPreference) return sessionPreference
  try {
    const value = window.localStorage.getItem(themeStorageKey)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function preferredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return (
    savedTheme() ??
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
  )
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light"
  const current = document.documentElement?.dataset.theme
  return isTheme(current) ? current : preferredTheme()
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.theme = theme
  const chrome = getComputedStyle(document.documentElement)
    .getPropertyValue("--browser-chrome")
    .trim()
  if (chrome)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", chrome)
}

export function initializeTheme() {
  applyTheme(preferredTheme())
}

export function changeTheme(theme: Theme) {
  sessionPreference = theme
  try {
    window.localStorage.setItem(themeStorageKey, theme)
  } catch {
    // The switch still works for this tab when browser storage is unavailable.
  }
  applyTheme(theme)
  window.dispatchEvent(new Event(themeEvent))
}

export function subscribeTheme(listener: () => void) {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)")
  const sync = () => {
    applyTheme(preferredTheme())
    listener()
  }
  const onSystemChange = () => {
    if (!savedTheme()) sync()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return
    sessionPreference = isTheme(event.newValue) ? event.newValue : null
    sync()
  }
  window.addEventListener(themeEvent, listener)
  window.addEventListener("storage", onStorage)
  media?.addEventListener("change", onSystemChange)
  return () => {
    window.removeEventListener(themeEvent, listener)
    window.removeEventListener("storage", onStorage)
    media?.removeEventListener("change", onSystemChange)
  }
}
