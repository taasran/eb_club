import assert from "node:assert/strict"
import { serveProjectSource as serve } from "../netlify/lib/project-source.mjs"

const info = {
  serverUrl:
    "https://testproject.supabase.co/functions/v1/make-server-ad6cf477",
  generatedAt: "2026-10-17",
  backendVersion: "club-admin-v3",
  sha256: "a".repeat(64),
  files: 80,
}
let binaryReads = 0
let verifiedHeaders
const archive = Buffer.from("test-private-archive")
const read = () => {
  binaryReads++
  return archive.toString("base64")
}
const serveProjectSource = (event, { request, info: override } = {}) =>
  serve(event, { info: override ?? info, archive: read, request })
const event = {
  httpMethod: "GET",
  headers: { authorization: "Bearer test-session" },
  queryStringParameters: {},
}
const requestFor =
  (role, status = 200) =>
  async (url, options) => {
    assert.equal(url, `${info.serverUrl}/admin/session`)
    verifiedHeaders = options.headers
    return new Response(JSON.stringify({ role }), { status })
  }
assert.equal(
  (
    await serveProjectSource({ ...event, headers: {} }, {
      read,
      request: requestFor("admin"),
    })
  ).statusCode,
  401,
)
assert.equal(binaryReads, 0)
for (const status of [401, 403]) {
  const response = await serveProjectSource(event, {
    read,
    request: requestFor(null, status),
  })
  assert.equal(response.statusCode, status)
}
assert.equal(
  (await serveProjectSource(event, { read, request: requestFor("pending") }))
    .statusCode,
  403,
)
assert.equal(binaryReads, 0)
for (const role of ["owner", "admin", "moderator"]) {
  const response = await serveProjectSource(event, {
    read,
    request: requestFor(role),
  })
  assert.equal(response.statusCode, 200)
  assert.equal(response.isBase64Encoded, true)
  assert.deepEqual(Buffer.from(response.body, "base64"), archive)
  assert.match(response.headers["Cache-Control"], /no-store/)
  assert.equal(verifiedHeaders.Authorization, event.headers.authorization)
}
const metadata = await serveProjectSource(
  { ...event, queryStringParameters: { metadata: "1" } },
  { read, request: requestFor("moderator") },
)
assert.equal(metadata.statusCode, 200)
assert.equal(JSON.parse(metadata.body).backendVersion, "club-admin-v3")
assert.equal(JSON.parse(metadata.body).serverUrl, undefined)
const readsBeforeRevocation = binaryReads
assert.equal(
  (await serveProjectSource(event, { read, request: requestFor(null, 403) }))
    .statusCode,
  403,
)
assert.equal(binaryReads, readsBeforeRevocation)
assert.equal(
  (
    await serveProjectSource(event, {
      read,
      request: async () => {
        throw new Error("Offline")
      },
    })
  ).statusCode,
  503,
)
assert.equal(
  (await serveProjectSource({ httpMethod: "OPTIONS" })).statusCode,
  204,
)
assert.equal((await serveProjectSource({ httpMethod: "POST" })).statusCode, 405)
let invalidTargetRequested = false
const invalidTarget = await serveProjectSource(event, {
  info: { ...info, serverUrl: "http://untrusted.example" },
  request: async () => {
    invalidTargetRequested = true
  },
})
assert.equal(invalidTarget.statusCode, 503)
assert.equal(invalidTargetRequested, false)
console.log(
  "PASS: source download denies anonymous/pending/revoked users, allows verified owner/admin/moderator, rechecks grants, and never publicly caches ZIPs.",
)
