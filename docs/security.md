# Club security hardening

## What ships with this update

- Cloudflare Pages `_headers`: MIME sniffing protection, HTTPS-only HSTS,
  anti-clickjacking, referrer and permissions policies, and an enforced CSP
  baseline (`object-src`, `base-uri`, `form-action`, `frame-ancestors`).
- HTML served through Pages middleware now has an **enforced CSP**. Cloudflare
  HTMLRewriter assigns a fresh cryptographic nonce to each document's scripts,
  including the initial theme bootstrap and JSON-LD. Arbitrary inline scripts
  and eval are not allowed. Facebook embeds, Google Fonts, Supabase and the
  Turnstile widget have explicit source allowances. Inline styles remain allowed
  because React uses style attributes for photo crops and other dynamic styles.
  HTML responses are not cached, and old ETag/length headers are removed.
  `_headers` retains its baseline/report-only fallback for responses outside
  document middleware. This is defense in depth, not a complete XSS guarantee.
- API and protected ZIP responses are non-cacheable and have restrictive
  MIME/CSP headers. Admin checks still verify current approval on every request.
  The shared ZIP authorization core lives in `functions/lib/project-source.mjs`
  and serves `/api/project-source` on Cloudflare Pages and in local dev.
- Distributed, atomic request quotas use unique INSERT reservations in the
  existing KV table, not isolate-local counters or an unsafe read/set counter.
  Slots expire by window and cleanup removes slots older than two hours.
  Quota/storage failures fail closed with 503. Exhaustion or heavy reservation
  contention returns 429 with `Retry-After`, readable by the frontend.
- Public form JSON is bounded to 8 KB (including the verification token), normalized and checked for control
  characters; repeat email submissions use an atomic insert-if-absent upsert.
- Photo links reject credential-bearing URLs. Activity source links must be
  official Facebook links. CSV exports neutralize spreadsheet formula prefixes.
- Dependabot proposes weekly dependency and GitHub Actions updates. Review them;
  this does not enable GitHub's account-level security alerts automatically.
- Join/newsletter forms support Cloudflare Turnstile with mandatory server-side
  Siteverify when configured. Each token is bound to the university hostname and
  its `join`/`newsletter` action; expired or replayed tokens are rejected by
  Cloudflare. Tokens are reset after submissions, and failed checks disable
  submission until retried. The secret never reaches the browser.

## Activate Turnstile for public forms

1. Cloudflare Dashboard → Turnstile → Add widget. Add `ebclub.iiuc.ac.bd` as the
   allowed hostname. Use a production widget, not Cloudflare's always-pass test
   keys. The server accepts only this hostname.
2. Copy the **Site Key** and **Secret Key** into the existing Supabase project's
   Edge Function secrets as `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
   Make environment values and Supabase production runtime secrets are separate;
   collecting a value in Make does not prove the deployed function has it.
3. Deploy the updated backend before the frontend. The public
   `/public/form-security` response should contain `required: true` and the public
   site key, never the secret. Test both join and newsletter on the university
   domain, including expired tokens and retry after a failed submission.

With **both** keys absent, only the existing rate limits apply; the website is
not CAPTCHA-protected. A partial key pair fails closed with 503. After activation,
do not remove both keys to troubleshoot without understanding that it disables
CAPTCHA. The frontend refreshes policy after each attempt so configuration
changes do not leave a disabled policy cached indefinitely.

This integration protects only the public join/newsletter API. Login/signup/
password recovery go directly through Supabase Auth and need its separate
dashboard CAPTCHA and rate-limit configuration. Turnstile in the Make preview
will not work with a production widget restricted to the university hostname;
verify on production or use a separately configured staging setup.

### Quotas

| Route | Shared scope | Limit |
| --- | --- | --- |
| Public join/newsletter submissions | Whole site | 120/hour |
| Public visit writes | Whole site | 1,000/hour |
| Admin Auth lookups | Whole site | 600/minute |
| Approved-admin image uploads/imports | Per user | 30/minute |
| Approved-admin Facebook history | Per user | 240/minute |
| Other approved-admin reads | Per user | 120/minute |
| Other approved-admin writes | Per user | 30/minute |

Global anonymous quotas intentionally do not trust arbitrary IP headers.
They limit database growth, **not** identify humans, guarantee analytics
accuracy, prevent all spam, or provide DDoS protection. An attacker can exhaust
a global quota and temporarily block legitimate writes. Tune limits after
monitoring traffic. Activate the Turnstile integration above and configure
gateway/WAF limits; Cloudflare Pages rules alone cannot protect a directly
reachable Supabase endpoint. Fixed windows can allow twice a quota around a
boundary. Under contention the limiter makes at most eight reservation attempts.
CORS is intentionally not treated as authentication: requests with bearer
tokens still require verified approval even without an Origin header.

## Production steps requiring the account owner

1. Deploy the updated frontend **and** `make-server-ad6cf477`. No new runtime
   secret or database migration is required for the request limiter.
2. In Supabase → SQL Editor, review and run `supabase/security-hardening.sql`.
   This script is **not automatically applied** by the existing deploy workflow.
   It enables KV RLS and removes direct browser-role privileges while preserving
   server-role access. Bucket-scoped restrictive policies block direct browser
   image inserts/updates/deletes; public club image downloads remain intentional.
   Do not put private documents in this public image bucket.
3. Validate: anonymous and pending users cannot access `/admin/*`; approved
   users can save/upload; public content and club images still load.
   Check that querying the KV table with an anon or authenticated browser JWT
   fails (never paste a service-role key in browser tools). A 401 from an admin
   route does not prove database RLS has been applied.
4. Enable 2FA on GitHub, Cloudflare, Supabase dashboard, owner email and Facebook.
   Dashboard 2FA is separate from club app MFA. This update does not add or
   enforce app MFA, which needs an enrollment/recovery workflow to avoid lockout.
5. Supabase Auth → enable email confirmation, set exact allowed redirect URLs,
   review password policy, login/signup/recovery rate limits and CAPTCHA.
   Activate public-form Turnstile using the two runtime secrets above; a
   deployed widget without server verification is not protection.
6. GitHub → enable secret scanning/push protection and Dependabot alerts if
   available; protect `main` with reviews. Use least-privilege deployment tokens.
   Rotate/revoke any previously exposed private key in its provider dashboard;
   changing source code cannot invalidate it.
7. Configure database backups appropriate to your plan **and** a separate
   storage-image backup. Verify a restore in an isolated project. A source ZIP
   is not a database, account or media backup. No backup schedule is provisioned
   by this update.

Never store service-role credentials, Facebook tokens, auth sessions, or API
keys in `VITE_*`, public JSON, Git, downloaded source archives or chat.
The public Supabase anon key is not a private key.

## Verify after deployment

- `curl -I https://ebclub.iiuc.ac.bd/` should show the new browser headers.
  Cloudflare `_headers` does not apply to Pages Function responses; the protected
  source-download function sets its own headers.
- Test public submission with a small valid JSON body, invalid control
  characters, a request over 8 KB, and a controlled quota test in staging.
- Inspect an HTML response's enforced CSP and matching script nonces. Check
  theme bootstrap, login, images, Facebook videos and Turnstile on the live domain.
- Ensure 429 includes `Retry-After`; test a storage outage returns 503 rather
  than accepting an unprotected write.
- Run `pnpm run check` and `pnpm run build` before publishing.

These are hardening controls, not a certification or a complete penetration test.
