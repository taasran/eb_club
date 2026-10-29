# IIUC Economics & Banking Club

React 19, TypeScript, Vite and Tailwind CSS v4. The public site and admin
dashboard share a Supabase API; Netlify serves the built frontend.

## Start here

```sh
pnpm install --frozen-lockfile
pnpm run check
```

Use Node.js 22 and pnpm 10.34.3, as specified in `.mise.toml`. In Figma Make the
development server is already running: edit source files and use the preview.
For a separate local checkout, `pnpm dev` starts Vite.

## Where to make changes

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Route registration, page metadata and visit tracking |
| `src/pages/HomePage.tsx` | Homepage sections and interactions |
| `src/pages/ArchivePage.tsx` | Leadership directories and year-wise archive |
| `src/pages/NotFoundPage.tsx` | Unknown routes |
| `src/pages/ResetPasswordPage.tsx` | Password recovery callback and new-password form |
| `src/components/` | Shared public-site icons and executive profile card |
| `src/data/club.ts` | Placeholder copy used before managed content exists |
| `src/AdminPage.tsx` | Admin sign-in, editors, inbox and analytics |
| `src/admin/config.ts` | Admin defaults, tabs and leadership-section definitions |
| `src/AdminAccess.tsx` | Owner-only account review, approval and deletion |
| `src/admin/AdminAuth.tsx` | Sign-in, profile registration and forgot-password forms |
| `src/admin/onboarding.ts` | Validated registration/recovery requests and public callback URLs |
| `src/admin/PasswordField.tsx` | Shared accessible password visibility control |
| `src/admin/ProjectDownload.tsx` | Owner-facing source download and snapshot details |
| `scripts/export-source.mjs` | Refresh source ZIP before each production build |
| `src/contentClient.ts` | Content types, API reads and verified publishing |
| `src/useSiteContent.ts` | Public-page content refresh subscriptions |
| `src/lib/analytics.ts` | Approximate browser-local visit tracking |
| `src/supabase.ts` | Browser Supabase client and shared API address |
| `src/index.css` | Existing design tokens, global fonts and site styles |
| `src/theme.ts`, `src/theme.css` | Browser-local theme preference, semantic night palette and themed surfaces |
| `src/admin/auth.css`, `src/admin/AuthAtmosphere.tsx` | Responsive animated content-studio entrance |
| `supabase/functions/server/` | API, authorization and validation |
| `public/` | Static assets, sitemap, robots, Netlify headers and redirects |
| `.github/workflows/deploy.yml` | Checks and production deployment on a `main` push |

The generated files `utils/supabase/info.tsx` and
`supabase/functions/server/kv_store.tsx` are platform-managed; do not edit them.

## How a content edit reaches the website

1. An authorized user edits content and clicks **Save changes**.
2. `publishContent` sends it to the protected API.
3. The API validates the content and persists it to the KV table.
4. The editor reads the public API back before reporting success.
5. Public pages refresh on focus, after a same-origin save and every 30 seconds
   while visible.

