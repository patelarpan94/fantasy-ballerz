#!/bin/bash
# Fantasy Ballerz league server: upload the latest Code.gs to a Sheet's Apps Script
# with clasp and update its web app in place (same /exec URL, nothing to paste).
#
#   One-time:  ./release.sh setup uat  <UAT script id>
#              ./release.sh setup live <Live script id>
#   Releases:  ./release.sh uat     (after a UAT build)
#              ./release.sh live    (after "push to live")
#
# The code comes from the GitHub site: uat/server/Code.js for UAT and
# server/Code.js for Live, so Live only changes once Live is promoted.
set -e
cd "$(dirname "$0")"
REPO=patelarpan94/fantasy-ballerz
DEP_uat=AKfycby3ghL7eesprTdB1BCH0Jblp8_8zt3u9VhVwRazRg-6fvgDD3h78ANdud_8JGQ7R3j9
DEP_live=AKfycbyjnhCF002TeeWcwGzjwcXlT0F8mL_mr8eY2_uXvElZmW967dorBqzBNUffHoXiGmx6
usage() { echo "Usage: ./release.sh uat|live   or   ./release.sh setup uat|live <script id>"; exit 1; }
command -v clasp >/dev/null || { echo "clasp isn't installed: npm install -g @google/clasp, then clasp login"; exit 1; }

if [ "$1" = setup ]; then
  ENV=$2; ID=$3
  { [ "$ENV" = uat ] || [ "$ENV" = live ]; } && [ -n "$ID" ] || usage
  rm -rf "$ENV.tmp"; mkdir "$ENV.tmp"; (cd "$ENV.tmp" && clasp clone "$ID")
  rm -rf "$ENV"; mv "$ENV.tmp" "$ENV"
  echo; echo "Set up $ENV. Files: $(ls "$ENV" | tr '\n' ' ')"; echo "Next: ./release.sh $ENV"
  exit 0
fi

ENV=$1
case "$ENV" in uat) DEP=$DEP_uat; P=uat/ ;; live) DEP=$DEP_live; P= ;; *) usage ;; esac
[ -f "$ENV/.clasp.json" ] || { echo "Run ./release.sh setup $ENV <script id> first."; exit 1; }
cd "$ENV"

echo "1. Downloading the $ENV server code from GitHub..."
SHA=$(curl -fsSL "https://api.github.com/repos/$REPO/commits/main" | grep -m1 '"sha"' | cut -d'"' -f4)
[ -n "$SHA" ] || { echo "Couldn't reach GitHub. Try again in a minute."; exit 1; }
curl -fsSL "https://raw.githubusercontent.com/$REPO/$SHA/${P}server/Code.js" -o Code.js.new
grep -q "function doPost" Code.js.new || { rm -f Code.js.new; echo "The download looks wrong; nothing was changed."; exit 1; }
REL=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/$SHA/${P}version.json" | sed -n 's/.*"release": *"\([^"]*\)".*/\1/p')
# clasp names the Sheet's Code.gs "Code.js" locally; replace whichever name the clone used
F=$(ls Code.js Code.gs 2>/dev/null | head -1); F=${F:-Code.js}
mv Code.js.new "$F"
echo "   $REL (commit ${SHA:0:7})"

echo "2. Uploading to Apps Script..."
clasp push -f

echo "3. Updating the web app (same URL)..."
if clasp update-deployment --help >/dev/null 2>&1; then clasp update-deployment "$DEP" -d "$REL"; else clasp deploy -i "$DEP" -d "$REL"; fi

echo; echo "Done. The $ENV server is now $REL."
