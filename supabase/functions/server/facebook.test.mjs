import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const source = readFileSync(new URL("./facebook.ts", import.meta.url), "utf8")
const { outputText, diagnostics } = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
})
assert.equal(
  diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ).length,
  0,
  "Facebook backend source must have no TypeScript syntax errors.",
)
const { createFacebookFeed } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)
const pageId = "451695514683833"
const token = "test-only-private-page-token"
const initialTime = Date.parse("2026-10-20T10:00:00Z")
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status })
const post = (number, changes = {}) => ({
  id: `${pageId}_${number}`,
  message: `Club update ${number}.`,
  created_time: `2026-10-${String(number + 1).padStart(2, "0")}T10:00:00+0000`,
  permalink_url: `https://www.facebook.com/${pageId}/posts/${number}`,
  full_picture: "https://scontent.example.fbcdn.net/photo.jpg?size=large",
  ...changes,
})
function fixture(options = {}) {
  let time = initialTime
  let body = {
    data: [post(1)],
    paging: { next: `https://graph.facebook.com/?access_token=${token}` },
  }
  let status = 200
  let calls = 0
  const storage = new Map()
  const requests = []
  const read = createFacebookFeed({
    config: () => ({ pageId, token }),
    cache: {
      get: async (key) => storage.get(key) ?? null,
      set: async (key, value) => {
        storage.set(key, structuredClone(value))
      },
    },
    now: () => time,
    fetch: async (url, init) => {
      calls++
      requests.push({ url: String(url), init })
      return json(body, status)
    },
    ...options,
  })
  return {
    read,
    storage,
    requests,
    get calls() {
      return calls
    },
    advance: (ms) => {
      time += ms
    },
    upstream: (value, code = 200) => {
      body = value
      status = code
    },
  }
}

const fresh = fixture()
const parallel = await Promise.all([fresh.read(), fresh.read(), fresh.read()])
assert.equal(fresh.calls, 1, "Concurrent reads share the same upstream fetch.")
assert.equal(parallel[0].status, 200)
assert.equal(parallel[0].feed.posts.length, 1)
assert.equal(parallel[0].feed.stale, false)
assert.equal(fresh.requests[0].init.headers.Authorization, `Bearer ${token}`)
assert.equal(fresh.requests[0].init.redirect, "error")
assert(fresh.requests[0].init.signal instanceof AbortSignal)
assert.equal(new URL(fresh.requests[0].url).pathname, `/v26.0/${pageId}/posts`)
assert.equal(new URL(fresh.requests[0].url).searchParams.get("limit"), "6")
assert.equal(
  new URL(fresh.requests[0].url).searchParams.get("fields"),
  "id,message,created_time,permalink_url,full_picture",
)
assert(!fresh.requests[0].url.includes(token))
assert(!JSON.stringify(parallel).includes(token))
assert(!JSON.stringify([...fresh.storage]).includes(token))
assert(!JSON.stringify(parallel).includes("paging"))
fresh.advance(5 * 60 * 1000 - 1)
await fresh.read()
assert.equal(fresh.calls, 1)
fresh.advance(1)
await fresh.read()
assert.equal(fresh.calls, 2)

const stale = fixture()
const original = await stale.read()
stale.advance(5 * 60 * 1000)
stale.upstream({ error: { message: `Invalid token: ${token}` } }, 401)
const fallback = await stale.read()
assert.equal(fallback.status, 200)
assert.equal(fallback.feed.stale, true)
assert.deepEqual(fallback.feed.posts, original.feed.posts)
assert.equal(fallback.feed.updatedAt, original.feed.updatedAt)
assert(!JSON.stringify(fallback).includes(token))
await stale.read()
assert.equal(stale.calls, 2, "Failed upstream reads have a retry cooldown.")
stale.advance(60 * 1000)
stale.upstream({ data: [post(2)] })
const recovered = await stale.read()
assert.equal(recovered.feed.stale, false)
assert.equal(recovered.feed.posts[0].id, `${pageId}_2`)
stale.advance(25 * 60 * 60 * 1000)
stale.upstream({ error: "expired" }, 400)
assert.equal((await stale.read()).status, 503)
assert.deepEqual((await stale.read()).feed.posts, [])

