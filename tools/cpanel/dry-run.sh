#!/bin/bash
# Dry run for .github/workflows/deploy-cpanel.yml: reads public_html through the cPanel API and
# prints what deploy.sh would do with each top-level entry. Changes nothing on the server.
set -euo pipefail
: "${CPANEL_HOST:?}" "${CPANEL_USER:?}" "${CPANEL_TOKEN:?}"
r=$(curl -sS -G --max-time 60 -H "Authorization: cpanel $CPANEL_USER:$CPANEL_TOKEN" \
  "https://$CPANEL_HOST:2083/execute/Fileman/list_files" --data-urlencode "dir=public_html" \
  --data-urlencode "show_hidden=1")
jq -e '.status == 1' >/dev/null <<<"$r" || { echo "list_files failed: $(jq -c .errors <<<"$r")"; exit 1; }
live=$(jq -r '.data[] | "\(.type) \(.file)"' <<<"$r")
echo "Backup first: ~/site-backups/public_html-<time>.tar.gz"
echo
while read -r type name; do
  [ -n "$name" ] || continue
  if [ -e "_cpanel/site/$name" ]; then
    if [ "$type" = dir ] && [ "$name" != api ]; then echo "REPLACE   $name/"
    elif [ "$name" = api ]; then echo "OVERLAY   api/ (config.php kept)"
    else echo "OVERWRITE $name"; fi
  else
    echo "KEEP      $name$([ "$type" = dir ] && echo /)"
  fi
done <<<"$live"
for f in _cpanel/site/* _cpanel/site/.htaccess; do
  name=$(basename "$f")
  grep -qx "[a-z]* $name" <<<"$live" || echo "ADD       $name$([ -d "$f" ] && echo /)"
done
