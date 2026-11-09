const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  Vary: "Authorization",
}
const json = (statusCode, value) => ({
  statusCode,
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(value),
})

// Cloudflare and Make preview share this core. Authorization is rechecked for
// every download, including after an account has been revoked.
export async function serveProjectSource(event, { info, archive, request = fetch } = {}) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" }
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." })
  const authorization = event.headers?.authorization ?? event.headers?.Authorization ?? ""
  if (!/^Bearer\s+\S+$/i.test(authorization) || authorization.length > 8200) {
    return json(401, { error: "Sign in to download project code." })
  }
  try {
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/make-server-[a-f0-9]+$/.test(info?.serverUrl ?? "")) {
      return json(503, { error: "Source download service is not configured." })
    }
    const access = await request(`${info.serverUrl}/admin/session`, {
      headers: { Authorization: authorization },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    })
    if (!access.ok) {
      const status = [401, 403, 429].includes(access.status) ? access.status : 503
      const response = json(status, {
        error: status === 401 ? "Your session has expired. Sign in again."
          : status === 403 ? "Only approved club admins and moderators can download project code."
          : status === 429 ? "Too many requests. Please wait before downloading again."
          : "Unable to verify download access. Try again.",
      })
      if (status === 429) {
        const retry = access.headers.get("Retry-After")
        response.headers["Retry-After"] = /^\d{1,6}$/.test(retry ?? "") ? retry : "60"
      }
      return response
    }
    const session = await access.json()
    if (!["owner", "admin", "moderator"].includes(session?.role)) {
      return json(403, { error: "This account cannot download project code." })
    }
    if (event.queryStringParameters?.metadata === "1") {
      const { generatedAt, backendVersion, sha256, files } = info
      return json(200, { generatedAt, backendVersion, sha256, files })
    }
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="eb-club-latest-source.zip"',
      },
      body: archive(),
      isBase64Encoded: true,
    }
  } catch {
    return json(503, { error: "Project code is temporarily unavailable. Check the protected download deployment and try again." })
  }
}
