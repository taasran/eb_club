import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./facebook.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
)
const { createFacebookFeed } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

const pageId = "451695514683833"
const token = "fixture-only-page-credential"
const instant = Date.parse("2026-10-26T19:00:00Z")
const photo = "https://scontent.example.fbcdn.net/shared-album.jpg"
const shared = {
  id: `${pageId}_122203517702536052`,
  created_time: "2026-09-30T11:26:33+0000",
  permalink_url: "https://www.facebook.com/122207097422536052/posts/122203517702536052",
}
const attachmentBody = {
  data: [{
    description: "A shared farewell programme from our university.",
    subattachments: {
      data: [{ media: { image: { src: photo } } }],
    },
  }],
}

function setup({ posts = [shared], load = async () => Response.json(attachmentBody) } = {}) {
  const requests = []
  const values = new Map()
  const reports = []
  let time = instant
  let offline = false
  const read = createFacebookFeed({
    config: () => ({ pageId, token }),
    cache: {
      get: async (key) => values.get(key),
      set: async (key, value) => values.set(key, structuredClone(value)),
    },
    now: () => time,
    reportFailure: (failure) => reports.push(failure),
    fetch: async (input, options) => {
      const url = new URL(input)
      requests.push(url)
      assert.equal(url.origin, "https://graph.facebook.com")
      assert.equal(url.href.includes(token), false)
      assert.equal(options.headers.Authorization, `Bearer ${token}`)
      assert.equal(options.redirect, "error")
      assert(options.signal instanceof AbortSignal)
      if (url.pathname === `/v26.0/${pageId}/posts`) {
        assert.equal(
          url.searchParams.get("fields"),
          "id,message,created_time,permalink_url,full_picture",
        )
        return offline
          ? Response.json({ error: { code: 190 } }, { status: 400 })
          : Response.json({ data: posts })
      }
      assert.equal(url.pathname, `/v26.0/${shared.id}/attachments`)
      assert.equal(
        url.searchParams.get("fields"),
        "media,description,subattachments{media,description}",
      )
      return load()
    },
  })
  return {
    read, requests, values, reports,
    advance: (ms) => { time += ms },
    disconnect: () => { offline = true },
  }
}

{
  const fixture = setup()
  const results = await Promise.all([fixture.read(), fixture.read()])
  const { feed, status } = results[0]
  assert.equal(status, 200)
  assert.equal(fixture.requests.length, 2, "Concurrent readers share enrichment.")
  assert.equal(feed.posts[0].image, photo)
  assert.equal(feed.posts[0].mediaType, "image")
  assert.equal(feed.posts[0].message, attachmentBody.data[0].description)
  assert.equal(feed.posts[0].url, shared.permalink_url)
  assert.equal(feed.posts[0].id, shared.id)
  assert.deepEqual(fixture.reports, [])
  await fixture.read()
  assert.equal(fixture.requests.length, 2, "Cached reads do not repeat enrichment.")
  fixture.advance(5 * 60 * 1000)
  fixture.disconnect()
  const fallback = await fixture.read()
  assert.equal(fallback.status, 200)
  assert.equal(fallback.feed.stale, true)
  assert.equal(fallback.feed.posts[0].image, photo)
}

for (const posts of [
  [{ ...shared, full_picture: photo }],
  [{
    ...shared,
    attachments: {
      data: [{
        media: { image: { src: photo } },
        description: "A photo from the shared programme.",
      }],
    },
  }],
  [{ ...shared, permalink_url: "https://www.facebook.com/reel/123456789/" }],
]) {
  const fixture = setup({ posts, load: () => assert.fail("No enrichment is needed.") })
  assert.equal((await fixture.read()).status, 200)
  assert.equal(fixture.requests.length, 1)
}

for (const load of [
  async () => Response.json({ error: { code: 12 } }, { status: 400 }),
  async () => Response.json({ error: { code: 10 } }, { status: 403 }),
  async () => new Response("Not JSON"),
  async () => Response.json({ error: { code: 100 } }),
  async () => Response.json({ data: "malformed" }),
  async () => Response.json({ data: [] }),
  async () => { throw new DOMException("Timed out", "TimeoutError") },
]) {
  const fixture = setup({ load })
  const { feed, status } = await fixture.read()
  assert.equal(status, 200, "Optional attachment failures must never hide posts.")
  assert.equal(feed.stale, false)
  assert.equal(feed.posts.length, 1)
  assert.equal(feed.posts[0].image, null)
  assert.equal(feed.posts[0].mediaType, "text")
  assert.deepEqual(fixture.reports, [])
}

{
  const fixture = setup({
    load: async () => Response.json({
      data: [{
        description: "\u09ac\u09bf\u09a6\u09be\u09df",
        media: { image: { src: "https://fbcdn.net.attacker.invalid/photo.jpg" } },
        subattachments: {
          data: [
            { media: { image: { src: `https://scontent.example.fbcdn.net/photo?access_token=${token}` } } },
            {
              media: { image: { src: photo } },
              description: `Programme highlights ${token} \u2764\uFE0F`,
              target: { url: "https://attacker.invalid/do-not-follow" },
            },
          ],
        },
      }],
      paging: { next: `https://graph.facebook.com/next?access_token=${token}` },
    }),
  })
  const result = await fixture.read()
  assert.equal(result.feed.posts[0].image, photo)
  assert.equal(result.feed.posts[0].message, "Programme highlights [redacted]")
  const saved = JSON.stringify({ result, values: [...fixture.values] })
  assert.equal(saved.includes(token), false)
  assert.equal(saved.includes("paging"), false)
  assert.equal(saved.includes("attacker.invalid"), false)
  assert.equal(fixture.requests.length, 2)
}

{
  const fixture = setup({
    posts: [{ ...shared, message: "Our club shared these highlights." }],
  })
  const { feed } = await fixture.read()
  assert.equal(feed.posts[0].message, "Our club shared these highlights.")
  assert.equal(feed.posts[0].image, photo)
}

console.log("PASS: shared-post photos/captions, nested albums, optional lookup isolation, cache, and credential-safe previews.")
