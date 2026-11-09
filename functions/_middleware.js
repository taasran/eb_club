const legacyHostname = "ebclubiiuc.pages.dev"
const canonicalOrigin = "https://ebclub.iiuc.ac.bd"
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  "Content-Security-Policy-Report-Only": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self' https://ywwyzqlqmpcosiuszowt.supabase.co; frame-src https://www.facebook.com https://web.facebook.com; object-src 'none'; base-uri 'self'",
}

export async function onRequest(context) {
  const { request } = context
  const source = new URL(request.url)
  // Only the production Pages alias redirects. Custom domains and previews pass through.
  if (source.hostname !== legacyHostname) {
    const upstream = await context.next()
    const response = new Response(upstream.body, upstream)
    // Pages _headers is not guaranteed on Function responses. Preserve stricter API policies.
    for (const [name, value] of Object.entries(securityHeaders)) {
      if (!response.headers.has(name)) response.headers.set(name, value)
    }
    if (source.pathname === "/admin" || source.pathname.startsWith("/admin/")) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow")
    } else if (source.pathname.startsWith("/leadership/")) {
      response.headers.set("X-Robots-Tag", "noindex, follow")
    }
    return response
  }

  const destination = new URL(canonicalOrigin)
  destination.pathname = source.pathname
  destination.search = source.search
  destination.hash = source.hash
  return new Response(null, {
    status: request.method === "GET" || request.method === "HEAD" ? 301 : 308,
    headers: {
      Location: destination.href,
      // Recovery links may contain one-use codes; do not cache their destinations.
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
