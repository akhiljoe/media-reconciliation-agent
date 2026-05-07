#!/usr/bin/env bash
# Smoke tests + cost posture audit.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

: "${BACKEND_URL:?export BACKEND_URL=https://<backend-fqdn>}"
: "${FRONTEND_URL:?export FRONTEND_URL=https://<frontend-fqdn>}"

# Optional health route override (some apps use /health, some /api/health, /healthz, etc.)
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
# Optional protected route to test 401
PROTECTED_PATH="${PROTECTED_PATH:-/api/upload-file}"
# Optional login route + creds
LOGIN_PATH="${LOGIN_PATH:-/api/auth/login}"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

echo "Test 1: backend health (public)"
RESP=$(curl -sS -o /dev/null -w "%{http_code}" "$BACKEND_URL$HEALTH_PATH" || echo "000")
[ "$RESP" = "200" ] && pass "health returned 200" || fail "expected 200, got $RESP"

echo ""
echo "Test 2: protected route rejects without token"
RESP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL$PROTECTED_PATH" || echo "000")
[ "$RESP" = "401" ] && pass "got 401" || fail "expected 401, got $RESP (skip if your app has no auth)"

echo ""
echo "Test 3: CORS allows the frontend origin"
HDR=$(curl -sS -i -X OPTIONS "$BACKEND_URL$HEALTH_PATH" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null \
  | tr -d '\r' | grep -i "access-control-allow-origin" | head -1)
echo "  $HDR"
echo "$HDR" | grep -qi "$FRONTEND_URL" && pass "CORS allows $FRONTEND_URL" || fail "CORS does not allow $FRONTEND_URL (try sleep 60 and retry; container may be restarting)"

echo ""
echo "Test 4: login returns a token (skip if DEMO_USER/DEMO_PASS not set)"
if [ -n "$DEMO_USER" ] && [ -n "$DEMO_PASS" ]; then
  TOKEN=$(curl -sS -X POST "$BACKEND_URL$LOGIN_PATH" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASS\"}" \
    | python3 -c "import sys, json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    pass "login returned a token (length ${#TOKEN})"
  else
    fail "login did not return a token"
  fi
else
  echo "  SKIP: export DEMO_USER and DEMO_PASS to enable"
fi

echo ""
echo "Test 5: frontend reachable"
RESP=$(curl -sS -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
[ "$RESP" = "200" ] && pass "frontend returned 200" || fail "expected 200, got $RESP"

echo ""
echo "================================================================"
echo "$PASS passed, $FAIL failed"
echo "================================================================"

echo ""
echo "Cost posture audit"
az resource list --resource-group "$RG_NAME" \
  --query "[].{Name:name, Type:type}" --output table 2>/dev/null
echo ""
echo "Expected types:"
echo "  Microsoft.App/managedEnvironments"
echo "  Microsoft.App/containerApps"
echo "  Microsoft.OperationalInsights/workspaces  (free 5 GB/mo)"
echo "  Microsoft.Web/staticSites"
echo ""
echo "Flag if you also see:"
echo "  Microsoft.Insights/components               (App Insights, metered)"
echo "  Microsoft.ContainerRegistry/registries      (~\$5/mo Basic)"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
