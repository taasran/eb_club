# Facebook history and activity galleries

## What this feature does

Approved owners, admins and moderators can scan the Page history in
**Admin → Home page → Activity photos → Official Page archive**.

1. Click **Start new history scan**.
2. The server reads posts in batches of 25, follows post pagination, and reads
   attachment/sub-attachment pages in batches of up to 100.
3. Watch the unique-post, photo-candidate and API-page counts. **Pause scan**
   aborts the browser request; **Continue scan** retries the current batch.
4. When the accessible history ends, the UI reports that result. If an album
   could not be read, it explicitly reports a partial media scan.
5. Filter captions, review the suggested activity, and choose whether an image
   is a photograph or a full poster. Captions in the review UI retain their
   original language; the public gallery's generated alt text is English.
6. Click **Add to activity** on each selected image. The backend copies its
   bytes to the club's public image bucket using a content-hashed filename.
7. Reorder/remove photos in each activity's gallery, then click **Save changes**.
   The existing save/read-back verification publishes the gallery.

The scanner does not automatically publish or silently classify all images.
Activity suggestions are keyword-based, including English and Bengali terms;
ambiguous posts require manual classification. Video posts/attachments are
not imported as photos. A fallback post-preview image is labelled for review.

## Events and Our Legacy

- **Admin → Events:** each event card starts with **Event photos**. Use
  **Upload event photo**, **Add photo link**, or scan the Official Page Archive.
  Choose an existing event or create an event draft from a post.
- **Admin → Our Legacy:** choose a milestone, add a custom milestone or a
  template, then use **Upload milestone photo** or **Add photo link**.
  Its Official Page Archive supports **Add to milestone** and
  **Create milestone with photo**. Imported years come from the post date;
  review the year, title and description before publishing.
- Legacy galleries support 15 photos per milestone; event/activity galleries
  support 30. Reorder, remove, or choose photo/poster fit in each editor.
- Existing legacy images remain available. Rich galleries preserve each photo's
  fit, alt text and Facebook attribution, while keeping the older image fields
  synchronized. An empty gallery stays empty.
- All imports remain drafts until **Save changes**. Deploy both frontend and
  backend for the new legacy gallery validation.

## Limits and continuity

- A scan advances one Graph request per authenticated request, with a short
  client-side interval; it does not start a background job.
- Only one active scan is maintained per admin account. Starting another scan
  replaces that account's previous continuation. Scan handles expire after
  30 minutes of inactivity.
- Browser progress is kept while this admin screen remains mounted. Navigating
  away or reloading loses the browser's candidate list; start a fresh scan.
- Rate limits, network errors and unreadable post continuations pause the scan,
  without claiming that every post was read.
- Unreadable individual album pages can be skipped with an explicit partial
  result. Deleted, private, restricted or otherwise inaccessible history is not
  recoverable through this workflow.
- Extremely large/repeating responses stop at documented safety bounds rather
  than looping forever or claiming completion.
- Photo references expire after 24 hours. Rescan an expired reference.
- Galleries allow up to 30 images per activity. An explicit empty gallery hides
  photos; it does not resurrect the curated defaults.
- A managed gallery takes precedence over the older single-image override.
  Changing that override resets the gallery. **Use curated defaults** removes
  the activity's managed gallery and legacy override from the draft.

## API and security

Both routes are behind the existing verified, approved-admin middleware:

- `GET /admin/facebook/history?cursor=<opaque-handle>`
- `POST /admin/facebook/import` with `{ "photoId": "<scanned-photo-id>" }`

The Page token stays in the server's outbound Graph Authorization header.
Graph paging URLs never go to the browser and are never followed as arbitrary
URLs. Nested continuations are parsed and reconstructed against the fixed
Graph host and supported attachment paths. Scan handles are bound to an admin
account, Page configuration and revision.

Imports accept only a server-recorded image reference, not a supplied URL.
Only allowlisted Facebook CDN hosts are fetched, with redirects disabled,
timeouts, bounded streaming downloads (5 MB), and JPG/PNG/WebP signature
checks. The Page credential is never sent to a CDN. Stored filenames are
content-hashed, and repeated imports reuse that path.

The public `GET /public/facebook` endpoint still returns six sanitized recent
posts and does not trigger a history scan. No new Facebook credential is
required when the existing Page token has sufficient access.

## Deployment and verification

This feature requires **both** the new Supabase backend and frontend. The
frontend reports a useful deployment message when the history route is absent.
Do not interpret a successful local build as a production deployment or a scan.

The current `.github/workflows/deploy.yml` named **Check and deploy** publishes
the Supabase function first, then Cloudflare Pages, after a reviewed update
reaches `taasran/eb_club` on `main`. Its existing deployment credentials are
`SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
Runtime Page credentials remain in the Supabase function's secrets.

After deployment, sign in with an approved account and scan a known older post
with an album. Add an image to a draft, verify Save is disabled while copying,
publish, and confirm the public activity's image, source link and carousel.
Never put tokens in chat, browser variables or source files.
