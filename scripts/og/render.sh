#!/bin/bash
# Renders scripts/og/og.html to the link preview images in static/og/.
# (The icons in static/ are the iOS app's AppIcon.png, resized.)
# Needs Google Chrome; the fonts load from jsdelivr, so it needs the network too.
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=5000 --window-size="$2" --screenshot="$TMP/$1.png" "file://$PWD/scripts/og/og.html?v=$1" >/dev/null 2>&1; }

shot home 1200,630
shot kako-radi 1200,630

mkdir -p static/og
# JPEG keeps each preview far under WhatsApp's limit (300 KB on older app versions).
sips -s format jpeg -s formatOptions 86 "$TMP/home.png" --out static/og/matmat.jpg >/dev/null
sips -s format jpeg -s formatOptions 86 "$TMP/kako-radi.png" --out static/og/kako-radi.jpg >/dev/null
ls -l static/og
