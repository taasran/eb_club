// Run: node scripts/content-sync.test.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "club-content-test-"))
const write = (name, code) => {
  const file = path.join(dir, `${name}.mjs`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, code)
  return pathToFileURL(file).href
}
let graphCount = 0
function compile(name, mocks = {}) {
  // Compile the real component graph, replacing only APIs/browser integrations.
  // This keeps refactors covered without adding a browser test dependency.
  const graph = new Map()
  const prefix = `graph-${graphCount++}`
  function visit(source) {
    if (graph.has(source)) return graph.get(source)
    const target = pathToFileURL(path.join(dir, prefix, `${source}.mjs`)).href
    graph.set(source, target)
    let js = ts.transpileModule(fs.readFileSync(source, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText
    js = js.replace(/from "([^"]+)"/g, (_match, specifier) => {
      let dependency = mocks[specifier]
      if (!dependency && specifier.startsWith(".")) {
        const base = path.normalize(path.join(path.dirname(source), specifier))
        const file = [base, `${base}.tsx`, `${base}.ts`].find(
          (candidate) =>
            fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
        )
        if (!file) throw new Error(`Cannot resolve ${specifier} from ${source}`)
        dependency = mocks[file] ?? visit(file)
      }
      dependency ??= pathToFileURL(require.resolve(specifier)).href
      return `from "${dependency}"`
    })
    write(`${prefix}/${source}`, js)
    return target
  }
  const source = fs.existsSync(`src/${name}.tsx`)
    ? `src/${name}.tsx`
    : `src/${name}.ts`
  return visit(source)
}

