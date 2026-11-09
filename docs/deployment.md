# Automatic production deployment

## What is automated, and what is not

`.github/workflows/deploy.yml` checks pull requests. A push to the GitHub
repository's `main` branch runs the same checks, builds the frontend, deploys the
Supabase Edge Function and publishes `dist/` (along with `./functions`) to
Cloudflare Pages (`ebclubiiuc`).
Failed checks stop deployment. Production deploys are serialized.

## Production domain

The canonical site is **https://ebclub.iiuc.ac.bd**. Keep the existing
Cloudflare Pages project `ebclubiiuc` and the university DNS record:

```text
ebclub.iiuc.ac.bd CNAME ebclubiiuc.pages.dev
```

`functions/_middleware.js` permanently redirects the exact production alias
`ebclubiiuc.pages.dev` to the custom domain. GET/HEAD requests receive 301;
other methods use 308 to preserve their request method/body. Paths and query
strings are preserved. The custom domain and development/preview hosts pass
through without redirecting. The alias remains a DNS/hosting target, not a
second public site. Do not delete the project or remove the CNAME target.

Hostname redirects cannot be expressed in Cloudflare's path-only `_redirects`
file. Deploy the root Pages middleware with the frontend using the existing
Wrangler workflow; copying only `dist/` without `functions/` will omit the
redirect. Root middleware executes on all requests, including static assets,
so monitor the Pages Functions request allowance for the account.

The owner's Supabase Auth configuration must use:

- Site URL: `https://ebclub.iiuc.ac.bd`
- Redirect URLs: `https://ebclub.iiuc.ac.bd/admin` and
  `https://ebclub.iiuc.ac.bd/admin/reset-password`

Users must sign in again on the new origin; browser-local login sessions and
theme settings do not transfer between domains. Accounts and saved club
content remain in the same Supabase project. Previously issued recovery
emails may point to the old origin; request a fresh email on the new domain.

After deployment, verify:

```sh
curl -I 'https://ebclubiiuc.pages.dev/admin?from=old'
# 301; Location: https://ebclub.iiuc.ac.bd/admin?from=old
curl -I 'https://ebclub.iiuc.ac.bd/'
# Serves the site; no redirect back to pages.dev
```

Check profile deep links, login, recovery, Facebook embeds and protected ZIP
downloads on the new domain. A Make preview build does not publish this change.

This workflow cannot see uncommitted Figma Make edits. This workspace's current
`origin` is Figma-managed, not `taasran/eb_club`; saving a Make prompt does not
prove that GitHub received a commit. Use the project's supported GitHub
export/sync flow or have a developer push the reviewed changes to
`taasran/eb_club`. Do not replace the Make-managed remote or install a
credential-bearing “push on every file save” watcher.

The workflow files are prepared, but production automation is **not activated
or verified** until the repository connection and credentials below are set.

## One-time account setup

1. Put these files in `taasran/eb_club`, on its `main` branch, and enable GitHub
   Actions if the repository has it disabled.
2. Open **GitHub repository → Settings → Secrets and variables → Actions**.
3. Add these **repository secrets**, using credentials from accounts you own:

   | Secret | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages deployment access |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for the `ebclubiiuc` project |
   | `SUPABASE_ACCESS_TOKEN` | Supabase access token authorized for the connected project |

4. The workflow defaults to Supabase project `ywwyzqlqmpcosiuszowt`. If it changes,
   set the repository **variable** `SUPABASE_PROJECT_REF` and update the browser
   project's supported Supabase connection as well. Changing just the deploy
   target would make the editor and public website use different databases.
5. Confirm the existing Supabase project has its runtime secrets and KV table.
   Deploying a function does not provision a new database or transfer account
   ownership. The existing Make-connected project already provides the runtime
   Supabase credentials.
6. In GitHub **Actions → Check and deploy**, run the workflow on `main`. Verify
   all steps turn green and Cloudflare Pages shows a new published deploy.

Never paste these tokens into chat, commit them, or put them in `VITE_*`
variables. Review which repository collaborators may push to `main`, because
they can trigger production deployments. Use branch protection/reviews if needed.

## Avoid duplicate deployments

Choose one frontend deployment mechanism. The supplied workflow publishes the
already-tested build through Wrangler CLI (`wrangler pages deploy dist`). If the
Cloudflare Pages project also has automatic Git builds enabled for every push,
disable duplicate automatic builds in the Cloudflare dashboard after confirming
this workflow succeeds.

The build creates `private-downloads/` outside `dist/`. Do not copy this directory
into the public site or replace the download function with a static ZIP link.
The build creates a private `source-snapshot.mjs` dependency that Wrangler
bundles inside `./functions/api/project-source.js`.
Old public download aliases are forced through that endpoint
by `public/_redirects`; preserve these rules above the SPA fallback.

## Normal changes after setup

```text
Reviewed source update reaches GitHub main
  → frozen-lockfile install
  → regression tests and TypeScript
  → production build
  → Supabase backend deployment
  → Cloudflare Pages frontend deployment
```

No production credentials are exposed to pull-request checks. The CLI versions
are pinned in the workflow; update them deliberately. Content-only changes from the admin dashboard do
not trigger a build or deployment.

## Troubleshooting and rollback

- **No Actions run:** check that a commit actually reached GitHub `main`.
- **Missing secret:** add the named secret through GitHub Settings, then rerun.
- **Supabase deployment failed:** check token/project access and
  `supabase/config.toml`. The frontend step will not run after this failure.
- **Frontend deployment failed:** check Cloudflare token/account access. The backend
  may already be updated; the two services do not deploy atomically.
- **Wrong frontend project:** confirm `CLOUDFLARE_PROJECT_NAME` (`ebclubiiuc`) points to the existing
  project before enabling automation. Do not create a replacement project.
- **Rollback:** roll back to a previous successful deployment in Cloudflare Pages,
  then use a reviewed revert commit for source/backend changes. Republishing
  only the frontend does not roll back database content or the backend.
