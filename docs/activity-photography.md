# Activity photography

The club requested official Page imagery instead of unrelated stock photos.
The following images were retrieved through the existing public Facebook feed,
visually reviewed, and stored locally so expiring Facebook CDN links do not
break the activity cards. The source posts remain linked on the cards.

| Activity | Local asset | Original club post | Context |
| --- | --- | --- | --- |
| Seminars & workshops, photo 1 | `public/images/activities/icbm-conference.webp` | https://www.facebook.com/122207097422536052/posts/122204199176536052 | IIUC representatives at the ICBM 2026 academic conference; not presented as a student workshop photo. |
| Seminars & workshops, photo 2 | `public/images/activities/corporate-grooming.webp` | https://www.facebook.com/122207097422536052/posts/122207414948536052 | Official Corporate Grooming workshop announcement. |
| Leadership programmes / career development | `public/images/activities/corporate-grooming.webp` | https://www.facebook.com/122207097422536052/posts/122207414948536052 | Corporate Grooming workshop announcement, preparing students for professional life. The full poster is contained rather than cropped. |

The six posts available from the connected feed did not provide identifiable
industrial-visit, sports-tournament, health-camp or departmental-tour images.
Those categories use clearly labelled placeholders, not unrelated photos.
Add verified photos for them through **Admin → Home page → Activity photos**.
Managed activity galleries take priority, followed by the older single-image
override. Overrides do not inherit a different photo's Facebook attribution.

These are manually selected assets, not an automatic classifier or a complete
archive import. No Facebook access token or expiring CDN URL is stored here.

## Multiple photos and history coverage

Activities can provide `additionalImages` alongside their main photo in
`src/data/club.ts`. Each slide has its own alt text, image/poster fit and source
post. Duplicate image URLs are removed. Previous/next controls, keyboard arrows,
touch swipes and a photo counter let visitors browse at their own pace; there is
no autoplay. Only the selected image is loaded. Existing admin image overrides
still replace the default gallery instead of being mixed with it.

The connected public feed returns only six posts and exposes no history cursor.
A direct public request to the Page's Posts view redirected to Facebook login.
**The entire Page history has not yet been analysed in this workspace.**
The new [authenticated archive scanner](facebook-history.md) reads older posts
and album pages after its backend has been deployed. It supplies suggestions
for review and lets approved admins copy selected images into managed galleries.
Never expose the Page token in the frontend or bypass Facebook's login restriction.

## Hero loading

The hero waits for the current published content before requesting its image.
It no longer starts by requesting the old Unsplash demo image. A branded
placeholder is shown during loading or when a photo is missing/unavailable,
and the actual hero image uses eager loading and high fetch priority.
