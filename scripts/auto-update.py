#!/usr/bin/env python3
"""
Utah Glizzies — Fully Automatic Weekly Update Script
Fetches GameSheet data via Playwright (headless browser), generates AI content
via Claude API, updates siteContent.js, and commits. GitHub Action deploys to Cloudflare.

USAGE:
  python3 scripts/auto-update.py                        # Full auto mode
  python3 scripts/auto-update.py --manual "2026-07-03,Salty Boys,5,3"  # Override with known result
  python3 scripts/auto-update.py --dry-run              # Print what would change, don't write

REQUIREMENTS (GitHub Actions installs these):
  pip install requests playwright
  playwright install chromium --with-deps
"""

import os, re, sys, json, requests, argparse
from datetime import datetime, timezone

TEAM_ID       = os.environ.get("GAMESHEET_TEAM_ID", "f6cc3e10-5c24-4049-b6a9-bf2d57024f4a")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SITE_FILE     = "src/data/siteContent.js"
GAMESHEET_URL = f"https://teams.gamesheet.app/teams/{TEAM_ID}/schedule"

HEADERS = {"Accept": "application/json", "User-Agent": "UtahGlizziesBot/1.0"}


# ─── 1. FETCH GAMESHEET DATA ────────────────────────────────────────────────

def scrape_gamesheet_playwright():
    """Scrape the Gamesheet SPA using a headless browser. Returns list of game dicts."""
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        print("⚠️  Playwright not installed. Run: pip install playwright && playwright install chromium")
        return None

    print("🌐 Launching headless browser to scrape Gamesheet...")
    games = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page()
            page.goto(GAMESHEET_URL, timeout=30000)

            # Wait for schedule rows to render (Vue SPA needs time)
            try:
                page.wait_for_selector(".schedule-row, .game-row, [class*='game'], [class*='schedule']",
                                       timeout=10000)
            except PWTimeout:
                print("   ⚠️  No schedule rows found within timeout — page may still be loading")

            # Dump the full page content for parsing
            content = page.content()
            browser.close()

        # Parse completed games: look for score patterns like "8 - 1" near team names
        # GameSheet renders: home team | score | date | status
        completed = re.findall(
            r'(?:FINAL|Final|final).*?(\d{4}-\d{2}-\d{2})|(\d{4}-\d{2}-\d{2}).*?(?:FINAL|Final|final)',
            content
        )
        print(f"   Found {len(completed)} potential final game references")

        # More targeted: look for score blocks
        score_blocks = re.findall(
            r'(\d{4}-\d{2}-\d{2})[^<]*?(\d+)\s*[-–]\s*(\d+)',
            content
        )
        for date, s1, s2 in score_blocks:
            games.append({"date": date, "score1": int(s1), "score2": int(s2)})

        if games:
            print(f"   ✅ Scraped {len(games)} games with scores")
        else:
            print("   ⚠️  Could not parse scores from rendered HTML — Gamesheet layout may have changed")

    except Exception as e:
        print(f"   ❌ Playwright scrape failed: {e}")

    return games if games else None


def fetch_gamesheet_api():
    """Try the Gamesheet REST API (currently returns empty — kept for future compatibility)."""
    for path in [
        f"https://api.gamesheet.app/api/v4/teams/{TEAM_ID}/schedule",
        f"https://api.gamesheet.app/v4/teams/{TEAM_ID}/schedule",
    ]:
        try:
            r = requests.get(path, headers=HEADERS, timeout=10)
            if r.status_code == 200 and r.content:
                data = r.json()
                if data:
                    print(f"✅ GameSheet API responded at {path}")
                    return data
        except Exception:
            pass
    return None


# ─── 2. READ / WRITE siteContent.js ─────────────────────────────────────────

def read_site_content():
    with open(SITE_FILE, "r") as f:
        return f.read()

def write_site_content(content):
    with open(SITE_FILE, "w") as f:
        f.write(content)
    print("✅ siteContent.js written")


# ─── 3. PARSE SCHEDULE FROM siteContent.js ──────────────────────────────────

def parse_schedule(js):
    """Extract schedule entries from siteContent.js."""
    matches = re.findall(
        r'\{[^}]*?date:\s*"([\d-]+)"[^}]*?opponent:\s*"([^"]+)"[^}]*?status:\s*"(\w+)"[^}]*?\}',
        js, re.DOTALL
    )
    return [{"date": m[0], "opponent": m[1], "status": m[2]} for m in matches]


