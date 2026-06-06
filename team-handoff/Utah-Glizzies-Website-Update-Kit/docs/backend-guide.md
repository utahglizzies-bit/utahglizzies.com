# Utah Glizzies HC Website Backend Guide

This document explains how to update and manage utahglizzies.com without needing to rebuild the whole site from scratch.

## Quick Links

- Live website: https://www.utahglizzies.com
- Cloudflare Pages project: Utah Glizzies Pages project in the Utah Glizzies Cloudflare account
- Instagram: https://www.instagram.com/utah_glizzies_hockey/
- Contact email: utahglizzies@gmail.com
- GameSheet team page: https://teams.gamesheet.app/teams/f6cc3e10-5c24-4049-b6a9-bf2d57024f4a/schedule

## How The Site Is Hosted

The website is hosted as a static site on Cloudflare Pages. That means the public site is made from normal files: HTML, CSS, JavaScript, images, and game assets.

There is no database and no private server required for the main website. This keeps the site cheaper, faster, and easier to move later.

## Where To Update Website Content

Most weekly content is centralized in:

src/data/siteContent.js

That file controls the schedule, last game recap, player spotlight, hype meter, opponent chirps, roster/player cards, sponsor info, store items, social posts, and team info.

If you only need to update the opponent, next game, last game score, spotlight, chirps, sponsor list, or shop cards, start in that file.

## Main Editable Sections

schedule:
Controls upcoming and past games. The top red countdown banner automatically finds the next upcoming game from this list.

lastGame:
Controls the scoreboard recap at the top of the homepage.

playerSpotlight:
Controls the weekly player spotlight.

hypeMeter:
Controls the playoff hype counter text, goal, and counter key.

matchup:
Controls the weekly matchup preview, opponent storyline, scouting notes, and keys to the game.

opponentChirps:
Controls the chirp cards.

players:
Controls roster cards, stats, and future player profile data.

playerLore:
Controls the Official Glizzies Lore page.

sponsors:
Controls current sponsors, sponsor tiers, and sponsor pitch text.

store:
Controls the shop cards and public shop message. The shop can also read product rows from data/store-products.csv so non-coders can update merch like a spreadsheet.

socialPosts:
Controls the Glizzy Cam media grid.

teamInfo:
Controls team email, Instagram, rink info, logo paths, address, and SEO basics.

## Important Pages

index.html:
Homepage hub. Includes scoreboard, hero, matchup preview, chirps, player spotlight, lore preview, roster preview, shop/training teaser, Glizzy Cam, and contact form.

team.html:
Roster, stats, standings, and schedule.

lore.html:
Official Glizzies Lore page. Uses playerLore in src/data/siteContent.js.

shop.html:
Glizzy Shop page. Currently coming soon, but ready for real product links later.

sponsors.html:
Sponsor pitch, sponsor tiers, current sponsors, and sponsorship form.

game.html:
Glizzy Breakaway mini-game.

styles.css:
All visual styling.

script.js:
Homepage/team/shop/sponsor/media/lore rendering logic.

game.js:
Mini-game logic and player leaderboard counters.

## Forms

The contact and sponsor forms use FormSubmit and route to:

utahglizzies@gmail.com

The first live submission may require someone logged into the Utah Glizzies Gmail to confirm FormSubmit. After that, form messages should email the inbox directly.

Do not put Gmail passwords or private credentials into the website files.

The sponsor page also has direct email buttons. If the form ever feels broken, use the email link as the backup path:

- Sponsorship email: utahglizzies@gmail.com
- Subject line: Utah Glizzies Sponsorship Opportunity

If sponsor form messages are not arriving by email, check these in order:

1. Check the Utah Glizzies Gmail inbox and spam folder for a FormSubmit confirmation email.
2. Confirm the FormSubmit setup if requested.
3. Submit one test contact form and one test sponsor form from the live site.
4. If FormSubmit ever becomes unreliable, use the mailto buttons as the backup and consider moving forms to a Cloudflare Worker or a dedicated form service.

The website cannot send Gmail messages by itself unless FormSubmit, a mail service, a Cloudflare Worker, or a mailto link handles the actual email.

## GameSheet Weekly Update Workflow

The current source of truth is the GameSheet Teams stats area:

1. Open the GameSheet team page.
2. Go to Stats.
3. Use Standings for the team record, points, goals for, goals against, streak, PIM, power play, and penalty kill.
4. Set Division to D League.
5. Click Export and save the D League overall standings CSV.
6. Use Players for skater stats.
7. Important: the player export shown on June 1 only exported the visible/top league rows, so it included Jared Aida and Josh Morrill but not every Glizzy. For a full roster update, filter/search Utah Glizzies or use the full GameSheetStats feed so every Utah Glizzies player is included.
8. Use the exported screenshots as the visual reminder: the Export button is on the lower right of the Players and Standings tables.

Current verified standings from the June 1, 2026 export:

- Utah Glizzies: 11 GP, 5 W, 5 L, 1 shootout loss, 11 points, 40 GF, 37 GA, +3 differential, Won 1.
- Salt Shakers: 11 GP, 3 W, 6 L, 2 shootout losses, 8 points, 26 GF, 59 GA, -33 differential, Lost 5.

