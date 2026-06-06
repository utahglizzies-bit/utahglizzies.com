#!/usr/bin/env python3
"""
Utah Glizzies — Fully Automatic Weekly Update Script
Fetches GameSheet data, generates AI content via Claude API,
updates siteContent.js, and commits. GitHub Action deploys to Cloudflare.
"""

import os, re, json, requests
from datetime import datetime, timezone

TEAM_ID       = os.environ.get("GAMESHEET_TEAM_ID", "f6cc3e10-5c24-4049-b6a9-bf2d57024f4a")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SITE_FILE     = "src/data/siteContent.js"
GAMESHEET_API = f"https://api.gamesheet.app/api/v4/teams/{TEAM_ID}"

HEADERS = {"Accept": "application/json", "User-Agent": "UtahGlizziesBot/1.0"}


# ─── 1. FETCH GAMESHEET DATA ────────────────────────────────────────────────

def fetch_gamesheet_schedule():
    """Try GameSheet API for schedule results."""
    try:
        r = requests.get(f"{GAMESHEET_API}/schedule", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"GameSheet schedule fetch failed: {e}")
    return None

def fetch_gamesheet_stats():
    """Fetch player stats from GameSheet."""
    try:
        r = requests.get(f"{GAMESHEET_API}/stats", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"GameSheet stats fetch failed: {e}")
    return None

def fetch_gamesheet_standings():
    """Fetch team standings from GameSheet."""
    try:
        # Try common GameSheet API patterns
        for path in ["/standings", "/standing", "/season"]:
            r = requests.get(f"{GAMESHEET_API}{path}", headers=HEADERS, timeout=10)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        print(f"GameSheet standings fetch failed: {e}")
    return None


# ─── 2. READ CURRENT siteContent.js ─────────────────────────────────────────

def read_site_content():
    with open(SITE_FILE, "r") as f:
        return f.read()

def write_site_content(content):
    with open(SITE_FILE, "w") as f:
        f.write(content)
    print(f"✅ siteContent.js updated")


# ─── 3. PARSE CURRENT SCHEDULE FROM siteContent.js ──────────────────────────

def parse_current_schedule(js):
    """Extract schedule array from JS to find what's already final."""
    try:
        matches = re.findall(
            r'\{[^}]*date:\s*"([\d-]+)"[^}]*opponent:\s*"([^"]+)"[^}]*status:\s*"(\w+)"[^}]*\}',
            js, re.DOTALL
        )
        return [{
            "date": m[0],
            "opponent": m[1],
            "status": m[2]
        } for m in matches]
    except:
        return []


# ─── 4. CALL CLAUDE API ──────────────────────────────────────────────────────

def claude(prompt, system="You are the Utah Glizzies HC content writer. Beer league hockey, funny but clean, ESPN-style promo energy, hot dog branding. Keep it sharp and under 200 words per section."):
    if not ANTHROPIC_KEY:
        print("⚠️  No ANTHROPIC_API_KEY set — skipping AI content generation")
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
        else:
            print(f"Claude API error: {r.status_code} {r.text}")
    except Exception as e:
        print(f"Claude API call failed: {e}")
    return None


def generate_game_recap(opponent, glizzies_score, opponent_score, date):
    result = "win" if glizzies_score > opponent_score else "loss"
    prompt = f"""
Write a short game recap for Utah Glizzies HC.
Game: Glizzies {glizzies_score}, {opponent} {opponent_score} — {"WIN" if result=="win" else "LOSS"}
Date: {date}

Return ONLY valid JSON like this (no markdown, no extra text):
{{
  "recap": "2-3 sentence game recap in Glizzies brand voice",
  "momentOfGame": "1 sentence describing the key play or moment",
  "starOne": "Player nameplate and reason (e.g. GLIZZARD OF OZ — 2 goals, carried the offense)",
  "starTwo": "Player nameplate and reason",
  "starThree": "Player nameplate and reason"
}}
"""
    text = claude(prompt)
    if text:
        try:
            text = re.sub(r'^```json\s*', '', text.strip())
            text = re.sub(r'\s*```$', '', text.strip())
            return json.loads(text)
        except:
            print(f"Could not parse Claude recap JSON: {text[:200]}")
    return None


