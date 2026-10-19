import json, sys
ROOT = sys.argv[1]
T = open(ROOT + "/blog/utah-mammoth-changed-utah-hockey.html", encoding="utf-8").read()
BASE = "https://www.utahglizzies.com"

pre = T[:T.index("<title>")]
icon_to_ld = T[T.index('<link rel="icon"'):T.index('<script type="application/ld+json">')]
mid = T[T.index('<style id="presale-sticky-css">'):T.index('<div class="blog-post-hero">')]
tail = T[T.index('<footer class="site-footer">'):]

def build(p):
    url = f"{BASE}/blog/{p['slug']}.html"
    img = f"{BASE}/assets/photos/{p['hero']}"
    art = {"@context": "https://schema.org", "@type": "Article", "headline": p["h1"], "image": img,
           "datePublished": "2026-10-19", "dateModified": "2026-10-19",
           "author": {"@type": "Organization", "name": "Utah Glizzies HC"},
           "publisher": {"@type": "Organization", "name": "Utah Glizzies HC",
                         "logo": {"@type": "ImageObject", "url": f"{BASE}/assets/glizzies-logo.png?v=20260909"},
                         "url": BASE + "/"},
           "mainEntityOfPage": {"@type": "WebPage", "@id": url}, "description": p["desc"]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]}
    head = (f'<title>{p["title"]}</title>\n'
            f'  <meta name="description" content="{p["desc"]}" />\n'
            f'  <meta property="og:title" content="{p["h1"]}" />\n'
            f'  <meta property="og:description" content="{p["ogdesc"]}" />\n'
            f'  <meta property="og:type" content="article" />\n'
            f'  <meta property="og:image" content="{img}" />\n'
            f'  <meta property="og:url" content="{url}" />\n'
            f'  <meta name="twitter:card" content="summary_large_image" />\n'
            f'  <meta name="twitter:title" content="{p["h1"]}" />\n'
            f'  <meta name="twitter:description" content="{p["ogdesc"]}" />\n'
            f'  <meta name="twitter:image" content="{img}" />\n'
            f'  <link rel="canonical" href="{url}" />\n')
    for hl in ["en-us", "en-ca", "en", "x-default"]:
        head += f'  <link rel="alternate" hreflang="{hl}" href="{url}" />\n'
    head += "  " + icon_to_ld
    head += '<script type="application/ld+json">\n  ' + json.dumps(art, ensure_ascii=False) + "\n  </script>\n"
    head += '  <script type="application/ld+json">\n  ' + json.dumps(faq, ensure_ascii=False) + "\n  </script>\n"
    hero = (f'<div class="blog-post-hero">\n    <div class="breadcrumb"><a href="../index.html">Home</a> / <a href="../blog.html">Blog</a> / {p["crumb"]}</div>\n'
            f'    <span class="blog-post-tag">{p["tag"]}</span>\n    <h1>{p["h1"]}</h1>\n'
            f'    <p class="post-meta">October 19, 2026 &bull; {p["read"]} min read &bull; By Utah Glizzies HC</p>\n  </div>\n\n'
            f'  <figure class="blog-hero-figure">\n    <img src="../assets/photos/{p["hero"]}" alt="{p["heroalt"]}" width="1200" height="800" />\n  </figure>\n\n'
            f'  <div class="blog-prose">\n{p["body"]}\n  </div>\n\n  ')
    return pre + head + "  " + mid + hero + tail

posts = []

