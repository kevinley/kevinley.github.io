# kevinley.github.io

App reviews for founders who built their app with AI. One static page in three languages: plain HTML, CSS and JS, no build step, no dependencies.

## Deploy

GitHub Pages already serves this repo from `main` at https://kevinley.github.io/.

```sh
git add -A && git commit -m "Update site" && git push
```

The site is live about a minute later. `.nojekyll` tells Pages to serve the files as they are, without running Jekyll.

**When you change `styles.css`, `script.js` or `fire.js`, raise the `?v=` number** on the `styles.css`, `script.js` and `fire.js` links in `index.html`, `de/index.html`, `fr/index.html` (and `styles.css` in `404.html`). GitHub Pages lets browsers keep files for 10 minutes, so without a new number a returning visitor can get the new page with the old CSS or script.

## Languages

| Page | Address | File |
|---|---|---|
| English | https://kevinley.github.io/ | `index.html` |
| German | https://kevinley.github.io/de/ | `de/index.html` |
| French | https://kevinley.github.io/fr/ | `fr/index.html` |
| Legal notice | https://kevinley.github.io/legal/, /de/impressum/, /fr/mentions-legales/ | `legal/index.html`, `de/impressum/index.html`, `fr/mentions-legales/index.html` |
| Privacy notice | https://kevinley.github.io/privacy/, /de/datenschutz/, /fr/confidentialite/ | `privacy/index.html`, `de/datenschutz/index.html`, `fr/confidentialite/index.html` |

- **Tone:** the German page says "du", the French page says "vous".
- **One file per language:** each page is a full translation with the same markup. All three share `styles.css`, `script.js`, `fire.js`, the fonts and the photos.
- **When you change the text, change it on all three pages.** Each section has the same banner comment in every file, so you can find the matching spot.
- **The script's words** (the self-check label, the email subject and count, "Copied", "Tap a flame") live in `data-*` attributes in each page, not in `script.js`. Look for `data-one`, `data-many`, `data-subject`, `data-count`, `data-list`, `data-done` and `data-touch`.
- **Language switch:** the EN · DE · FR links sit at the right of the top bar. Each page also tells search engines about the other two (`hreflang` in the head and in `sitemap.xml`). There is no automatic redirect by browser language.
- **404:** `404.html` shows its message in German or French when the missing address starts with `/de/` or `/fr/`.
- **German and French typography:** prices are written `3.600 €` (German) and `3 600 €` (French). The French page puts a narrow non-breaking space before `?`, `!` and `;` (`&#8239;`) and a non-breaking space before `:` (`&nbsp;`). Keep these when you edit.

## Still to do

Search for `TODO` in `index.html`, `de/index.html` and `fr/index.html`:

- **Booking link:** commented out in the contact section until it exists. When it goes in, add the booking tool to the three privacy pages.
- **Quote:** commented out under "Who's looking at your app" until there is a real one.
- **security.txt:** renew `Expires` in `.well-known/security.txt` before 21 Nov 2027.

## Contact and business details

- **Email:** `swiftysenpai@icloud.com`. On each of the three pages it appears in the hero button, the self-check button, the contact button and the JSON-LD, and it is the contact in `.well-known/security.txt`. To change it, replace it everywhere at once.
- **Email draft:** all three mail buttons open the same draft. Its text lives in `<template id="mail-draft">` on each page, so you can edit it there. The script puts the self-check count where `{count}` is.
- **Legal notice:** its own page per language (`legal/`, `de/impressum/`, `fr/mentions-legales/`), linked from every footer next to the privacy notice: name, legal form, address, email, RCS, VAT and business permit numbers (with the ministry that issued it), prices, hosting, copyright. The VAT number is also in the JSON-LD. The JSON-LD and `llms.txt` only give the country, on purpose: the full address is only on the legal and privacy pages. If a detail changes, change it everywhere.
- **Privacy notice (GDPR):** one page per language, linked from every footer. It says what the site and the email contact do with personal data: GitHub Pages logs visitors' IP addresses, and the mailbox is iCloud Mail. **Before the site uses anything new** (the booking tool, analytics, a contact form, fonts or scripts from another site), add it to all three privacy pages and change their date. If an email to you, a mailbox move or a new tool changes what happens to people's data, change it there too.
- **Profiles:** the `Person` in the JSON-LD links to LinkedIn and GitHub (`sameAs`), so search engines and AI tools tie them to you. Add more profiles there.

