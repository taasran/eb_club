# Google Search site name

Preferred site name: **Economics & Banking Club, IIUC**.
Production homepage: **https://ebclub.iiuc.ac.bd/** (Cloudflare Pages).

The small name above a Google result's URL is its **site name**, not the page
title. Google chooses it automatically; changing the HTML does not guarantee an
immediate change to an existing result.

`index.html` provides the preferred name in the homepage's `WebSite` and
`Organization` JSON-LD, `og:site_name` and `application-name`. The `WebSite`
also lists recognizable alternate names. These signals are in the initial HTML
and do not depend on JavaScript executing. Preserve both existing
`google-site-verification` meta tags.

## After publishing the update

1. Publish the updated frontend to the existing Cloudflare Pages project. A
   Figma Make preview edit alone does not update the production website.
2. View the production homepage's page source and confirm that its `WebSite`
   `name` and `og:site_name` say `Economics & Banking Club, IIUC`.
3. In Google Search Console, select the property covering
   `https://ebclub.iiuc.ac.bd/`, open **URL inspection**, and inspect that exact
   homepage URL.
4. Choose **Test live URL**. If Google can access the page, choose
   **Request indexing**.
5. Allow time for Google to recrawl the homepage and reprocess its site name.
   This may take days or weeks, with no guaranteed deadline or chosen name.

## Moving to the university domain

Add and verify a Search Console property for `https://ebclub.iiuc.ac.bd/`,
then submit `https://ebclub.iiuc.ac.bd/sitemap.xml`. The previous property's
verification does not automatically verify the new origin. Both existing
verification meta tags are preserved; add any new verification requested by
Google without removing them.

After deployment, the old production alias redirects permanently to the
university domain, and canonical, Open Graph and JSON-LD URLs use that domain.
Keep the old Search Console property for monitoring while Google recrawls.
If available for the property types, use Google's Change of Address tool.
Do not delete the existing Cloudflare Pages project or change the university's
CNAME away from it.

Google's guidance:
https://developers.google.com/search/docs/appearance/site-names
