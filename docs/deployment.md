# Automatic production deployment

## What is automated, and what is not

`.github/workflows/deploy.yml` checks pull requests. A push to the GitHub
repository's `main` branch runs the same checks, builds the frontend, deploys the
Supabase function and finally publishes `dist/` and the protected source-download
Netlify function to the existing Netlify site.
Failed checks stop deployment. Production deploys are serialized.

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
   | `NETLIFY_AUTH_TOKEN` | Netlify personal access token with deployment access |
   | `NETLIFY_SITE_ID` | ID of the existing `ebclubiiuc` site, not its URL |
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
   all steps turn green and Netlify shows a new published deploy.

Never paste these tokens into chat, commit them, or put them in `VITE_*`
variables. Review which repository collaborators may push to `main`, because
they can trigger production deployments. Use branch protection/reviews if needed.

## Avoid duplicate deployments

Choose one frontend deployment mechanism. The supplied workflow publishes the
already-tested build through Netlify CLI. If the Netlify site also has native
Git builds enabled for every push, stop those automatic native builds in the
Netlify dashboard after confirming this workflow succeeds. Otherwise the same
commit may deploy twice and consume extra credits.

`netlify.toml` also defines the correct build command and output directory for a
developer who deliberately chooses native Netlify Git builds instead. Native
Netlify builds alone do not deploy the Supabase backend.

The build creates `private-downloads/` outside `dist/`. Do not copy this directory
into the public site or replace the download function with a static ZIP link.
The build creates a private `source-snapshot.mjs` dependency; the workflow's
`--functions=netlify/functions` bundles it inside the protected endpoint.
Old public download aliases are forced through that endpoint
by `public/_redirects`; preserve these rules above the SPA fallback.

## Normal changes after setup

```text
Reviewed source update reaches GitHub main
  → frozen-lockfile install
  → regression tests and TypeScript
  → production build
  → Supabase backend deployment
  → Netlify frontend deployment
```

No production credentials are exposed to pull-request checks. The CLI versions
are pinned in the workflow; update them deliberately. Each production deployment
can consume Netlify credits. Content-only changes from the admin dashboard do
not trigger a build or deployment.

## Troubleshooting and rollback

- **No Actions run:** check that a commit actually reached GitHub `main`.
- **Missing secret:** add the named secret through GitHub Settings, then rerun.
- **Supabase deployment failed:** check token/project access and
  `supabase/config.toml`. The frontend step will not run after this failure.
- **Frontend deployment failed:** check Netlify token/site access. The backend
  may already be updated; the two services do not deploy atomically.
- **Wrong frontend project:** confirm `NETLIFY_SITE_ID` points to the existing
  site before enabling automation. Do not create a replacement site.
- **Rollback:** republish a previous successful frontend deploy from Netlify,
  then use a reviewed revert commit for source/backend changes. Republishing
  only the frontend does not roll back database content or the backend.

Figma Make's **Publish** is separate. Its existing `.figma/make/deploy` script
publishes through Make; it does not secretly push to GitHub or Netlify.
