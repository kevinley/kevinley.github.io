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
| CSS | 14 KB | 9.7 KB |
| JS the page needs | 4 KB | 2.0 KB (`script.js`) |
| JS for the effects | – | 4.1 KB (`fire.js`, fetched after the page has loaded) |
| Font files | 2 | 2 (Inter Tight latin, regular + italic, 69 KB) |

A first visit is about 113 KB on phones and 121 KB on laptops, in 8 requests, all from the same host. The photo ships as a transparent AVIF (13 KB on phones, 21 KB on laptops), with a JPEG fallback. `script.js` fetches `fire.js` (the WebGL flames and the burning cursor) only once the page has loaded and the browser is idle, so the effects never slow down the first paint.

## Burning cursor

With a mouse, hovering a flame turns the cursor into a flame of that color. The normal cursor is hidden, and the flame's bright core is where clicks land. The flame grows with every second of hover, up to 5× at 5 seconds, and its light grows with it. It keeps burning 3 seconds for every second of hover, 30 seconds at most, then goes out within 1 second and the normal cursor comes back. Its light shows the wall behind the page, colored orange or blue by the flame. Touch screens and reduced motion skip it.

- **Timing and size:** `PER`, `MAX`, `OUT` and `GROW` at the top of the cursor part of `fire.js`.
- **The wall:** a pattern of dots every 24 px with a crosshair every 120 px, in the flame's color. It is a small SVG tile inside `styles.css` (`--wall-tile` in `.wall__paper`), so there is nothing extra to download. It is fixed to the window and stays put while the light moves. To change the pattern, edit the tile: white is drawn, and its opacity sets how bright.

## Images

- `assets/kevin-640.avif` and `assets/kevin-1024.avif`: the hero photo, cut out with a transparent background, so the wall behind the page shows around it.
- `assets/kevin-640.jpg` and `assets/kevin-1024.jpg`: the fallback for browsers without AVIF, on the page color `#0e0e0d`.
- `assets/kevin-mask.avif`: the mask for the flames' light on the photo, 256 px. It is white, and its transparency follows how bright the photo is: fully transparent beside the photo and in the darkest shadows, so the light only lands on the hands and face. It is a plain transparency mask because Safari ignores brightness ("luminance") masks, and the light then fills the photo's whole square.
- `og.jpg`: the 1200×630 preview image for links shared on Slack, LinkedIn and X.

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
