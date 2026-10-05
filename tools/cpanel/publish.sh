#!/bin/bash
# Called by .github/workflows/deploy-cpanel.yml after the "cpanel" branch is pushed.
# Uses the cPanel UAPI (port 2083) with an API token to:
#   1. add each niche subdomain, sharing public_html (AutoSSL then issues its certificate),
#   2. clone the repo once into ~/repositories/gwagency-live, then pull the cpanel branch,
#   3. run the deployment (.cpanel.yml -> deploy.sh), and wait for it to finish.
# Needs CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN and REPO_URL in the environment.
set -euo pipefail
: "${CPANEL_HOST:?}" "${CPANEL_USER:?}" "${CPANEL_TOKEN:?}" "${REPO_URL:?}"
REPO_ROOT="/home/$CPANEL_USER/repositories/gwagency-live"

api() {
  local fn=$1; shift
  local args=()
  for kv in "$@"; do args+=(--data-urlencode "$kv"); done
  curl -sS -G --max-time 120 -H "Authorization: cpanel $CPANEL_USER:$CPANEL_TOKEN" \
    "https://$CPANEL_HOST:2083/execute/$fn" "${args[@]}"
}
ok() { jq -e '.status == 1' >/dev/null <<<"$1"; }

while read -r sub; do
  [ -n "$sub" ] || continue
  r=$(api SubDomain/addsubdomain "domain=$sub" "rootdomain=groundwork-web.com" "dir=public_html")
  if ok "$r"; then echo "added $sub.groundwork-web.com"
  elif grep -qi "already exists" <<<"$r"; then echo "$sub.groundwork-web.com exists"
  else echo "addsubdomain $sub failed: $(jq -c .errors <<<"$r")"; exit 1; fi
done < _cpanel/subdomains.txt

r=$(api VersionControl/retrieve)
if ! jq -e --arg p "$REPO_ROOT" '.data[]? | select(.repository_root == $p)' >/dev/null <<<"$r"; then
  r=$(api VersionControl/create "type=git" "name=gwagency-live" "repository_root=$REPO_ROOT" \
        "source_repository={\"remote_name\":\"origin\",\"url\":\"$REPO_URL\"}" "checkout=1")
  ok "$r" || { echo "clone failed: $(jq -c .errors <<<"$r")"; exit 1; }
  echo "cloned $REPO_URL"
fi
r=$(api VersionControl/update "repository_root=$REPO_ROOT" "branch=cpanel")
ok "$r" || { echo "pull failed: $(jq -c .errors <<<"$r")"; exit 1; }
echo "on $(jq -r '.data.last_update.identifier // .data.branch' <<<"$r")"

r=$(api VersionControlDeployment/create "repository_root=$REPO_ROOT")
ok "$r" || { echo "deploy failed to start: $(jq -c .errors <<<"$r")"; exit 1; }
id=$(jq -r '.data.deploy_id' <<<"$r")
for _ in $(seq 60); do
  sleep 5
  d=$(api VersionControlDeployment/retrieve | jq --arg id "$id" '.data[] | select((.deploy_id|tostring) == $id)')
  if [ "$(jq -r '.timestamps.succeeded // empty' <<<"$d")" ]; then echo "deploy $id succeeded"; exit 0; fi
  if [ "$(jq -r '.timestamps.failed // empty' <<<"$d")" ]; then echo "deploy $id failed; log: $(jq -r .log_path <<<"$d")"; exit 1; fi
done
echo "deploy $id still running after 5 minutes"; exit 1