## Moving to your own domain

1. Add a `CNAME` file containing the domain, for example `kevinley.dev`.
2. Point the domain's DNS at GitHub Pages, then tick "Enforce HTTPS" in the repo settings.
3. Replace `https://kevinley.github.io/` with the new address in `index.html`, `de/index.html` and `fr/index.html` (canonical, hreflang, Open Graph, JSON-LD), `robots.txt`, `sitemap.xml`, `llms.txt` and `.well-known/security.txt`.
4. Things GitHub Pages can't do, that your own domain behind a CDN such as Cloudflare can: response headers (`X-Frame-Options` or CSP `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`), long cache times for the `?v=` files, fonts and images, and the email records DMARC and MTA-STS for the domain.

## Search engines and AI tools

- **Structured data (JSON-LD, in each page's head):** `WebSite`, `Person` (photo, country, areas of expertise in `knowsAbout`), `Service` (hourly rate, the three offers in `hasOfferCatalog`) and `FAQPage`. The same facts as the visible page, in the page's language. When the page changes, change these too.
- **`llms.txt`:** a plain summary of the site for AI tools, with links to the three languages and the sections. Written only from what the page says; keep it in step.
- **`robots.txt`:** everyone may crawl everything. AI search and answer crawlers (OpenAI, Anthropic, Perplexity) are named in their own group, so their access is explicit.
- **Icons:** `favicon.ico` (16, 32, 48 px), `favicon.svg`, `apple-touch-icon.png` (180 px) and the icons in `site.webmanifest` (`assets/icon-*.png`).
- **Content-Security-Policy and Referrer-Policy** are `<meta>` tags, because GitHub Pages can't send headers. The CSP allows only files from this site, plus inline `style` attributes (the flame chips) and the one inline script that adds the `js` class, by its hash. **If you change that inline script, update its `sha256-…` in the CSP**, or it stops running (the same goes for the script in `404.html`). Print the new hash with:

  ```sh
  printf 'document.documentElement.classList.add("js")' | openssl dgst -sha256 -binary | openssl base64
  ```

## Speed

| | Budget (gzip) | Now |
|---|---|---|
| HTML | 15 KB | 8.5 KB (English), 9.4 KB (German), 9.3 KB (French) |
| CSS | 14 KB | 10.7 KB |
| JS the page needs | 4 KB | 2.1 KB (`script.js`) |
| JS for the effects | – | 5.8 KB (`fire.js`, deferred, never blocks the first paint) |
| Font files | 2 | 2 (Inter Tight latin, regular + italic, 69 KB) |

A first visit is about 115 KB on phones and 123 KB on laptops, in 8 requests, all from the same host. The photo ships as a transparent AVIF (13 KB on phones, 21 KB on laptops), with a JPEG fallback.

**Lighthouse (local runs, 21 Nov 2026):** Accessibility, Best Practices and SEO 100 on every page. Performance on mobile: 99 without a graphics chip (simulated with `--disable-gpu`; test servers like PageSpeed Insights' usually have none, so the page shows the CSS fireballs), and 83 to 99 with a graphics chip, varying from run to run, mostly 96 to 99, because creating the WebGL context takes 10 to 130 ms. Desktop: 100. Before these changes the live site scored 38 on mobile.

How the flames stay cheap (all in `fire.js`):

- **Loaded with the page:** `fire.js` is a deferred script, so the fire is there in the first frames. Until it is ready, the CSS fireballs stay hidden, so there is no swap from circles to fire. They show if WebGL is missing or slow (`.no-gl`), or after 2.5 s if `fire.js` never arrives.
- **No software WebGL:** on machines where WebGL would run on the CPU, the browser refuses the context (`failIfMajorPerformanceCaveat`) and the CSS fireballs show. That fire used to block the page for seconds there.
- **One canvas, one context for both flames:** each flame draws in its own half. A WebGL context is slow to create, so the cursor gets its own only when a mouse first enters the photo.
- **Shader compiled off the main thread** (`KHR_parallel_shader_compile`).
- **Work only where the flame is:** the shader skips the noise outside the flame's reach and the sparks outside their column. That is the same picture for about a third of the GPU work.
- **Lower resolution on slow chips:** if the flames run under 50 frames per second after the page has loaded, they draw at 60% resolution from then on.
- **The light on the photo flickers with opacity,** which the browser blends without redrawing. A brightness filter made it redraw the masked light every frame.
- **Paused** when the photo is off screen or the tab is in the background.

## Burning cursor

With a mouse, hovering a flame turns the cursor into a flame of that color. The normal cursor is hidden, and the flame's bright core is where clicks land. The flame grows with every second of hover, up to 5× at 5 seconds, and its light grows with it. It keeps burning 3 seconds for every second of hover, 30 seconds at most, then goes out within 1 second and the normal cursor comes back. Its light shows the wall behind the page, colored orange or blue by the flame. Touch screens and reduced motion skip it.

- **Timing and size:** `PER`, `MAX`, `OUT` and `GROW` at the top of the cursor part of `fire.js`.
- **The wall:** a blueprint grid in the flame's color: fine lines every 24 px, a stronger line and a cross every 120 px. It is a small SVG tile inside `styles.css` (`--wall-tile` in `.wall__paper`), so there is nothing extra to download. It is fixed to the window and stays put while the light moves. To change the pattern, edit the tile: white is drawn, and its opacity sets how bright.
- **Easter eggs:** eight bits of code drawn on the wall, one or two in the empty band above each section, at the left or right edge of the column. The orange flame shows them broken (`// TODO: fix before launch`, a live key in the code, `500 Internal Server Error`…), the blue flame shows the same spot fixed. They scroll with the page. The list is `EGGS` in the cursor part of `fire.js`: `[section, 0 = left / 1 = right, broken, fixed]`, where section 0 is the first section after the hero. The text is code, so it stays English on all three pages. Keep each line short (under about 30 characters), so it fits beside the content at laptop widths.

## Images

- `assets/kevin-640.avif` and `assets/kevin-1024.avif`: the hero photo, cut out with a transparent background, so the wall behind the page shows around it.
- `assets/kevin-640.jpg` and `assets/kevin-1024.jpg`: the fallback for browsers without AVIF, on the page color `#0e0e0d`.
- `assets/kevin-mask.avif`: the mask for the flames' light on the photo, 256 px. It is white, and its transparency follows how bright the photo is: fully transparent beside the photo and in the darkest shadows, so the light only lands on the hands and face. It is a plain transparency mask because Safari ignores brightness ("luminance") masks, and the light then fills the photo's whole square.
- `og.jpg`, `de/og.jpg`, `fr/og.jpg`: the 1200×630 preview image for links shared on Slack, LinkedIn and X, one per language.

To redo them on macOS from a new 1024 px photo, start with two PNGs: the cut-out with transparency (`cut.png`; Finder's "Remove Background" quick action does this) and the cut-out on `#0e0e0d` (`on-bg.png`).

```sh
sips -s format avif -s formatOptions 50 cut.png --out assets/kevin-1024.avif
sips -Z 640 cut.png --out cut-640.png && sips -s format avif -s formatOptions 50 cut-640.png --out assets/kevin-640.avif
sips -s format jpeg -s formatOptions 58 on-bg.png --out assets/kevin-1024.jpg
sips -Z 640 -s format jpeg -s formatOptions 60 on-bg.png --out assets/kevin-640.jpg
swift tools/light-mask.swift assets/kevin-1024.avif mask.png
sips -Z 256 mask.png --out mask-256.png && sips -s format avif mask-256.png --out assets/kevin-mask.avif
```

Then move the flames onto the new palms with `--fire-x`, `--fire-y`, `--ice-x` and `--ice-y` at the top of the Stage section in `styles.css`.
