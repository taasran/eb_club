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

The owner uses **Account requests** to review registered profiles, approve an
admin/moderator role, change that role, or delete an account.
Admins can manage content, analytics, uploads and the private inbox. Moderators
can manage content, uploads and analytics, but cannot read/delete inbox entries.
Only the owner can list or change team access. The owner's role is protected.
Roles are checked on every request, so revocation does not depend on signing out.

## Activity log

Every content save, image upload, inbox deletion and access approval/removal is
written to the KV table (`eb:audit:*`) with the actor's email, name, role, time
and a summary of what changed. The owner reads it under **Activity log**; admins
and moderators cannot. Redeploy the Supabase function to start recording.

## Account requests, approval and removal

1. A new user opens `/admin`, selects **Create account**, and enters their full
   name, Matric ID, email, batch, password and password confirmation.
2. Supabase Auth stores the credentials. Only the profile fields and a request
   marker are stored in user metadata; the password is never in profile metadata,
   the KV table, or the owner-facing response.
3. The owner opens **Account requests**, refreshes the list and checks the
   pending profiles. This is a dashboard queue, not an email notification.
   Fields are self-reported and should be verified before approval.
4. The owner approves an admin/moderator role or rejects and deletes the account.
   Registration metadata, query parameters and a valid Auth session cannot grant
   a role. The server-only approval is bound to the Auth user ID.
5. Approved users sign in using their original email and password. Email
   confirmation remains required by the backend; verification and owner approval
   are separate checks.

Deletion revokes the grant before calling Auth deletion. If Auth deletion fails,
access remains blocked and the owner can retry. A minimal revoked-grant marker is
retained so a recreated account cannot inherit old access. Uploaded images and
published website content are not deleted along with the account.

Existing legacy email-only approvals continue to work only for accounts created
before their grant timestamp. New accounts require a fresh ID-bound approval.

## Forgotten passwords

**Forgot password?** sends a reset request through Supabase Auth. The email
returns to `/admin/reset-password`, where an authenticated recovery session is
required to update the password. A typed URL or an email address alone cannot
reset it. Password reset does not change any approval or role.

### Required Supabase Auth settings

- Enable the email provider and new-user signup.
- In **Authentication → URL Configuration**, allow both redirect URLs:
  `https://ebclubiiuc.netlify.app/admin` and
  `https://ebclubiiuc.netlify.app/admin/reset-password`; use the public site as the Site URL.
  Authentication callbacks deliberately do not use the private Make preview.
- Ensure the email templates for signup confirmation and password recovery include
  the actual confirmation link, rather than only a numeric OTP.
- Verify delivery for an external teammate's email. The built-in email service
  has recipient/rate restrictions; a production site may need custom SMTP.
  Sending/rate-limit errors are displayed in the sign-in form.
- The frontend does not change these project settings, provision SMTP, disable
  email verification, or create server-side admin grants from query parameters.

## Deployment checks

1. `/health` should return `version: "club-admin-v4"`.
2. `/admin/session` without a user token should return 401.
3. A confirmed account without a team grant should receive 403.
4. The confirmed owner should receive their email and `role: "owner"`.
5. Save a content edit and check it on the homepage; upload a JPG or PNG.
6. Submit a join request or newsletter entry and check the private inbox.
7. Register a test account; confirm its pending profile appears only for the
   owner and cannot access the dashboard. Approve moderator access, then verify
   inbox/team APIs still return 403. Delete it and verify access is revoked.
8. Send a reset email, open its recovery link and set a new password. Verify the
   old password fails, the new one works, and approval status is unchanged.

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
