# Utah Glizzies Website Update Kit

This folder is for teammates who want to update utahglizzies.com without breaking the site.

## The Main Rule

For normal updates, edit this file first:

`src/data/siteContent.js`

That file controls the schedule, scoreboard recap, matchup, chirps, roster cards, lore, sponsors, shop, Instagram/media cards, contact info, hype counter, and game roster data.

Do not edit `script.js`, `game.js`, or `styles.css` unless you are intentionally changing how the site works or looks.

## Safe Files To Update

- `src/data/siteContent.js`: main website content and weekly updates
- `data/store-products.csv`: shop product cards
- `assets/glizzies-logo.png`: main logo image
- `assets/glizzies-wordmark.png`: header wordmark image
- `docs/backend-guide.md`: full explanation of how the site works

## Weekly Update Checklist

1. In `schedule`, mark the completed game as `final`.
2. Add `glizziesScore`, `opponentScore`, and `result`.
3. Make sure the next upcoming game has `status: "upcoming"`.
4. Update `lastGame` with the final score, recap, and moment of the game.
5. Update `matchup` for the next opponent.
6. Update `opponentChirps` with the next opponent's players and stats.
7. Update `playerSpotlight`.
8. Reset `hypeMeter.hypeApiKey` for a new hype campaign if needed.
9. Update `seasonStats` after new GameSheet exports.
10. Deploy the updated site through Cloudflare Pages.

## Shop Updates

Use:

`data/store-products.csv`

Each row is one product card. Keep checkout/payment on an outside service such as Fourthwall, Shopify, Square, or another product link. Do not collect credit cards directly on the Glizzies website.

## Things Not To Put In Website Files

- Gmail passwords
- GameSheet passwords
- Cloudflare passwords
- Private API keys
- Personal information that should not be public

Everything in the website files should be considered public.

## If The Site Breaks

Most content-file mistakes are caused by missing commas, missing quotes, or accidentally deleting a bracket.

Check `src/data/siteContent.js` first. If the page goes blank after an update, undo the most recent edit and try again carefully.

## Best Team Workflow

One person edits the data files, then has another teammate review before deployment.

For bigger changes, ask Codex to update the files and build a new Cloudflare upload ZIP.
