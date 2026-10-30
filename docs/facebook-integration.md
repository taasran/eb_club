# Facebook Page updates

The homepage's **The latest from our club** section reads the club's Page posts
through the existing Supabase function. The React app never calls Graph API or
receives a Facebook access token.

The six-post public feed is intentionally unchanged. For older posts and
multiple album photos, see [the approved-admin archive workflow](facebook-history.md).

## Runtime secrets

In the connected Supabase project, open **Edge Functions → Secrets** and save:

| Name | Value |
| --- | --- |
| `FACEBOOK_PAGE_ID` | `451695514683833` |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | A valid long-lived **Page** access token |

The Page token needs `pages_show_list` and `pages_read_engagement` granted for
this Page. Confirm its Page ID, `Type: Page`, `Valid: True`, and expiry using
Meta's Access Token Debugger. A user token is not a replacement for a Page token.
`Expires: Never` is not a guarantee of permanent access: check the separate data
access expiry and reauthorize if Meta requests it or the Page permissions change.

Do not put a token in chat, frontend code, a `VITE_*` variable, a source archive,
or a GitHub commit. Do not share Graph responses containing `access_token` or
`paging.next`. Only add the two values to Supabase's server-side secrets; the
existing GitHub deployment credentials do not need a Facebook token.

## Deploy and verify

Deploy the updated `make-server-ad6cf477` Supabase function and the frontend.
The existing GitHub `main` workflow deploys the backend before Cloudflare Pages
after its checks pass. A workspace edit or successful build does not itself
push to GitHub or deploy the function.

Check `GET /functions/v1/make-server-ad6cf477/public/facebook` on the connected
Supabase project. Success returns `posts`, `pageUrl`, `updatedAt`, and `stale`.
There should be no token, upstream Graph error, or Graph pagination URL.
Check the homepage section and a post's **Read on Facebook** link as well.

## Refresh, language and failures

- Up to six latest posts are fetched with Graph API `v26.0`.
- The main request uses only `id,message,created_time,permalink_url,full_picture`;
  do not add the deprecated top-level `type` field.
- Non-video posts without an image get a separate, optional attachment lookup
  for a shared photo or album preview and an English attachment description.
  This lookup has a three-second timeout and runs at most once per missing-image
  post per feed refresh. Permission errors, deprecated fields, malformed data
  or timeouts leave the basic post intact; they never make the feed return 503.
  Only allowlisted Facebook CDN image URLs and sanitized captions are cached.
  If Facebook does not grant access to a shared post's media, its Facebook link
  remains available; this does not bypass the original Page's access controls.
- Sanitized results are cached in the existing KV table for five minutes.
  Graph failures have a one-minute retry cooldown and preserve successful
  results for up to 24 hours, with an explicit stale notice.
- Browsers refresh every five minutes while the page is visible, and on focus.
  This is on-demand polling, not a webhook or an unattended background import.
- Only allowlisted fields are stored/returned. Tokens stay in the server's
  outbound Authorization header, not the request URL, response, or error logs.
- All interface copy is English. Non-Latin captions use a neutral English
  description and link to the original post; there is no automatic translation.
  Emoji are omitted from captions. Facebook images and links remain available.
- Missing secrets, invalid/expired tokens, network failures and malformed
  Graph responses never break the rest of the website. Without a usable cache,
  the endpoint returns 503 and the section links visitors to the Facebook Page.
- Facebook image links may expire independently. Failed images show a
  Facebook-icon placeholder instead of a broken-image symbol.

If access stops working, use Meta's own debugger privately, renew the Page
authorization if necessary, and replace `FACEBOOK_PAGE_ACCESS_TOKEN` in the
Supabase dashboard. Do not send raw Graph errors or credentials to visitors.

## Diagnosing a 503

The public response intentionally does not expose the reason for a failure.
In Supabase, open the `make-server-ad6cf477` function's **Logs**, request the
public feed after its one-minute retry cooldown, and find **Facebook feed
unavailable**. These server-only diagnostics contain allowlisted metadata:

- `stage: config`: `pageIdValid` and `tokenPresent` report whether the function
  received usable configuration. They never show secret values.
- `stage: request`: the outbound request failed before receiving a response.
- `stage: response`: check `httpStatus`, and numeric `graphCode` and
  `graphSubcode` when Facebook supplied them. The raw error text is not logged.
- `stage: posts`: Facebook returned data, but no valid posts could be normalized.

Leading and trailing whitespace is trimmed from both configured values before
validation and before sending the Authorization header. Successful requests do
not emit a diagnostic. Never paste tokens, raw Graph responses, or paging URLs
when sharing logs; share only the diagnostic metadata above.
