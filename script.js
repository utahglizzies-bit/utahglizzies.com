const siteContent = window.siteContent;

if (!siteContent) {
  throw new Error("Missing src/data/siteContent.js before script.js");
}

const team = siteContent.teamInfo;
const now = new Date();

const parseGameDate = (game) => new Date(`${game.date}T${toTwentyFourHour(game.time)}:00-06:00`);

function toTwentyFourHour(time) {
  if (!time || time === "TBD") return "23:59";
  const [raw, meridiem] = time.trim().split(" ");
  let [hour, minute] = raw.split(":").map(Number);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getNextGame() {
  return siteContent.schedule
    .filter((game) => game.status !== "final" && parseGameDate(game) >= now)
    .sort((a, b) => parseGameDate(a) - parseGameDate(b))[0] || siteContent.schedule.find((game) => game.status !== "final");
}

function getLastFinalGame() {
  return siteContent.schedule
    .filter((game) => game.status === "final")
    .sort((a, b) => parseGameDate(b) - parseGameDate(a))[0];
}

function formatGameDate(game) {
  const date = parseGameDate(game);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const nextGame = getNextGame();
const lastFinalGame = getLastFinalGame();

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

function setNavOpen(isOpen) {
  nav.classList.toggle("is-open", isOpen);
  toggle?.setAttribute("aria-expanded", String(isOpen));
  if (toggle) toggle.textContent = isOpen ? "Close" : "Menu";
  // Lock body scroll while the full-screen mobile nav is open so the page
  // behind it can't scroll and nothing feels "stuck".
  document.body.style.overflow = isOpen ? "hidden" : "";
}

toggle?.addEventListener("click", () => {
  setNavOpen(!nav.classList.contains("is-open"));
});

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});

// Safety net: if the viewport is ever resized/rotated past the mobile
// breakpoint while the menu is open, force it closed so it can't get stuck.
window.addEventListener("resize", () => {
  if (window.innerWidth > 1100 && nav?.classList.contains("is-open")) setNavOpen(false);
});

function renderSimpleCards(selector, items, template) {
  const target = document.querySelector(selector);
  if (!target || !items) return;
  target.innerHTML = items.map(template).join("");
}

function rotateHeroTagline() {
  const tagline = document.querySelector("[data-hero-tagline]");
  if (!tagline || !siteContent.heroTaglines?.length) return;
  let index = 0;
  setInterval(() => {
    index = (index + 1) % siteContent.heroTaglines.length;
    tagline.textContent = siteContent.heroTaglines[index];
  }, 3800);
}

