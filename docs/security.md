# Club security hardening

## What ships with this update

- Cloudflare Pages `_headers`: MIME sniffing protection, HTTPS-only HSTS,
  anti-clickjacking, referrer and permissions policies, and an enforced CSP
  baseline (`object-src`, `base-uri`, `form-action`, `frame-ancestors`).
- A broader CSP is **Report-Only**, not enforced. It is a rollout diagnostic,
  not XSS protection yet. Inspect browser console violations on public pages,
  Admin, Facebook embeds, Google Fonts and Supabase images before promoting it.
  The inline theme bootstrap/JSON-LD need reviewed hashes before enforcing
  `script-src 'self'`; do not break theme startup by copying it blindly.
- API and protected ZIP responses are non-cacheable and have restrictive
  MIME/CSP headers. Admin checks still verify current approval on every request.
  The shared ZIP authorization core lives in `functions/lib/project-source.mjs`
  and serves `/api/project-source` on Cloudflare Pages and in local dev.
- Distributed, atomic request quotas use unique INSERT reservations in the
  existing KV table, not isolate-local counters or an unsafe read/set counter.
  Slots expire by window and cleanup removes slots older than two hours.
  Quota/storage failures fail closed with 503. Exhaustion or heavy reservation
  contention returns 429 with `Retry-After`, readable by the frontend.
- Public form JSON is bounded to 4 KB, normalized and checked for control
  characters; repeat email submissions use an atomic insert-if-absent upsert.
- Photo links reject credential-bearing URLs. Activity source links must be
  official Facebook links. CSV exports neutralize spreadsheet formula prefixes.
- Dependabot proposes weekly dependency and GitHub Actions updates. Review them;
  this does not enable GitHub's account-level security alerts automatically.

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
monitoring traffic. For public launches add verified Turnstile to forms and
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
   Configure a real Turnstile widget/site key and server verification before
   describing the public forms as CAPTCHA-protected. None is silently enabled.
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
  characters, a request over 4 KB, and a controlled quota test in staging.
- Ensure 429 includes `Retry-After`; test a storage outage returns 503 rather
  than accepting an unprotected write.
- Run `pnpm run check` and `pnpm run build` before publishing.

These are hardening controls, not a certification or a complete penetration test.
