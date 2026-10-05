#!/bin/bash
# Runs on the cPanel server from the checked-out "cpanel" branch (cPanel Git Version Control
# runs .cpanel.yml). Backs up public_html, then mirrors site/ into it. Server-only files
# (api/config.php, .well-known, cgi-bin, PHP settings, logs) are never touched.
set -euo pipefail
DEST="$HOME/public_html"
BACKUPS="$HOME/site-backups"
mkdir -p "$BACKUPS"
tar -czf "$BACKUPS/public_html-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$HOME" public_html
ls -1t "$BACKUPS"/public_html-*.tar.gz | tail -n +11 | xargs -r rm -f
rsync -a --delete \
  --exclude '/api/config.php' --exclude '/.well-known/' --exclude '/cgi-bin/' \
  --exclude '/.user.ini' --exclude '/php.ini' --exclude 'error_log' \
  site/ "$DEST/"
echo "Deployed $(git rev-parse --short HEAD) to $DEST"