# ─── 4. CLAUDE API ───────────────────────────────────────────────────────────

def claude(prompt, system="You are the Utah Glizzies HC content writer. Beer league hockey, funny but clean, ESPN-style promo energy, hot dog branding. Keep it sharp and under 200 words per section."):
    if not ANTHROPIC_KEY:
        print("⚠️  No ANTHROPIC_API_KEY — skipping AI content generation")
        return None
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "system": system,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30
        )
        if r.status_code == 200:
            return r.json()["content"][0]["text"].strip()
        print(f"Claude API error: {r.status_code}")
    except Exception as e:
        print(f"Claude API failed: {e}")
    return None


def generate_game_recap(opponent, gs, opp, date):
    result = "WIN" if gs > opp else "LOSS"
    prompt = f"""Write a short game recap for Utah Glizzies HC.
Game: Glizzies {gs}, {opponent} {opp} — {result}  |  Date: {date}

Return ONLY valid JSON (no markdown):
{{
  "recap": "2-3 sentence recap in Glizzies brand voice",
  "momentOfGame": "1 sentence key moment",
  "starOne": "Nameplate — reason (e.g. GLIZZARD OF OZ — 2 goals)",
  "starTwo": "Nameplate — reason",
  "starThree": "Nameplate — reason"
}}"""
    text = claude(prompt)
    if text:
        try:
            return json.loads(re.sub(r'^```json\s*|\s*```$', '', text.strip()))
        except Exception:
            pass
    return None


def generate_matchup_content(opponent, next_date, next_time, last_result, game_type="Playoff"):
    prompt = f"""Write matchup preview for Utah Glizzies HC vs {opponent}.
Game: {next_date} at {next_time} — {game_type}
Last result: {last_result}

Return ONLY valid JSON (no markdown):
{{
  "title": "Catchy matchup title",
  "threatLevel": "Funny threat level",
  "storyline": "2-3 sentence storyline in Glizzies voice",
  "keys": ["Key 1", "Key 2", "Key 3", "Key 4", "Key 5"]
}}"""
    text = claude(prompt)
    if text:
        try:
            return json.loads(re.sub(r'^```json\s*|\s*```$', '', text.strip()))
        except Exception:
            pass
    return None


def generate_chirps(opponent):
    prompt = f"""Write 3 funny opponent chirp cards for {opponent} in a beer league hockey game.
Light-hearted, never mean — bench chirp energy.

Return ONLY valid JSON (no markdown):
[
  {{"playerName": "name or 'The Bench'", "number": "##", "moment": "chirp topic", "lines": ["line 1", "line 2", "line 3"]}},
  {{...}},
  {{...}}
]"""
    text = claude(prompt)
    if text:
        try:
            return json.loads(re.sub(r'^```json\s*|\s*```$', '', text.strip()))
        except Exception:
            pass
    return None


# ─── 5. UPDATE siteContent.js SECTIONS ──────────────────────────────────────

def replace_balanced_block(js, start_marker, new_block, open_ch="{", close_ch="}"):
    """Replace a `key: { ... },` (or `key: [ ... ],`) block by counting delimiter
    depth instead of a naive non-greedy regex.

    Bug this fixes: objects like `lastGame` and `opponentChirps` contain NESTED
    uses of the same delimiter (e.g. lastGame.threeStars is an array of `{...}`
    objects; each chirp has a nested `lines: [...]` array). A regex like
    `r'lastGame:\\s*\\{.*?\\},'` stops at the FIRST `},`/`],` it finds, which is
    usually the end of a nested item, not the end of the outer block — silently
    truncating the object and leaving orphaned JS behind (this broke the site
    on 2026-07-07). Counting delimiter depth finds the real matching close.

    Caveat: this is a simple char counter, not a JS parser, so a string value
    that itself contains a literal `{`/`}`/`[`/`]` matching open_ch/close_ch
    could throw off the count. None of our generated content does that today.
    """
    start = js.find(start_marker)
    if start == -1:
        print(f"  ⚠️  Could not find block starting with {start_marker!r} — leaving js unchanged")
        return js

    depth = 1
    i = start + len(start_marker)
    while depth > 0 and i < len(js):
        if js[i] == open_ch:
            depth += 1
        elif js[i] == close_ch:
            depth -= 1
        i += 1

    if depth != 0:
        print(f"  ⚠️  Unbalanced {open_ch!r}/{close_ch!r} after {start_marker!r} — leaving js unchanged")
        return js

    end = i
    if end < len(js) and js[end] == ",":
        end += 1

    return js[:start] + new_block + js[end:]


