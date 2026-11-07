#!/usr/bin/env bash
# Smoke test: start postgres + gateway from the default compose file,
# verify HTTP endpoints, then tear down unconditionally.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT=sbs-smoke-$$
ENV_FILE="$(mktemp)"
GATEWAY_PORT=8090
POSTGRES_PORT=55480
COMPOSE_CMD=(docker compose -f "$REPO_DIR/compose.yaml" -p "$PROJECT" --env-file "$ENV_FILE")
TIMEOUT_S=90
PASSED=0
FAILED=0

cleanup() {
  echo "--- teardown ---"
  # --rmi local also removes the gateway image this run built. Without it every
  # run leaks a 229 MB image that nothing later reclaims.
  "${COMPOSE_CMD[@]}" down -v --remove-orphans --rmi local 2>/dev/null || true
  rm -f "$ENV_FILE"
  echo "--- verifying no leftover containers ---"
  leftover="$(docker ps -a --filter "name=${PROJECT}" --format '{{.Names}}' 2>/dev/null)"
  if [ -n "$leftover" ]; then
    echo "FAIL: leftover containers: $leftover"
    docker rm -f $leftover 2>/dev/null || true
  else
    echo "OK: no containers remain for project $PROJECT"
  fi
  echo "--- verifying no leftover images ---"
  leftover_images="$(docker images --filter "reference=${PROJECT}*" --format '{{.Repository}}:{{.Tag}}' 2>/dev/null)"
  if [ -n "$leftover_images" ]; then
    echo "FAIL: leftover images: $leftover_images"
    docker rmi -f $leftover_images 2>/dev/null || true
  else
    echo "OK: no images remain for project $PROJECT"
  fi
  echo "--- temp env deleted: $([ ! -f "$ENV_FILE" ] && echo yes || echo no) ---"
}
trap cleanup EXIT

# ── 1. Generate throwaway env ────────────────────────────────────────
PG_PASS="$(openssl rand -base64 32)"
GW_TOKEN="$(openssl rand -base64 32)"
WEBUI_KEY="$(openssl rand -hex 32)"
cat > "$ENV_FILE" <<EOF
POSTGRES_DB=smoke_db
POSTGRES_USER=smoke_user
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_HOST_PORT=${POSTGRES_PORT}
GATEWAY_TOKEN=${GW_TOKEN}
GATEWAY_OWNER_ID=smoke-owner
GATEWAY_HOST_PORT=${GATEWAY_PORT}
WEBUI_SECRET_KEY=${WEBUI_KEY}
EOF

echo "=== env generated at $ENV_FILE ==="

# ── 2. Start only postgres and gateway ───────────────────────────────
echo "=== starting postgres + gateway (project $PROJECT) ==="
"${COMPOSE_CMD[@]}" up -d --no-deps postgres gateway

# ── 3. Wait for services to be ready ────────────────────────────────
BASE="http://127.0.0.1:${GATEWAY_PORT}"
deadline=$((SECONDS + TIMEOUT_S))

echo "=== waiting for postgres healthy ==="
while true; do
  status="$("${COMPOSE_CMD[@]}" ps postgres --format '{{.Health}}' 2>/dev/null || echo unknown)"
  [ "$status" = "healthy" ] && break
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "FAIL: postgres did not become healthy within ${TIMEOUT_S}s"
    "${COMPOSE_CMD[@]}" logs postgres 2>&1
    exit 1
  fi
  sleep 2
done
echo "OK: postgres healthy"

echo "=== waiting for gateway healthy ==="
while true; do
  gw_status="$("${COMPOSE_CMD[@]}" ps gateway --format '{{.Health}}' 2>/dev/null || echo unknown)"
  [ "$gw_status" = "healthy" ] && break
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "FAIL: gateway did not become healthy within ${TIMEOUT_S}s (status: $gw_status)"
    "${COMPOSE_CMD[@]}" logs gateway 2>&1
    exit 1
  fi
  sleep 2
done
echo "OK: gateway healthy"

echo "=== waiting for readyz 200 ==="
while true; do
  rz_code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/readyz" 2>/dev/null)"
  [ "$rz_code" = "200" ] && break
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "FAIL: readyz did not return 200 within ${TIMEOUT_S}s (last: $rz_code)"
    "${COMPOSE_CMD[@]}" logs gateway 2>&1
    exit 1
  fi
  sleep 2
done
echo "OK: readyz 200"

# ── 4. Assert HTTP surface ───────────────────────────────────────────
assert_status() {
  local label="$1" method="$2" url="$3" expected="$4"
  shift 4
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$@" "$url" 2>/dev/null)"
  if [ "$code" = "$expected" ]; then
    echo "PASS [$label]: $method $url -> $code"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL [$label]: expected $expected, got $code"
    FAILED=$((FAILED + 1))
  fi
}

echo "=== asserting HTTP surface ==="

# 4a. Health check (unauthenticated, 200)
assert_status "healthz" GET "${BASE}/healthz" 200

# 4b. Readiness probe (unauthenticated, 200 -- already waited, confirm assertion)
assert_status "readyz" GET "${BASE}/readyz" 200

# 4c. Authenticated route: GET /v1/models returns 200 with empty models
assert_status "models-auth" GET "${BASE}/v1/models" 200 \
  -H "Authorization: Bearer ${GW_TOKEN}"

# 4d. Unauthenticated data route returns 401
assert_status "models-noauth" GET "${BASE}/v1/models" 401

# ── 5. Assert a rejected input stores nothing ────────────────────────
# POST /v1/documents/ingest with invalid body (missing document) -> 400
assert_status "ingest-bad-body" POST "${BASE}/v1/documents/ingest" 400 \
  -H "Authorization: Bearer ${GW_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"not_document": true}'

# Verify nothing was stored: lexical search returns empty matches
retrieval_body="$(curl -s -X POST "${BASE}/v1/retrieval/query" \
  -H "Authorization: Bearer ${GW_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "anything", "mode": "lexical"}')"
retrieval_code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE}/v1/retrieval/query" \
  -H "Authorization: Bearer ${GW_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "anything", "mode": "lexical"}')"

if [ "$retrieval_code" = "200" ] && echo "$retrieval_body" | grep -q '"matches":\[\]'; then
  echo "PASS [no-stored-data]: retrieval 200, matches is empty after rejected ingest"
  PASSED=$((PASSED + 1))
else
  echo "FAIL [no-stored-data]: expected 200 with empty matches, got $retrieval_code: $retrieval_body"
  FAILED=$((FAILED + 1))
fi

# ── 6. Summary ──────────────────────────────────────────────────────
echo ""
echo "=== results: $PASSED passed, $FAILED failed ==="
if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
echo "=== all smoke assertions passed ==="
