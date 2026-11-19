#!/usr/bin/env node
/*
  Utah Glizzies — Shopify → site sync
  -----------------------------------
  Pulls every product published to the site's Storefront sales channel and rebuilds:
    • shop.html                      (All products: hero lineup + search/sort/category tabs)
    • shop/<category>.html           (Hats, Jerseys, Hoodies, Tees, Youth, Gear)
    • shop/<product>.html            (ONLY for products without a hand-curated page)
    • data/shop-catalog.json         (what the grid was built from)
    • sitemap.xml                    (shop URLs refreshed between SHOP-SYNC markers)

  Usage:   node scripts/sync-shop.mjs            # build
           node scripts/sync-shop.mjs --dry-run  # report only, write nothing
           node scripts/sync-shop.mjs --fixture f.json   # preview only: add unpublished test products

  To get a product on the site: set it Active in Shopify AND publish it to the
  sales channel that owns the Storefront token (Shopify admin → product → Publishing).
  Curated overrides live in scripts/shop-config.json. Shopify tags:
    hero-hat / hero-jersey   fill the Hero Lineup slots
    cat:<slug>               force a category (hats, jerseys, hoodies, tees, youth, gear)
    sold-out                 force Sold Out     hide-web   keep off the site
  No npm dependencies — Node 18+.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const SITE = "https://www.utahglizzies.com";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (p, s) => { if (DRY) return; fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), s); };
const exists = (p) => fs.existsSync(path.join(ROOT, p));

// Storefront credentials: reuse the public token already shipped in assets/shop-cart.js
const cartJs = read("assets/shop-cart.js");
const SHOP = {
  domain: cartJs.match(/domain:"([^"]+)"/)[1],
  token: cartJs.match(/token:"([^"]+)"/)[1],
  api: cartJs.match(/apiVersion:"([^"]+)"/)[1],
};
const cfg = JSON.parse(read("scripts/shop-config.json"));
const CATS = cfg.categories;
const CAT_SLUGS = CATS.map((c) => c.slug);

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
const numId = (gid) => gid.split("/").pop();
const slugify = (s) => s.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 70);
const cdn = (url, w) => (url ? url + (url.includes("?") ? "&" : "?") + "width=" + w : "");
const FRAC = { "¼":"1/4","½":"1/2","¾":"3/4","⅛":"1/8","⅜":"3/8","⅝":"5/8","⅞":"7/8" };
const decode = (s) => s.replace(/(\d?)\s*([¼½¾⅛⅜⅝⅞])/g, (m, d, f) => (d ? d + " " : "") + FRAC[f]).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "’").replace(/\u00a0/g, " ");

async function gql(query, variables = {}) {
  const r = await fetch(`https://${SHOP.domain}/api/${SHOP.api}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SHOP.token },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const Q = `query($after:String){ products(first:100, after:$after){ pageInfo{ hasNextPage endCursor }
  edges{ node{ id handle title productType tags createdAt publishedAt availableForSale descriptionHtml
    priceRange{ minVariantPrice{ amount } maxVariantPrice{ amount } }
    images(first:12){ edges{ node{ url altText } } } } } } }`;

async function fetchAll() {
  let after = null, out = [];
  do {
    const d = await gql(Q, { after });
    out.push(...d.products.edges.map((e) => e.node));
    after = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  } while (after);
  return out;
}

// Split Printful-style descriptionHtml into prose, bullet specs and an imperial size table.
function parseDescription(html) {
  html = html || "";
  const sgIdx = html.search(/<[^>]*class="size-guide-title"|size guide/i);
  const body = sgIdx >= 0 ? html.slice(0, sgIdx) : html;
  const guide = sgIdx >= 0 ? html.slice(sgIdx) : "";
  const text = decode(body.replace(/<meta[^>]*>/gi, "").replace(/<\/(p|div|li)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, ""));
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const desc = [], specs = [];
  for (const l of lines) (/^[•\-\u2022]/.test(l) ? specs : desc).push(l.replace(/^[•\-\u2022]\s*/, ""));
  // keep the fun copy, drop Printful's made-to-order boilerplate from the short desc
  const prose = desc.filter((l) => !/made especially for you|disclaimer:|this product is made on demand/i.test(l)).join(" ").replace(/\s+/g, " ").trim();

  let size = null;
  const tables = [...guide.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const imperial = tables.find((t, i) => /inch/i.test(t)) || tables[0];
  if (imperial) {
    const rows = [...imperial.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => decode(c[1].replace(/<[^>]+>/g, "")).trim()));
    if (rows.length > 1) {
      const cols = rows[0].slice(1).map((c) => c.replace(/\s*\((inches|inch|in)\)\s*/i, "").replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\B\w+/g, (m) => m.toLowerCase()));
      size = { cols, rows: rows.slice(1).filter((r) => r[0]), note: 'Measurements provided by the supplier; may vary up to 2" (5 cm).' };
    }
  }
  return { desc: prose, specs: specs.join(" • "), size };
}

