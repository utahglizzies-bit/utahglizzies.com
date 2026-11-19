# Shop sync (Shopify → utahglizzies.com/shop)

The shop pages are generated from Shopify. Don't hand-edit `shop.html` or the category pages; your edits will get overwritten.

## Add new merch
1. In Shopify, set the product to **Active** and publish it to the sales channel the site uses (product → Publishing). A draft or unpublished product won't show up.
2. Optional tags:
   - `hero-hat` or `hero-jersey`: puts it in a Hero Lineup slot (the slot shows "Coming Soon" until something is tagged).
   - `cat:hats|jerseys|hoodies|tees|youth|gear`: forces a category (otherwise the category is guessed from the title).
   - `sold-out`: shows it as Sold Out. `hide-web`: keeps it off the site.
3. Run `node scripts/sync-shop.mjs` (add `--dry-run` to preview the report without writing anything).
4. Review on the local dev server (`python3 -m http.server 8000` → http://localhost:8000/shop.html), then commit and push.

## What it builds
- `shop.html`: hero lineup, then all products with search, sort, and an in-stock filter, then How It Works and the FAQ.
- `shop/hats.html`, `jerseys`, `hoodies`, `tees`, `youth`, `gear`: one page per category.
- `shop/<product>.html`: **only** for products without a hand-curated page. Curated pages (no `generated-by:sync-shop` marker) are never touched.
- Size guides come from the Printful size table in each product description, shown in inches with a cm toggle.
- `sitemap.xml` shop URLs (between `SHOP-SYNC` markers) and `data/shop-catalog.json`.

## Curated overrides
`scripts/shop-config.json` holds custom names, card blurbs, local photos, display order, forced sold-out flags, and the hero slot copy, all keyed by Shopify product ID.
