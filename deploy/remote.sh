#!/usr/bin/env bash
#
# Runs on the server, piped in over SSH by .github/workflows/deploy.yml.
# Also safe to run by hand:  bash /opt/feelm-sk/deploy/remote.sh
set -euo pipefail

APP_DIR=/opt/feelm-sk
COMPOSE="docker compose -f compose.prod.yaml"

cd "$APP_DIR"

echo "==> Fetching main"
git fetch --quiet origin main
git reset --quiet --hard origin/main
echo "    now at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# The API origin is compiled into the client bundle by Vite, so it is a build
# argument rather than something the container reads at start-up. Changing it
# means rebuilding, which is exactly what happens here.
echo "==> Building"
$COMPOSE build

echo "==> Starting"
$COMPOSE up -d --remove-orphans

echo "==> Checking"
for attempt in $(seq 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)
    if [ "$code" = "200" ]; then
        echo "    site answering (HTTP $code)"
        break
    fi
    if [ "$attempt" = "15" ]; then
        echo "    site not answering after 30s (last status: $code)" >&2
        $COMPOSE logs --tail 40 >&2
        exit 1
    fi
    sleep 2
done

echo "==> Pruning old images"
docker image prune -f --filter 'until=168h' >/dev/null

echo "==> Done"