function categorize(p, tags) {
  const forced = tags.filter((t) => t.startsWith("cat:")).map((t) => t.slice(4)).filter((c) => CAT_SLUGS.includes(c));
  if (forced.length) return forced;
  const s = (p.title + " " + p.productType + " " + tags.filter((t) => !t.startsWith("hero-")).join(" ")).toLowerCase();
  const cats = [];
  if (/\byouth\b|\bkids?\b/.test(s)) cats.push("youth");
  if (/glizzy sweater|jersey/.test(s)) cats.push("jerseys");
  else if (/\bhat\b|trucker|beanie|bucket|\bcap\b|headwear|dad hat/.test(s)) cats.push("hats");
  else if (/hoodie|zip|crew\b|sweatshirt|sweater|pullover/.test(s)) cats.push("hoodies");
  else if (/\btee\b|t-shirt|shirt|crop|tank|muscle/.test(s)) cats.push("tees");
  else cats.push("gear");
  return cats;
}

const MEASURE = read("shop/glizzy-tee.html").match(/<div class="size-measure">[\s\S]*?<\/dl><\/div><\/div>/)?.[0] || "";

function sizeGuideHtml(size, cats) {
  if (!size) return "";
  const apparel = cats.some((c) => ["hoodies", "tees", "jerseys", "youth"].includes(c)) && size.cols.some((c) => /length|width/i.test(c));
  const json = JSON.stringify(size).replace(/'/g, "&#39;");
  return `<button class="size-toggle" data-sizetoggle type="button"><span class="chev">▸</span> Size Guide</button><div class="size-panel" data-sizepanel><div data-sizedata='${json}'></div>${apparel ? MEASURE : ""}</div>`;
}

function badgeHtml(prod) {
  if (prod.soldOut) return `<span class="pc-badge soldout">Sold Out</span>`;
  if (prod.badge) return `<span class="pc-badge ${prod.badge.toLowerCase() === "presale" ? "presale" : "newdrop"}">${esc(prod.badge)}</span>`;
  if ((prod.tags || []).includes("presale") || (prod.tags || []).includes("custom-jersey")) return `<span class="pc-badge presale">Presale</span>`;
  if (prod.isNew) return `<span class="pc-badge newdrop">New Drop</span>`;
  return "";
}

// ---------- build model ----------
const live = await fetchAll();
// --fixture <file.json>: append extra Storefront-shaped products (preview/testing only — never use for a real deploy)
const fx = process.argv.indexOf("--fixture");
if (fx > -1) { const extra = JSON.parse(fs.readFileSync(path.resolve(process.argv[fx + 1]), "utf8")); live.push(...extra); console.log(`⚠ fixture mode: +${extra.length} preview products`); }
const now = Date.now();
const products = [];
const seenIds = new Set();
for (const p of live) {
  const id = numId(p.id);
  const tags = p.tags || [];
  if (tags.includes("hide-web")) continue;
  seenIds.add(id);
  const o = cfg.products[id] || {};
  const parsed = parseDescription(p.descriptionHtml);
  const images = (p.images.edges || []).map((e) => e.node.url);
  const cats = o.cats || categorize(p, tags);
  const created = p.publishedAt || p.createdAt;
  const lo = parseFloat(p.priceRange.minVariantPrice.amount), hi = parseFloat(p.priceRange.maxVariantPrice.amount);
  products.push({
    id, handle: p.handle,
    slug: o.slug || slugify(p.title),
    name: o.name || p.title,
    card: o.card || (parsed.desc.match(/^.{20,140}?[.!?](\s|$)/)?.[0].trim() ?? parsed.desc.slice(0, 120)),
    desc: parsed.desc, specs: parsed.specs, size: parsed.size,
    img: o.img || cdn(images[0], 640),
    images, cats, tags,
    price: lo, priceHi: hi,
    soldOut: !!o.soldOut || tags.includes("sold-out") || !p.availableForSale,
    badge: o.badge || null,
    isNew: now - Date.parse(created) < 45 * 864e5,
    order: o.order ?? 1000,
    created,
    hero: tags.find((t) => t.startsWith("hero-")) || null,
    curated: !!o.img,
  });
}
// curated products that are unpublished but should still show (e.g. sold-out pucks)
for (const [id, o] of Object.entries(cfg.products)) {
  if (seenIds.has(id) || !o.keepWhenUnpublished) continue;
  products.push({ id, slug: o.slug, name: o.name, card: o.card || "", img: o.img, images: [], cats: o.cats || ["gear"], tags: [], price: o.price ?? 0, priceHi: o.price ?? 0, soldOut: true, badge: null, isNew: false, order: o.order ?? 1000, created: "2000-01-01", hero: null, curated: true, unpublished: true });
}
// unique slugs
const slugCount = {};
for (const p of products) { if (CAT_SLUGS.includes(p.slug)) p.slug += "-item"; slugCount[p.slug] = (slugCount[p.slug] || 0) + 1; if (slugCount[p.slug] > 1) p.slug += "-" + slugCount[p.slug]; }
// Featured order: new drops first (newest on top), then the rest by curated order
const featured = (a, b) => (b.isNew - a.isNew) || (a.isNew && b.isNew ? Date.parse(b.created) - Date.parse(a.created) : 0) || a.order - b.order || Date.parse(b.created) - Date.parse(a.created);
products.sort(featured);

// ---------- product pages ----------
const PRESALE_BOX = `<div class="presale-box" data-presale-box>
          <div class="presale-box-head">Presale · Made to Order</div>
          <p>Custom jerseys are made in one batch, and our supplier requires a minimum order before production can start.</p>
          <ol>
            <li><strong>Order now</strong> while the presale is open.</li>
            <li><strong>Minimum hit</strong> → the presale closes and production starts.</li>
            <li><strong>Delivery</strong> is about <strong>8–10 weeks</strong> after the presale closes.</li>
          </ol>
          <label class="presale-ack"><input type="checkbox" data-presale-ack /> <span>I understand this is a custom, made-to-order presale item that ships about 8–10 weeks after the presale closes. All sales final.</span></label>
          <div class="presale-error" role="alert">Please read the presale terms above and check the box to continue.</div>
        </div>`;
const productTpl = read("scripts/templates/product.html");
const report = { generated: [], keptCurated: [], skippedHandEdited: [] };
for (const p of products) {
  const file = `shop/${p.slug}.html`;
  if (exists(file) && !read(file).includes("generated-by:sync-shop")) { report.keptCurated.push(file); continue; }
  if (p.unpublished) continue;
  const big = p.images.map((u) => cdn(u, 1200));
  const thumbs = big.length > 1 ? big.map((u, i) => `<button class="pd-thumb${i ? "" : " active"}" data-thumb="${esc(u)}"><img src="${esc(cdn(p.images[i], 160))}" alt="" loading="lazy" /></button>`).join("") : "";
  const primaryCat = CATS.find((c) => c.slug === p.cats[0]);
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", name: p.name, image: p.images.slice(0, 4), description: p.desc.slice(0, 300),
    brand: { "@type": "Brand", name: "Utah Glizzies HC" }, url: `${SITE}/shop/${p.slug}.html`,
    offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: p.price, highPrice: p.priceHi, availability: p.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
  }).replace(/</g, "\\u003c")}</script>`;
  const html = productTpl
    .replaceAll("{{TITLE}}", esc(p.name))
    .replaceAll("{{META_DESC}}", esc(p.card))
    .replaceAll("{{SLUG}}", p.slug)
    .replaceAll("{{OG_IMAGE}}", esc(cdn(p.images[0], 1200)))
    .replaceAll("{{PID}}", p.id)
    .replaceAll("{{MAIN_IMG}}", esc(big[0] || "../assets/glizzies-logo.png?v=20260909"))
    .replaceAll("{{BADGE}}", badgeHtml(p))
    .replaceAll("{{THUMBS}}", thumbs)
    .replaceAll("{{PRICE}}", money(p.price))
    .replaceAll("{{DESC}}", esc(p.desc))
    .replaceAll("{{SPECS}}", esc(p.specs))
    .replaceAll("{{SIZE_GUIDE}}", sizeGuideHtml(p.size, p.cats))
    .replaceAll("{{BACK_HREF}}", primaryCat ? `${primaryCat.slug}.html` : "../shop.html")
    .replaceAll("{{BACK_LABEL}}", primaryCat ? esc(primaryCat.name) : "shop")
    .replaceAll("{{CUSTOM_ATTR}}", p.tags.includes("custom-jersey") ? ' data-custom="jersey"' : "")
    .replaceAll("{{CUSTOM_FIELDS}}", p.tags.includes("custom-jersey") ? '<div class="pc-custom-field"><label for="cfName">Nameplate (back)</label><input id="cfName" data-custom-name maxlength="16" placeholder="GLIZZY MCGUIRE" autocomplete="off" style="text-transform:uppercase" /></div><div class="pc-custom-field"><label for="cfNum">Number</label><input id="cfNum" data-custom-number inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="26" autocomplete="off" /></div><p class="pc-custom-note">Double-check your spelling. We stitch exactly what you type.</p>' : "")
    .replaceAll("{{PRESALE_BOX}}", (p.tags.includes("presale") || p.tags.includes("custom-jersey")) ? PRESALE_BOX : "")
    .replaceAll("{{JSONLD}}", jsonld);
  write(file, html);
  report.generated.push(file);
}

// ---------- listing pages ----------
const listingTpl = read("scripts/templates/shop-listing.html");
const intro = read("scripts/templates/shop-intro.html");
const outro = read("scripts/templates/shop-outro.html");

function card(p, root) {
  const href = `${root}shop/${p.slug}.html`;
  const price = p.priceHi > p.price ? `${money(p.price)}–${money(p.priceHi)}` : money(p.price);
  const btn = p.soldOut ? `<a class="pc-add pc-add-soldout" href="${href}">Sold Out — Notify Me</a>` : `<a class="pc-add" href="${href}">View &amp; Buy</a>`;
  const img = !p.img ? root + "assets/glizzies-logo.png?v=20260909" : p.img.startsWith("http") ? p.img : root + p.img;
  return `<div class="product-card" data-name="${esc(p.name.toLowerCase())}" data-search="${esc((p.name + " " + p.cats.join(" ") + " " + p.tags.join(" ")).toLowerCase())}" data-price="${p.price}" data-created="${esc(p.created)}" data-order="${products.indexOf(p)}" data-soldout="${p.soldOut ? 1 : 0}">
        <a class="pc-thumb-link" href="${href}"><div class="pc-img"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async" />${badgeHtml(p)}</div></a>
        <div class="pc-body">
          <div class="pc-name"><a href="${href}">${esc(p.name)}</a></div>
          <div class="pc-price"${p.unpublished ? "" : ` data-card-price data-card-pid="${p.id}"`}>${price}</div>
          <div class="pc-desc">${esc(p.card)}</div>
          ${btn}
        </div>
      </div>`;
}

function heroLineup(root) {
  const used = new Set();
  const slots = cfg.heroSlots.map((s) => {
    const p = products.find((x) => x.hero === s.tag && !used.has(x.id));
    if (p) { used.add(p.id); return card(p, root); }
    return `<div class="product-card hero-placeholder">
        <div class="pc-img"><img src="${root}assets/glizzies-logo.png?v=20260909" alt="" loading="lazy" decoding="async" /><span class="pc-badge presale">Coming Soon</span></div>
        <div class="pc-body">
          <div class="pc-name">${esc(s.placeholderTitle)}</div>
          <div class="pc-price">Dropping Soon</div>
          <div class="pc-desc">${esc(s.placeholderText)}</div>
          <a class="pc-add gold" href="https://www.instagram.com/UtahGlizziesHockey/" target="_blank" rel="noreferrer">Follow For The Drop</a>
        </div>
      </div>`;
  });
  return `<section class="shop-section shop-hero-lineup" id="hero-lineup">
    <div class="shop-group-heading"><small>The Hero Lineup</small><h2>The Flagships</h2><p>The new hero hat and hero jerseys. The dogs are back — all lost dogs come home.</p></div>
    <div class="product-grid">
      ${slots.join("\n      ")}
    </div>
  </section>`;
}

function browse(list, root, active) {
  const tabs = [`<a class="shop-tab${active ? "" : " active"}" href="${root}shop.html#shop">All <span>${products.length}</span></a>`]
    .concat(CATS.map((c) => { const n = products.filter((p) => p.cats.includes(c.slug)).length; return n ? `<a class="shop-tab${active === c.slug ? " active" : ""}" href="${root}shop/${c.slug}.html#shop">${esc(c.name)} <span>${n}</span></a>` : ""; }))
    .join("");
  const cat = CATS.find((c) => c.slug === active);
  return `<section class="shop-section shop-browse" id="shop" data-shop-browse>
    <div class="shop-group-heading"><small>${cat ? "Shop / " + esc(cat.name) : "The Whole Kennel"}</small><h2>${cat ? esc(cat.title) : "Shop All Merch"}</h2><p>${cat ? esc(cat.blurb) : "Every hat, hoodie, tee, and piece of gear. Search it, sort it, get that dog in you."}</p></div>
    <nav class="shop-tabs" aria-label="Shop categories">${tabs}</nav>
    <div class="shop-toolbar">
      <label class="shop-search"><span class="visually-hidden">Search merch</span><input type="search" placeholder="Search merch… (hoodie, hat, toile)" data-shop-search autocomplete="off" /></label>
      <label class="shop-sort"><span>Sort</span><select data-shop-sort>
        <option value="featured">Featured</option><option value="new">Newest</option><option value="price-asc">Price: Low → High</option><option value="price-desc">Price: High → Low</option><option value="name">Name A–Z</option>
      </select></label>
      <label class="shop-instock"><input type="checkbox" data-shop-instock /> In stock only</label>
    </div>
    <div class="shop-count" data-shop-count aria-live="polite">${list.length} items</div>
    <div class="product-grid" data-shop-grid>
      ${list.map((p) => card(p, root)).join("\n      ")}
    </div>
    <div class="shop-empty" data-shop-empty hidden>No dogs match that. <button type="button" data-shop-clear>Clear search</button></div>
  </section>`;
}

function listing({ root, title, desc, canonical, active, list, main }) {
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: list.filter((p) => !p.unpublished).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/shop/${p.slug}.html`, name: p.name })) };
  return listingTpl
    .replaceAll("{{TITLE}}", esc(title))
    .replaceAll("{{META_DESC}}", esc(desc))
    .replaceAll("{{CANONICAL}}", canonical)
    .replaceAll("{{JSONLD}}", `<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, "\\u003c")}</script>`)
    .replace("{{INTRO}}", main ? intro : "")
    .replace("{{HERO_LINEUP}}", main ? heroLineup(root) : "")
    .replace("{{BROWSE}}", browse(list, root, active))
    .replace("{{OUTRO}}", main ? outro : "")
    .replaceAll("{{ROOT}}", root);
}

