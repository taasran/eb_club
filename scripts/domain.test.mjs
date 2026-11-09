import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { onRequest } from "../functions/_middleware.js"

const canonical = "https://ebclub.iiuc.ac.bd"
const legacy = "https://ebclubiiuc.pages.dev"

for (const path of [
  "/",
  "/admin",
  "/admin/reset-password?code=one-use-fixture",
  "/profiles/executives/id-eb42?from=facebook",
  "/images/club-logo.png",
  "/api/project-source?metadata=1",
  "/?redirect=https%3A%2F%2Fevil.example",
  "//evil.example/path?source=old",
]) {
  for (const method of ["GET", "HEAD", "POST", "OPTIONS"]) {
    const response = await onRequest({
      request: new Request(`${legacy}${path}`, { method }),
      next: () => assert.fail("The production alias should redirect before serving content."),
    })
    assert.equal(response.status, ["GET", "HEAD"].includes(method) ? 301 : 308)
    const target = new URL(response.headers.get("Location"))
    const source = new URL(`${legacy}${path}`)
    assert.equal(target.origin, canonical)
    assert.equal(target.pathname, source.pathname)
    assert.equal(target.search, source.search)
    assert.equal(response.headers.get("Cache-Control"), "no-store")
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer")
  }
}

for (const origin of [
  canonical,
  "http://localhost:8443",
  "https://preview.ebclubiiuc.pages.dev",
  "https://ebclubiiuc.pages.dev.evil.example",
]) {
  let calls = 0
  const result = new Response("Existing route")
  const response = await onRequest({
    request: new Request(`${origin}/admin?keep=1`),
    next: () => { calls++; return result },
  })
  assert.equal(response.status, result.status)
  assert.equal(await response.text(), "Existing route")
  assert.equal(response.headers.get("Location"), null)
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff")
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow")
  assert.equal(calls, 1)
}

const protectedResponse = await onRequest({
  request: new Request(`${canonical}/api/project-source`),
  next: () => new Response("Private", {
    status: 403,
    headers: { "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'" },
  }),
})
assert.equal(protectedResponse.status, 403)
assert.equal(protectedResponse.headers.get("Content-Security-Policy"), "default-src 'none'")
assert.equal(protectedResponse.headers.get("Cache-Control"), "private, no-store")
const rootPolicy = readFileSync("public/_headers", "utf8").split("/admin")[0]
const publicResponse = await onRequest({
  request: new Request(`${canonical}/`),
  next: () => new Response("Public"),
})
for (const line of rootPolicy.split("\n").filter((line) => line.startsWith("  "))) {
  const separator = line.indexOf(":")
  assert.equal(publicResponse.headers.get(line.slice(0, separator).trim()), line.slice(separator + 1).trim())
}

const moduleUrl = (source) => {
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    reportDiagnostics: true,
  })
  assert.deepEqual(diagnostics.map((entry) =>
    ts.flattenDiagnosticMessageText(entry.messageText, "\n"),
  ), [])
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
}
const siteUrl = moduleUrl(readFileSync("src/site.ts", "utf8"))
const site = await import(siteUrl)
assert.equal(site.siteOrigin, canonical)
assert.equal(site.siteHostname, "ebclub.iiuc.ac.bd")
const seo = await import(moduleUrl(
  readFileSync("src/seo.ts", "utf8").replace('from "./site"', `from "${siteUrl}"`),
))
const previousDocument = globalThis.document
const attributes = new Map()
try {
  globalThis.document = {
    title: "",
    querySelector: (selector) => ({
      setAttribute: (key, value) => attributes.set(`${selector}:${key}`, value),
    }),
  }
  seo.updatePageMetadata("/profiles/executives/id-eb42")
  assert.equal(attributes.get('link[rel="canonical"]:href'), `${canonical}/profiles/executives/id-eb42`)
  assert.equal(attributes.get('meta[property="og:url"]:content'), `${canonical}/profiles/executives/id-eb42`)
  seo.updatePageMetadata("/")
  assert.equal(attributes.get('link[rel="canonical"]:href'), `${canonical}/`)
} finally {
  if (previousDocument === undefined) delete globalThis.document
  else globalThis.document = previousDocument
}

const html = readFileSync("index.html", "utf8")
assert.match(html, /rel="canonical" href="https:\/\/ebclub\.iiuc\.ac\.bd\/"/)
assert.equal((html.match(/name="google-site-verification"/g) ?? []).length, 2)
const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
for (const entity of structured["@graph"]) {
  assert(entity["@id"].startsWith(`${canonical}/`))
  assert.equal(entity.url, `${canonical}/`)
}
assert.equal(structured["@graph"][0].logo, `${canonical}/images/club-logo.png`)
assert.match(readFileSync("public/robots.txt", "utf8"), /Sitemap: https:\/\/ebclub\.iiuc\.ac\.bd\/sitemap\.xml/)
assert.match(readFileSync("public/sitemap.xml", "utf8"), /<loc>https:\/\/ebclub\.iiuc\.ac\.bd\/<\/loc>/)
const siteConfig = JSON.parse(readFileSync(".figma/make/site.json", "utf8"))
assert.equal(siteConfig.openGraph.image, `${canonical}/images/club-banner.png`)
for (const file of ["index.html", "public/robots.txt", "public/sitemap.xml", ".figma/make/site.json", "src/seo.ts", "src/admin/onboarding.ts", "src/pages/HomePage.tsx"]) {
  assert(!readFileSync(file, "utf8").includes("ebclubiiuc.pages.dev"), `${file} must use the custom domain.`)
}
console.log("PASS: canonical domain metadata, permanent host redirects, preserved paths/queries, no open redirects or preview loops, and both Google verification tags.")