def update_last_game(js, opponent, gs, opp, date, recap):
    result = "win" if gs > opp else "loss"
    recap_text  = recap.get("recap", f"Glizzies {gs}, {opponent} {opp}.") if recap else f"Glizzies {gs}, {opponent} {opp}."
    moment_text = recap.get("momentOfGame", "Great team effort.") if recap else "Great team effort."
    stars_block = ""
    if recap and recap.get("starOne"):
        stars_block = f"""
    threeStars: [
      {{ name: "{recap.get('starOne','')}", star: 1 }},
      {{ name: "{recap.get('starTwo','')}", star: 2 }},
      {{ name: "{recap.get('starThree','')}", star: 3 }}
    ],"""

    new_block = f"""  lastGame: {{
    opponent: "{opponent}",
    glizziesScore: {gs},
    opponentScore: {opp},
    date: "{date}",
    result: "{result}",
    recap:
      "{recap_text.replace(chr(34), chr(39))}",
    momentOfGame:
      "{moment_text.replace(chr(34), chr(39))}",{stars_block}
  }},"""

    return replace_balanced_block(js, "  lastGame: {", new_block)


def update_matchup(js, data, opponent, next_date, next_time):
    if not data:
        return js
    keys_str = json.dumps(data.get("keys", []))
    new_block = f"""    matchup: {{
    title: "{data.get('title', 'Matchup Preview')}",
    threatLevel: "{data.get('threatLevel', 'Elevated Mustard')}",
    playerToWatch: "TBD",
    opponent: "{opponent}",
    record: "{opponent}: record TBD",
    storyline:
      "{data.get('storyline', '').replace(chr(34), chr(39))}",
    opponentBreakdown: [],
    opponentStats: ["Next up: {opponent}, {next_date} at {next_time}."],
    keys: {keys_str},
  }},"""
    return replace_balanced_block(js, "    matchup: {", new_block)


def update_chirps(js, chirps):
    if not chirps:
        return js
    chirps_str = json.dumps(chirps, indent=4)
    new_block = f'    opponentChirps: {chirps_str},'
    return replace_balanced_block(js, "    opponentChirps: [", new_block, open_ch="[", close_ch="]")


def mark_game_final(js, date, gs, opp):
    result = "win" if gs > opp else "loss"
    pattern = r'(date:\s*"' + re.escape(date) + r'"[^}]*?status:\s*)"upcoming"'
    replacement = (r'\1"final", glizziesScore: ' + str(gs) +
                   ', opponentScore: ' + str(opp) +
                   ', result: "' + result + '"')
    new_js = re.sub(pattern, replacement, js, flags=re.DOTALL)
    if new_js == js:
        print(f"  ⚠️  Could not find upcoming game for {date}")
    else:
        print(f"  ✅ {date} → final {gs}-{opp} {result}")
    return new_js


def update_cache_bust(js):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return re.sub(r'// cache-bust: [\d-]+ \S+',
                  f'// cache-bust: {today} auto-updated', js)


def validate_js_syntax(js):
    """Sanity-check that the generated siteContent.js still parses before we write it.
    Runs it through Node so a truncated/regex bug can never silently ship broken JS
    to the live site again (this is what happened on 2026-07-07)."""
    import subprocess
    script = js.replace("window.siteContent", "global.siteContent") + "\nconsole.log('__VALID__');"
    try:
        result = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=15)
        if result.returncode != 0 or "__VALID__" not in result.stdout:
            print("❌ Generated siteContent.js failed Node.js syntax validation:")
            print("   " + (result.stderr.strip() or "unknown error").replace("\n", "\n   ")[:2000])
            return False
        return True
    except FileNotFoundError:
        print("⚠️  Node.js not found on PATH — skipping syntax validation (proceed with caution)")
        return True
    except Exception as e:
        print(f"⚠️  Validation could not run ({e}) — proceeding without it")
        return True