function renderCountdown() {
  const timer = document.querySelector("[data-countdown]");
  const meta = document.querySelector("[data-countdown-meta]");
  const banner = document.querySelector("[data-countdown-bar]");
  const label = banner?.querySelector("span");
  if (!timer || !meta || !banner) return;

  const final = siteContent.lastGame;
  const bannerLines = nextGame
    ? [
        `Next Puck Drop: Glizzies vs ${nextGame.opponent} — ${formatGameDate(nextGame)} at ${nextGame.time}`,
        "Playoff Hockey: Bring the mustard.",
        "Win or go home. Preferably win.",
      ]
    : final.result === "win"
      ? [`GLIZZIES WIN!!! Glizzies ${final.glizziesScore}, ${final.opponent} ${final.opponentScore}`]
      : [`Final: Glizzies ${final.glizziesScore}, ${final.opponent} ${final.opponentScore} — regroup and reload.`];

  let line = 0;
  const rotateLine = () => {
    banner.dataset.bannerLine = bannerLines[line % bannerLines.length];
    if (label) label.textContent = bannerLines[line % bannerLines.length];
    line += 1;
  };
  rotateLine();
  setInterval(rotateLine, 4200);

  const tick = () => {
    if (!nextGame) {
      timer.textContent = final.result === "win" ? "GLIZZIES WIN!!!" : "FINAL";
      meta.textContent = `${team.shortName} ${final.glizziesScore}, ${final.opponent} ${final.opponentScore}`;
      return;
    }
    const diff = parseGameDate(nextGame) - new Date();
    if (diff <= 0) {
      timer.textContent = "PUCK DROP";
      meta.textContent = `${nextGame.label} at ${team.facility}`;
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timer.textContent = `${days}D ${hours}H ${minutes}M ${seconds}S`;
    meta.textContent = `${nextGame.label} - ${formatGameDate(nextGame)}, ${nextGame.time} at ${team.facility} (${nextGame.rink})`;
  };
  tick();
  setInterval(tick, 1000);
}

function renderNextGame() {
  const title = document.querySelector("[data-next-game-title]");
  const copy = document.querySelector("[data-next-game-copy]");
  const card = document.querySelector("[data-next-game-card]");
  if (!nextGame) return;

  const text = `${formatGameDate(nextGame)} at ${nextGame.time} on ${nextGame.rink} at ${team.facility}, ${team.address}. ${nextGame.gameType || "Game"} mode: bring the mustard.`;
  if (title) title.textContent = nextGame.label;
  if (copy) copy.textContent = text;
  if (card) {
    card.innerHTML = `
      <span>${nextGame.gameType || "Next Game"}</span>
      <strong>${team.shortName} ${nextGame.label}</strong>
      <p>${formatGameDate(nextGame)} · ${nextGame.time} · ${nextGame.rink}</p>
      <a class="text-link" href="${team.mapsUrl}" target="_blank" rel="noreferrer">Get rink directions</a>
    `;
  }
}

function renderLastGame() {
  const target = document.querySelector("[data-last-game]");
  if (!target) return;
  const game = siteContent.lastGame;
  const win = game.result === "win";
  target.innerHTML = `
    <div class="scoreboard-card ${win ? "is-win" : "is-loss"}">
      <div class="scoreboard-topline">
        <span>${win ? "Final - Glizzies Win" : "Final"}</span>
        <span>${game.date}</span>
      </div>
      <div class="scoreboard-score">
        <div><small>Utah Glizzies</small><strong>${game.glizziesScore}</strong></div>
        <span>FINAL</span>
        <div><small>${game.opponent}</small><strong>${game.opponentScore}</strong></div>
      </div>
      <p>${game.recap}</p>
      <div class="moment-card">
        <span>Moment of the Game</span>
        <strong>${game.momentOfGame}</strong>
      </div>
    </div>
  `;
}

function renderMatchup() {
  const target = document.querySelector("[data-matchup]");
  if (!target || !nextGame) return;
  const matchup = siteContent.matchup;
  target.innerHTML = `
    <article class="matchup-card matchup-lead">
      <span class="threat-badge">${matchup.threatLevel}</span>
      <h3>${matchup.title}</h3>
      <p><strong>${team.shortName} ${nextGame.label}</strong> · ${formatGameDate(nextGame)} · ${nextGame.time} · ${nextGame.rink}</p>
      <p>${matchup.storyline}</p>
      <ul>${matchup.opponentStats.map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
    <article class="matchup-card">
      <span class="threat-badge mustard">${matchup.opponent}</span>
      <h3>${matchup.record}</h3>
      <div class="matchup-scouting">
        ${matchup.opponentBreakdown.map(([label, value]) => `<div><span>${label}</span><p>${value}</p></div>`).join("")}
      </div>
    </article>
    <article class="matchup-card">
      <span class="threat-badge mustard">Keys to the Game</span>
      <h3>Win or go home. Preferably win.</h3>
      <ul>${matchup.keys.map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
  `;
}

function renderSpotlight() {
  const target = document.querySelector("[data-spotlight]");
  if (!target) return;
  const spotlight = siteContent.playerSpotlight;
  target.innerHTML = `
    <article class="spotlight-card">
      <div>
        <p class="eyebrow">Player Spotlight</p>
        <h2>${spotlight.name} <span>#${spotlight.number}</span></h2>
        <p class="spotlight-title">${spotlight.title}</p>
        <p>${spotlight.story}</p>
      </div>
      <dl>
        ${spotlight.callouts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
      </dl>
    </article>
  `;
}

async function requestCount(action) {
  const meter = siteContent.hypeMeter;
  const url = `${meter.hypeApiBase}/${action}/${meter.hypeApiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Hype service unavailable");
  const data = await response.json();
  return data.value || data.count || 0;
}

function renderGlizzyMeter() {
  const target = document.querySelector("[data-glizzy-meter]");
  if (!target) return;
  const meter = siteContent.hypeMeter;
  target.innerHTML = `
    <div class="meter-header">
      <div>
        <span class="eyebrow">${meter.gameWeek}</span>
        <h3>${meter.label}</h3>
        <p>${meter.reason}</p>
      </div>
      <button class="hype-button" data-hype-button type="button">
        <strong data-hype-percent>${Math.round((meter.level / meter.hypeGoal) * 100)}%</strong>
        <span>Push playoff hype</span>
      </button>
    </div>
    <div class="hype-progress"><span data-hype-progress style="width: 0%"></span></div>
    <p class="hype-caption" data-hype-caption>Playoff mustard pressure is building across the fanbase.</p>
  `;

  const percent = target.querySelector("[data-hype-percent]");
  const progress = target.querySelector("[data-hype-progress]");
  const button = target.querySelector("[data-hype-button]");
  const caption = target.querySelector("[data-hype-caption]");
  const update = (value) => {
    const clicks = Math.max(0, Number(value) || 0);
    const hypePercent = Math.min(100, Math.round((clicks / meter.hypeGoal) * 100));
    percent.textContent = `${hypePercent}%`;
    progress.style.width = `${hypePercent}%`;
    caption.textContent = hypePercent >= 100
      ? "Full playoff mustard achieved. The bench is officially overcooked."
      : "Every click raises the playoff hype without showing the recipe.";
  };
  requestCount("get").then(update).catch(() => update(Number(localStorage.getItem(meter.hypeStorageKey)) || meter.level));
  button.addEventListener("click", async () => {
    try {
      update(await requestCount("hit"));
    } catch {
      const next = (Number(localStorage.getItem(meter.hypeStorageKey)) || meter.level) + 1;
      localStorage.setItem(meter.hypeStorageKey, String(next));
      update(next);
    }
  });
}

function renderFanAdvice() {
  const target = document.querySelector("[data-fan-advice]");
  if (!target || !siteContent.fanAdvice?.length) return;
  let index = Math.floor(Math.random() * siteContent.fanAdvice.length);
  const quote = target.querySelector("[data-fan-advice-quote]");
  const button = target.querySelector("[data-fan-advice-button]");
  const update = () => {
    quote.textContent = siteContent.fanAdvice[index];
  };
  button?.addEventListener("click", () => {
    index = (index + 1) % siteContent.fanAdvice.length;
    update();
  });
  update();
}

function renderThreeStars() {
  const target = document.querySelector("[data-three-stars]");
  if (!target) return;
  const game = siteContent.lastGame;
  const starLabels = ["First Star", "Second Star", "Third Star"];
  // Use siteContent.lastGame.threeStars if available, otherwise fall back to defaults
  const stars = game.threeStars && game.threeStars.length > 0
    ? game.threeStars.map((s, i) => `<article class="star-card"><span>${starLabels[i] || "Star"}</span><h3>${s.nameplate || s.name}</h3><p>${s.name} · #${s.number}</p><p>${s.reason}</p></article>`)
    : [
        ["First Star", "Trey Kemp", "One-timer in playoff-prep fashion. That puck had an appointment."],
        ["Second Star", "Hayden Rathmell", "Threaded the setup pass between two defenders like he was filing paperwork."],
        ["Third Star", "The Bench", "Kept the vibes warm and the win column moving."],
      ].map(([label, name, text]) => `<article class="star-card"><span>${label}</span><h3>${name}</h3><p>${text}</p></article>`);
  target.innerHTML = stars.join("") +
    `<article class="star-card"><span>Scoreboard</span><h3>${team.shortName} ${game.glizziesScore}, ${game.opponent} ${game.opponentScore}</h3><p>${game.date} — ${game.recap ? game.recap.split(".")[0] + "." : "Another one for the books."}</p></article>`;
}

function renderPlayerCards() {
  renderSimpleCards("[data-player-previews]", siteContent.players.slice(0, 6), (player) => `
    <article class="player-preview-card">
      <span class="player-number">#${player.number}</span>
      <h3>${player.nameplate}</h3>
      <p>${player.name} · ${player.position}</p>
      <p>${player.bio}</p>
    </article>
  `);
}

function renderSeasonSchedule() {
  renderSimpleCards("[data-season-schedule]", siteContent.schedule, (game) => `
    <article class="schedule-row ${game.status === "upcoming" ? "is-next" : ""} ${game.gameType?.includes("advanced") ? "is-playoff" : ""}">
      <strong>${game.displayDate}</strong>
      <span>${game.label}</span>
      <small>${game.time} | ${game.rink}</small>
      <em>${game.status === "final" ? `${game.result === "win" ? "W" : "L"} ${game.glizziesScore}-${game.opponentScore}` : game.gameType || "Upcoming"}</em>
    </article>
  `);
}

function loreProfileSlug(nameplate) {
  return String(nameplate)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderTeamLore() {
  const target = document.querySelector("[data-team-lore]");
  if (!target || !siteContent.playerLore) return;
  const activeFilter = target.dataset.filter || "all";
  const lore = siteContent.playerLore.filter((player) => activeFilter === "all" || player.status.toLowerCase() === activeFilter);
  // Lore lives at site root (team.html, lore.html) so profile links are relative to root.
  const onLorePage = window.location.pathname.includes("/players/");
  const prefix = onLorePage ? "../players/" : "players/";
  // Build a nameplate -> jersey number lookup from the roster data.
  const numberByName = {};
  (siteContent.players || []).forEach((p) => {
    numberByName[loreProfileSlug(p.nameplate)] = p.number;
  });
  target.innerHTML = lore.map((player) => {
    const slug = player.profileSlug || loreProfileSlug(player.nameplate);
    const href = `${prefix}${slug}.html`;
    const number = numberByName[slug];
    const numberTag = number && number !== "-" ? `<span class="lore-card-number">#${number}</span>` : "";
    return `
    <article class="lore-profile-card">
      <div class="lore-card-topline">
        ${numberTag}
        <em>${player.stamp}</em>
      </div>
      <h3>${player.nameplate}</h3>
      <p class="lore-real-name">${player.name}</p>
      <a class="button secondary lore-read-link" href="${href}">Read Full Lore</a>
    </article>
  `;
  }).join("");
}

document.querySelectorAll("[data-lore-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector("[data-team-lore]");
    if (!target) return;
    target.dataset.filter = button.dataset.loreFilter;
    document.querySelectorAll("[data-lore-filter]").forEach((item) => {
      item.classList.toggle("primary", item === button);
      item.classList.toggle("secondary", item !== button);
    });
    renderTeamLore();
  });
});

