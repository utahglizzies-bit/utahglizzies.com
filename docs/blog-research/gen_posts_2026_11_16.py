import re, json, pathlib
ROOT = pathlib.Path('/Users/aherrin/Downloads/glizzies-full-site/UtahGlizzies.com')
tpl = (ROOT/'blog/utah-mammoth-changed-utah-hockey.html').read_text()
head_css = tpl[tpl.index('<style id="presale-sticky-css">'):tpl.index('</head>')]
banner_to_hero = tpl[tpl.index('<body>'):tpl.index('<div class="blog-post-hero">')]
tail = tpl[tpl.index('<footer class="site-footer">'):]
BASE = 'https://www.utahglizzies.com'
TODAY = '2026-11-16'

def build(p):
    url = f"{BASE}/blog/{p['slug']}.html"
    img = f"{BASE}/assets/photos/{p['hero']}"
    art = {"@context":"https://schema.org","@type":"Article","headline":p['h1'],"image":img,"datePublished":TODAY,"dateModified":TODAY,
      "author":{"@type":"Organization","name":"Utah Glizzies HC"},
      "publisher":{"@type":"Organization","name":"Utah Glizzies HC","logo":{"@type":"ImageObject","url":BASE+"/assets/glizzies-logo.png?v=20260909"},"url":BASE+"/"},
      "mainEntityOfPage":{"@type":"WebPage","@id":url},"description":p['desc']}
    faq = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in p['faq']]}
    ld = f'<script type="application/ld+json">\n  {json.dumps(art)}\n  </script>\n  <script type="application/ld+json">\n  {json.dumps(faq)}\n  </script>\n'
    if p.get('howto'):
        ht = {"@context":"https://schema.org","@type":"HowTo","name":p['howto'][0],"step":[{"@type":"HowToStep","name":n,"text":t} for n,t in p['howto'][1]]}
        ld += f'  <script type="application/ld+json">\n  {json.dumps(ht)}\n  </script>\n'
    hreflangs = ''.join(f'  <link rel="alternate" hreflang="{l}" href="{url}" />\n' for l in ['en-us','en-ca','en','x-default'])
    head = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{p['title']}</title>
  <meta name="description" content="{p['desc']}" />
  <meta property="og:title" content="{p['h1']}" />
  <meta property="og:description" content="{p['ogdesc']}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="{img}" />
  <meta property="og:url" content="{url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{p['h1']}" />
  <meta name="twitter:description" content="{p['ogdesc']}" />
  <meta name="twitter:image" content="{img}" />
  <link rel="canonical" href="{url}" />
{hreflangs}  <link rel="icon" href="../assets/glizzies-logo.png?v=20260909" />
  <link rel="manifest" href="../manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&family=Oswald:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../styles.css?v=20260909d" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-49PTYCCKB1"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-49PTYCCKB1');</script>
  {ld}  '''
    hero = f'''<div class="blog-post-hero">
    <div class="breadcrumb"><a href="../index.html">Home</a> / <a href="../blog.html">Blog</a> / {p['crumb']}</div>
    <span class="blog-post-tag">{p['tag']}</span>
    <h1>{p['h1']}</h1>
    <p class="post-meta">November 16, 2026 &bull; {p['read']} min read &bull; By Utah Glizzies HC</p>
  </div>

  <figure class="blog-hero-figure">
    <img src="../assets/photos/{p['hero']}" alt="{p['heroalt']}" width="1200" height="800" />
  </figure>

  <div class="blog-prose">
{p['body']}
    <div class="blog-post-footer">
      <a href="../blog.html" class="button secondary">&larr; All Posts</a>
      <a href="{p['next'][0]}" class="button primary">Next: {p['next'][1]}</a>
    </div>

  </div>

  '''
    (ROOT/f"blog/{p['slug']}.html").write_text(head + head_css + '</head>\n' + banner_to_hero + hero + tail)

P1 = dict(
 slug='utah-outdoor-ice-skating-winter-guide',
 title='Outdoor Ice Skating in Utah: Winter Rink Guide | Glizzies',
 desc='Where to skate outdoors in Utah this winter: Gallivan Center, Park City, Millcreek Common and Bountiful, plus how to turn it into real hockey skills.',
 ogdesc='Outdoor ice in Utah this winter, from downtown Salt Lake to Park City, and how to level up into hockey.',
 h1='Outdoor Ice Skating in Utah: A Winter Guide for Hockey Fans',
 crumb='Outdoor Ice Skating in Utah', tag='Utah Hockey', read=5,
 hero='hero-action.jpg', heroalt='Utah Glizzies player skating hard during a beer league game',
 faq=[('Where can you skate outdoors in Salt Lake City?','The Gallivan Center at 239 S. Main St. in downtown Salt Lake City runs an outdoor rink each winter, usually opening around November. Season dates and hours change, so check the venue before you go.'),
      ('Are there outdoor ice rinks in Park City?','Yes. The Resort Center rink at the base of Park City Mountain Resort is an outdoor rink, and Park City Ice Arena offers indoor ice.'),
      ('Can you play hockey at outdoor public rinks in Utah?','Generally these are public skating rinks, so sticks and pucks are usually not allowed. Check each rink rules, and use a stick and puck session at an indoor rink for real hockey practice.'),
      ('Do the Utah Glizzies skate outdoors?','No. The Glizzies play indoors at the Utah Mammoth Ice Center in Sandy.')],
 body='''    <p>The NHL is bringing outdoor hockey to Salt Lake City on New Year's Eve, and suddenly everyone in Utah wants to skate somewhere with a view. Good news: Utah has a handful of outdoor rinks that turn up every winter. Here is where to look, what to expect, and how to turn a lap around the rink into actual hockey skills.</p>

    <h2>Where to Skate Outdoors in Utah</h2>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">Nov</div><div class="stat-label">Most outdoor rinks open around November and run through winter</div></div>
      <div class="stat-box"><div class="stat-num">5+</div><div class="stat-label">Outdoor skate spots along the Wasatch Front and Park City</div></div>
      <div class="stat-box"><div class="stat-num">Check</div><div class="stat-label">Dates and hours change every season. Confirm before you drive</div></div>
    </div>
    <ul>
      <li><strong>Gallivan Center, Salt Lake City:</strong> a downtown outdoor rink at 239 S. Main St. It usually opens around November and closed its most recent season in early March.</li>
      <li><strong>Resort Center, Park City:</strong> an outdoor rink at the base of Park City Mountain Resort with lights, music and holiday decor.</li>
      <li><strong>Millcreek Common:</strong> a skate loop that typically runs roughly November through February or March.</li>
      <li><strong>J. Lynn Crane Park and the Bountiful Ice Ribbon:</strong> seasonal ice ribbons that generally run November through February.</li>
    </ul>
    <p>Season dates for this winter were not all posted when we checked, so treat the list as a starting point and check each rink's own schedule.</p>

    <h2>Public Skate Is Not Hockey (Yet)</h2>
    <p>Outdoor rinks are built for casual skating. Most do not allow sticks and pucks, so do not show up with your gear bag and a dream. What they are great for is the part of hockey that matters most at the start: getting comfortable on your edges, gliding, and not panicking when you move.</p>

    <figure>
      <img src="../assets/photos/team-net.jpg" alt="Utah Glizzies teammates posing in front of the net at the rink" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Every Glizzie started with a wobbly lap around somebody's rink.</figcaption>
    </figure>

    <h2>Drills You Can Do on Any Public Rink</h2>
    <ol>
      <li><strong>Glide on two feet.</strong> Push off, bend your knees, and hold the glide as long as possible.</li>
      <li><strong>Practice your stop.</strong> Our <a href="how-to-stop-in-hockey-beginner-guide.html">beginner guide to stopping</a> breaks down the snowplow and the T-stop.</li>
      <li><strong>Skate backward in a straight line.</strong> Short sections at first, then add curves.</li>
      <li><strong>Work on crossovers.</strong> Big circles, outside leg crossing over, no hands on the boards.</li>
    </ol>

    <h2>Ready for Real Ice and a Stick?</h2>
    <p>When laps get boring, move indoors. Our <a href="utah-stick-and-puck-open-skate-guide.html">stick and puck guide</a> covers open sessions where you can bring equipment, and the <a href="adult-learn-to-skate-programs-utah.html">adult learn-to-skate programs</a> are the fastest route if you want coaching. Not sure where the indoor rinks are? See our <a href="ice-rinks-in-utah.html">Utah ice rinks guide</a>.</p>

    <div class="blog-cta-box">
      <h3>Skip the Cold. Join the <span>Hot Dogs.</span></h3>
      <p>The Utah Glizzies play indoors at the Utah Mammoth Ice Center in Sandy. No frostbite, only hot dog puns. Come meet the team.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>