const contentJs = ts.transpileModule(
  fs.readFileSync("src/contentClient.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText
const { readContent, publishContent, contentSnapshot } = await import(
  write("contentClient", contentJs)
)
const fixture = {
  heroTitle: "Our updated club",
  heroDescription: "Saved introduction",
  campusImage: "https://example.com/campus.jpg",
  events: [
    { title: "Saved seminar", type: "Seminar" },
    { title: "Saved workshop", type: "Workshop" },
    { title: "Third saved event", type: "Meetup" },
  ],
  executives: [
    {
      name: "Saved President",
      designation: "President",
      studentId: "EB123",
      batch: "26",
      image: "",
    },
  ],
  leadership: { "former-presidents": [] },
  archiveYears: [],
}
const originalFetch = globalThis.fetch
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status })
try {
  const {
    adminSignInUrl,
    passwordResetUrl,
    normalizeAdminEmail,
    registerAccount,
    requestPasswordReset,
    saveResetPassword,
  } = await import(compile("admin/onboarding"))
  assert.equal(
    normalizeAdminEmail(" Team+Club@Example.com "),
    "team+club@example.com",
  )
  const profile = {
    name: " New Applicant ",
    matricId: " EB123 ",
    email: " Applicant@Example.com ",
    batch: " 26th ",
  }
  let signupArgs
  const signupAuth = {
    async signUp(args) {
      signupArgs = args
      return { error: null }
    },
  }
  await registerAccount(
    signupAuth,
    profile,
    "SafePassword123",
    "SafePassword123",
  )
  assert.equal(signupArgs.email, "applicant@example.com")
  assert.equal(signupArgs.password, "SafePassword123")
  assert.equal(signupArgs.options.emailRedirectTo, adminSignInUrl)
  assert.deepEqual(signupArgs.options.data, {
    full_name: "New Applicant",
    matric_id: "EB123",
    batch: "26th",
    club_access_request: true,
  })
  assert.equal("password" in signupArgs.options.data, false)
  assert.equal("role" in signupArgs.options.data, false)
  await assert.rejects(
    registerAccount(
      signupAuth,
      { ...profile, matricId: "" },
      "SafePassword123",
      "SafePassword123",
    ),
    /Matric ID/,
  )
  await assert.rejects(
    registerAccount(signupAuth, profile, "short", "short"),
    /at least 8/,
  )
  await assert.rejects(
    registerAccount(signupAuth, profile, "SafePassword123", "WrongPassword123"),
    /do not match/,
  )
  await assert.rejects(
    registerAccount(
      {
        async signUp() {
          return { error: { message: "Signup disabled" } }
        },
      },
      profile,
      "SafePassword123",
      "SafePassword123",
    ),
    /Signup disabled/,
  )
  let resetEmail
  await requestPasswordReset(
    {
      async resetPasswordForEmail(email, options) {
        resetEmail = { email, options }
        return { error: null }
      },
    },
    " Applicant@Example.com ",
  )
  assert.deepEqual(resetEmail, {
    email: "applicant@example.com",
    options: { redirectTo: passwordResetUrl },
  })
  let updatedPassword
  const recoveryAuth = {
    async getSession() {
      return { data: { session: { user: { id: "account-id" } } }, error: null }
    },
    async updateUser(update) {
      updatedPassword = update
      return { error: null }
    },
  }
  await saveResetPassword(recoveryAuth, "NewPassword123", "NewPassword123")
  assert.deepEqual(updatedPassword, { password: "NewPassword123" })
  updatedPassword = null
  await assert.rejects(
    saveResetPassword(
      {
        ...recoveryAuth,
        async getSession() {
          return { data: { session: null }, error: null }
        },
      },
      "NewPassword123",
      "NewPassword123",
    ),
    /invalid or expired/,
  )
  assert.equal(updatedPassword, null)
  await assert.rejects(
    requestPasswordReset(
      {
        async resetPasswordForEmail() {
          return { error: { message: "Email rate limit exceeded" } }
        },
      },
      "applicant@example.com",
    ),
    /Email rate limit/,
  )

  let putBody
  let cache
  globalThis.fetch = async (_url, options) => {
    cache = options.cache
    // Simulate Postgres JSONB returning a different object-key order.
    return json({
      content: Object.fromEntries(Object.entries(fixture).reverse()),
    })
  }
  await publishContent(
    async (_url, options) => {
      putBody = JSON.parse(options.body)
      return json({ ok: true })
    },
    "https://test.invalid",
    "public-key",
    fixture,
  )
  assert.deepEqual(putBody.content, fixture)
  assert.equal(cache, "no-store")
  assert.equal(
    contentSnapshot({ a: 1, b: [1, 2] }),
    contentSnapshot({ b: [1, 2], a: 1 }),
  )
  assert.notEqual(contentSnapshot([1, 2]), contentSnapshot([2, 1]))

  globalThis.fetch = async () => json({ content: null })
  await assert.rejects(
    publishContent(
      async () => json({ ok: true }),
      "https://test.invalid",
      "key",
      fixture,
    ),
    /did not return your saved changes/,
  )
  await assert.rejects(
    publishContent(
      async () => json({ error: "Session expired" }, 401),
      "https://test.invalid",
      "key",
      fixture,
    ),
    /Session expired/,
  )
  globalThis.fetch = async () => json({ error: "Backend unavailable" }, 503)
  await assert.rejects(
    readContent("https://test.invalid", "key"),
    /Backend unavailable/,
  )
  globalThis.fetch = async () => json({ unrelated: true })
  await assert.rejects(
    readContent("https://test.invalid", "key"),
    /invalid response/,
  )

  const reactUrl = pathToFileURL(require.resolve("react")).href
  const empty = write(
    "empty",
    "export default function Empty() { return null; }",
  )
  const hook = write(
    "hook",
    "export default function useSiteContent() { return globalThis.__clubContentFixture; } export function announceContentUpdate() {}",
  )
  const router = write(
    "router",
    `
    import {createElement} from "${reactUrl}";
    export function createBrowserRouter(routes) { return { routes }; }
    export function RouterProvider({router}) {
      return createElement(router.routes.find(route => route.path === (globalThis.__clubTestRoute ?? "/")).Component);
    }
  `,
  )
  const supabase = write(
    "supabase",
    'export const serverUrl = "https://test.invalid"; export const publicAnonKey = "test-key"; export const supabase = {};',
  )
  const seo = write("seo", "export function updatePageMetadata() {}")
  const { default: App } = await import(
    compile("App", {
      "react-router": router,
      "src/AdminPage.tsx": empty,
      "src/supabase.ts": supabase,
      "src/EconomicsBackdrop.tsx": empty,
      "src/EconomicsLoader.tsx": empty,
      "src/seo.ts": seo,
      "src/useSiteContent.ts": hook,
    })
  )
  const { default: AdminPage } = await import(
    compile("AdminPage", {
      "src/supabase.ts": supabase,
      "src/EconomicsLoader.tsx": empty,
      "src/useSiteContent.ts": hook,
    })
  )
  const loadingAdmin = renderToStaticMarkup(createElement(AdminPage))
  assert.match(loadingAdmin, /Download latest project code/)
  assert.match(loadingAdmin, /href="\/downloads\/eb-club-source\.zip"/)
  assert.match(loadingAdmin, /download="eb-club-latest-source\.zip"/)
  const authReact = write(
    "authReact",
    `
    export function useState(initial) {
      const value = typeof initial === "function" ? initial() : initial;
      return [value === true ? false : value, () => {}];
    }
    export function useEffect() {}
  `,
  )
  const { default: SignInPage } = await import(
    compile("AdminPage", {
      react: authReact,
      "src/supabase.ts": supabase,
      "src/EconomicsLoader.tsx": empty,
      "src/useSiteContent.ts": hook,
    })
  )
  const signInHtml = renderToStaticMarkup(createElement(SignInPage))
  assert.match(signInHtml, /Forgot password/)
  assert.match(signInHtml, /Create account/)
  assert.doesNotMatch(signInHtml, /Email me a sign-in link/)
  const modeReact = write(
    "modeReact",
    `
    export function useState(initial) { return [initial === "signin" ? globalThis.__clubAuthMode : initial, () => {}]; }
    export function useEffect() {}
  `,
  )
  const { default: AccountAuth } = await import(
    compile("admin/AdminAuth", {
      react: modeReact,
      "src/supabase.ts": supabase,
    })
  )
  globalThis.__clubAuthMode = "signup"
  const registrationHtml = renderToStaticMarkup(
    createElement(AccountAuth, {
      onAuthenticated: async () => ({ ok: false }),
    }),
  )
  for (const label of [
    "Full name",
    "Matric ID",
    "Batch",
    "Confirm password",
    "Create account &amp; request approval",
  ])
    assert(registrationHtml.includes(label), label)
  globalThis.__clubAuthMode = "forgot"
  const forgottenHtml = renderToStaticMarkup(
    createElement(AccountAuth, {
      onAuthenticated: async () => ({ ok: false }),
    }),
  )
  assert.match(forgottenHtml, /Send password-reset email/)
  assert.doesNotMatch(forgottenHtml, /type="password"/)
  delete globalThis.__clubAuthMode
  const teamReact = write(
    "teamReact",
    `
    export function useState(initial) {
      return [Array.isArray(initial) ? [{userId: "applicant-id", email: "friend@example.com", name: "Applicant", matricId: "EB123", batch: "26", role: null, status: "pending", createdAt: "2026-01-01", emailConfirmed: true}] : initial, () => {}];
    }
    export function useEffect() {}
  `,
  )
  const { default: TeamAccess } = await import(
    compile("AdminAccess", { react: teamReact })
  )
  const teamHtml = renderToStaticMarkup(
    createElement(TeamAccess, {
      ownerEmail: "owner@example.com",
      request: async () => {
        throw new Error("SSR must not request private data")
      },
    }),
  )
  assert.match(teamHtml, /Approve as admin/)
  assert.match(teamHtml, /Approve as moderator/)
  assert.match(teamHtml, /Reject &amp; delete account/)
  assert.match(teamHtml, /EB123/)
  assert.doesNotMatch(teamHtml, /Copy login link|Open email draft/)
  globalThis.__clubContentFixture = fixture
  let html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Our updated club/)
  assert.match(html, /Saved introduction/)
  assert.match(html, /Third saved event/)
  assert.match(html, /View Saved seminar event/)
  assert.match(html, /Saved President/)
  assert.doesNotMatch(html, /Executive slot 30/)
  assert.doesNotMatch(html, /Economics in a changing world/)
  assert.doesNotMatch(html, /Profile 5 \/ 30/)
  globalThis.__clubContentFixture = {
    ...fixture,
    executives: Array.from({ length: 32 }, (_, index) => ({
      ...fixture.executives[0],
      name: `Published Member ${index + 1}`,
    })),
  }
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Published Member 32/)
  assert.match(html, /28 profiles/)
  assert.match(html, /Profile 5 \/ 32/)

  globalThis.__clubContentFixture = { ...fixture, events: [], executives: [] }
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /No upcoming events/)
  assert.doesNotMatch(
    html,
    /Saved President|Name to be announced|Economics in a changing world/,
  )
  globalThis.__clubTestRoute = "/leadership/former-presidents"
  html = renderToStaticMarkup(createElement(App))
  assert.doesNotMatch(html, /Name to be announced/)
  globalThis.__clubTestRoute = "/leadership/committee-wise-archive"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /No committee sessions are currently published/)
  assert.doesNotMatch(html, /Name to be announced/)
  // Exercise update subscriptions without a browser or an authenticated account.
  globalThis.window = new EventTarget()
  globalThis.document = new EventTarget()
  document.hidden = false
  let tick
  window.setInterval = (callback) => {
    tick = callback
    return 1
  }
  window.clearInterval = () => {
    tick = undefined
  }
  globalThis.localStorage = { setItem() {} }
  globalThis.__clubReads = 0
  const fakeReact = write(
    "hookReact",
    `
    export function useState(initial) { return [initial, value => globalThis.__clubHookValue = value]; }
    export function useEffect(effect) { globalThis.__clubHookCleanup = effect(); }
  `,
  )
  const fakeClient = write(
    "hookClient",
    `
    export async function readContent() {
      globalThis.__clubReads++;
      return globalThis.__clubContentFixture;
    }
  `,
  )
  const sync = await import(
    compile("useSiteContent", {
      react: fakeReact,
      "src/contentClient.ts": fakeClient,
      "src/supabase.ts": supabase,
    })
  )
  sync.default()
  await Promise.resolve()
  assert.equal(globalThis.__clubReads, 1)
  assert.deepEqual(globalThis.__clubHookValue, globalThis.__clubContentFixture)
  window.dispatchEvent(new Event("focus"))
  sync.announceContentUpdate()
  const storage = new Event("storage")
  storage.key = sync.contentUpdatedKey
  window.dispatchEvent(storage)
  tick()
  document.dispatchEvent(new Event("visibilitychange"))
  assert.equal(globalThis.__clubReads, 6)
  document.hidden = true
  tick()
  assert.equal(globalThis.__clubReads, 6)
  globalThis.__clubHookCleanup()
  window.dispatchEvent(new Event("focus"))
  assert.equal(globalThis.__clubReads, 6)
  assert.equal(tick, undefined)
  console.log(
    "PASS: registration/password recovery, auth/approval rendering, verified persistence, records, refresh and cleanup.",
  )
} finally {
  globalThis.fetch = originalFetch
  delete globalThis.__clubContentFixture
  delete globalThis.__clubTestRoute
  delete globalThis.window
  delete globalThis.document
  delete globalThis.localStorage
  delete globalThis.__clubReads
  delete globalThis.__clubHookValue
  delete globalThis.__clubHookCleanup
  fs.rmSync(dir, { recursive: true, force: true })
}
