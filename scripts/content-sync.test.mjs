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
const {
  readContent,
  publishContent,
  contentSnapshot,
  currentClubTeam,
  legacyPhotos,
  maxLegacyPhotos,
} = await import(write("contentClient", contentJs))
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
  const oldProfiles = Array.from({ length: 5 }, (_, index) => ({
    name: `Person ${index + 1}`,
  }))
  const splitTeam = currentClubTeam(oldProfiles)
  assert.deepEqual(splitTeam.clubLeadership, oldProfiles.slice(0, 3))
  assert.deepEqual(splitTeam.executives, oldProfiles.slice(3))
  assert.deepEqual(
    [...splitTeam.clubLeadership, ...splitTeam.executives],
    oldProfiles,
  )
  assert.deepEqual(currentClubTeam(oldProfiles, []), {
    clubLeadership: [],
    executives: oldProfiles,
  })
  assert.deepEqual(currentClubTeam([], oldProfiles).clubLeadership, oldProfiles)
  const { moveTeamProfile, maxTeamProfiles } = await import(
    compile("admin/teamTransfer")
  )
  const transferProfile = {
    ...fixture.executives[0],
    name: "Transfer member",
    quote: "Learning and leadership.",
    image: "https://example.com/profile.jpg",
    imageZoom: 1.7,
    imageX: 37,
    imageY: 28,
  }
  const sameNameProfile = { ...transferProfile, studentId: "EB456" }
  const existingLeader = { ...transferProfile, name: "Existing leader" }
  const transferContent = {
    ...fixture,
    clubLeadership: [existingLeader],
    executives: [transferProfile, sameNameProfile],
  }
  const beforeTransfer = contentSnapshot(transferContent)
  const movedToLeadership = moveTeamProfile(
    transferContent,
    "executives",
    transferProfile,
  )
  assert.deepEqual(movedToLeadership.executives, [sameNameProfile])
  assert.deepEqual(movedToLeadership.clubLeadership, [
    existingLeader,
    transferProfile,
  ])
  assert.equal(movedToLeadership.clubLeadership.at(-1), transferProfile)
  assert.equal(
    contentSnapshot(transferContent),
    beforeTransfer,
    "Moving never mutates the input draft.",
  )
  assert.equal(movedToLeadership.leadership, transferContent.leadership)
  assert.equal(
    moveTeamProfile(movedToLeadership, "executives", transferProfile),
    movedToLeadership,
    "A stale click cannot move another member.",
  )
  assert.equal(
    moveTeamProfile(transferContent, "executives", { ...transferProfile }),
    transferContent,
    "Select by object identity, not by name.",
  )
  const movedBack = moveTeamProfile(
    movedToLeadership,
    "clubLeadership",
    transferProfile,
  )
  assert.deepEqual(movedBack.executives, [sameNameProfile, transferProfile])
  assert.deepEqual(movedBack.clubLeadership, [existingLeader])
  const emptyLeadership = moveTeamProfile(
    movedBack,
    "clubLeadership",
    existingLeader,
  )
  assert.deepEqual(emptyLeadership.clubLeadership, [])
  assert.deepEqual(
    currentClubTeam(emptyLeadership.executives, emptyLeadership.clubLeadership)
      .clubLeadership,
    [],
  )
  const fullLeadership = {
    ...transferContent,
    clubLeadership: Array.from({ length: maxTeamProfiles }, () => ({
      ...existingLeader,
    })),
  }
  assert.equal(
    moveTeamProfile(fullLeadership, "executives", transferProfile),
    fullLeadership,
    "Never remove a profile when the destination is full.",
  )
  const fullExecutives = {
    ...transferContent,
    executives: Array.from({ length: maxTeamProfiles }, () => ({
      ...sameNameProfile,
    })),
  }
  assert.equal(
    moveTeamProfile(fullExecutives, "clubLeadership", existingLeader),
    fullExecutives,
  )
  const legacyTeam = Array.from({ length: 5 }, (_, index) => ({
    ...transferProfile,
    name: `Legacy ${index}`,
  }))
  const legacyMoved = moveTeamProfile(
    { ...fixture, executives: legacyTeam },
    "executives",
    legacyTeam[3],
  )
  assert.deepEqual(legacyMoved.clubLeadership, [
    ...legacyTeam.slice(0, 3),
    legacyTeam[3],
  ])
  assert.deepEqual(legacyMoved.executives, [legacyTeam[4]])
  assert.deepEqual(legacyPhotos({ image: "https://example.com/old.jpg" }), [
    "https://example.com/old.jpg",
  ])
  assert.deepEqual(
    legacyPhotos({ image: "https://example.com/old.jpg", images: [] }),
    [],
  )
  assert.equal(
    legacyPhotos({
      image: "",
      images: Array.from(
        { length: 16 },
        (_, i) => `https://example.com/${i}.jpg`,
      ),
    }).length,
    maxLegacyPhotos,
  )
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
    posts: [
      {
        id: "451695514683833_123",
        message: "Our latest campus story.",
        createdAt: "2026-10-20T10:00:00Z",
        url: "https://www.facebook.com/451695514683833/posts/123",
        image: "https://scontent.example.fbcdn.net/story.jpg",
        mediaType: "image",
      },
    ],
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
  assert.deepEqual(
    await facebookClient.readFacebookFeed("https://test.invalid", "public-key"),
    facebookFixture,
  )
  const legacyFacebookFixture = {
    ...facebookFixture,
    posts: facebookFixture.posts.map(({ mediaType, ...post }) => post),
  }
  globalThis.fetch = async () => json(legacyFacebookFixture)
  assert.deepEqual(
    await facebookClient.readFacebookFeed("https://test.invalid", "public-key"),
    facebookFixture,
  )
  globalThis.fetch = async () =>
    json({ error: "upstream-private-details" }, 503)
  await assert.rejects(
    facebookClient.readFacebookFeed("", ""),
    /temporarily unavailable/,
  )
  for (const changes of [
    { posts: null },
    { updatedAt: "invalid" },
    { pageUrl: "javascript:alert(1)" },
    {
      posts: [{ ...facebookFixture.posts[0], url: "https://attacker.invalid" }],
    },
    {
      posts: [
        { ...facebookFixture.posts[0], image: "https://attacker.invalid" },
      ],
    },
    {
      posts: [
        {
          ...facebookFixture.posts[0],
          url: "https://www.facebook.com/post?access_token=private",
        },
      ],
    },
    { posts: [{ ...facebookFixture.posts[0], mediaType: "audio" }] },
  ]) {
    globalThis.fetch = async () => json({ ...facebookFixture, ...changes })
    await assert.rejects(
      facebookClient.readFacebookFeed("", ""),
      /could not be loaded/,
    )
  }
  const facebookHook = write(
    "facebookHook",
    "export default function useFacebookFeed() { return globalThis.__facebookFixture; }",
  )
  const { default: FacebookUpdates } = await import(
    compile("components/FacebookUpdates", {
      "src/useFacebookFeed.ts": facebookHook,
    })
  )
  globalThis.__facebookFixture = {
    feed: facebookFixture,
    loading: false,
    failed: false,
  }
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
  globalThis.__facebookFixture = {
    feed: { ...facebookFixture, stale: true },
    loading: false,
    failed: false,
  }
  assert.match(
    renderToStaticMarkup(createElement(FacebookUpdates)),
    /last available updates/,
  )
  globalThis.__facebookFixture = {
    feed: { ...facebookFixture, posts: [] },
    loading: false,
    failed: false,
  }
  assert.match(
    renderToStaticMarkup(createElement(FacebookUpdates)),
    /no recent posts/,
  )
  globalThis.__facebookFixture = { feed: null, loading: false, failed: true }
  assert.match(
    renderToStaticMarkup(createElement(FacebookUpdates)),
    /temporarily unavailable/,
  )
  globalThis.__facebookFixture = { feed: null, loading: true, failed: false }
  assert.match(
    renderToStaticMarkup(createElement(FacebookUpdates)),
    /Loading the latest club updates/,
  )
  globalThis.__facebookFixture = {
    feed: {
      ...facebookFixture,
      posts: [{ ...facebookFixture.posts[0], message: "", image: null }],
    },
    loading: false,
    failed: false,
  }
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
    "export default function useSiteContent() { return globalThis.__clubContentFixture; } export function useSiteContentState() { return { content: globalThis.__clubContentFixture, status: globalThis.__clubContentStatus ?? 'ready' }; } export function announceContentUpdate() {}",
  )
  const router = write(
    "router",
    `
    import {createElement} from "${reactUrl}";
    export function createBrowserRouter(routes) { return { routes }; }
    export function useParams() {
      const [, , group, profileKey] = (globalThis.__clubTestRoute ?? "/").split("/");
      return { group, profileKey };
    }
    export function RouterProvider({router}) {
      const path = globalThis.__clubTestRoute ?? "/";
      return createElement(router.routes.find(route => route.path === path || (path.startsWith("/profiles/") && route.path === "/profiles/:group/:profileKey")).Component);
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
    export { useRef } from "${reactUrl}";
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
  assert.match(signInHtml, /role="switch" aria-label="Night mode"/)
  assert.doesNotMatch(
    signInHtml,
    /Pause ambient animation|Motion on|Motion off|auth-orbit-map/,
  )
  assert.match(signInHtml, /auth-market-graph/)
  assert.match(signInHtml, /MARKET EQUILIBRIUM/)
  assert.match(signInHtml, /QUANTITY/)
  assert.match(signInHtml, /PRICE/)
  assert.match(signInHtml, /NOT LIVE DATA/)
  assert.match(
    signInHtml,
    /class="auth-mode-switch" role="group" aria-label="Account access"/,
  )
  assert.doesNotMatch(signInHtml, /Email me a sign-in link/)
  const modeReact = write(
    "modeReact",
    `
    export function useState(initial) { return [initial === "signin" ? globalThis.__clubAuthMode : initial, () => {}]; }
    export function useEffect() {}
    export { useRef } from "${reactUrl}";
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
  assert.match(registrationHtml, /class="auth-access-stage" data-mode="signup"/)
  assert.match(registrationHtml, /data-mode="signup" class="auth-access-card"/)
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
  assert.match(html, /executive-card leadership-card profile-card/)
  assert.match(html, /src="https:\/\/example.com\/campus\.jpg"/)
  assert.match(html, /fetchPriority="high"/i)
  assert.doesNotMatch(html, /images\.unsplash\.com/)
  assert.match(html, /\/images\/activities\/icbm-conference\.webp/)
  assert.match(html, /\/images\/activities\/corporate-grooming\.webp/)
  assert.match(html, /activity-photo-poster/)
  assert.match(html, /Source: club Facebook post/)
  assert.match(html, /Official industrial visits photo to be added/)
  assert.match(html, /Official health camps photo to be added/)
  assert(fs.existsSync("public/images/activities/icbm-conference.webp"))
  assert(fs.existsSync("public/images/activities/corporate-grooming.webp"))
  assert.match(html, /class="activity-gallery-controls"/)
  assert.match(html, /Next seminars &amp; workshops photo/)
  const { default: activityPhotos } = await import(compile("activityMedia"))
  const { activities: activityDefinitions } = await import(compile("data/club"))
  const workshopActivity = activityDefinitions.find(
    (item) => item.id === "workshops",
  )
  const workshopPhotos = activityPhotos(workshopActivity)
  assert.equal(workshopPhotos.length, 2)
  assert.equal(workshopPhotos[0].kind, "photo")
  assert.equal(workshopPhotos[1].kind, "poster")
  assert.notEqual(workshopPhotos[0].source, workshopPhotos[1].source)
  assert.equal(
    activityPhotos({
      ...workshopActivity,
      additionalImages: [
        ...workshopActivity.additionalImages,
        workshopPhotos[0],
        { ...workshopPhotos[0], src: "  " },
      ],
    }).length,
    2,
    "Blank and duplicate images do not become extra slides.",
  )
  const overridePhotos = activityPhotos(
    workshopActivity,
    " https://example.com/selected.jpg ",
  )
  assert.equal(overridePhotos.length, 1)
  assert.equal(overridePhotos[0].src, "https://example.com/selected.jpg")
  assert.equal(overridePhotos[0].source, undefined)
  assert.deepEqual(
    activityPhotos(workshopActivity, overridePhotos[0].src, []),
    [],
    "An explicit empty managed gallery does not resurrect defaults.",
  )
  const archiveClient = await import(compile("admin/facebookArchive"))
  assert.equal(
    archiveClient.suggestActivity(
      "Workshop on corporate grooming and career development",
    ),
    "leadership",
  )
  assert.equal(
    archiveClient.suggestActivity("Football tournament"),
    "tournaments",
  )
  assert.equal(
    archiveClient.suggestActivity("স্বাস্থ্য ক্যাম্প ও রক্তদান"),
    "health-camp",
  )
  assert.equal(
    archiveClient.suggestActivity("Department farewell memories"),
    "",
    "Ambiguous events are not mislabelled as tours or sports.",
  )
  const archivePost = {
    id: "451695514683833_123",
    message: "Research workshop",
    createdAt: "2026-10-01T10:00:00Z",
    url: "https://www.facebook.com/451695514683833/posts/123",
    images: [],
  }
  const archivePhoto = {
    id: `${archivePost.id}-${"a".repeat(24)}`,
    url: "https://scontent.example.fbcdn.net/one.jpg",
    preview: false,
  }
  const mergedArchive = archiveClient.mergeArchivePosts([archivePost], [
    { ...archivePost, images: [archivePhoto, archivePhoto] },
  ])
  assert.equal(mergedArchive.length, 1)
  assert.equal(mergedArchive[0].images.length, 1)
  assert.equal(archivePost.images.length, 0)
  const batch = {
    posts: mergedArchive,
    nextCursor: null,
    complete: true,
    partial: false,
    postsScanned: 1,
    requestsScanned: 2,
    photosFound: 1,
    warnings: [],
  }
  assert.equal(
    (
      await archiveClient.readArchive(
        async () => Response.json(batch),
        undefined,
        new AbortController().signal,
      )
    ).complete,
    true,
  )
  await assert.rejects(
    archiveClient.readArchive(
      async () => Response.json({ error: "Missing route" }, { status: 404 }),
      undefined,
      new AbortController().signal,
    ),
    /Deploy the updated Supabase backend/,
  )
  await assert.rejects(
    archiveClient.readArchive(
      async () =>
        Response.json({
          ...batch,
          nextCursor: "https://graph.facebook.com/?access_token=private",
        }),
      undefined,
      new AbortController().signal,
    ),
    /invalid/,
  )
  const importedPhoto = {
    src: "https://storage.example.com/permanent.jpg",
    alt: "Official workshop",
    kind: "photo",
    source: archivePost.url,
  }
  const importedDraft = archiveClient.appendActivityPhoto(
    fixture,
    "workshops",
    importedPhoto,
  )
  assert.equal(importedDraft.activityGalleries.workshops.length, 3)
  assert.equal(
    importedDraft.activityGalleries.workshops.at(-1).src,
    importedPhoto.src,
  )
  assert.equal(
    fixture.activityGalleries,
    undefined,
    "Importing a photo never mutates the saved content.",
  )
  assert.equal(
    archiveClient.appendActivityPhoto(
      importedDraft,
      "workshops",
      importedPhoto,
    ),
    importedDraft,
  )
  assert.equal(
    archiveClient.appendActivityPhoto(
      importedDraft,
      "not-an-activity",
      importedPhoto,
    ),
    importedDraft,
  )
  assert.equal(
    activityPhotos(
      workshopActivity,
      overridePhotos[0].src,
      importedDraft.activityGalleries.workshops,
    ).length,
    3,
    "A published gallery takes priority over the legacy cover field.",
  )
  const { default: FacebookPhotoLibrary } = await import(
    compile("admin/FacebookPhotoLibrary")
  )
  const libraryHtml = renderToStaticMarkup(
    createElement(FacebookPhotoLibrary, {
      request: async () =>
        assert.fail("The archive only reads after an explicit admin action."),
      content: fixture,
      disabled: false,
      onAdd() {},
      onPending() {},
    }),
  )
  assert.match(libraryHtml, /Start new history scan/)
  assert.match(libraryHtml, /Review before publishing/)
  assert.match(libraryHtml, /Not complete/)
  assert.equal(
    activityPhotos(activityDefinitions.find((item) => item.id === "tours"))
      .length,
    0,
  )
  const activityGalleryReact = write(
    "activityGalleryReact",
    `
    export function useState(initial) { return [initial === 0 ? globalThis.__activityPhotoIndex : initial, () => {}]; }
    export { useRef } from "${reactUrl}";
  `,
  )
  const { default: ActivityGallery } = await import(
    compile("components/ActivityGallery", { react: activityGalleryReact })
  )
  globalThis.__activityPhotoIndex = 1
  const secondPhotoHtml = renderToStaticMarkup(
    createElement(ActivityGallery, { activity: workshopActivity }),
  )
  assert.match(secondPhotoHtml, /corporate-grooming\.webp/)
  assert.match(secondPhotoHtml, /activity-photo-poster/)
  assert.match(secondPhotoHtml, /122207414948536052/)
  assert.match(secondPhotoHtml, /2 \/ 2/)
  assert.doesNotMatch(
    secondPhotoHtml,
    /icbm-conference\.webp|122204199176536052/,
    "Only the selected photo and its source are shown.",
  )
  const pendingGalleryHtml = renderToStaticMarkup(
    createElement(ActivityGallery, {
      activity: workshopActivity,
      pending: true,
    }),
  )
  assert.doesNotMatch(pendingGalleryHtml, /<img|<button|Source: club Facebook/)
  const overrideGalleryHtml = renderToStaticMarkup(
    createElement(ActivityGallery, {
      activity: workshopActivity,
      publishedImage: overridePhotos[0].src,
    }),
  )
  assert.match(overrideGalleryHtml, /selected\.jpg/)
  assert.doesNotMatch(
    overrideGalleryHtml,
    /<button|Source: club Facebook|icbm-conference\.webp/,
  )
  delete globalThis.__activityPhotoIndex
  globalThis.__clubContentFixture = {}
  globalThis.__clubContentStatus = "loading"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Loading the latest photo/)
  assert.doesNotMatch(html, /class="campus-image" src=|images\.unsplash\.com/)
  assert.doesNotMatch(
    html,
    /src="\/images\/activities\//,
    "Wait for published overrides before requesting fallback activity photos.",
  )
  globalThis.__clubContentStatus = "error"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Campus photo is temporarily unavailable/)
  assert.doesNotMatch(html, /images\.unsplash\.com|src=""/)
  delete globalThis.__clubContentStatus
  globalThis.__clubContentFixture = {
    ...fixture,
    activityImages: { leadership: "https://example.com/saved-leadership.jpg" },
  }
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /src="https:\/\/example.com\/saved-leadership\.jpg"/)
  assert.doesNotMatch(
    html,
    /corporate-grooming\.webp|122207414948536052/,
    "Admin media must not inherit a different photo's Facebook attribution.",
  )
  globalThis.__clubContentFixture = fixture
  html = renderToStaticMarkup(createElement(App))
  const failedMediaReact = write(
    "failedMediaReact",
    `
    export function useState() { return ["https://example.com/missing.jpg", () => {}]; }
  `,
  )
  const { default: FailedMedia } = await import(
    compile("components/ManagedImage", { react: failedMediaReact })
  )
  const failedMediaHtml = renderToStaticMarkup(
    createElement(FailedMedia, {
      src: "https://example.com/missing.jpg",
      alt: "Published campus",
      className: "campus-image",
      eager: true,
    }),
  )
  assert.match(failedMediaHtml, /Photo temporarily unavailable/)
  assert.doesNotMatch(failedMediaHtml, /<img|images\.unsplash\.com/)
  const { default: ExecutiveCard } = await import(
    compile("components/ExecutiveCard")
  )
  const portraitCard = renderToStaticMarkup(
    createElement(ExecutiveCard, {
      role: "General Secretary",
      description: "Coordinating the club community.",
      index: 0,
      total: 1,
      person: {
        name: "Profile Member",
        image: "https://example.com/portrait.jpg",
        imageX: 35,
        imageY: 25,
        imageZoom: 1.2,
        studentId: "EB42",
        batch: "26",
        quote: "Learning together.",
      },
    }),
  )
  assert.match(
    portraitCard,
    /<h3>Profile Member<\/h3><p class="profile-role">General Secretary<\/p>/,
  )
  assert.match(portraitCard, /object-position:35% 25%/)
  assert.match(portraitCard, /scale\(1\.2\)/)
  assert.match(portraitCard, /class="profile-portrait-stage"/)
  assert.match(portraitCard, /class="profile-club-seal" aria-hidden="true"/)
  assert.doesNotMatch(
    portraitCard,
    /profile-edition|COMMITTEE · IIUC|LEADERSHIP · IIUC/,
  )
  const executiveLabelCard = renderToStaticMarkup(
    createElement(ExecutiveCard, {
      role: "Executive Member",
      description: "Supporting the club community.",
      index: 3,
      total: 4,
      leadership: false,
    }),
  )
  assert.match(executiveLabelCard, /Executives Economics &amp; Banking Club/)
  assert.doesNotMatch(executiveLabelCard, /profile-edition|COMMITTEE · IIUC/)
  assert.match(portraitCard, /class="profile-open-link"/)
  assert.match(portraitCard, /href="\/profiles\/leadership\/id-eb42"/)
  assert.doesNotMatch(portraitCard, /<details class="profile-disclosure">/)
  assert(
    portraitCard.indexOf("<h3>Profile Member</h3>") <
      portraitCard.indexOf('class="profile-registry"'),
    "Capsule headers lead with the person's name, not the registry label.",
  )
  assert.match(portraitCard, /View profile details for Profile Member/)
  assert.match(portraitCard, /View profile <svg/)
  assert.doesNotMatch(portraitCard, /Follow|followers/i)
  assert.match(portraitCard, /ID: EB42/)
  assert.match(portraitCard, /Batch: 26/)
  assert.doesNotMatch(
    portraitCard,
    /Learning together/,
    "Cards link to the profile rather than rendering saved quotes.",
  )
  assert.doesNotMatch(
    portraitCard.split('class="executive-info"')[0],
    /executive-reveal/,
  )
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
  const completeRoster = html
    .split("CLUB EXECUTIVES")[1]
    .split("join-banner")[0]
  assert(
    completeRoster,
    "The executive section must not disappear with only four profiles.",
  )
  for (let index = 1; index <= 3; index++)
    assert(!completeRoster.includes(`Leader ${index}`))
  assert.match(completeRoster, /Leader 4/)
  assert.match(completeRoster, /ID: EB4/)
  assert.doesNotMatch(
    completeRoster,
    /<button|Pause auto-slide|Resume auto-slide/,
  )

  globalThis.__clubContentFixture = {
    ...fixture,
    clubLeadership: Array.from({ length: 5 }, (_, index) => ({
      ...fixture.executives[0],
      name: `Featured Leader ${index + 1}`,
    })),
    executives: [{ ...fixture.executives[0], name: "Independent Executive" }],
    legacy: [
      {
        year: "2025",
        title: "Programme gallery",
        text: "Our programme",
        image: "https://example.com/cover.jpg",
        images: Array.from(
          { length: 15 },
          (_, index) => `https://example.com/programme-${index + 1}.jpg`,
        ),
      },
    ],
  }
  html = renderToStaticMarkup(createElement(App))
  const leadersOnly = html
    .split("CLUB LEADERSHIP")[1]
    .split("CLUB EXECUTIVES")[0]
  assert.match(leadersOnly, /Featured Leader 5/)
  assert.doesNotMatch(leadersOnly, /Independent Executive/)
  const executivesOnly = html
    .split("CLUB EXECUTIVES")[1]
    .split("join-banner")[0]
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
  const emptyRoster = globalThis.__clubContentFixture
  globalThis.__clubContentFixture = {
    ...emptyRoster,
    leadership: {
      "former-presidents": [
        {
          name: "Archived Member",
          designation: "Former President",
          session: "2024–2025",
          image: "https://example.com/former-member.jpg",
        },
      ],
    },
  }
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /archive-profile-card profile-card/)
  assert.doesNotMatch(html, /profile-edition/)
  assert.match(
    html,
    /<h3>Archived Member<\/h3><p class="profile-role">Former President<\/p>/,
  )
  assert.match(html, /2024–2025/)
  assert.match(html, /class="archive-profile-photo"/)
  assert.match(html, /class="archive-profile-session"/)
  assert.match(
    html,
    /href="\/profiles\/former-presidents\/archived-member-former-president-2024-2025"/,
  )
  const { profileDirectory, findProfile, profileHref } = await import(
    compile("profileDirectory")
  )
  const profileFixture = {
    ...fixture,
    clubLeadership: [],
    executives: [
      {
        name: "Profile Member",
        designation: "General Secretary",
        studentId: "EB42",
        batch: "26",
        image: "https://example.com/portrait.jpg",
        imageX: 35,
        imageY: 25,
        imageZoom: 1.2,
        quote: "Learning together.",
      },
    ],
  }
  const { default: roleQuote, roleSpeech } = await import(
    compile("data/roleQuotes")
  )
  const mainRoles = [
    "President",
    "Vice President",
    "General Secretary",
    "Assistant General Secretary",
    "Joint Secretary",
    "Treasurer",
    "Organizing Secretary",
    "Executive Member",
    "Faculty Advisor",
  ]
  assert.equal(
    new Set(mainRoles.map(roleQuote)).size,
    mainRoles.length,
    "Each defined designation gets its own role inspiration.",
  )
  assert.equal(roleQuote("  VICE-PRESIDENT  "), roleQuote("Vice President"))
  assert.equal(
    roleQuote("Former General Secretary"),
    roleQuote("General Secretary"),
  )
  assert.equal(roleQuote("Faculty Adviser"), roleQuote("Faculty Advisor"))
  assert.equal(roleQuote(""), roleQuote("Executive Member"))
  assert.match(roleQuote("Community Coordinator"), /Community Coordinator/)
  assert.equal(new Set(mainRoles.map(roleSpeech)).size, mainRoles.length)
  for (const designation of [
    ...mainRoles,
    "Former President",
    "Community Coordinator",
    "constructor",
    "",
  ]) {
    const lines = roleSpeech(designation).split("\n")
    assert.equal(
      lines.length,
      3,
      `${designation || "Unspecified role"} gets a three-line speech.`,
    )
    assert(lines.every((line) => line.trim().length > 0))
  }
  assert.equal(roleSpeech("  VICE-PRESIDENT "), roleSpeech("Vice President"))
  assert.equal(roleSpeech("Faculty Adviser"), roleSpeech("Faculty Advisor"))
  assert.notEqual(roleSpeech("Former President"), roleSpeech("President"))
  assert.equal(roleSpeech("Executive slot 07"), roleSpeech("Executive Member"))
  let directory = profileDirectory(profileFixture)
  assert.equal(
    profileHref(profileFixture.executives[0], "executives", 0),
    "/profiles/executives/id-eb42",
  )
  assert.equal(
    findProfile(directory, "executives", "id-eb42").person,
    profileFixture.executives[0],
  )
  assert.equal(findProfile(directory, "unknown", "id-eb42"), undefined)
  assert.equal(findProfile(directory, "executives", "missing"), undefined)
  assert.equal(
    profileDirectory({ ...fixture, executives: [], clubLeadership: [] }).filter(
      (entry) => ["leadership", "executives"].includes(entry.group),
    ).length,
    0,
  )
  directory = profileDirectory({
    ...profileFixture,
    executives: [],
    clubLeadership: profileFixture.executives,
  })
  assert.equal(
    findProfile(directory, "executives", "id-eb42").group,
    "leadership",
    "Shared links survive a transfer between current team sections.",
  )
  globalThis.__clubContentFixture = profileFixture
  globalThis.__clubTestRoute = "/profiles/executives/id-eb42"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /class="member-poster"/)
  assert.match(html, /<h1 id="member-name">Profile<span>Member<\/span><\/h1>/)
  assert.match(html, /General Secretary/)
  assert.match(html, /Student ID/)
  assert.match(html, /EB42/)
  assert.match(html, /Batch/)
  assert.doesNotMatch(html, /Learning together/)
  assert.match(html, /I believe clear communication builds trust/)
  assert.match(html, /ROLE INSPIRATION/)
  assert.match(html, /Clear communication turns shared plans into progress/)
  assert.match(html, /IN THEIR WORDS/)
  assert.match(html, /Suggested role-based message/)
  assert.doesNotMatch(html, /Ideas\.|Into impact\./)
  assert.match(html, /object-position:35% 25%/)
  assert.match(html, /scale\(1\.2\)/)
  assert.match(html, /CLUB AFFILIATION/)
  assert.match(html, /Club contact, not a personal contact address/)
  assert.match(html, /Copy profile link/)
  assert.match(html, /role="switch" aria-label="Night mode"/)
  assert.doesNotMatch(html, /followers|GPA|Phone number|Personal email/i)
  globalThis.__clubContentFixture = {
    ...profileFixture,
    executives: [{ ...profileFixture.executives[0], quote: "   " }],
  }
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /IN THEIR WORDS/)
  assert.match(
    html,
    /I believe clear communication builds trust\.\nMy aim is to connect people and plans\.\nTogether, we can make every effort count\./,
  )
  assert.match(html, /Suggested role-based message/)
  assert.doesNotMatch(html, /Learning together\.|ROLE AT A GLANCE/)
  for (const designation of mainRoles) {
    globalThis.__clubContentFixture = {
      ...profileFixture,
      executives: [{ ...profileFixture.executives[0], designation }],
    }
    html = renderToStaticMarkup(createElement(App))
    assert(
      html.includes(roleSpeech(designation)),
      `${designation} shows its full speech even when a personal quote is saved.`,
    )
    assert.doesNotMatch(html, /Learning together/)
    assert.match(html, /Suggested role-based message/)
    assert.equal(
      globalThis.__clubContentFixture.executives[0].quote,
      "Learning together.",
      "Display changes must not overwrite saved quotes.",
    )
  }
  globalThis.__clubTestRoute = "/profiles/executives/missing"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /This profile is no longer listed/)
  globalThis.__clubContentStatus = "loading"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /Opening the profile/)
  assert.doesNotMatch(html, /This profile is no longer listed/)
  globalThis.__clubContentStatus = "error"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /We couldn’t load this profile/)
  assert.match(html, /Try again/)
  delete globalThis.__clubContentStatus
  globalThis.__clubContentFixture = {
    ...emptyRoster,
    leadership: {
      "former-presidents": [
        {
          name: "Archived Member",
          designation: "Former President",
          session: "2024–2025",
          image: "",
        },
      ],
    },
  }
  globalThis.__clubTestRoute =
    "/profiles/former-presidents/archived-member-former-president-2024-2025"
  html = renderToStaticMarkup(createElement(App))
  assert.match(html, /2024–2025/)
  assert.match(html, /From our leadership archive/)
  assert.match(html, /PORTRAIT TO BE ADDED/)
  assert.doesNotMatch(html, /Student ID/)
  assert.match(html, /I believe the value of leadership lies in service/)
  assert.match(html, /Suggested role-based message/)
  globalThis.__clubContentFixture = emptyRoster
  globalThis.__clubTestRoute =
    "/leadership/former-assistant-general-secretaries"
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
    compile("components/LegacySlideshow", { react: galleryReact })
  )
  const milestone = {
    year: "2025",
    title: "Gallery",
    text: "",
    image: "",
    images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
  }
  for (const pause of [
    "",
    "closed",
    "hover",
    "focus",
    "motion",
    "single",
    "empty",
  ]) {
    globalThis.__galleryState = 0
    globalThis.__galleryIndex = 0
    globalThis.__galleryPause = pause
    globalThis.__carouselEffects = []
    timers.length = 0
    gallery.default({
      milestone: {
        ...milestone,
        images:
          pause === "single"
            ? milestone.images.slice(0, 1)
            : pause === "empty"
              ? []
              : milestone.images,
      },
      active: pause !== "closed",
    })
    const cleanups = globalThis.__carouselEffects.map((effect) => effect())
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
    cleanups.forEach((cleanup) => cleanup?.())
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
    export function useState(initial) {
      return [initial, value => {
        if (typeof initial === "string") globalThis.__clubHookStatus = value;
        else globalThis.__clubHookValue = value;
      }];
    }
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
  assert.equal(globalThis.__clubHookStatus, "ready")
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
  const feedReact = write(
    "feedReact",
    `
    export function useState(initial) {
      globalThis.__facebookSetState(initial);
      return [initial, globalThis.__facebookSetState];
    }
    export function useEffect(effect) { globalThis.__facebookEffect(effect); }
  `,
  )
  globalThis.__facebookSetState = (update) => {
    facebookState =
      typeof update === "function" ? update(facebookState) : update
  }
  globalThis.__facebookEffect = (effect) => {
    facebookCleanup = effect()
  }
  const feedApi = write(
    "feedApi",
    `
    export const facebookRefreshInterval = 300000;
    export async function readFacebookFeed(...args) { return globalThis.__facebookRead(...args); }
  `,
  )
  globalThis.__facebookRead = async (_url, _key, signal) => {
    facebookReads++
    facebookRequest = signal
    if (rejectFacebook) throw new Error("offline")
    return facebookFixture
  }
  const { default: useFacebookFeed } = await import(
    compile("useFacebookFeed", {
      react: feedReact,
      "src/facebookClient.ts": feedApi,
      "src/supabase.ts": supabase,
    })
  )
  useFacebookFeed()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(facebookReads, 1)
  assert.deepEqual(facebookState.feed, facebookFixture)
  window.dispatchEvent(new Event("focus"))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(facebookReads, 2)
  document.hidden = true
  tick()
  assert.equal(facebookReads, 2)
  document.hidden = false
  rejectFacebook = true
  tick()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(facebookState.failed, true)
  assert.deepEqual(facebookState.feed, facebookFixture)
  facebookCleanup()
  const lastReads = facebookReads
  window.dispatchEvent(new Event("focus"))
  assert.equal(facebookReads, lastReads)
  assert.equal(tick, undefined)
  assert(facebookRequest instanceof AbortSignal)
  assert.equal(
    (
      fs
        .readFileSync("index.html", "utf8")
        .match(/name="google-site-verification"/g) ?? []
    ).length,
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
