import re, json, pathlib
ROOT = pathlib.Path('/Users/aherrin/Downloads/glizzies-full-site/UtahGlizzies.com')
tpl = (ROOT/'blog/utah-mammoth-changed-utah-hockey.html').read_text()
head_css = tpl[tpl.index('<style id="presale-sticky-css">'):tpl.index('</head>')]
banner_to_hero = tpl[tpl.index('<body>'):tpl.index('<div class="blog-post-hero">')]
tail = tpl[tpl.index('<footer class="site-footer">'):]
BASE = 'https://www.utahglizzies.com'
TODAY = '2026-11-10'

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
    <p class="post-meta">November 10, 2026 &bull; {p['read']} min read &bull; By Utah Glizzies HC</p>
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
 slug='utah-mammoth-winter-classic-2026-guide',
 title='Utah Mammoth Winter Classic 2026: Fan Guide | Utah Glizzies',
 desc='Utah Mammoth vs. Colorado Avalanche in the NHL Winter Classic, Dec. 31 at Rice-Eccles Stadium: time, tickets, what to wear, and how to get on the ice.',
 ogdesc='Mammoth vs. Avalanche outdoors at Rice-Eccles Stadium on Dec. 31 — what to know, what to wear, and how to play yourself.',
 h1='Utah Mammoth Winter Classic 2026: Your Fan Guide',
 crumb='Utah Mammoth Winter Classic 2026', tag='Utah Hockey', read=5,
 hero='hero-fans.jpg', heroalt='Hockey fans cheering in the stands at a Utah game',
 faq=[('When is the 2026 NHL Winter Classic in Salt Lake City?','The Utah Mammoth host the Colorado Avalanche on Thursday, December 31, 2026, at Rice-Eccles Stadium. Most ticket listings show a 4:00 PM Mountain start, so confirm on the official ticket page.'),
      ('Where is the Winter Classic played?','At Rice-Eccles Stadium on the University of Utah campus, not the Delta Center. It is the one outdoor home game of the Mammoth season.'),
      ('What should I wear to an outdoor hockey game in Utah?','Layer up: thermal base layer, insulated waterproof outer layer, wool socks, gloves and a hat. Hand warmers and a stadium-approved blanket or seat cushion help if allowed.'),
      ('Do the Utah Glizzies play at the Delta Center?','No. The Glizzies play at the Utah Mammoth Ice Center in Sandy. The NHL Utah Mammoth play at the Delta Center, plus this one outdoor game at Rice-Eccles.')],
 body='''    <p>Every so often the NHL takes the best indoor sport on earth and plops it in a football stadium in the freezing cold. On <strong>Thursday, December 31, 2026</strong>, that stadium is Rice-Eccles in Salt Lake City, the Utah Mammoth are the hosts, and the <strong>Colorado Avalanche</strong> are the guests. New Year's Eve hockey, outdoors, in Utah. Here's the beer-league-approved guide.</p>

    <h2>The Basics</h2>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">Dec 31</div><div class="stat-label">Thursday, New Year's Eve 2026</div></div>
      <div class="stat-box"><div class="stat-num">4 PM</div><div class="stat-label">MT start per most ticket listings (one resale site shows 7 PM, so verify)</div></div>
      <div class="stat-box"><div class="stat-num">Rice-Eccles</div><div class="stat-label">University of Utah campus, not the Delta Center</div></div>
    </div>
    <p>This is the one extra home game on top of the Mammoth's regular 41 at the Delta Center. Start time and ticket rules can change at the league's discretion, so check the official ticket page before you plan your day. Resale listings we saw started around $240 and up, and prices move fast.</p>

    <h2>What to Wear (Rec Players Already Know This)</h2>
    <p>If you've ever played a 10:30 PM game in a rink where the heat is a rumor, you're ahead of everyone. The rule is layers:</p>
    <ul>
      <li><strong>Base layer:</strong> thermal or moisture-wicking. Cotton is a trap.</li>
      <li><strong>Mid layer:</strong> fleece or wool.</li>
      <li><strong>Outer layer:</strong> insulated and windproof. Stadium wind is real.</li>
      <li><strong>Extremities:</strong> wool socks, gloves, a hat. Hand warmers are the MVP.</li>
    </ul>

    <figure>
      <img src="../assets/photos/hero-celebration.jpg" alt="Utah Glizzies players celebrating a goal in a beer league game" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Goal celebrations hit harder in the cold. Ask any Glizzie.</figcaption>
    </figure>

    <h2>Getting There</h2>
    <p>Game-day traffic around the U is no joke on a normal Saturday, and this is a holiday-week game with a national TV audience. Plan on transit, rideshare drop-offs a few blocks away, or parking well ahead. Check official Mammoth and University channels for gate times and transportation details, because those get published closer to the date.</p>

    <h2>Then Go Play Some Hockey Yourself</h2>
    <p>Outdoor hockey makes everybody want a pond. Utah doesn't have many frozen ponds you'd trust, but it does have indoor rinks, adult learn-to-skate classes, and open stick-and-puck sessions. Start with our <a href="utah-stick-and-puck-open-skate-guide.html">Utah stick and puck guide</a> or the <a href="adult-learn-to-skate-programs-utah.html">adult learn-to-skate programs</a> list. Already skating? The <a href="how-to-join-beer-league-hockey-utah.html">beer league joining guide</a> gets you on a roster.</p>
    <p>Want the rest of the Mammoth calendar? Our <a href="utah-mammoth-november-2026-home-games-guide.html">November home games guide</a> covers the homestand.</p>

    <div class="blog-cta-box">
      <h3>Rice-Eccles Is Cold. The Sandy Rink Is <span>Warmer.</span></h3>
      <p>The Mammoth play the Winter Classic outdoors. The Utah Glizzies play at the Utah Mammoth Ice Center in Sandy, indoors, with hot dogs. Come meet the team.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>
''',
 next=('how-to-join-beer-league-hockey-utah.html','How to Join Beer League Hockey in Utah'))

