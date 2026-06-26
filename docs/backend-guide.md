# Utah Glizzies Website — Backend & Deployment Guide

**Site:** https://www.utahglizzies.com  
**Repo:** https://github.com/utahglizzies-bit/utahglizzies.com  
**Hosting:** Cloudflare Pages (project: `utahglizzies`)  
**Data file:** `src/data/siteContent.js`

---

## How The Site Works

All dynamic content (scores, roster, schedule, matchup, chirps) lives in `src/data/siteContent.js`. Every HTML page loads that one file. **Edit the JS file → redeploy → site updates.** No database, no backend server.

---

## Deploying (Two Methods)

### Method 1 — Direct Wrangler Deploy (fastest, local)

```bash
bash deploy.sh
```

This runs `wrangler pages deploy . --project-name=utahglizzies` and pushes the current folder to Cloudflare Pages in ~30 seconds. You need to be logged in: `wrangler login`.

### Method 2 — GitHub Push (automatic CI/CD)

```bash
cd /Users/aherrin/Downloads/glizzies-full-site/UtahGlizzies.com
git add -A
git commit -m "update: [description]"
git push origin main
```

Cloudflare Pages is connected to the GitHub repo and auto-deploys on every push to `main`. Live in ~60 seconds.

**Note:** After `deploy.sh` (Wrangler), also push to GitHub so the repo stays in sync:
```bash
git add -A && git commit -m "deploy: [date] update" && git push
```

---

## Weekly Auto-Update (Post-Game)

### Automatic: GitHub Actions

`.github/workflows/auto-update.yml` runs the update script automatically:
- **Friday nights:** Saturday 5:30 AM UTC = Friday 11:30 PM MT (1hr after a 10:30 PM game)
- **Championship July 3:** July 4, 3:00 AM UTC = July 3, 9:00 PM MT (1hr after 8pm game)
- **Manual trigger:** Go to GitHub → Actions → Auto-Update Glizzies Site → Run workflow

The script fetches Gamesheet data via Playwright (headless browser), calls Claude API for recap/matchup/chirps, updates `siteContent.js`, commits, and pushes. Cloudflare auto-deploys the push.

### Manual: Enter a known result directly

```bash
cd /Users/aherrin/Downloads/glizzies-full-site/UtahGlizzies.com
python3 scripts/auto-update.py --manual "2026-07-03,Salty Boys,5,3"
bash deploy.sh
git add -A && git commit -m "update: Jul 3 championship result" && git push
```

### What the script updates automatically
- `schedule[]` — marks the game final with scores
- `lastGame` — recap, moment of game, three stars (AI-generated)
- `matchup` — next opponent preview (AI-generated)
- `opponentChirps` — bench chirps for next game (AI-generated)
- `cache-bust` comment — forces browser cache refresh

### What requires manual edits
- Player stats in `players[]` — update `g`, `a`, `pts`, `gp` from the box score
- `seasonStats` — update W/L/GF/GA/points after each game
- New players (subs/affiliates) — add to the `players[]` array

---

## Adding a New Player

Find the `players:` array in `siteContent.js` and add:
```js
{ name: "First Last", number: "##", nameplate: "NAMEPLATE", position: "Forward",
  photo: "", bio: "One-liner bio.", stats: { gp: 0, g: 0, a: 0, pts: 0, pim: 0 },
  instagram: "", nickname: "Nameplate" },
```

---

## Adding a New Game to the Schedule

Add to the `schedule:` array:
```js
{ date: "2026-07-10", displayDate: "Jul 10", time: "9:30 PM", opponent: "Team Name",
  label: "vs Team Name", rink: "North Rink", status: "upcoming", gameType: "Playoff" },
```

---

## Required Secrets (GitHub)

Set at: https://github.com/utahglizzies-bit/utahglizzies.com/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for AI recap/chirp generation) |

Cloudflare Pages deployment is handled by the CF Pages ↔ GitHub integration (no CF API key needed in Actions).

---

## Wrangler Login (first time or after token expiry)

```bash
export PATH=/Users/aherrin/.npm-global/bin:$PATH
wrangler login
```

Follow the browser prompt. Token is stored locally — only needs to be done once.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `src/data/siteContent.js` | All site data — scores, roster, schedule, chirps |
| `scripts/auto-update.py` | Post-game auto-updater |
| `.github/workflows/auto-update.yml` | GitHub Actions schedule |
| `deploy.sh` | One-command Wrangler deploy |
| `team.html` | Roster + schedule page |
| `index.html` | Homepage with matchup hub |
| `recaps/` | Individual game recap pages |

---

## Championship Game — July 3, 2026

- **Opponent:** Salty Boys
- **Time:** 8:00 PM MT
- **Auto-update fires:** July 3, 9:00 PM MT (July 4, 3:00 AM UTC)
- **Manual fallback:** `python3 scripts/auto-update.py --manual "2026-07-03,Salty Boys,X,Y"`
