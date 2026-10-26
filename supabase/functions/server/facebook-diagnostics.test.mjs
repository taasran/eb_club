import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText, diagnostics } = ts.transpileModule(
  readFileSync(new URL("./facebook.ts", import.meta.url), "utf8"),
  {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
)
assert.equal(
  diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ).length,
  0,
)
const { createFacebookFeed } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

const pageId = "451695514683833"
const credential = "test-credential"
const instant = Date.parse("2026-10-26T18:00:00Z")
const post = {
  id: `${pageId}_122205831338536052`,
  message: "EB Farewell Batch 17-20 \u{1F64C}",
  created_time: "2026-10-16T15:20:06+0000",
  permalink_url: "https://www.facebook.com/reel/3273959049481829/",
  full_picture: "https://scontent.fcgp15-1.fna.fbcdn.net/example.jpg",
}

function setup({
  config = { pageId, token: credential },
  fetch = async () => Response.json({ data: [post] }),
  reportFailure,
} = {}) {
  const reports = []
  const values = new Map()
  const getFeed = createFacebookFeed({
    config: () => config,
    cache: {
      get: async (key) => values.get(key),
      set: async (key, value) => {
        values.set(key, value)
      },
    },
    fetch,
    now: () => instant,
    reportFailure: reportFailure ?? ((failure) => reports.push(failure)),
  })
  return { getFeed, reports }
}

{
  const { getFeed, reports } = setup({
    config: {},
    fetch: async () => assert.fail("Missing config must not call Facebook."),
  })
  assert.equal((await getFeed()).status, 503)
  assert.deepEqual(reports, [
    { stage: "config", pageIdValid: false, tokenPresent: false },
  ])
}

{
  const { getFeed, reports } = setup({
    config: {
      pageId: ` ${pageId}\n`,
      token: ` ${credential}\r\n`,
    },
    fetch: async (url, options) => {
      assert.equal(url.pathname, `/v26.0/${pageId}/posts`)
      assert.equal(url.searchParams.has("access_token"), false)
      assert.equal(options.headers.Authorization, `Bearer ${credential}`)
      return Response.json({ data: [post] })
    },
  })
  const result = await getFeed()
  assert.equal(result.status, 200)
  assert.equal(result.feed.posts[0].id, post.id)
  assert.equal(result.feed.posts[0].message, "EB Farewell Batch 17-20")
  assert.equal(result.feed.posts[0].createdAt, "2026-10-16T15:20:06.000Z")
  assert.equal(result.feed.updatedAt, new Date(instant).toISOString())
  assert.deepEqual(reports, [])
}

{
  const { getFeed, reports } = setup({
    fetch: async () =>
      Response.json(
        {
          error: {
            code: 190,
            error_subcode: 463,
            message: `Private upstream details: ${credential}`,
          },
          paging: {
            next: `https://graph.facebook.com/example?access_token=${credential}`,
          },
        },
        { status: 400 },
      ),
  })
  const result = await getFeed()
  assert.equal(result.status, 503)
  assert.deepEqual(reports, [
    {
      stage: "response",
      httpStatus: 400,
      graphCode: 190,
      graphSubcode: 463,
    },
  ])
  assert.equal(JSON.stringify({ result, reports }).includes(credential), false)
}

{
  const { getFeed, reports } = setup({
    fetch: async () => {
      throw new Error(`Private request URL and credential: ${credential}`)
    },
  })
  assert.equal((await getFeed()).status, 503)
  assert.deepEqual(reports, [{ stage: "request" }])
  assert.equal(JSON.stringify(reports).includes(credential), false)
}

{
  const { getFeed, reports } = setup({
    fetch: async () => new Response("Not JSON", { status: 200 }),
  })
  assert.equal((await getFeed()).status, 503)
  assert.deepEqual(reports, [{ stage: "response", httpStatus: 200 }])
}

{
  const { getFeed, reports } = setup({
    fetch: async () =>
      Response.json({ data: [{ ...post, id: "unrelated-post" }] }),
  })
  assert.equal((await getFeed()).status, 503)
  assert.deepEqual(reports, [{ stage: "posts", httpStatus: 200 }])
}

{
  const { getFeed, reports } = setup({
    fetch: async () =>
      Response.json(
        {
          error: {
            code: credential,
            error_subcode: { private: credential },
          },
        },
        { status: 400 },
      ),
  })
  assert.equal((await getFeed()).status, 503)
  assert.deepEqual(reports, [{ stage: "response", httpStatus: 400 }])
}

{
  const { getFeed } = setup({
    config: {},
    reportFailure: () => {
      throw new Error("Diagnostics unavailable")
    },
  })
  assert.equal((await getFeed()).status, 503)
}

{
  const warnings = []
  const originalWarn = console.warn
  try {
    console.warn = (...args) => warnings.push(args)
    const getFeed = createFacebookFeed({
      config: () => ({ pageId, token: credential }),
      cache: {
        get: async () => null,
        set: async () => {},
      },
      fetch: async () => {
        throw new Error(`Do not log this credential: ${credential}`)
      },
    })
    assert.equal((await getFeed()).status, 503)
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(warnings, [
    ["Facebook feed unavailable", { stage: "request" }],
  ])
  assert.equal(JSON.stringify(warnings).includes(credential), false)
}

console.log("Facebook diagnostic checks passed.")