write("shop.html", listing({ root: "", title: "Glizzy Shop — Official Utah Glizzies HC Merch", desc: "Official Utah Glizzies HC merch. Embroidered hats and jerseys, hoodies, tees, stickers, pucks, and gear. Search, sort, and shop by category.", canonical: `${SITE}/shop.html`, active: null, list: products, main: true }));
const catPages = [];
for (const c of CATS) {
  const list = products.filter((p) => p.cats.includes(c.slug));
  if (!list.length) continue;
  write(`shop/${c.slug}.html`, listing({ root: "../", title: `${c.title} — Utah Glizzies HC Shop`, desc: `${c.blurb} Official Utah Glizzies HC merch.`, canonical: `${SITE}/shop/${c.slug}.html`, active: c.slug, list, main: false }));
  catPages.push(`shop/${c.slug}.html`);
}

// ---------- catalog + sitemap ----------
write("data/shop-catalog.json", JSON.stringify({ syncedAt: new Date().toISOString(), products: products.map(({ desc, specs, size, images, ...rest }) => rest) }, null, 2));

const today = new Date().toISOString().slice(0, 10);
let sm = read("sitemap.xml").replace(/\s*<url><loc>https:\/\/www\.utahglizzies\.com\/shop(\.html|\/[^<]*)<\/loc>.*?<\/url>/g, "").replace(/\s*<!-- SHOP-SYNC:(START|END) -->/g, "");
const shopUrls = ["shop.html", ...catPages, ...products.filter((p) => !p.unpublished).map((p) => `shop/${p.slug}.html`)]
  .map((u, i) => `  <url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${i === 0 ? "0.8" : "0.7"}</priority></url>`);
