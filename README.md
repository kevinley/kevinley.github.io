# kevinley.github.io

App reviews for founders who built their app with AI. One static page: plain HTML, CSS and JS, no build step, no dependencies.

## Deploy

GitHub Pages already serves this repo from `main` at https://kevinley.github.io/.

```sh
git add -A && git commit -m "Update site" && git push
```

The site is live about a minute later. `.nojekyll` tells Pages to serve the files as they are, without running Jekyll.

## Before going live

Search for `TODO` in `index.html`:

- **Email:** `hello@kevinley.dev` is a placeholder. It appears in the hero button, the self-check button, the contact button and the JSON-LD.
- **Email draft:** all three mail buttons open the same draft. Its text lives in `<template id="mail-draft">` in `index.html`, so you can edit it there. The script puts the self-check count where `{count}` is.
- **Booking link:** commented out in the contact section until it exists.
- **Quote:** commented out under "Who's looking at your app" until there is a real one.
- **Legal notice:** business name, address and VAT number in the footer.

## Moving to your own domain

1. Add a `CNAME` file containing the domain, for example `kevinley.dev`.
2. Point the domain's DNS at GitHub Pages, then tick "Enforce HTTPS" in the repo settings.
3. Replace `https://kevinley.github.io/` with the new address in `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` and `sitemap.xml`.

## Speed

| | Budget (gzip) | Now |
|---|---|---|
| HTML | 15 KB | 7.7 KB |
| CSS | 14 KB | 9.2 KB |
| JS | 4 KB | 4.0 KB |
| Font files | 2 | 2 (Inter Tight latin, regular + italic, 69 KB) |

A first visit is about 105 KB and 7 requests, all from the same host. The photo ships as AVIF (9 KB on phones, 19 KB on laptops), with a JPEG fallback. The WebGL flames start only after the page has loaded.

## Images

- `assets/kevin-640.*` and `assets/kevin-1024.*`: the hero photo, with AVIF first and JPEG as the fallback.
- `assets/kevin-mask.jpg`: a 256 px copy used as the light mask on the photo.
- `og.jpg`: the 1200×630 preview image for links shared on Slack, LinkedIn and X.

To redo them from a new 1024 px source photo on macOS:

```sh
sips -s format avif -s formatOptions 50 src.jpg --out assets/kevin-1024.avif
sips -Z 640 -s format avif -s formatOptions 50 src.jpg --out assets/kevin-640.avif
sips -s format jpeg -s formatOptions 58 src.jpg --out assets/kevin-1024.jpg
sips -Z 640 -s format jpeg -s formatOptions 60 src.jpg --out assets/kevin-640.jpg
sips -Z 256 -s format jpeg -s formatOptions 55 src.jpg --out assets/kevin-mask.jpg
```
