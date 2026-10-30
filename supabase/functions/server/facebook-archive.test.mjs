import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText, diagnostics } = ts.transpileModule(
  readFileSync(new URL("./facebook_archive.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    reportDiagnostics: true,
  },
)
assert.deepEqual(diagnostics, [])
const { createFacebookArchive, FacebookArchiveError } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)
const pageId = "451695514683833"
const credential = "fixture-only-page-credential"
const owner = "owner@example.com"
const image = (name) => `https://scontent.example.fbcdn.net/${name}.jpg?oe=1234`
const post = (number, extras = {}) => ({
  id: `${pageId}_${number}`,
  message: `Workshop ${number}: ${credential}`,
  created_time: "2026-10-01T10:00:00Z",
  permalink_url: `https://www.facebook.com/${pageId}/posts/${number}`,
  ...extras,
})
const attachment = (name) => ({
  type: "photo",
  media: { image: { src: image(name) } },
})
const paging = (
  after,
  node = pageId,
  edge = "posts",
  origin = "https://graph.facebook.com",
) => ({
  cursors: { after },
  next: `${origin}/v26.0/${node}/${edge}?after=${after}&access_token=${credential}`,
})

function setup({
  graph,
  download,
  config = { pageId, token: credential },
} = {}) {
  const values = new Map()
  const requests = []
  const stored = []
  let time = Date.parse("2026-10-30T10:00:00Z")
  const api = createFacebookArchive({
    config: () => config,
    now: () => time,
    cache: {
      get: async (key) => structuredClone(values.get(key)),
      set: async (key, value) => {
        values.set(key, structuredClone(value))
      },
    },
    storeImage: async (bytes, type, path) => {
      stored.push({ bytes, type, path })
      return `https://storage.example.com/${path}`
    },
    fetch: async (input, options) => {
      const url = new URL(input)
      requests.push(url)
      assert.equal(options.redirect, "error")
      assert(options.signal instanceof AbortSignal)
      assert.equal(
        url.href.includes(credential),
        false,
        "Credentials never travel in URLs, including paging URLs.",
      )
      if (url.hostname === "graph.facebook.com") {
        assert.equal(
          options.headers.Authorization,
          `Bearer ${config.token.trim()}`,
        )
        return graph ? graph(url) : Response.json({ data: [post(1)] })
      }
      assert(url.hostname.endsWith(".fbcdn.net"))
      assert.equal(
        options.headers?.Authorization,
        undefined,
        "The Page token must never be sent to an image CDN.",
      )
      return download
        ? download(url)
        : new Response(new Uint8Array([255, 216, 255, 1, 2, 3]))
    },
  })
  return {
    api,
    values,
    requests,
    stored,
    advance: (ms) => {
      time += ms
    },
  }
}

async function collect(api) {
  let cursor
  let last
  const posts = new Map()
  for (let step = 0; step < 30; step++) {
    last = await api.read(owner, cursor)
    assert.equal(JSON.stringify(last).includes(credential), false)
    assert.equal(JSON.stringify(last).includes("graph.facebook.com"), false)
    for (const entry of last.posts) {
      const previous = posts.get(entry.id)
      const images = new Map(
        (previous?.images ?? []).map((photo) => [photo.id, photo]),
      )
      for (const photo of entry.images) images.set(photo.id, photo)
      posts.set(entry.id, { ...entry, images: [...images.values()] })
    }
    if (last.complete) return { last, posts }
    assert(last.nextCursor)
    cursor = last.nextCursor
  }
  assert.fail("The fixture history must finish.")
}

{
  const fixture = setup({
    graph: (url) => {
      if (url.pathname === `/v26.0/${pageId}/posts`) {
        assert.equal(url.searchParams.get("limit"), "25")
        assert.equal(url.searchParams.has("access_token"), false)
        return url.searchParams.get("after") === "OLDER"
          ? Response.json({
              data: [
                post(3),
                post(4, {
                  permalink_url: `https://www.facebook.com/${pageId}/videos/44/`,
                }),
              ],
            })
          : Response.json({ data: [post(1), post(2)], paging: paging("OLDER") })
      }
      if (url.pathname === `/v26.0/${pageId}_1/attachments`) {
        return url.searchParams.get("after") === "ROOT_MORE"
          ? Response.json({ data: [attachment("d")] })
          : Response.json({
              data: [
                {
                  type: "album",
                  subattachments: {
                    data: [attachment("a"), attachment("b")],
                    paging: paging("ALBUM_MORE", "999", "subattachments"),
                  },
                },
              ],
              paging: paging("ROOT_MORE", `${pageId}_1`, "attachments"),
            })
      }
      if (url.pathname === "/v26.0/999/subattachments")
        return Response.json({ data: [attachment("c")] })
      return Response.json({
        data: [attachment(url.pathname.includes("_2/") ? "e" : "f")],
      })
    },
  })
  const first = await fixture.api.read(owner)
  assert.equal(first.posts.length, 2)
  assert.equal(first.complete, false)
  assert.equal(first.posts[0].message.includes(credential), false)
  await assert.rejects(
    fixture.api.read("someone-else@example.com", first.nextCursor),
    (error) => error.status === 409,
  )
  const second = await fixture.api.read(owner, first.nextCursor)
  const count = fixture.requests.length
  assert.deepEqual(
    await fixture.api.read(owner, first.nextCursor),
    second,
    "A retried batch is idempotent.",
  )
  assert.equal(fixture.requests.length, count)
  const full = await collect(fixture.api)
  assert.equal(full.last.postsScanned, 4)
  assert.equal(full.last.complete, true)
  assert.equal(full.last.partial, false)
  assert.equal(
    full.posts.get(`${pageId}_1`).images.length,
    4,
    "Both album and attachment continuations are traversed.",
  )
  assert.equal(
    full.posts.get(`${pageId}_4`).images.length,
    0,
    "Video posts do not become photo galleries.",
  )
  const selected = full.posts.get(`${pageId}_1`).images[0]
  const saved = await fixture.api.importPhoto(selected.id)
  assert.equal(saved.kind, "photo")
  assert.equal(saved.source, post(1).permalink_url)
  assert(saved.src.startsWith("https://storage.example.com/facebook/"))
  assert.equal(fixture.stored[0].type, "image/jpeg")
  assert.match(fixture.stored[0].path, /\/[a-f0-9]{64}\.jpg$/)
  assert.equal(
    JSON.stringify([...fixture.values.values()]).includes(credential),
    false,
  )
  await assert.rejects(
    fixture.api.importPhoto("https://127.0.0.1/private"),
    (error) => error.status === 400,
  )
  fixture.advance(25 * 60 * 60 * 1000)
  await assert.rejects(
    fixture.api.importPhoto(selected.id),
    (error) => error.status === 409,
  )
  await assert.rejects(
    fixture.api.read(owner, second.nextCursor),
    (error) => error.status === 409,
  )
}