Empty saved lists mean “no published records”; do not replace them with
placeholder records. An ordinary content edit does **not** require a code deploy.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run test` | Content publication/render/refresh and authorization regressions |
| `pnpm run typecheck` | Frontend TypeScript check |
| `pnpm run test:theme` | Theme defaults, persistence, cross-tab sync and storage-failure regressions |
| `pnpm run check` | Both tests and typechecking; used by CI |
| `pnpm run build` | Production frontend in `dist/` |
| `pnpm run source:export` | Refresh the preview's downloadable source snapshot without deploying |
| `pnpm format <paths>` | Format the files you changed with the project's oxfmt |

The render tests use mocked APIs and never write to production data. Backend
authorization and account-service tests cover ID-bound approval, revocation,
deletion errors and private profile responses using fake Auth/KV dependencies.
They are not a substitute for an authenticated staging smoke test or an actual
confirmation/recovery email delivery test.

## Project code download

Approved owners, admins and moderators have a **Latest project code** card and a
sidebar shortcut. The loading screen, login form and homepage do not expose a
source download. `pnpm run build` regenerates `private-downloads/eb-club-source.zip`
and its JSON metadata outside the published `dist` directory.
For source edits visible only in the Make preview, run `pnpm run source:export`
to refresh the snapshot without publishing. This does not push to GitHub.

The Netlify `project-source` function validates the bearer session against the
club backend's `/admin/session` on every metadata/download request. It rejects
pending or revoked users, never publicly caches the response, and bundles the
private snapshot as a static function-bundle dependency. No new deployment secret is
required. The Make preview uses this protected service on the public club domain;
the function must be deployed before preview downloads work.

The snapshot includes the frontend, backend, tests, workflow and static assets.
Environment files, Git/platform state, dependencies, build output, private-key
files and nested archives are excluded. The export fails for recognized private
token/service-role-key patterns; this is a safety net, not a replacement for
reviewing source before publishing it. The archive is not a database/Auth/storage
backup or a private secret store. Builds remove legacy public source ZIP aliases
and strip source files from the old public design package. Previously downloaded
copies, public GitHub source and old immutable deploy URLs are not revoked by this
change; manage repository visibility and old deployments separately if needed.

## Facebook Page updates

The homepage reads up to six Page posts through the existing Supabase backend.
Facebook credentials stay in Supabase runtime secrets, never in the React app.
The server caches sanitized posts for five minutes and falls back to recently
cached posts during temporary failures. Visible pages poll automatically; there
is no background import or webhook. Non-Latin captions use English fallback copy.

See [Facebook integration setup](docs/facebook-integration.md) for the two secret
names, deployment steps, token renewal and troubleshooting.

## Executive showcase

### Moving profiles between sections

In the admin editor, every current team profile has **Move to Leadership** or
**Move to Club Executives**. Confirming removes the selected profile from its
source and appends it to the destination draft, preserving its name, designation,
ID, batch, photo, quote and crop/zoom settings. It does not create a copy or
change the designation automatically. Moves wait until image uploads finish.

Click **Save changes** to publish both lists through the existing verified
content-save flow. **Discard** restores all unsaved edits, including moves.
The destination's 300-profile validation limit is enforced before moving.
No backend schema change or special account privilege is added.

Club Leadership is a compact summary of the first four saved profiles. The Club
Executives section below it shows the complete committee, including those leaders
with their IDs/batches. It remains visible when only four or fewer profiles exist.
The native smooth-scroll carousel advances every four seconds when visible,
pauses on hover/focus and supports Pause/Resume, keyboard arrows and touch. It
does not auto-animate for reduced-motion users or when every card fits on screen.

Current and archived members share the compact, rounded portrait-card design in
`src/components/profile-cards.css`: edge-to-edge photos with a frosted caption
panel, translucent ivory in day mode and smoke glass at night.
Executive cards use “Executives Economics & Banking Club”; leadership and archive
cards keep their own descriptive labels. Decorative card numbers are omitted.
Names appear above designations. Existing photo crop/zoom settings, IDs, batches,
sessions, quotes and responsibilities remain intact. The keyboard-accessible
**View profile** disclosure reveals the quote/responsibility; longer content
scrolls within the glass panel without resizing the carousel. It is not a fake
Follow action and does not display invented follower counts.
The club-crest medallion and subtle pointer-only lift finish the cards.
Reduced-motion preferences disable movement.

## Day and night appearance

Public-page top bars, the login toolbar, admin dashboard, password recovery and
not-found page share the keyboard-accessible Day/Night switch. On a first visit,
the theme follows the device preference. A manual choice is stored only in this
browser under `eb-club-theme`, persists across reloads and synchronizes between
tabs. No account or server preference is changed. If browser storage is blocked,
switching still works for the current tab. The initial HTML applies the theme
before rendering to avoid a light flash.

`src/theme.css` extends the existing club tokens with a deep-emerald night
palette. Keep brand-panel/photograph text separate from surface text, and use
semantic tokens instead of adding isolated dark backgrounds. The login artwork
is decorative, not live statistics. Its Motion control pauses the ambient
animation, and `prefers-reduced-motion` disables it automatically. Sign-in,
account review and password recovery use the unchanged Supabase flows.

## Conventions for the next developer

- Use descriptive names and straightforward functions; keep page-specific state
  in the page that owns it.
- Put reusable UI in `components`, static fallback copy in `data`, and API logic
  in `contentClient` or the backend—not inside render markup.
- Reuse the existing design tokens/classes and icon components. No visual
  redesign was intended by this file split.
- Explain decisions in short comments, not what every line of code does.
- Never place service-role keys or deployment tokens in browser code.
- Preserve the Google Search Console verification meta tag in `index.html`.
- Keep the public API route/function name stable unless frontend and backend
  are migrated together.

See [deployment setup](docs/deployment.md) for auto-deploy prerequisites and
[backend setup](supabase/ADMIN_SETUP.md) for roles and API behavior.
