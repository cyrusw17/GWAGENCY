#!/bin/bash
# Runs on the cPanel server from the checked-out "cpanel" branch (cPanel Git Version Control
# runs .cpanel.yml). Backs up public_html, then copies site/ in the way offer1's deploy did:
# folders the site owns are replaced whole, api/ is overlaid so api/config.php survives, and
# anything else already in public_html (the private list folder, .well-known, cgi-bin) is left alone.
set -euo pipefail
DEST="$HOME/public_html"
BACKUPS="$HOME/site-backups"
mkdir -p "$BACKUPS" "$DEST" "$HOME/gw-data"
tar -czf "$BACKUPS/public_html-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$HOME" public_html
ls -1t "$BACKUPS"/public_html-*.tar.gz | tail -n +11 | xargs -r rm -f
for path in site/*/; do
  name=$(basename "$path")
  [ "$name" = api ] || rm -rf "${DEST:?}/$name"
done
cp -R site/. "$DEST/"
chmod 750 "$HOME/gw-data"
# Leads always go to the agency inbox, whatever an older config.php says (offer1's deploy did the same).
if [ -f "$DEST/api/config.php" ]; then
  sed -i 's/define("GW_LEAD_EMAIL".*/define("GW_LEAD_EMAIL", "groundworkweb@proton.me");/' "$DEST/api/config.php"
  chmod 600 "$DEST/api/config.php"
fi
echo "Deployed $(git rev-parse --short HEAD) to $DEST"
