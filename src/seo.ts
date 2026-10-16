const origin = "https://ebclubiiuc.netlify.app"
const homeTitle = "IIUC Economics & Banking Club | Learning, Leadership & Community"
const homeDescription = "Explore the Economics & Banking Club at International Islamic University Chittagong (IIUC): student activities, events, executive committee and membership."

/** Keep metadata accurate on client navigation as well as direct page loads. */
export function updatePageMetadata(pathname: string) {
  const isHome = pathname === "/"
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")
  const isArchive = pathname.startsWith("/leadership/")
  const title = isHome ? homeTitle : isAdmin
    ? "Admin | IIUC Economics & Banking Club"
    : isArchive ? "Leadership Archives | IIUC Economics & Banking Club"
    : "Page Not Found | IIUC Economics & Banking Club"
  const description = isHome ? homeDescription : isArchive
    ? "Leadership and committee archives of the Economics & Banking Club at IIUC. Records are being updated."
    : isAdmin ? "Club administration sign-in." : "This page is unavailable."
  document.title = title
  const setMeta = (attribute: "name" | "property", key: string, content: string) => {
    document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.setAttribute("content", content)
  }
  setMeta("name", "description", description)
  // Archive records still contain placeholders; enable indexing after publication.
  setMeta("name", "robots", isHome ? "index, follow, max-image-preview:large" : isArchive ? "noindex, follow" : "noindex, nofollow")
  setMeta("property", "og:title", title)
  setMeta("property", "og:description", description)
  setMeta("property", "og:url", `${origin}${pathname}`)
  setMeta("name", "twitter:title", title)
  setMeta("name", "twitter:description", description)
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", `${origin}${pathname}`)
}
