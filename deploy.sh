#!/bin/zsh
# Utah Glizzies — One-command deploy to Cloudflare Pages
# Run this from anywhere: just open Terminal and paste the path to this file

export PATH=/Users/aherrin/.npm-global/bin:$PATH

SITE="/Users/aherrin/Downloads/glizzies-full-site/UtahGlizzies.com"

echo "🏒 Deploying Utah Glizzies to Cloudflare Pages..."
cd "$SITE" && wrangler pages deploy . --project-name=utahglizzies --commit-dirty=true

echo ""
echo "✅ Done. Live at https://www.utahglizzies.com"