sm = sm.replace("</urlset>", `  <!-- SHOP-SYNC:START -->\n${shopUrls.join("\n")}\n  <!-- SHOP-SYNC:END -->\n</urlset>`);
write("sitemap.xml", sm);

// ---------- report ----------
console.log(`${DRY ? "[dry-run] " : ""}Synced ${products.length} products from ${SHOP.domain}`);
for (const c of CATS) console.log(`  ${c.name.padEnd(16)} ${products.filter((p) => p.cats.includes(c.slug)).length}`);
console.log(`  Hero slots filled: ${products.filter((p) => p.hero).length}/${cfg.heroSlots.length}`);
console.log(`Generated product pages: ${report.generated.length ? report.generated.join(", ") : "none"}`);
console.log(`Kept hand-curated pages: ${report.keptCurated.length}`);
const noSize = products.filter((p) => !p.curated && !p.size && p.cats.some((c) => ["hoodies", "tees", "jerseys"].includes(c)));
if (noSize.length) console.log("⚠ Apparel without a size guide in Shopify:", noSize.map((p) => p.name).join(", "));
const junk = products.filter((p) => /^[a-z]{5,}\S*size guide|njkl/i.test(p.desc));
if (junk.length) console.log("⚠ Check description text:", junk.map((p) => p.name).join(", "));