function renderPlayerStatsTable() {
  const target = document.querySelector("[data-player-stats]");
  if (!target) return;
  const sorted = [...siteContent.players].sort((a, b) => (b.stats?.pts || 0) - (a.stats?.pts || 0));
  target.innerHTML = sorted.map((player, index) => `
    <tr class="${index === 0 ? "team-row" : ""}">
      <td>${player.number}</td>
      <td>${player.name}</td>
      <td>${player.stats?.gp ?? 0}</td>
      <td>${player.stats?.g ?? 0}</td>
      <td>${player.stats?.a ?? 0}</td>
      <td>${player.stats?.pts ?? 0}</td>
      <td>${player.stats?.pim ?? 0}</td>
      <td>${player.bio}</td>
    </tr>
  `).join("");
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseProductsCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((product, header, index) => {
      product[header] = values[index] || "";
      return product;
    }, {});
  }).filter((product) => product.name);
}

async function getStoreProducts() {
  const fallback = siteContent.store.products || [];
  if (!siteContent.store.catalogCsvUrl) return fallback;
  try {
    const response = await fetch(siteContent.store.catalogCsvUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Store catalog unavailable");
    const products = parseProductsCsv(await response.text());
    return products.length ? products : fallback;
  } catch {
    return fallback;
  }
}

async function renderStore() {
  const products = await getStoreProducts();
  renderSimpleCards("[data-store-products]", products, (product) => `
    <article class="product-card">
      <img src="${product.image || siteContent.teamInfo.logo}" alt="" />
      <span>${product.type || "Merch"}</span>
      <h3>${product.name}</h3>
      <p>${product.price || "Coming Soon"}</p>
      <a class="button secondary ${product.url ? "" : "is-disabled"}" href="${product.url || "#shop"}" ${product.url ? 'target="_blank" rel="noreferrer"' : ""}>${product.status === "coming-soon" || !product.url ? "Coming Soon" : "Shop Now"}</a>
    </article>
  `);
  const note = document.querySelector("[data-store-note]");
  if (note) note.textContent = siteContent.store.publicNote;
}

function renderSocialPosts() {
  renderSimpleCards("[data-social-posts]", siteContent.socialPosts, (post) => `
    <article class="social-card">
      <img src="${post.image}" alt="" />
      <p>${post.caption}</p>
      <a class="text-link" href="${post.instagramUrl}" target="_blank" rel="noreferrer">Open on Instagram</a>
    </article>
  `);
}

function renderSiteLinks() {
  renderSimpleCards("[data-site-links]", siteContent.siteLinks, ([label, href, description]) => `
    <article class="site-link-card">
      <a href="${href}">${label}</a>
      <p>${description}</p>
    </article>
  `);
}

function renderSponsors() {
  renderSimpleCards("[data-sponsor-tiers]", siteContent.sponsors.tiers, ([name, description]) => `
    <article class="sponsor-tier"><h3>${name}</h3><p>${description}</p></article>
  `);
  renderSimpleCards("[data-current-sponsors]", siteContent.sponsors.current, (sponsor) => `
    <article class="sponsor-tier"><span>${sponsor.tier}</span><h3>${sponsor.name}</h3><p>${sponsor.description}</p></article>
  `);
}

function renderMediaKit() {
  const blurb = document.querySelector("[data-team-blurb]");
  if (blurb) blurb.textContent = team.blurb;
  renderSimpleCards("[data-brand-colors]", team.brandColors, ([name, value]) => `
    <article class="color-chip"><i style="background:${value}"></i><strong>${name}</strong><span>${value}</span></article>
  `);
}

function renderMetadata() {
  if (!document.querySelector(".home-hero")) return;
  document.title = team.seoTitle;
  document.querySelector('meta[name="description"]')?.setAttribute("content", team.seoDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", team.seoTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", team.seoDescription);
  const structuredData = document.querySelector("[data-structured-data]");
  if (structuredData) {
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: team.name,
      alternateName: ["Utah Glizzies", "Utah Glizzies Hockey", "Utah Glizzies HC"],
      sport: "Ice Hockey",
      url: team.canonicalUrl,
      logo: `${team.canonicalUrl}${team.logo}`,
      sameAs: [team.instagramUrl],
      address: {
        "@type": "PostalAddress",
        streetAddress: "10450 S. State Street STE 2200A",
        addressLocality: "Sandy",
        addressRegion: "UT",
        postalCode: "84070",
        addressCountry: "US",
      },
      description: team.seoDescription,
    });
  }
}