def generate_matchup_content(next_opponent, next_date, next_time, last_result):
    prompt = f"""
Write matchup preview content for Utah Glizzies HC vs {next_opponent}.
Game: {next_date} at {next_time}
Last game result: {last_result}

Return ONLY valid JSON (no markdown):
{{
  "title": "Matchup title (catchy, like 'Playoff Briefing: Shake The Salt')",
  "threatLevel": "Funny threat level (like 'Full Chili Dog Emergency')",
  "storyline": "2-3 sentence matchup storyline in Glizzies voice",
  "keys": ["Key 1 to winning", "Key 2", "Key 3", "Key 4"]
}}
"""
    text = claude(prompt)
    if text:
        try:
            text = re.sub(r'^```json\s*', '', text.strip())
            text = re.sub(r'\s*```$', '', text.strip())
            return json.loads(text)
        except:
            print(f"Could not parse Claude matchup JSON: {text[:200]}")
    return None


def generate_chirps(opponent):
    prompt = f"""
Write 3 funny opponent chirp cards for {opponent} players.
These are light-hearted beer league chirps — funny but never mean.

Return ONLY valid JSON (no markdown):
[
  {{
    "playerName": "Player name or 'The Bench'",
    "number": "Jersey number or '00'",
    "moment": "Short label for the chirp topic",
    "lines": ["Chirp line 1", "Chirp line 2", "Chirp line 3"]
  }},
  {{ ... }},
  {{ ... }}
]
"""
    text = claude(prompt)
    if text:
        try:
            text = re.sub(r'^```json\s*', '', text.strip())
            text = re.sub(r'\s*```$', '', text.strip())
            return json.loads(text)
        except:
            print(f"Could not parse Claude chirps JSON: {text[:200]}")
    return None


# ─── 5. UPDATE siteContent.js SECTIONS ──────────────────────────────────────

def update_last_game(js, opponent, gs, os_, date, recap_data):
    result = "win" if gs > os_ else "loss"
    recap  = recap_data.get("recap", f"Glizzies {gs}, {opponent} {os_}.") if recap_data else f"Glizzies {gs}, {opponent} {os_}."
    moment = recap_data.get("momentOfGame", "Great effort by the whole team.") if recap_data else "Great effort."

    new_block = f"""  lastGame: {{
    opponent: "{opponent}",
    glizziesScore: {gs},
    opponentScore: {os_},
    date: "{date}",
    result: "{result}",
    recap: "{recap.replace(chr(34), chr(39))}",
    momentOfGame: "{moment.replace(chr(34), chr(39))}","""

    if recap_data and recap_data.get("starOne"):
        new_block += f"""
    threeStars: [
      {{ name: "{recap_data.get('starOne','')}", star: 1 }},
      {{ name: "{recap_data.get('starTwo','')}", star: 2 }},
      {{ name: "{recap_data.get('starThree','')}", star: 3 }}
    ],"""

    new_block += "\n  },"

    js = re.sub(r'  lastGame:\s*\{.*?\},', new_block, js, flags=re.DOTALL)
    return js


def update_matchup(js, matchup_data, opponent, next_date, next_time):
    if not matchup_data:
        return js
    keys_str = json.dumps(matchup_data.get("keys", []))
    new_block = f"""  matchup: {{
    title: "{matchup_data.get('title','Matchup Preview')}",
    threatLevel: "{matchup_data.get('threatLevel','Elevated Mustard')}",
    playerToWatch: "TBD",
    opponent: "{opponent}",
    record: "{opponent}: record TBD",
    storyline: "{matchup_data.get('storyline','').replace(chr(34), chr(39))}",
    opponentBreakdown: [],
    opponentStats: ["Next up: {opponent}, {next_date} at {next_time}."],
    keys: {keys_str},
  }},"""
    js = re.sub(r'  matchup:\s*\{.*?\},', new_block, js, flags=re.DOTALL)
    return js


def update_chirps(js, chirps_data):
    if not chirps_data:
        return js
    chirps_str = json.dumps(chirps_data, indent=4)
    js = re.sub(r'  opponentChirps:\s*\[.*?\],', f'  opponentChirps: {chirps_str},', js, flags=re.DOTALL)
    return js


def mark_game_final(js, date, gs, os_):
    result = "win" if gs > os_ else "loss"
    # Find the schedule entry for this date and update it
    pattern = r'(\{[^}]*date:\s*"' + re.escape(date) + r'"[^}]*status:\s*)"upcoming"'
    replacement = r'\1"final", glizziesScore: ' + str(gs) + ', opponentScore: ' + str(os_) + ', result: "' + result + '"'
    new_js = re.sub(pattern, replacement, js, flags=re.DOTALL)
    if new_js == js:
        print(f"  ⚠️  Could not find upcoming game for {date} to mark final")
    else:
        print(f"  ✅ Marked {date} as final ({gs}-{os_} {result})")
    return new_js