const unavailable = fixture()
unavailable.upstream({ error: { message: token } }, 500)
assert.equal((await unavailable.read()).status, 503)
await unavailable.read()
assert.equal(unavailable.calls, 1)
unavailable.advance(60 * 1000)
unavailable.upstream({ data: [] })
const empty = await unavailable.read()
assert.equal(empty.status, 200)
assert.deepEqual(empty.feed.posts, [])
assert(empty.feed.updatedAt)

for (const config of [
  {},
  { pageId },
  { pageId: "../me", token },
  { pageId, token: " " },
]) {
  const missing = fixture({ config: () => config })
  assert.equal((await missing.read()).status, 503)
  assert.equal(missing.calls, 0)
}
for (const body of [
  null,
  {},
  { data: {} },
  { data: [null, { id: "bad" }] },
  { data: [], error: "failed" },
]) {
  const malformed = fixture()
  malformed.upstream(body)
  assert.equal((await malformed.read()).status, 503)
}
const filtered = fixture()
filtered.upstream({
  data: [
    post(1, {
      message: `An English update. \u2764\uFE0F ${token}`,
      permalink_url: `https://www.facebook.com/post?access_token=${token}`,
      full_picture: `https://scontent.example.fbcdn.net/photo?access_token=${token}`,
    }),
    post(2, {
      message: "\u0995\u09cd\u09b2\u09be\u09ac update",
      full_picture: "javascript:alert(1)",
    }),
    post(3, { full_picture: "https://fbcdn.net.attacker.invalid/photo.jpg" }),
    post(4, { permalink_url: "https://facebook.com.attacker.invalid/post" }),
    post(5, { message: "x".repeat(500), created_time: "invalid-date" }),
    post(6, { message: "x".repeat(500) }),
    post(7),
    post(8),
    post(8),
    post(9, { id: "99999_123" }),
  ],
})
const sanitized = await filtered.read()
assert.equal(sanitized.feed.posts.length, 6)
assert.equal(sanitized.feed.posts[0].id, `${pageId}_8`)
assert.equal(
  sanitized.feed.posts.find((value) => value.id === `${pageId}_2`).message,
  "",
)
assert.equal(
  sanitized.feed.posts.find((value) => value.id === `${pageId}_2`).image,
  null,
)
assert.equal(
  sanitized.feed.posts.find((value) => value.id === `${pageId}_3`).image,
  null,
)
assert.equal(
  sanitized.feed.posts.find((value) => value.id === `${pageId}_4`).url,
  `https://www.facebook.com/${pageId}_4`,
)
assert.equal(
  sanitized.feed.posts.find((value) => value.id === `${pageId}_6`).message
    .length,
  320,
)
assert(!JSON.stringify(sanitized).includes(token))

const video = fixture()
video.upstream({
  data: [
    post(1, {
      type: "status",
      attachments: {
        data: [{ media_type: "video_autoplay" }],
      },
    }),
  ],
})
assert.equal((await video.read()).feed.posts[0].mediaType, "video")

const permalinkVideo = fixture()
permalinkVideo.upstream({
  data: [
    post(1, {
      permalink_url: "https://www.facebook.com/reel/123456789/",
    }),
  ],
})
assert.equal((await permalinkVideo.read()).feed.posts[0].mediaType, "video")

const redacted = fixture()
redacted.upstream({
  data: [post(1, { message: `Update \u2764\uFE0F ${token}` })],
})
assert.equal((await redacted.read()).feed.posts[0].message, "Update [redacted]")

const noStorage = fixture({
  cache: {
    get: async () => {
      throw new Error("offline")
    },
    set: async () => {
      throw new Error("offline")
    },
  },
})
assert.equal((await noStorage.read()).status, 200)
const timeout = fixture({
  fetch: async () => {
    throw new DOMException("Timed out", "TimeoutError")
  },
})
assert.equal((await timeout.read()).status, 503)

console.log(
  "PASS: Facebook server-only token handling, sanitized fields/links/captions, cache TTL, concurrent reads, retry, stale expiry, missing secrets and upstream failures.",
)