{
  const fixture = setup({
    graph: (url) =>
      url.pathname.endsWith("/posts")
        ? Response.json({ data: [post(1, { full_picture: image("preview") })] })
        : Response.json({ error: { message: credential } }, { status: 403 }),
  })
  const { last, posts } = await collect(fixture.api)
  assert.equal(last.complete, true)
  assert.equal(
    last.partial,
    true,
    "Skipped media is explicitly reported; it is not called a complete media import.",
  )
  assert.equal(posts.get(`${pageId}_1`).images[0].preview, true)
  assert.equal(JSON.stringify(last).includes(credential), false)
}

{
  const fixture = setup({
    graph: (url) =>
      url.pathname.endsWith("/posts")
        ? Response.json({ data: [post(1)] })
        : Response.json({
            data: [
              {
                subattachments: {
                  data: [attachment("safe")],
                  paging: paging(
                    "BAD",
                    "99",
                    "subattachments",
                    "https://127.0.0.1",
                  ),
                },
              },
            ],
          }),
  })
  const { last } = await collect(fixture.api)
  assert.equal(last.partial, true)
  assert(fixture.requests.every((url) => url.hostname === "graph.facebook.com"))
}

{
  let limited = true
  const fixture = setup({
    graph: (url) =>
      url.pathname.endsWith("/posts")
        ? Response.json({ data: [post(1)] })
        : limited
          ? Response.json({ error: { code: 4, message: credential } }, {
              status: 429,
            })
          : Response.json({ data: [attachment("resumed")] }),
  })
  const first = await fixture.api.read(owner)
  await assert.rejects(
    fixture.api.read(owner, first.nextCursor),
    (error) =>
      error instanceof FacebookArchiveError &&
      error.status === 429 &&
      !error.message.includes(credential),
  )
  limited = false
  assert.equal((await fixture.api.read(owner, first.nextCursor)).complete, true)
}

{
  const fixture = setup({
    graph: () => Response.json({ data: [], paging: paging("LOOP") }),
  })
  const first = await fixture.api.read(owner)
  const second = await fixture.api.read(owner, first.nextCursor)
  await assert.rejects(
    fixture.api.read(owner, second.nextCursor),
    (error) => error.status === 409,
  )
}

for (const config of [{}, { pageId, token: "bad credential" }]) {
  await assert.rejects(
    setup({ config }).api.read(owner),
    (error) => error.status === 503,
  )
}
await assert.rejects(
  setup().api.read(owner, "https://graph.facebook.com/?access_token=private"),
  (error) => error.status === 400,
)

for (const [download, status] of [
  [
    () =>
      new Response("<svg>not a safe image</svg>", {
        headers: { "content-type": "image/png" },
      }),
    400,
  ],
  [
    () =>
      new Response("huge", {
        headers: { "content-length": String(6 * 1024 * 1024) },
      }),
    413,
  ],
  [() => new Response(new Uint8Array(5 * 1024 * 1024 + 1)), 413],
]) {
  const fixture = setup({
    graph: (url) =>
      Response.json({
        data: url.pathname.endsWith("/posts")
          ? [post(1)]
          : [attachment("candidate")],
      }),
    download,
  })
  const full = await collect(fixture.api)
  await assert.rejects(
    fixture.api.importPhoto(full.posts.get(`${pageId}_1`).images[0].id),
    (error) => error.status === status,
  )
  assert.equal(fixture.stored.length, 0)
}

{
  const fixture = setup({
    graph: (url) =>
      Response.json({
        data: url.pathname.endsWith("/posts")
          ? [post(1, { full_picture: image("video-preview") })]
          : [
              {
                type: "video_inline",
                media: { image: { src: image("video-preview") } },
              },
            ],
      }),
  })
  assert.equal(
    (await collect(fixture.api)).posts.get(`${pageId}_1`).images.length,
    0,
  )
}

console.log(
  "PASS: authenticated history cursors, post/album/sub-album pagination, pause/retry, partial failures, token isolation, image allowlists, bounded downloads and storage copies.",
)
