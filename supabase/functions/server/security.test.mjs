import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText, diagnostics } = ts.transpileModule(
  readFileSync(new URL("./security.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    reportDiagnostics: true,
  },
)
assert.deepEqual(
  diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")),
  [],
)
const {
  createRequestLimiter,
  SecurityLimitError,
  publicQuota,
  adminQuota,
  validSubmission,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

const rows = new Set()
let time = Date.parse("2026-10-30T12:00:00Z")
let reserveCalls = 0
const store = {
  async slots(prefix) {
    return [...rows].filter((key) => key.startsWith(prefix))
  },
  async reserve(key) {
    reserveCalls++
    if (rows.has(key)) return false
    rows.add(key)
    return true
  },
  async prune(before) {
    for (const key of rows) if (key < before) rows.delete(key)
  },
}
const quota = { scope: "test", limit: 5, windowMs: 60000 }
const actors = "approved-user-not-a-secret"
// Independent limiters model separate server instances sharing the unique DB primary key.
const outcomes = await Promise.allSettled(
  Array.from({ length: 30 }, () =>
    createRequestLimiter(store, () => time)(quota, actors),
  ),
)
assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 5)
for (const result of outcomes.filter((item) => item.status === "rejected")) {
  assert(result.reason instanceof SecurityLimitError)
  assert.equal(result.reason.status, 429)
  assert.equal(result.reason.retryAfter, 60)
}
assert.equal(rows.size, 5)
assert([...rows].every((key) => !key.includes(actors)))
assert(reserveCalls <= 30 * 8)
const check = createRequestLimiter(store, () => time)
await assert.rejects(check(quota, actors), (error) => error.status === 429)
await check(quota, "another-approved-user")
await check({ ...quota, scope: "different-scope" }, actors)
time += 61000
await check(quota, actors)
assert.equal(
  rows.size,
  8,
  "A new window must not overwrite the previous window.",
)
time += 7200000
await createRequestLimiter(store, () => time)(quota, actors)
assert.equal(rows.size, 1, "Prune only windows older than two hours.")

for (const failing of ["slots", "reserve", "prune"]) {
  const broken = {
    ...store,
    [failing]: async () => {
      throw new Error("private DB detail")
    },
  }
  await assert.rejects(
    createRequestLimiter(broken, () => time)(quota),
    (error) =>
      error.status === 503 &&
      error.retryAfter === 30 &&
      !error.message.includes("private"),
  )
}
let attempts = 0
await assert.rejects(
  createRequestLimiter(
    {
      async slots() {
        return []
      },
      async reserve() {
        attempts++
        return false
      },
      async prune() {},
    },
    () => time,
  )({ ...quota, limit: 600 }),
  (error) => error.status === 429,
)
assert.equal(attempts, 8)
assert.equal(publicQuota("/make-server-ad6cf477/public/content"), null)
assert.equal(publicQuota("/make-server-ad6cf477/public/submit").limit, 120)
assert.equal(publicQuota("/make-server-ad6cf477/public/visit").limit, 1000)
assert.equal(adminQuota("/admin/facebook/history", "GET").limit, 240)
assert.equal(adminQuota("/admin/upload", "POST").limit, 30)
assert.equal(adminQuota("/admin/content", "PUT").scope, "admin-write")

assert.deepEqual(
  validSubmission({
    type: "join",
    data: {
      name: " Member ",
      email: " CLUB@Example.com ",
      studentId: "EB123",
      batch: "26",
      ignored: "not stored",
    },
  }),
  {
    type: "join",
    data: {
      name: "Member",
      email: "club@example.com",
      studentId: "EB123",
      batch: "26",
    },
  },
)
for (const body of [
  null,
  [],
  {},
  { type: "unknown", data: {} },
  { type: "newsletter", data: { email: "not-an-email" } },
  {
    type: "newsletter",
    data: { email: "a@example.com\nBcc:evil@example.com" },
  },
  {
    type: "join",
    data: {
      name: "\u0000evil",
      email: "a@example.com",
      studentId: "EB",
      batch: "26",
    },
  },
  {
    type: "join",
    data: {
      name: "x".repeat(251),
      email: "a@example.com",
      studentId: "EB",
      batch: "26",
    },
  },
])
  assert.equal(validSubmission(body), null)

const index = readFileSync(new URL("./index.tsx", import.meta.url), "utf8")
assert.match(index, /error\?\.code === "23505"/)
assert.match(index, /\.insert\(\{ key, value: true \}\)/)
assert.match(index, /ignoreDuplicates: true/)
assert(
  index.indexOf("await limitRequest(adminQuota") >
    index.indexOf("if (!role || !canAccess"),
)
assert.match(index, /maxSize: 8192/)
const headers = readFileSync("public/_headers", "utf8")
for (const name of [
  "X-Content-Type-Options",
  "Permissions-Policy",
  "Referrer-Policy",
  "X-Frame-Options",
  "Strict-Transport-Security",
  "Content-Security-Policy-Report-Only",
]) {
  assert(headers.includes(name))
}
assert.match(headers, /frame-ancestors 'none'/)
const sql = readFileSync("supabase/security-hardening.sql", "utf8")
assert.match(sql, /enable row level security/)
assert.match(
  sql,
  /revoke all on table public\.kv_store_ad6cf477 from public, anon, authenticated/,
)
assert.match(sql, /as restrictive for insert/)
assert.match(sql, /as restrictive for update/)
assert.match(sql, /as restrictive for delete/)
assert.doesNotMatch(sql, /drop table|truncate|delete from/i)
console.log(
  "PASS: shared atomic quotas, concurrent requests, scope/user isolation, window rollover, cleanup, bounded contention, fail-closed outages, form validation and security policy wiring.",
)