function renderChirps() {
  renderSimpleCards("[data-chirps]", siteContent.opponentChirps, (chirp, index) => {
    const lines = chirp.lines || [chirp.line];
    const line = lines[index % lines.length];
    const number = chirp.number ? `<strong>#${chirp.number}</strong>` : "";
    return `
      <article class="chirp-card" data-chirp-card data-lines="${encodeURIComponent(JSON.stringify(lines))}" data-line-index="${index % lines.length}">
        <div class="chirp-target">
          <span>${chirp.moment}</span>
          ${number}
        </div>
        <h3>${chirp.playerName || "Opponent"}</h3>
        <p>${line}</p>
        <button class="text-link chirp-rotate" type="button">Rotate chirp</button>
      </article>
    `;
  });
  document.querySelectorAll("[data-chirp-card]").forEach((card) => {
    const text = card.querySelector("p");
    const button = card.querySelector("button");
    const lines = JSON.parse(decodeURIComponent(card.dataset.lines || "%5B%5D"));
    let index = Number(card.dataset.lineIndex) || 0;
    button?.addEventListener("click", () => {
      index = (index + 1) % lines.length;
      text.textContent = lines[index];
    });
  });
}

function renderHomepage() {
  rotateHeroTagline();
  renderCountdown();
  renderNextGame();
  renderLastGame();
  renderMatchup();
  renderSpotlight();
  renderGlizzyMeter();
  renderThreeStars();
  renderPlayerCards();
  renderSeasonSchedule();
  renderTeamLore();
  renderPlayerStatsTable();
  renderStore();
  renderSocialPosts();
  renderSponsors();
  renderMediaKit();
  renderSiteLinks();
  renderFanAdvice();
  renderMetadata();
  renderChirps();
  renderSimpleCards("[data-chants]", siteContent.chants, ([moment, primary, alt]) => `
    <article class="chant-card"><span>${moment}</span><strong>${primary}</strong><small>${alt}</small></article>
  `);
  renderSimpleCards("[data-lore-cards]", siteContent.loreCards, ([title, teaser]) => `
    <article class="lore-card"><h3>${title}</h3><p>${teaser}</p></article>
  `);
  const loreIntro = document.querySelector("[data-player-lore-intro]");
  if (loreIntro) loreIntro.textContent = siteContent.playerLoreIntro;
  const subIntro = document.querySelector("[data-unnamed-subs-intro]");
  if (subIntro) subIntro.textContent = siteContent.unnamedSubsIntro;
}


