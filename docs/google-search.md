# Google Search site name

Preferred site name: **Economics & Banking Club, IIUC**.
Production homepage: **https://ebclubiiuc.pages.dev/** (Cloudflare Pages).

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
   `https://ebclubiiuc.pages.dev/`, open **URL inspection**, and inspect that exact
   homepage URL.
4. Choose **Test live URL**. If Google can access the page, choose
   **Request indexing**.
5. Allow time for Google to recrawl the homepage and reprocess its site name.
   This may take days or weeks, with no guaranteed deadline or chosen name.

There is no need to rename the Cloudflare project, change the Facebook
integration, remove verification tags, or replace the existing sitemap for this
metadata update. A custom club domain can provide a clearer long-term identity,
but is optional and does not guarantee Google's choice of site name.

Google's guidance:
https://developers.google.com/search/docs/appearance/site-names