# ---------- POST 1: November Mammoth ----------
posts.append(dict(
    slug="utah-mammoth-november-2026-home-games-guide",
    title="Utah Mammoth November 2026 Home Games: Fan Guide",
    h1="Utah Mammoth November 2026 Home Games: A Fan Guide",
    desc="Utah Mammoth November 2026 home games at the Delta Center: all six dates, puck drops and a five-game homestand plan, plus how to go from fan to player.",
    ogdesc="Six November home games, a five-game homestand and one very good excuse to buy a jersey. Your Mammoth game-night cheat sheet.",
    hero="utah-mammoth-delta-center.jpg", heroalt="Utah Mammoth player celebrating with fans at the Delta Center",
    crumb="Utah Mammoth November 2026 Home Games", tag="Utah Hockey", read=5,
    faq=[("How many Utah Mammoth home games are in November 2026?", "Six: Nov. 12 vs. St. Louis, Nov. 14 vs. San Jose, Nov. 16 vs. Vancouver, Nov. 18 vs. Colorado, Nov. 21 vs. Anaheim and Nov. 30 vs. Montreal, all at the Delta Center in Salt Lake City."),
         ("Where do the Utah Mammoth play?", "At the Delta Center in downtown Salt Lake City. The Utah Glizzies, a beer league team, play at the Utah Mammoth Ice Center in Sandy."),
         ("What time do Mammoth home games start in November?", "Most start at 7:00 p.m. Mountain Time. The Nov. 16 Vancouver game and the Nov. 30 Montreal game are scheduled for 7:30 p.m. Always confirm on the team's official schedule before you go."),
         ("How can I start playing hockey in Utah?", "Local rinks run adult learn-to-skate and learn-to-play programs, and beer league teams like the Utah Glizzies welcome beginners.")],
    body='''
    <p>The Mammoth are about to leave town for a long road trip, then come home and stay home. After six straight road games (Oct. 29 through Nov. 11), the team returns to the Delta Center for a five-game homestand, the second-longest of the season. Here's your November game-night cheat sheet, plus how to turn "I love this sport" into "I own a hockey bag that smells like regret."</p>

    <h2>The November Home Schedule</h2>
    <p>All six November home games are at the Delta Center in downtown Salt Lake City. Times are Mountain Time.</p>
    <ul>
      <li><strong>Thu, Nov. 12:</strong> vs. St. Louis Blues, 7:00 p.m.</li>
      <li><strong>Sat, Nov. 14:</strong> vs. San Jose Sharks, 7:00 p.m.</li>
      <li><strong>Mon, Nov. 16:</strong> vs. Vancouver Canucks, 7:30 p.m.</li>
      <li><strong>Wed, Nov. 18:</strong> vs. Colorado Avalanche, 7:00 p.m.</li>
      <li><strong>Sat, Nov. 21:</strong> vs. Anaheim Ducks, 7:00 p.m.</li>
      <li><strong>Mon, Nov. 30:</strong> vs. Montreal Canadiens, 7:30 p.m.</li>
    </ul>
    <p>Schedules move. Double-check dates and puck drops on the <a href="https://www.nhl.com/utah/schedule" rel="noopener" target="_blank">official Mammoth schedule</a> before you buy tickets or book a babysitter.</p>

    <h2>Which Game Should You Pick?</h2>
    <p>If you only go to one, make it the Colorado game on Nov. 18. Division rivals, loud building, and a midweek night when nobody has to explain to their boss why they're hoarse. The Saturday games against San Jose (Nov. 14) and Anaheim (Nov. 21) are the easiest on the calendar for a first-timer. Montreal on Nov. 30 is the one for people who like their hockey history with a side of fan-base noise.</p>

    <div class="pullquote">A five-game homestand is the hockey equivalent of an all-you-can-eat hot dog buffet. Pace yourself, hydrate, and do not eat a fifth one.</div>

    <h2>Game-Night Tips for New Fans</h2>
    <ol>
      <li><strong>Get there early.</strong> Warmups are half the show, and downtown parking and TRAX both get busy.</li>
      <li><strong>Learn the three-second rule of icing.</strong> Okay, it isn't a three-second rule. Just ask the person next to you; hockey fans love explaining icing.</li>
      <li><strong>Pick a player to watch.</strong> Following one skater all game teaches you more about positioning than any TV broadcast. Our <a href="hockey-positions-explained-beginners-beer-league.html">positions guide</a> helps.</li>
      <li><strong>Can't make it?</strong> Check our list of <a href="where-to-watch-hockey-salt-lake-city.html">where to watch hockey in Salt Lake City</a>.</li>
    </ol>

    <figure>
      <img src="../assets/photos/glizzies-team-mammoth-ice-center.jpg" alt="Utah Glizzies beer league team in green jerseys at the Utah Mammoth Ice Center in Sandy" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Not the Delta Center: the Glizzies at the Utah Mammoth Ice Center in Sandy.</figcaption>
    </figure>

    <h2>From the Stands to the Ice</h2>
    <p>Every November sellout sends a few hundred more Utahns home thinking, "I could do that." (You could. Slower, and with more falling.) If that's you, start with our guide to <a href="how-to-start-playing-hockey-adult-utah.html">starting hockey as an adult in Utah</a>, then look at the <a href="adult-hockey-leagues-salt-lake-city.html">adult leagues in Salt Lake City</a>. If you're comparing this with last month, here's our <a href="utah-mammoth-october-2026-home-games-guide.html">October home games guide</a>.</p>

    <div class="blog-cta-box">
      <h3>Same Sport. <span>Fewer Sellouts.</span></h3>
      <p>The Mammoth play at the Delta Center. The Utah Glizzies play at the Utah Mammoth Ice Center in Sandy. Same love of the game, slightly more questionable cardio. Come meet the team.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>

    <div class="blog-post-footer">
      <a href="../blog.html" class="button secondary">&larr; All Posts</a>
      <a href="how-to-join-beer-league-hockey-utah.html" class="button primary">Next: How to Join Beer League Hockey in Utah</a>
    </div>
'''))