When updating weekly, do not change player lore. Update schedule, lastGame, playerSpotlight, hypeMeter labels, matchup, opponentChirps, seasonStats, and players.

## Shop Updates Without Coding

The easiest non-coder shop workflow is to update the spreadsheet-style file:

data/store-products.csv

Each row is one product card. The columns are:

- name: Product name shown on the card.
- type: Hat, Shirt, Sticker, Hoodie, Mystery, etc.
- price: "$25", "Coming Soon", "$5", etc.
- status: Use coming-soon for unavailable items. Use live when the item is ready.
- image: Image path, usually assets/glizzies-logo.png until real product photos exist.
- url: Checkout link. Leave blank if coming soon.

Example live product row:

Glizzies Hat,Hat,$25,live,assets/glizzies-logo.png,https://your-store-link.com/glizzies-hat

Payment should happen on an outside platform. Do not collect credit cards directly on the Glizzies site.

Good payment/store options:

- Fourthwall: Best all-in-one merch option. They handle products, checkout, taxes, shipping, and payment.
- Shopify Buy Button: More professional and flexible, but more setup.
- Square Online: Simple if someone already uses Square.
- Venmo or payment link: Fastest, but manual and less polished.
- External product links: Easiest static-site option. Put the checkout URL in the url column.

Recommended first setup:

1. Create products in Fourthwall or Shopify.
2. Copy each product checkout URL.
3. Paste the URL into data/store-products.csv.
4. Set status to live.
5. Rebuild the ZIP and upload it to Cloudflare Pages.

This still requires a deploy, but teammates are editing rows instead of layout code. A future upgrade could move the product list to a published Google Sheet so merch rows update without redeploying.

## Hype Counter

The hype counter is shared across visitors by using a public counter service. The key is stored in hypeMeter.hypeApiKey.

To reset hype for a new game, change hypeMeter.hypeApiKey to a new unique value, for example:

utahglizzies-2026-playoff-round2

The site will then start counting from zero for that new key.

## Glizzy Breakaway Game Stats

The game page requires users to choose a player before starting. Goals and stopped attempts are tracked by player nameplate through the shared counter service.

The live leaderboard shows:

- Player nameplate
- Goals
- Times stopped
- Scoring percentage

Important gameplay rules:

- Space shoots the puck and should not scroll the page.
- A goal only counts if the puck crosses inside the net mouth.
- Shots that hit the goalie or miss the net count as stopped attempts.
- The selected player gets the stats. The game should not randomly award points to someone the user did not choose.

The game uses:

public/game/sprites/skater-left.png
public/game/sprites/skater-right.png
public/game/sprites/goalie.png
public/game/sprites/puck.png

To reset game stats for a new campaign, change gameStats.keyPrefix in src/data/siteContent.js.

## Weekly Automation Options

Because the site is static, it does not have a private backend constantly running in the background.

There are three realistic automation paths:

- Manual weekly update: Update src/data/siteContent.js and data/store-products.csv, rebuild the ZIP, upload to Cloudflare Pages.
- Semi-automatic Codex workflow: Ask Codex weekly to pull GameSheet stats, update siteContent.js, rebuild the ZIP, and deploy.
- Fully automatic workflow: Move the site to a GitHub repo and use GitHub Actions or Cloudflare Pages builds to fetch public schedule/stat data and publish automatically.

The lowest-cost path right now is manual or semi-automatic through Cloudflare Pages.

## Deployment

To deploy a new version:

1. Update the files locally.
2. Zip the site folder or use the existing utah-glizzies-site.zip package.
3. Open the Cloudflare Pages project.
4. Go to Deployments.
5. Use “Upload assets” or “Create deployment” and upload the zip/folder.
6. Wait for Cloudflare Pages to mark the deploy as Published.
7. Check https://www.utahglizzies.com after deployment.

## Safe Editing Rules

- Edit src/data/siteContent.js for normal content changes.
- Avoid editing script.js unless changing how the site behaves.
- Avoid editing styles.css unless changing design.
- Do not add passwords, private tokens, Gmail passwords, or private API keys to the site.
- If something breaks, check for missing commas or quotes in src/data/siteContent.js first.
- After changes, open the site locally or deploy a test and click through the main pages.

## Weekly Update Checklist

1. Update lastGame after a game goes final.
2. Mark the completed schedule game as final.
3. Add the score and result.
4. Confirm the next game is listed as upcoming.
5. Update matchup storyline and keys.
6. Update opponent chirps.
7. Change playerSpotlight.
8. Reset hypeMeter.hypeApiKey if starting a new hype campaign.
9. Add any new Glizzy Cam posts.
10. Deploy to Cloudflare Pages.

## Current Brand Tone

The site should feel like:

- Beer league hockey
- Minor league promo-night energy
- ESPN-style matchup previews
- Fake mythological locker room lore
- Hot dog/glizzy branding
- Funny but clean

Avoid:

- Mean personal attacks
- Profanity-heavy copy
- Generic corporate copy
- Random developer instructions on public pages
- Overly childish jokes

## Who To Contact

For website access, sponsor messages, media, merch, or general site updates:

utahglizzies@gmail.com