''',
 next=('utah-stick-and-puck-open-skate-guide.html','Utah Stick and Puck Guide'))

P2 = dict(
 slug='late-night-beer-league-hockey-survival-guide',
 title='Late-Night Beer League Hockey: Survive the 11 PM Game',
 desc='Late-night beer league hockey tips: what to eat, how to warm up, and how to wind down and sleep after a 10 or 11 PM puck drop.',
 ogdesc='A 10:45 PM puck drop is a lifestyle. Here is how to eat, warm up, recover and sleep around it.',
 h1='Late-Night Beer League Hockey: How to Survive the 11 PM Game',
 crumb='Late-Night Beer League Hockey', tag='Culture', read=5,
 hero='hero-faceoff.jpg', heroalt='Faceoff during a late night Utah Glizzies beer league game',
 faq=[('How do you sleep after a late night hockey game?','Skip alcohol and screens, take a cooler rinse instead of a very hot shower, keep the room dark, and give your body time to come down. Late games leave players wired, so build a wind-down routine.'),
      ('What should you eat before a late hockey game?','Eat a lighter meal a couple of hours before, favor carbs with some protein, and avoid heavy greasy food right before you skate. Hydrate before you get to the rink.'),
      ('Should you nap before a late game?','A short nap earlier in the day can help, but a late-afternoon nap can make it harder to sleep after the game.'),
      ('How much sleep do hockey players need?','Most sources suggest 7 to 9 hours. After a late game, protect your bedtime on the following nights.')],
 howto=('Survive a late-night hockey game',[('Eat early and light','Have a balanced meal a couple of hours before and skip heavy food right before the game.'),('Hydrate','Drink water through the day and before you reach the rink.'),('Warm up dynamically','Do a short dynamic warmup before you step on the ice.'),('Wind down','Cut screens, skip alcohol, and take a cooler rinse after the game.'),('Protect your sleep','Aim for 7 to 9 hours across the next nights.')]),
 body='''    <p>Nobody dreams of a 10:45 PM puck drop. Ice time is a scarce resource, though, so the late slot is where a lot of adult hockey lives. If your game ends after midnight and your alarm goes off at 6 AM, this guide is for you.</p>

    <h2>The Problem With Late Hockey</h2>
    <p>Hockey revs up your nervous system. Sports-science folks at USA Hockey have pointed out that after a late game, players are wired, which makes falling asleep hard. Add a long drive, a locker room beer, and a phone, and sleep gets worse fast.</p>

    <h2>Before the Game</h2>
    <ul>
      <li><strong>Eat earlier, and lighter.</strong> A balanced meal with carbs and some protein a couple of hours out beats a burrito at 10 PM.</li>
      <li><strong>Hydrate all day.</strong> Show up already hydrated, not trying to catch up in the locker room.</li>
      <li><strong>Mind your naps.</strong> A short nap earlier in the day can help. A late-afternoon nap can wreck your sleep afterward.</li>
      <li><strong>Warm up on purpose.</strong> A few minutes of dynamic movement before stepping on the ice cuts the stiff, tired-legs feeling and helps avoid injury. See our <a href="beer-league-hockey-injuries-prevention.html">injury prevention guide</a>.</li>
    </ul>

    <figure>
      <img src="../assets/photos/hero-celebration.jpg" alt="Utah Glizzies players celebrating a goal late in a beer league game" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Goal celebrations at 11:40 PM hit different.</figcaption>
    </figure>

    <h2>After the Game</h2>
    <ol>
      <li><strong>Unpack your gear.</strong> Tired or not, <a href="how-to-stop-hockey-gear-from-smelling.html">hang it up so it dries</a>.</li>
      <li><strong>Go easy on the alcohol.</strong> It is a classic cause of poor sleep, even though the post-game beer is a tradition. See the <a href="unwritten-rules-beer-league-hockey.html">unwritten rules</a>.</li>
      <li><strong>Cool down.</strong> Some sports-science advice favors a cooler rinse over a long hot shower, since a lower body temperature helps sleep.</li>
      <li><strong>Cut the screens.</strong> Doomscrolling the group chat can wait until morning.</li>
      <li><strong>Protect the next night.</strong> Most sources recommend 7 to 9 hours of sleep. Bank some on the following nights.</li>
    </ol>

    <h2>Is It Worth It?</h2>
    <p>Yes. Late ice is cheaper and easier to get, and the people who play at 11 PM are the most committed (or most unwell) in the league. If you are still deciding whether beer league is for you, see how to <a href="how-to-join-beer-league-hockey-utah.html">join a team in Utah</a>.</p>

    <div class="blog-cta-box">
      <h3>Late Puck Drops. Early <span>Regrets.</span></h3>
      <p>The Utah Glizzies play out of the Utah Mammoth Ice Center in Sandy. Bring a good attitude and a second coffee. Come meet the team.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>
