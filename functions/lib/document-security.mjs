export function documentPolicy(nonce) {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https: data: blob:",
    "connect-src 'self' https://ywwyzqlqmpcosiuszowt.supabase.co wss://ywwyzqlqmpcosiuszowt.supabase.co https://challenges.cloudflare.com",
    "frame-src https://www.facebook.com https://web.facebook.com https://challenges.cloudflare.com",
    "media-src 'self' https: blob:",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ")
}

export function secureDocument(response) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0")).join("")
  const secured = new Response(response.body, response)
  secured.headers.set("Content-Security-Policy", documentPolicy(nonce))
  secured.headers.delete("Content-Security-Policy-Report-Only")
  secured.headers.set("Cache-Control", "no-store")
  secured.headers.delete("ETag")
  secured.headers.delete("Content-Length")
  return new HTMLRewriter().on("script", {
    element(element) { element.setAttribute("nonce", nonce) },
  }).transform(secured)
}