# ─── 6. MAIN ORCHESTRATION ───────────────────────────────────────────────────

def main():
    print("🏒 Utah Glizzies Auto-Update Starting...")
    print(f"   Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")

    js = read_site_content()
    current_schedule = parse_current_schedule(js)
    upcoming = [g for g in current_schedule if g["status"] == "upcoming"]
    finals   = [g for g in current_schedule if g["status"] == "final"]

    print(f"   Schedule: {len(finals)} final, {len(upcoming)} upcoming")

    # ── Try GameSheet API ──
    gs_data = fetch_gamesheet_schedule()
    changed = False

    if gs_data:
        print("✅ GameSheet data fetched successfully")
        # Parse GameSheet response — handle various response formats
        games = []
        if isinstance(gs_data, list):
            games = gs_data
        elif isinstance(gs_data, dict):
            games = gs_data.get("games", gs_data.get("schedule", gs_data.get("data", [])))

        for game in games:
            # GameSheet field names vary — try common patterns
            game_date = (game.get("date") or game.get("gameDate") or game.get("scheduled_at", ""))[:10]
            home_score = game.get("homeScore") or game.get("home_score") or game.get("homeTeamScore")
            away_score = game.get("awayScore") or game.get("away_score") or game.get("awayTeamScore")
            status     = (game.get("status") or game.get("gameStatus") or "").lower()

            if not game_date or home_score is None:
                continue

            # Check if this game is in our upcoming list and now has a score
            in_upcoming = any(g["date"] == game_date for g in upcoming)
            is_complete = "final" in status or "complete" in status or "done" in status

            if in_upcoming and is_complete:
                # Determine which score is ours
                home_team = str(game.get("homeTeam") or game.get("home_team") or "").lower()
                is_home   = "glizz" in home_team or "utah" in home_team
                gs_score  = int(home_score) if is_home else int(away_score)
                opp_score = int(away_score) if is_home else int(home_score)
                opponent  = next((g["opponent"] for g in upcoming if g["date"] == game_date), "Opponent")

                print(f"\n🆕 New result found: {game_date} — Glizzies {gs_score}, {opponent} {opp_score}")

                # Mark final in schedule
                js = mark_game_final(js, game_date, gs_score, opp_score)

                # Generate AI recap content
                print("   🤖 Generating game recap via Claude...")
                recap_data = generate_game_recap(opponent, gs_score, opp_score, game_date)

                # Update lastGame
                display_date = datetime.strptime(game_date, "%Y-%m-%d").strftime("%b %-d, %Y")
                js = update_last_game(js, opponent, gs_score, opp_score, display_date, recap_data)
                print(f"   ✅ lastGame updated")

                changed = True

    else:
        print("⚠️  GameSheet API unavailable — skipping score updates")
        print("   (Scores must be entered manually or GameSheet API endpoint needs updating)")

    # ── Generate matchup + chirps for next upcoming game ──
    # Re-parse to get updated upcoming list
    current_schedule = parse_current_schedule(js)
    upcoming = [g for g in current_schedule if g["status"] == "upcoming"]

    if upcoming:
        next_game = upcoming[0]
        print(f"\n🎯 Next game: {next_game['date']} vs {next_game['opponent']}")

        if ANTHROPIC_KEY:
            # Only regenerate matchup if we have a new result (or first run)
            if changed:
                print("   🤖 Generating matchup preview via Claude...")
                last_final = [g for g in current_schedule if g["status"] == "final"]
                last_result = f"Glizzies most recent game was vs {last_final[-1]['opponent']}" if last_final else "coming off a break"
                matchup_data = generate_matchup_content(
                    next_game["opponent"], next_game["date"], "game time TBD", last_result
                )
                if matchup_data:
                    js = update_matchup(js, matchup_data, next_game["opponent"], next_game["date"], "game time TBD")
                    print("   ✅ matchup updated")

                print("   🤖 Generating opponent chirps via Claude...")
                chirps = generate_chirps(next_game["opponent"])
                if chirps:
                    js = update_chirps(js, chirps)
                    print("   ✅ opponentChirps updated")

                changed = True

    # ── Write file if anything changed ──
    if changed:
        write_site_content(js)
        print("\n✅ siteContent.js updated — GitHub Action will commit and push")
        print("   Cloudflare Pages will auto-deploy in ~30 seconds after push")
    else:
        print("\n✅ No changes detected — site is already up to date")

if __name__ == "__main__":
    main()