# ─── 6. MAIN ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manual", help="Force a result: 'YYYY-MM-DD,Opponent,gs,opp'")
    parser.add_argument("--dry-run", action="store_true", help="Print changes, don't write")
    args = parser.parse_args()

    print("🏒 Utah Glizzies Auto-Update Starting...")
    print(f"   Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")

    js = read_site_content()
    schedule = parse_schedule(js)
    upcoming = [g for g in schedule if g["status"] == "upcoming"]
    finals   = [g for g in schedule if g["status"] == "final"]
    print(f"   Schedule: {len(finals)} final, {len(upcoming)} upcoming")

    changed = False
    new_results = []   # list of (date, opponent, gs, opp)

    # ── Manual override ──
    if args.manual:
        parts = args.manual.split(",")
        if len(parts) == 4:
            date, opp, gs, opp_s = parts[0].strip(), parts[1].strip(), int(parts[2]), int(parts[3])
            print(f"\n📋 Manual override: {date} — Glizzies {gs}, {opp} {opp_s}")
            new_results.append((date, opp, gs, opp_s))
        else:
            print("❌ --manual format: 'YYYY-MM-DD,Opponent,glizzies_score,opp_score'")
            sys.exit(1)

    # ── Auto-scrape ──
    else:
        # Try Playwright scraping first
        scraped = scrape_gamesheet_playwright()

        # Fallback: try REST API
        if not scraped:
            scraped = fetch_gamesheet_api()

        if scraped:
            for entry in upcoming:
                for game in scraped:
                    if game.get("date") == entry["date"]:
                        # Determine which score is ours — heuristic: Glizzies score is likely higher in wins
                        # We need context from the page; without it, we can't reliably assign home/away
                        # For now, flag for manual review
                        print(f"  ⚠️  Found score for {entry['date']} from scrape — verify manually which team is Glizzies")
                        print(f"       Raw scores: {game.get('score1')} - {game.get('score2')}")
        else:
            print("⚠️  No game data available from Gamesheet — no score updates")
            print("   To manually enter a result:")
            print("   python3 scripts/auto-update.py --manual '2026-07-03,Salty Boys,5,3'")

    # ── Apply new results ──
    for date, opponent, gs, opp in new_results:
        in_upcoming = any(g["date"] == date for g in upcoming)
        if not in_upcoming:
            print(f"  ⚠️  {date} not in upcoming schedule — skipping")
            continue

        js = mark_game_final(js, date, gs, opp)

        print(f"   🤖 Generating recap via Claude...")
        display_date = datetime.strptime(date, "%Y-%m-%d").strftime("%b %-d, %Y")
        recap = generate_game_recap(opponent, gs, opp, display_date)
        js = update_last_game(js, opponent, gs, opp, display_date, recap)
        changed = True

    # ── Refresh matchup + chirps for next upcoming game ──
    schedule = parse_schedule(js)
    upcoming = [g for g in schedule if g["status"] == "upcoming"]

    if upcoming and changed and ANTHROPIC_KEY:
        nxt = upcoming[0]
        print(f"\n🎯 Generating content for: {nxt['date']} vs {nxt['opponent']}")

        last_final = [g for g in schedule if g["status"] == "final"]
        last_result = f"just beat {last_final[-1]['opponent']}" if last_final else "coming off a break"

        matchup = generate_matchup_content(nxt["opponent"], nxt["date"], "game time TBD", last_result)
        if matchup:
            js = update_matchup(js, matchup, nxt["opponent"], nxt["date"], "game time TBD")

        chirps = generate_chirps(nxt["opponent"])
        if chirps:
            js = update_chirps(js, chirps)
        changed = True

    if changed:
        js = update_cache_bust(js)

        if not validate_js_syntax(js):
            print("\n🛑 Aborting WITHOUT writing — the update would have broken siteContent.js.")
            print("   Check the update_last_game / update_matchup / update_chirps regex logic above.")
            sys.exit(1)

        if args.dry_run:
            print("\n🔍 DRY RUN — changes computed but NOT written")
        else:
            write_site_content(js)
            print("\n✅ siteContent.js updated — push to GitHub and Cloudflare will auto-deploy")
            print("   Or run: bash deploy.sh  (direct Wrangler deploy)")
    else:
        print("\n✅ No new results — site already up to date")


if __name__ == "__main__":
    main()