// ── Auto SportsEvent Schema — reads next game from siteContent.schedule ──
function renderSportsEventSchema() {
  const next = siteContent.schedule.find(g => g.status === 'upcoming');
  if (!next) return;

  // Convert 12hr time string to 24hr for ISO
  function to24(t) {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return { h: 21, min: 0 };
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const pm = m[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return { h, min };
  }

  const { h, min } = to24(next.time);
  const pad = n => String(n).padStart(2, '0');
  const startISO = next.date + 'T' + pad(h) + ':' + pad(min) + ':00-06:00';
  // Estimate end time ~90 minutes after start
  const endTotalMin = h * 60 + min + 90;
  const endISO = next.date + 'T' + pad(Math.floor(endTotalMin / 60) % 24) + ':' + pad(endTotalMin % 60) + ':00-06:00';

  const label = next.gameType ? next.label + ' — ' + next.gameType : next.label;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    'name': 'Utah Glizzies HC ' + label,
    'description': (next.gameType || 'D League') + ' game between Utah Glizzies HC and the ' + next.opponent + ' at Utah Mammoth Ice Center in Sandy, Utah.',
    'image': 'https://www.utahglizzies.com/assets/glizzies-logo.png',
    'startDate': startISO,
    'endDate': endISO,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'SportsActivityLocation',
      'name': 'Utah Mammoth Ice Center — ' + next.rink,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '10450 S. State Street STE 2200A',
        'addressLocality': 'Sandy',
        'addressRegion': 'UT',
        'postalCode': '84070',
        'addressCountry': 'US'
      }
    },
    'organizer': { '@type': 'SportsOrganization', 'name': 'Utah Glizzies HC', 'url': 'https://www.utahglizzies.com/' },
    'performer': [
      { '@type': 'SportsTeam', 'name': 'Utah Glizzies HC', 'url': 'https://www.utahglizzies.com/' },
      { '@type': 'SportsTeam', 'name': next.opponent }
    ],
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
      'url': 'https://www.utahglizzies.com/team.html#schedule',
      'description': 'Free to attend at Utah Mammoth Ice Center, Sandy UT'
    },
    'sport': 'Ice Hockey'
  };

  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(el);
}