P2 = dict(
 slug='how-to-stop-hockey-gear-from-smelling',
 title='How to Stop Hockey Gear From Smelling (It Works) | Glizzies',
 desc='How to get the smell out of hockey gear and keep it out: dry it right after games, wash it, and store it so your bag stops being a biohazard.',
 ogdesc='Hockey bag smell is a drying problem. Here is the post-game routine that actually fixes it.',
 h1='How to Stop Your Hockey Gear From Smelling',
 crumb='How to Stop Hockey Gear From Smelling', tag='Gear', read=5,
 hero='team-both-jerseys.jpg', heroalt='Utah Glizzies teammates in green and cream jerseys',
 faq=[('How do you get the smell out of hockey gear?','Dry it fast and completely after every game. Take everything out of the bag, open up gloves, skates and pads, and use airflow from a fan or drying rack. Wash washable items, and treat sprays as a short-term fix only.'),
       ('Can you put hockey gloves in the dryer?','Usually no. Machine drying can stiffen and damage leather palms, so air-dry gloves inside out instead.'),
       ('How soon should you air out hockey gear?','As soon as you get home. Gear that is out of the bag within about 30 minutes smells far less than gear left zipped up overnight.'),
       ('Should you store hockey gear in the garage?','Only if it is dry and ventilated. Damp basements and garages can cause mildew, which makes the smell worse.')],
 howto=('Stop hockey gear from smelling',[('Unpack immediately','Take every piece of gear out of the bag as soon as you get home.'),('Open everything up','Pull skate tongues forward, remove insoles, and turn gloves inside out.'),('Add airflow','Use a fan, drying rack, or boot and glove dryer so everything dries fully.'),('Wash what you can','Wash base layers, socks, and jocks after every game; wash pads and the bag periodically.'),('Store dry','Keep the dried gear and bag somewhere ventilated, not damp.')]),
 body='''    <p>Your hockey bag smells because it's a warm, damp, sealed box full of sweat. Bacteria love that. Your car knows. Your spouse knows. The fix isn't a magic spray, it's drying. Here's the routine.</p>

    <h2>The Rule: Dry It Fast, Dry It Completely</h2>
    <p>Equipment managers and gear shops keep saying the same thing: take everything out of the bag right after the game. Gear that's aired out within about 30 minutes of getting home smells dramatically less than gear left zipped up overnight. That one habit does most of the work.</p>

    <h2>The Post-Game Routine</h2>
    <ol>
      <li><strong>Unpack immediately.</strong> The bag is not storage. It is transportation.</li>
      <li><strong>Open everything up.</strong> Pull skate tongues forward, pull out the insoles, and turn gloves inside out so the inner padding can dry.</li>
      <li><strong>Add airflow.</strong> A box fan and a drying rack beat leaving gear on the floor. A boot and glove dryer is a nice upgrade.</li>
      <li><strong>Wash what you can.</strong> Base layers, socks and jocks go in the wash after every game. Wash pads and the bag itself now and then.</li>
      <li><strong>Store it dry.</strong> A damp basement or garage can grow mildew, which is worse than sweat.</li>
    </ol>

    <figure>
      <img src="../assets/photos/team-net.jpg" alt="Utah Glizzies teammates posing in front of the net after a game" loading="lazy" decoding="async" width="1200" height="800" />
      <figcaption>Nobody in this photo wants to open the bag. Dry your gear.</figcaption>
    </figure>

    <h2>Mistakes That Keep the Stink Alive</h2>
    <ul>
      <li><strong>Relying on sprays.</strong> They mask odor briefly; drying and washing fix it.</li>
      <li><strong>Machine-drying gloves.</strong> It can wreck leather palms. Air-dry them.</li>
      <li><strong>Leaving the bag zipped.</strong> You are marinating it.</li>
      <li><strong>Skipping the skates.</strong> Insoles and tongues out, then dry, then <a href="how-often-to-sharpen-hockey-skates.html">sharpen on schedule</a>.</li>
    </ul>

    <p>New to all this? Our <a href="beer-league-equipment-checklist-beginners.html">beginner equipment checklist</a> covers what to buy, and <a href="where-to-buy-hockey-gear-utah.html">where to buy hockey gear in Utah</a> covers where.</p>

    <div class="blog-cta-box">
      <h3>Smell Like a Champion. Or At Least <span>Like Nothing.</span></h3>
      <p>The Utah Glizzies play out of the Utah Mammoth Ice Center in Sandy. Our locker room is proof that this advice works, mostly. Come meet the team.</p>
      <a href="../team.html" class="button primary" style="display:inline-block;margin-right:12px;">Meet the Team</a>
      <a href="../community.html" class="button secondary" style="display:inline-block;">Go to The Pit</a>
    </div>
''',
 next=('beer-league-equipment-checklist-beginners.html','Beer League Equipment Checklist'))

