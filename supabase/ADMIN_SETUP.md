# Club admin backend

Deploy `supabase/functions/server` using the connected project's Supabase
edge-function deployment option in **Figma Make settings**. The frontend expects
the function name `make-server-ad6cf477`. Publishing the frontend to Netlify
alone does not deploy this backend.

## Owner authorization

The backend validates the session token with Supabase Auth on every admin
request. A confirmed account matching `ADMIN_OWNER_EMAIL` is the owner.
The default is `tasranurrahaman@gmail.com`, the owner email supplied in the
reported login screenshot. Set `ADMIN_OWNER_EMAIL` in server secrets to override
it. Never put the service-role key in frontend code.

Creating an account does not grant admin rights. If email confirmation is
enabled, confirm the owner's email before signing in. This authorization grants
access to this application's dashboard only; it does not transfer ownership of
Supabase, GitHub, Netlify, or Figma accounts.

The owner can use **Team access** to grant or update an email's admin/moderator
role, and revoke access. Team members must create and confirm their own
accounts using exactly that email. Granting access does not send an invitation.
Admins can manage content, analytics, uploads and the private inbox. Moderators
can manage content, uploads and analytics, but cannot read/delete inbox entries.
Only the owner can list or change team access. The owner's role is protected.
Roles are checked on every request, so revocation does not depend on signing out.

## Deployment checks

1. `/health` should return `version: "club-admin-v2"`.
2. `/admin/session` without a user token should return 401.
3. A confirmed account without a team grant should receive 403.
4. The confirmed owner should receive their email and `role: "owner"`.
5. Save a content edit and check it on the homepage; upload a JPG or PNG.
6. Submit a join request or newsletter entry and check the private inbox.
7. Grant moderator access, sign in as that user, and verify inbox/team APIs return
   403. Revoke access and verify the next admin request returns 403.

## Content publication

After clicking **Save changes**, the admin now reads the public API back and
compares it with the submitted content before marking the edits saved. A
failed API call or mismatched readback leaves the edits unsaved and displays
the error. Opening the editor also requires a successful content read so that
a backend outage cannot silently replace saved content with defaults.

Public pages re-fetch uncached content on focus, on same-origin save events,
and every 30 seconds while visible. They preserve the last successful content
on transient failures. Saved empty arrays are intentional deletions and do not
restore placeholder events, executives, or archives.

Publish the updated frontend to Netlify once to install this behavior. The
Make preview and Netlify are separate deployments; editing preview code does
not update an existing Netlify deployment. After both frontend and backend are
current, ordinary content edits only require **Save changes**, not a new
frontend deployment.

Local regression checks:

```sh
node scripts/content-sync.test.mjs
node supabase/functions/server/validation.test.mjs
pnpm exec tsc --noEmit
pnpm build
```

Content and inbox entries use the existing KV table. Images use the public
`make-ad6cf477-club-images` storage bucket; only upload website imagery, not
private documents. Inbox entries are never exposed through public routes.
Visitor counts are approximate browser-reported analytics, not audited unique
people. Visit records contain no IP addresses or fingerprints; schedule cleanup
of `eb:visit:` records older than 90 days for long-running installations.

For a public site receiving spam or substantial traffic, add gateway rate
limits/CAPTCHA and a database-backed aggregate analytics service before scaling.