renderSportsEventSchema();
// ── Raw Dog of the Night ─────────────────────────────────────────────
function renderRDOTN() {
  const el = document.querySelector('[data-rdotn]');
  if (!el || !siteContent.rawDogOfNight) return;
  const r = siteContent.rawDogOfNight;
  const stats = r.stats || [
    { icon: "🪄", label: "Defenders Dangled" },
    { icon: "🔥", label: "Doubters Silenced" },
    { icon: "🐐", label: "\u2018I\u2019m Back\u2019 Energy" },
  ];
  el.innerHTML = `
    <div class="rdotn-inner">
      <div class="rdotn-badge-col">
        <span class="rdotn-trophy">🌭</span>
        <div class="rdotn-nameplate">${r.nameplate}</div>
        ${r.gameNickname ? `<div class="rdotn-game-nickname">aka \u201c${r.gameNickname}\u201d</div>` : ""}
        <div class="rdotn-number">#${r.number}</div>
        <div class="rdotn-game-label">${r.game}</div>
      </div>
      <div class="rdotn-content-col">
        <div class="rdotn-eyebrow">🏆 Raw Dog of the Night</div>
        <h2 class="rdotn-title">${r.winner}</h2>
        <p class="rdotn-reason">${r.reason}</p>
        <blockquote class="rdotn-citation">${r.citation}</blockquote>
        <div class="rdotn-stats-row">
          ${stats.map((s) => `<div class="rdotn-stat"><strong>${s.icon}</strong><span>${s.label}</span></div>`).join("")}
        </div>
        <div class="rdotn-voted-by">Voted by: ${r.nominatedBy} &bull; Honorable mention: ${r.honorableMention}</div>
      </div>
    </div>`;
}


renderRDOTN();
renderHomepage();

// ── Service Worker + Scroll Reveal ────────────────────────────────────
// Service worker disabled
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.section').forEach(el => {
  // Never apply reveal to nav, header, countdown, or footer
  if (el.closest('.site-header') || el.closest('.site-nav') || el.closest('.site-footer') || el.closest('.countdown-bar')) return;
  el.classList.add('reveal');
  revealObs.observe(el);
});

// If the page is opened with a hash (e.g. team.html#roster), make sure the
// target section and everything above it is revealed immediately, then scroll
// to it once content has rendered. Without this, anchor-jumping can land on a
// section the IntersectionObserver never triggers, leaving it stuck invisible.
function revealHashTarget() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;
  let target;
  try { target = document.querySelector(hash); } catch (e) { return; }
  if (!target) return;
  // Reveal the target and any revealable ancestor/preceding sections.
  document.querySelectorAll('.reveal').forEach((el) => {
    if (el === target || el.contains(target) || target.contains(el) ||
        el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) {
      el.classList.add('visible');
    }
  });
  target.classList.add('visible');
  // Re-scroll after dynamic content (roster, lore) has been injected.
  requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
}
window.addEventListener('load', revealHashTarget);
window.addEventListener('hashchange', revealHashTarget);