# ---------- POST 2: sharpening ----------
posts.append(dict(
    slug="how-often-to-sharpen-hockey-skates",
    title="How Often to Sharpen Hockey Skates (Beginner Guide)",
    h1="How Often Should You Sharpen Your Hockey Skates?",
    desc="How often to sharpen hockey skates as a beginner or beer leaguer: a practical hours-on-ice rule, signs your edges are dull, and mistakes that kill a good sharpen.",
    ogdesc="Every 10 to 15 hours is a solid rule for beer leaguers. Here's how to tell when your edges are done, and what to avoid.",
    hero="hero-action.jpg", heroalt="Utah Glizzies player skating with the puck during a beer league game",
    crumb="How Often to Sharpen Hockey Skates", tag="Gear", read=5,
    faq=[("How often should a beginner sharpen hockey skates?", "A practical rule for recreational adults is every 10 to 15 hours on the ice, sooner if your edges stop gripping. Sources vary from every 5 hours to every 30, so go by feel as much as by the clock."),
         ("How do I know my hockey skates are dull?", "You slip on stops and crossovers, your edges won't bite on turns, or you see rounded, nicked or rusty edges. A common check is to run a fingernail across the edge: a sharp edge lightly shaves a bit of nail."),
         ("Do new skates need sharpening?", "Often yes. Many new skates ship with a factory edge that is not tuned for you, so many players get a fresh sharpen before the first skate."),
         ("Can I walk on concrete in my skates?", "Not with bare blades. Concrete and rubber mats dull edges fast, so use skate guards and soakers off the ice.")],
    body='''
    <p>Sharpening is the most underrated upgrade in beer league hockey. A $15 sharpen can feel better than a $300 stick. But how often is often enough? The honest answer from coaches, retailers and rink pros: it depends, and they don't all agree. Here's a straight answer you can actually use.</p>

    <h2>The Short Answer</h2>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">10&ndash;15</div><div class="stat-label">Hours on ice between sharpens is a solid default for recreational adults</div></div>
      <div class="stat-box"><div class="stat-num">5&ndash;30</div><div class="stat-label">The range you'll see online, depending on skater weight, ice and style</div></div>
    </div>
    <p>Some guides say every 5 to 10 hours. Others say 20 to 30 for casual skaters. A sharpening-machine maker says every 3 to 4 hours, which is roughly the number you'd quote if you sold sharpening machines. For a beer leaguer playing one or two games a week, "every 10 to 15 hours" splits the difference. That's roughly every 8 to 12 games if you also take a few stick-and-puck sessions.</p>

    <h2>Signs Your Edges Are Done</h2>
    <ul>
      <li><strong>You slide on stops and tight turns.</strong> If your <a href="how-to-stop-in-hockey-beginner-guide.html">hockey stop</a> suddenly feels like a suggestion, check your edges first.</li>
      <li><strong>Crossovers feel mushy.</strong> The blade won't bite, so you wash out.</li>
      <li><strong>Visible nicks, rust or rounded edges.</strong> Not a good sign.</li>
      <li><strong>The fingernail test.</strong> Gently drag a fingernail across the edge. A sharp edge shaves a tiny curl; a dull one just slides.</li>
    </ul>

    <figure>
      <img src="../assets/photos/team-net.jpg" alt="Utah Glizzies beer league team photo with the net" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Even the Glizzies can't blame bad edges for every missed shot. Most of them, though.</figcaption>
    </figure>

    <h2>What Changes How Often You Need It</h2>
    <p>Heavier skaters, hard stoppers and players on rough or cold ice dull blades faster. Light, smooth skaters on good ice stretch it out. If you play outdoors or at crowded public sessions with scratched-up ice, plan on more frequent sharpens.</p>

    <div class="pullquote">Dull skates make everything harder. Over-sharpened skates make you grab ice you didn't ask for. The goal is "bites when you want it to, glides when you don't."</div>

    <h2>Mistakes That Kill a Good Sharpen</h2>
    <ol>
      <li><strong>Walking on concrete or rubber mats without guards.</strong> Use hard guards between the locker room and the ice, and soft soakers to dry blades afterward.</li>
      <li><strong>Leaving skates in the bag.</strong> Moisture means rust. Dry them out when you get home.</li>
      <li><strong>Sharpening too often.</strong> Every sharpen removes steel. Don't take a fresh grind before every game because you're feeling nervous.</li>
      <li><strong>Asking for "whatever."</strong> Tell the shop your weight, skill level and how you skate. They'll pick a hollow that matches.</li>
    </ol>

    <h2>Where to Get It Done in Utah</h2>
    <p>Most rinks and local hockey shops offer sharpening, often with a same-day turnaround. Start with our guide on <a href="where-to-buy-hockey-gear-utah.html">where to buy hockey gear in Utah</a>, and call ahead for hours and pricing, since both change. If you're still shopping for your first pair, see our <a href="best-hockey-skates-adult-rec-players-2026.html">best skates for adult rec players</a> and the full <a href="beer-league-equipment-checklist-beginners.html">beer league equipment checklist</a>.</p>

    <div class="blog-cta-box">
      <h3>Sharp Skates. <span>Dull Jokes.</span></h3>
      <p>The Utah Glizzies play at the Utah Mammoth Ice Center in Sandy. Come learn what a good edge feels like, then ruin it with a hard stop. Meet the squad.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>

    <div class="blog-post-footer">
      <a href="../blog.html" class="button secondary">&larr; All Posts</a>
      <a href="beer-league-equipment-checklist-beginners.html" class="button primary">Next: Beer League Equipment Checklist</a>
    </div>
'''))

for p in posts:
    open(f"{ROOT}/blog/{p['slug']}.html", "w", encoding="utf-8").write(build(p))
    print("wrote", p["slug"])
