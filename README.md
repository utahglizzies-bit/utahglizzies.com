# Utah Glizzies

Static starter site for `utahglizzies.com`.

## What is included

- Fan-headquarters home page with a big logo-forward hero
- Upcoming matchup preview, threat level, keys to the game, and opponent chirp guide
- Countdown bar for the next puck drop and rink address/map link
- Opponent threat board with personal, clean-but-sharp matchup chirps
- Spotlight of the week, Glizzy Meter, three stars, chants, lore archive preview, and player card previews
- Playoff-week hype meter data, ready to reset from one editable object
- Team page for roster cards, schedule notes, standings, and stat-based player blurbs
- Shop, sponsors, contact forms, and Glizzy Breakaway mini-game
- Mobile navigation and Cloudflare-ready contact/sponsor forms

## Weekly content updates

Editable site content is centralized in `src/data/siteContent.js`. Update that file first; the homepage, team page, shop, sponsors, and game roster all read from it.

Update these keys when new info comes in:

- `schedule`: dates, times, opponents, rink, address, status, and final scores
- `lastGame`: scoreboard recap, final score, moment of the game
- `playerSpotlight`: weekly spotlight story and callouts
- `hypeMeter`: playoff-week hype level, label, reason, and game week
- `matchup`: opponent stats, keys to the game, opponent threat players, matchup chirps
- `opponentChirps`: clean hockey roasts, including opponent names/numbers when useful
- `players`: roster, future profile fields, nameplates, stats, bios, and game roster
- `sponsors`: current sponsors and sponsorship tiers
- `store`: provider, store URL, and product cards
- `socialPosts`: manual Glizzy Cam posts
- `chants`: fan chant cards
- `loreCards`: nameplate lore teasers

No environment variables are currently required. Do not put passwords, API keys, Gmail passwords, or private GameSheet credentials in this repo. Contact and sponsor forms route through FormSubmit to `utahglizzies@gmail.com`; the first live submission may require inbox confirmation.

## Connecting the domain without Wix Premium

Wix currently requires a paid Premium/Studio plan to connect a custom domain to a Wix site. A cheaper path is to host this static site somewhere else and point DNS for `utahglizzies.com` at that host.

Current setup note:

- Host: Cloudflare Pages
- Primary public URL: `https://www.utahglizzies.com`
- The bare apex may need DNS/registrar cleanup once the domain transfer lock expires.

That means the domain itself is usable without paying Wix for a website plan.

Good options:

- GitHub Pages: free, good for a simple static site
- Cloudflare Pages: free, fast, and very good DNS tools
- Netlify: easy static hosting, but this site moved away after usage limits paused the public site

Typical DNS setup:

- Add the site to the host first.
- Add `utahglizzies.com` and `www.utahglizzies.com` as custom domains in that host.
- In the domain registrar DNS settings, create the records the host gives you.
- Enable HTTPS after DNS validates.

## Recommended deployment path

This site is currently deployed through Cloudflare Pages. To publish updates:

1. Zip the static files in this folder.
2. Upload the zip or folder to the existing Cloudflare Pages project.
3. Keep the custom domains:
   - `utahglizzies.com`
   - `www.utahglizzies.com`
4. Wait for Cloudflare Pages to finish deploy and HTTPS checks.

The included `CNAME` file is still useful if the site ever moves to GitHub Pages.

## Next edits to make

- Add real game/practice dates.
- Decide where merch sales should happen: Shopify, Square, Stripe payment links, Fourthwall, Printful, or preorder form.
- Choose whether Mammoth news should be manually curated or pulled from a feed.
- Replace lore teasers with real team stories as they happen.
- Re-export GameSheet stats after games and refresh the team page.
