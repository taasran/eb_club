import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText, diagnostics } = ts.transpileModule(
  readFileSync(new URL("./turnstile.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }, reportDiagnostics: true },
)
assert.deepEqual(diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")), [])
const { createTurnstile, TurnstileError } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`)
const config = () => ({ siteKey: "fixture-site-key", secretKey: "fixture-private-key" })
let calls = 0
let result = { success: true, hostname: "ebclub.iiuc.ac.bd", action: "join" }
let status = 200
const verifier = createTurnstile({
  config,
  request: async (url, options) => {
    calls++
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify")
    assert.equal(options.method, "POST")
    assert.equal(options.redirect, "error")
    assert(options.signal instanceof AbortSignal)
    const body = new URLSearchParams(options.body)
    assert.equal(body.get("secret"), "fixture-private-key")
    assert.equal(body.get("response"), "fixture-token")
    return new Response(JSON.stringify(result), { status })
  },
})
assert.deepEqual(verifier.publicConfig(), { required: true, siteKey: "fixture-site-key" })
assert(!JSON.stringify(verifier.publicConfig()).includes("fixture-private-key"))
for (const token of [undefined, "", {}, "x".repeat(2049)]) {
  await assert.rejects(verifier.verify(token, "join"), (error) => error instanceof TurnstileError && error.status === 400)
}
assert.equal(calls, 0)
await verifier.verify("fixture-token", "join")
for (const invalid of [
  { success: false, "error-codes": ["timeout-or-duplicate"] },
  { success: true, hostname: "evil.example", action: "join" },
  { success: true, hostname: "ebclub.iiuc.ac.bd", action: "newsletter" },
  { success: true },
  null,
]) {
  result = invalid
  await assert.rejects(verifier.verify("fixture-token", "join"), (error) => [400, 503].includes(error.status))
}
status = 500
result = { error: "private provider error" }
await assert.rejects(verifier.verify("fixture-token", "join"),
  (error) => error.status === 503 && !error.message.includes("private"))
const offline = createTurnstile({
  config,
  request: async () => { throw new Error("private timeout detail") },
})
await assert.rejects(offline.verify("fixture-token", "join"), (error) => error.status === 503)
for (const partial of [{ siteKey: "fixture-site-key" }, { secretKey: "fixture-private-key" }]) {
  const missing = createTurnstile({ config: () => partial })
  assert.throws(() => missing.publicConfig(), (error) => error.status === 503)
  await assert.rejects(missing.verify("anything", "join"), (error) => error.status === 503)
}
const unconfigured = createTurnstile({
  config: () => ({}),
  request: async () => assert.fail("No external request without configuration."),
})
assert.deepEqual(unconfigured.publicConfig(), { required: false, siteKey: null })
await unconfigured.verify(undefined, "join")
const index = readFileSync(new URL("./index.tsx", import.meta.url), "utf8")
assert(index.indexOf("await turnstile.verify") < index.indexOf("const { error } = await db().from", index.indexOf('app.post(`${base}/public/submit`')))
console.log("PASS: Turnstile server validation, missing/expired tokens, hostname/action binding, partial configuration and fail-closed upstream errors.")
