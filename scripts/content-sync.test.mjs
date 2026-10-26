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
const { readContent, publishContent, contentSnapshot, currentClubTeam, legacyPhotos, maxLegacyPhotos } = await import(
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
  const oldProfiles = Array.from({ length: 5 }, (_, index) => ({ name: `Person ${index + 1}` }))
  const splitTeam = currentClubTeam(oldProfiles)
  assert.deepEqual(splitTeam.clubLeadership, oldProfiles.slice(0, 3))
  assert.deepEqual(splitTeam.executives, oldProfiles.slice(3))
  assert.deepEqual([...splitTeam.clubLeadership, ...splitTeam.executives], oldProfiles)
  assert.deepEqual(currentClubTeam(oldProfiles, []), { clubLeadership: [], executives: oldProfiles })
  assert.deepEqual(currentClubTeam([], oldProfiles).clubLeadership, oldProfiles)
  assert.deepEqual(legacyPhotos({ image: "https://example.com/old.jpg" }), ["https://example.com/old.jpg"])
  assert.deepEqual(legacyPhotos({ image: "https://example.com/old.jpg", images: [] }), [])
  assert.equal(legacyPhotos({ image: "", images: Array.from({ length: 16 }, (_, i) => `https://example.com/${i}.jpg`) }).length, maxLegacyPhotos)
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

  const facebookClient = await import(compile("facebookClient"))
  const facebookFixture = {
    posts: [{
      id: "451695514683833_123",
      message: "Our latest campus story.",
      createdAt: "2026-10-20T10:00:00Z",
      url: "https://www.facebook.com/451695514683833/posts/123",
      image: "https://scontent.example.fbcdn.net/story.jpg",
      mediaType: "image",
    }],
    pageUrl: facebookClient.facebookPageUrl,
    updatedAt: "2026-10-20T10:00:00Z",
    stale: false,
  }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://test.invalid/public/facebook")
    assert.equal(options.headers.Authorization, "Bearer public-key")
    assert.equal(options.cache, "no-store")
    return json(facebookFixture)
  }
  assert.deepEqual(await facebookClient.readFacebookFeed("https://test.invalid", "public-key"), facebookFixture)
  const legacyFacebookFixture = {
    ...facebookFixture,
    posts: facebookFixture.posts.map(({ mediaType, ...post }) => post),
  }
  globalThis.fetch = async () => json(legacyFacebookFixture)
  assert.deepEqual(
    await facebookClient.readFacebookFeed("https://test.invalid", "public-key"),
    facebookFixture,
  )
  globalThis.fetch = async () => json({ error: "upstream-private-details" }, 503)
  await assert.rejects(facebookClient.readFacebookFeed("", ""), /temporarily unavailable/)
  for (const changes of [
    { posts: null },
    { updatedAt: "invalid" },
    { pageUrl: "javascript:alert(1)" },
    { posts: [{ ...facebookFixture.posts[0], url: "https://attacker.invalid" }] },
    { posts: [{ ...facebookFixture.posts[0], image: "https://attacker.invalid" }] },
    { posts: [{ ...facebookFixture.posts[0], url: "https://www.facebook.com/post?access_token=private" }] },
    { posts: [{ ...facebookFixture.posts[0], mediaType: "audio" }] },
  ]) {
    globalThis.fetch = async () => json({ ...facebookFixture, ...changes })
    await assert.rejects(facebookClient.readFacebookFeed("", ""), /could not be loaded/)
  }
  const facebookHook = write("facebookHook", "export default function useFacebookFeed() { return globalThis.__facebookFixture; }")
  const { default: FacebookUpdates } = await import(compile("components/FacebookUpdates", {
    "src/useFacebookFeed.ts": facebookHook,
  }))
  globalThis.__facebookFixture = { feed: facebookFixture, loading: false, failed: false }
  let facebookHtml = renderToStaticMarkup(createElement(FacebookUpdates))
  assert.match(facebookHtml, /Our latest campus story/)
  assert.match(facebookHtml, /Read on Facebook/)
  assert.match(facebookHtml, /20 Oct 2026/)
  assert.match(facebookHtml, /rel="noopener noreferrer"/)
  assert.match(facebookHtml, /loading="lazy"/)
  assert.doesNotMatch(facebookHtml, /access_token|graph\.facebook\.com/)
  globalThis.__facebookFixture = {
    feed: {
      ...facebookFixture,
      posts: [{ ...facebookFixture.posts[0], mediaType: "video" }],
    },
    loading: false,
    failed: false,
  }
  facebookHtml = renderToStaticMarkup(createElement(FacebookUpdates))
  assert.match(facebookHtml, /facebook\.com\/plugins\/video\.php/)
  assert.match(facebookHtml, /allowFullScreen/)
  globalThis.__facebookFixture = { feed: { ...facebookFixture, stale: true }, loading: false, failed: false }
  assert.match(renderToStaticMarkup(createElement(FacebookUpdates)), /last available updates/)
  globalThis.__facebookFixture = { feed: { ...facebookFixture, posts: [] }, loading: false, failed: false }
  assert.match(renderToStaticMarkup(createElement(FacebookUpdates)), /no recent posts/)
  globalThis.__facebookFixture = { feed: null, loading: false, failed: true }
  assert.match(renderToStaticMarkup(createElement(FacebookUpdates)), /temporarily unavailable/)
  globalThis.__facebookFixture = { feed: null, loading: true, failed: false }
  assert.match(renderToStaticMarkup(createElement(FacebookUpdates)), /Loading the latest club updates/)
  globalThis.__facebookFixture = { feed: { ...facebookFixture, posts: [{ ...facebookFixture.posts[0], message: "", image: null }] }, loading: false, failed: false }
  facebookHtml = renderToStaticMarkup(createElement(FacebookUpdates))
  assert.match(facebookHtml, /Another moment from our club/)
  assert.doesNotMatch(facebookHtml, /src="null"/)

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
  assert.doesNotMatch(
    loadingAdmin,
    /Download latest project code|downloads\/eb-club-source|project-source/,
  )
  const { default: ProjectDownload } = await import(
    compile("admin/ProjectDownload", { "src/supabase.ts": supabase })
  )
  const downloadCard = renderToStaticMarkup(createElement(ProjectDownload))
  assert.match(downloadCard, /Latest project code/)
  assert.match(downloadCard, /type="button"/)
  assert.doesNotMatch(downloadCard, /href="\/downloads\/eb-club-source\.zip"/)
  assert.match(downloadCard, /not a database/)
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
  assert.match(html, /29 profiles/)
  assert.match(html, /Profile 1 \/ 29/)
  globalThis.__clubContentFixture = {
    ...fixture,
    executives: Array.from({ length: 4 }, (_, index) => ({
      ...fixture.executives[0],
      name: `Leader ${index + 1}`,
      studentId: `EB${index + 1}`,
    })),
  }
  html = renderToStaticMarkup(createElement(App))
  const completeRoster = html.split("CLUB EXECUTIVES")[1].split("join-banner")[0]
  assert(
    completeRoster,
    "The executive section must not disappear with only four profiles.",
  )
  for (let index = 1; index <= 3; index++)
    assert(!completeRoster.includes(`Leader ${index}`))
  assert.match(completeRoster, /Leader 4/)
  assert.match(completeRoster, /ID: EB4/)
  assert.doesNotMatch(completeRoster, /<button|Pause auto-slide|Resume auto-slide/)

  globalThis.__clubContentFixture = {
    ...fixture,
    clubLeadership: Array.from({ length: 5 }, (_, index) => ({
      ...fixture.executives[0], name: `Featured Leader ${index + 1}`,
    })),
    executives: [{ ...fixture.executives[0], name: "Independent Executive" }],
    legacy: [{
      year: "2025", title: "Programme gallery", text: "Our programme",
      image: "https://example.com/cover.jpg",
      images: Array.from({ length: 15 }, (_, index) => `https://example.com/programme-${index + 1}.jpg`),
    }],
  }
  html = renderToStaticMarkup(createElement(App))
  const leadersOnly = html.split("CLUB LEADERSHIP")[1].split("CLUB EXECUTIVES")[0]
  assert.match(leadersOnly, /Featured Leader 5/)
  assert.doesNotMatch(leadersOnly, /Independent Executive/)
  const executivesOnly = html.split("CLUB EXECUTIVES")[1].split("join-banner")[0]
  assert.match(executivesOnly, /Independent Executive/)
  assert.doesNotMatch(executivesOnly, /Featured Leader/)
  assert.match(html, /programme-15.jpg/)
  assert.match(html, /transition-opacity/)
  assert.match(html, /1 \/ 15/)

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
  globalThis.__clubTestRoute = "/leadership/former-assistant-general-secretaries"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Former Assistant General Secretaries/)
  globalThis.__clubTestRoute = "/leadership/committee-wise-archive"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /No committee sessions are currently published/)
  assert.doesNotMatch(html, /Name to be announced/)
  // Run a complete auto-slide/wrap cycle and verify all motion pause conditions.
  globalThis.window = new EventTarget()
  globalThis.document = new EventTarget()
  document.hidden = false
  window.innerHeight = 900
  window.matchMedia = () => ({
    matches: globalThis.__carouselPause === "motion",
    addEventListener() {},
    removeEventListener() {},
  })
  globalThis.getComputedStyle = () => ({ columnGap: "20px" })
  const timers = []
  const cleared = []
  window.setInterval = (callback, delay) => {
    timers.push({ callback, delay })
    return timers.length
  }
  window.clearInterval = (id) => cleared.push(id)
  let offscreen = false
  const scrolls = []
  globalThis.__carouselTrack = {
    firstElementChild: { offsetWidth: 280 },
    scrollLeft: 0,
    clientWidth: 900,
    scrollWidth: 1200,
    getBoundingClientRect: () => ({
      top: offscreen ? 1000 : 0,
      bottom: offscreen ? 1200 : 200,
    }),
    scrollTo(options) {
      scrolls.push(options)
      this.scrollLeft = options.left
    },
  }
  const carouselReact = write(
    "carouselReact",
    `
    export function useState(initial) {
      const index = ++globalThis.__carouselState;
      const paused = (index === 1 && globalThis.__carouselPause === "hover") ||
        (index === 2 && globalThis.__carouselPause === "focus") ||
        (index === 3 && globalThis.__carouselPause === "motion");
      return [paused ? true : initial, () => {}];
    }
    export function useRef() { return {current: globalThis.__carouselTrack}; }
    export function useEffect(effect) { globalThis.__carouselEffects.push(effect); }
  `,
  )
  const carousel = await import(
    compile("components/ExecutiveShowcase", { react: carouselReact })
  )
  assert.equal(carousel.nextExecutiveOffset(0, 900, 1200, 300), 300)
  assert.equal(carousel.nextExecutiveOffset(300, 900, 1200, 300), 0)
  assert.equal(carousel.nextExecutiveOffset(0, 900, 600, 300), 0)
  for (const pause of ["", "hover", "focus", "motion"]) {
    globalThis.__carouselPause = pause
    globalThis.__carouselState = 0
    globalThis.__carouselEffects = []
    timers.length = 0
    carousel.default({
      profiles: Array.from({ length: 4 }, () => fixture.executives[0]),
    })
    const cleanups = globalThis.__carouselEffects.map((effect) => effect())
    assert.equal(timers.length, pause ? 0 : 1)
    if (!pause) {
      assert.equal(timers[0].delay, 3000)
      timers[0].callback()
      assert.deepEqual(scrolls.at(-1), { left: 300, behavior: "smooth" })
      timers[0].callback()
      assert.deepEqual(scrolls.at(-1), { left: 0, behavior: "smooth" })
      const count = scrolls.length
      document.hidden = true
      timers[0].callback()
      document.hidden = false
      offscreen = true
      timers[0].callback()
      offscreen = false
      assert.equal(scrolls.length, count)
    }
    cleanups.forEach((cleanup) => cleanup?.())
  }
  assert(cleared.length > 0)
  const galleryReact = write(
    "galleryReact",
    `
    export function useState(initial) {
      const index = ++globalThis.__galleryState;
      const value = index === 1 ? globalThis.__galleryIndex : index === 2 ? globalThis.__galleryPause === "hover" : index === 3 ? globalThis.__galleryPause === "focus" : globalThis.__galleryPause === "motion";
      return [value, update => { if (index === 1) globalThis.__galleryIndex = typeof update === "function" ? update(globalThis.__galleryIndex) : update; }];
    }
    export function useRef() { return {current: globalThis.__carouselTrack}; }
    export function useEffect(effect) { globalThis.__carouselEffects.push(effect); }
  `,
  )
  const gallery = await import(
    compile("components/LegacySlideshow", { react: galleryReact }),
  )
  const milestone = { year: "2025", title: "Gallery", text: "", image: "", images: ["https://example.com/a.jpg", "https://example.com/b.jpg"] }
  for (const pause of ["", "closed", "hover", "focus", "motion", "single", "empty"]) {
    globalThis.__galleryState = 0
    globalThis.__galleryIndex = 0
    globalThis.__galleryPause = pause
    globalThis.__carouselEffects = []
    timers.length = 0
    gallery.default({
      milestone: { ...milestone, images: pause === "single" ? milestone.images.slice(0, 1) : pause === "empty" ? [] : milestone.images },
      active: pause !== "closed",
    })
    const cleanups = globalThis.__carouselEffects.map(effect => effect())
    assert.equal(timers.length, pause ? 0 : 1)
    if (!pause) {
      assert.equal(timers[0].delay, 3000)
      timers[0].callback()
      assert.equal(globalThis.__galleryIndex, 1)
      timers[0].callback()
      assert.equal(globalThis.__galleryIndex, 0)
      document.hidden = true
      timers[0].callback()
      document.hidden = false
      offscreen = true
      timers[0].callback()
      offscreen = false
      assert.equal(globalThis.__galleryIndex, 0)
    }
    cleanups.forEach(cleanup => cleanup?.())
  }
  delete globalThis.getComputedStyle
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
  window.setTimeout = globalThis.setTimeout
  window.clearTimeout = globalThis.clearTimeout
  document.hidden = false
  let facebookReads = 0
  let facebookRequest
  let facebookCleanup
  let facebookState
  let rejectFacebook = false
  const feedReact = write("feedReact", `
    export function useState(initial) {
      globalThis.__facebookSetState(initial);
      return [initial, globalThis.__facebookSetState];
    }
    export function useEffect(effect) { globalThis.__facebookEffect(effect); }
  `)
  globalThis.__facebookSetState = update => { facebookState = typeof update === "function" ? update(facebookState) : update }
  globalThis.__facebookEffect = effect => { facebookCleanup = effect() }
  const feedApi = write("feedApi", `
    export const facebookRefreshInterval = 300000;
    export async function readFacebookFeed(...args) { return globalThis.__facebookRead(...args); }
  `)
  globalThis.__facebookRead = async (_url, _key, signal) => {
    facebookReads++
    facebookRequest = signal
    if (rejectFacebook) throw new Error("offline")
    return facebookFixture
  }
  const { default: useFacebookFeed } = await import(compile("useFacebookFeed", {
    react: feedReact,
    "src/facebookClient.ts": feedApi,
    "src/supabase.ts": supabase,
  }))
  useFacebookFeed()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(facebookReads, 1)
  assert.deepEqual(facebookState.feed, facebookFixture)
  window.dispatchEvent(new Event("focus"))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(facebookReads, 2)
  document.hidden = true
  tick()
  assert.equal(facebookReads, 2)
  document.hidden = false
  rejectFacebook = true
  tick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(facebookState.failed, true)
  assert.deepEqual(facebookState.feed, facebookFixture)
  facebookCleanup()
  const lastReads = facebookReads
  window.dispatchEvent(new Event("focus"))
  assert.equal(facebookReads, lastReads)
  assert.equal(tick, undefined)
  assert(facebookRequest instanceof AbortSignal)
  assert.equal(
    (fs.readFileSync("index.html", "utf8").match(/name="google-site-verification"/g) ?? []).length,
    2,
    "Preserve both Google Search Console verification tags.",
  )
  console.log(
    "PASS: registration/recovery, approval/download rendering, separate leadership/executives, legacy gallery, content refresh, Facebook API/render/fallback/polling/cleanup, and both Google verification tags.",
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
  delete globalThis.getComputedStyle
  for (const name of [
    "__carouselTrack",
    "__carouselPause",
    "__carouselState",
    "__carouselEffects",
    "__galleryState",
    "__galleryIndex",
    "__galleryPause",
    "__facebookFixture",
    "__facebookSetState",
    "__facebookEffect",
    "__facebookRead",
  ])
    delete globalThis[name]
  fs.rmSync(dir, { recursive: true, force: true })
}