''',
 next=('unwritten-rules-beer-league-hockey.html','Unwritten Rules of Beer League Hockey'))

build(P1); build(P2)

bh = ROOT/'blog.html'; s = bh.read_text()
cards = ''
for p,cat,ex,imgalt in [(P1,'utah','Where to skate outdoors in Utah this winter, from Gallivan Center to Park City, and how to build real hockey skills.','Utah Glizzies player skating hard during a beer league game'),
                (P2,'culture','How to eat, warm up, wind down and sleep around a 10 or 11 PM beer league puck drop.','Faceoff during a late night Utah Glizzies beer league game')]:
    cards += f'''        <a class="blog-card" href="blog/{p['slug']}.html" data-cat="{cat}">
          <div class="blog-card-media"><img src="assets/photos/{p['hero']}" alt="{imgalt}" loading="lazy" decoding="async" /></div>
          <span class="blog-tag">{p['tag']}</span>
          <h2>{p['h1']}</h2>
          <p>{ex}</p>
          <div class="blog-card-meta">
            <span>Nov 16, 2026</span>
            <span>&bull;</span>
            <span>{p['read']} min read</span>
          </div>
          <span class="blog-card-cta">Read the guide</span>
        </a>

'''
marker = '<div class="blog-grid" id="blog-grid">\n\n'
assert marker in s
bh.write_text(s.replace(marker, marker + cards, 1))

sm = ROOT/'sitemap.xml'; t = sm.read_text()
new = ''.join(f'  <url><loc>{BASE}/blog/{p["slug"]}.html</loc><lastmod>{TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n' for p in (P1,P2))
sm.write_text(t.replace('</urlset>', new + '</urlset>'))
print('ok')
