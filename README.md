# SWAG Tools

Free browser-based tools site. React + Vite, no backend, no API keys. Cloudflare Pages ready.

## Status: first batch (26 tools)
Written and syntax-checked with the TypeScript parser. **Not yet installed, built or run** (the authoring environment had no network). Run the checklist below before deploying.

**Included:** Image (resizer, compressor, format converter, cropper, to Base64) · Text (word counter, character counter, case converter, remove extra spaces, text diff, Lorem Ipsum) · SEO (slug, meta tags, robots.txt, XML sitemap) · Developer (JSON, URL encode/decode, Base64, sandboxed HTML preview) · Color (picker, HEX to RGB, RGB to HEX, palette) · Utility (password generator, unit converter, date calculator).

**Not built yet (next batches):** PDF tools (need the free `pdf-lib` library, added via npm), QR Code Generator (needs a small QR library), HTML/CSS/JS Minifier, and the AI-assisted tools. When added, AI tools must say that generation needs a configured API and must never show fake results. Never put an API key in frontend code; call an AI provider through a server-side function.

## Setup
```
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview
```
Before launch set `CONTACT_EMAIL` in `src/config.js` (the Contact page shows a "not configured" notice until you do).

## Test checklist
- [ ] `npm run build` succeeds
- [ ] Home: search, category cards, favourites star, recently used list, dark/light toggle, mobile menu
- [ ] Each tool: valid input works, empty/invalid input shows an error, Copy/Download/Reset work
- [ ] Image tools: try a PNG, JPG and WebP; check the downloaded file opens
- [ ] HTML preview: scripts run only inside the iframe
- [ ] Footer pages open: About, Contact, Privacy, Terms, Disclaimer

## Deploy to Cloudflare Pages (free)
1. Push this folder to a GitHub repository.
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git.
3. Build command `npm run build`, output directory `dist`. Add env var `NODE_VERSION` = `20`.
4. Deploy. `public/_redirects` makes page refreshes work for tool URLs.
Android-friendly path: create the repo and upload files using the GitHub website in Chrome, then do steps 2-4 in the Cloudflare dashboard in Chrome (desktop site mode helps).

## SEO and AdSense notes
- Each tool sets its own title and meta description in the browser. The site is a single-page app, so crawlers that do not run JavaScript see only the default tags. For stronger SEO later, add pre-rendering.
- Add `sitemap.xml` after you have a domain (use the Sitemap tool here) and submit it in Google Search Console.
- AdSense approval is decided by Google and is not promised. It needs your own domain, original useful content, and updated Privacy Policy text covering ads and cookies.
- Privacy/Terms/Disclaimer are plain templates. Have them reviewed before launch.