build(P1); build(P2)

# blog.html
bh = ROOT/'blog.html'; s = bh.read_text()
cards = ''
for p,cat,ex,imgalt in [(P1,'utah','Date, time, what to wear and how to get there for the Mammoth vs. Avalanche outdoor game at Rice-Eccles Stadium.','Hockey fans cheering in the stands at a Utah game'),
                (P2,'gear','Why hockey bags stink and the post-game drying routine that fixes it, no magic spray required.','Utah Glizzies teammates in green and cream jerseys')]:
    cards += f'''        <a class="blog-card" href="blog/{p['slug']}.html" data-cat="{cat}">
          <div class="blog-card-media"><img src="assets/photos/{p['hero']}" alt="{imgalt}" loading="lazy" decoding="async" /></div>
          <span class="blog-tag">{p['tag']}</span>
          <h2>{p['h1']}</h2>
          <p>{ex}</p>
          <div class="blog-card-meta">
            <span>Nov 10, 2026</span>
            <span>&bull;</span>
            <span>{p['read']} min read</span>
          </div>
          <span class="blog-card-cta">Read the guide</span>
        </a>

'''
marker = '<div class="blog-grid" id="blog-grid">\n\n'
assert marker in s
bh.write_text(s.replace(marker, marker + cards, 1))

# sitemap
sm = ROOT/'sitemap.xml'; t = sm.read_text()
new = ''.join(f'  <url><loc>{BASE}/blog/{p["slug"]}.html</loc><lastmod>{TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n' for p in (P1,P2))
sm.write_text(t.replace('</urlset>', new + '</urlset>'))
print('ok')
