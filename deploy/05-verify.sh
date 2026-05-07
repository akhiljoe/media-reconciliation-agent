#!/usr/bin/env bash
# Smoke tests against the deployed stack.
# Run after 04 and the second invocation of 03.
set -e

: "${BACKEND_URL:?export BACKEND_URL=https://<backend-fqdn>}"
: "${FRONTEND_URL:?export FRONTEND_URL=https://<frontend-fqdn>}"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

echo "Test 1: backend /api/health (public)"
RESP=$(curl -sS -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" || echo "000")
[ "$RESP" = "200" ] && pass "health returned 200" || fail "expected 200, got $RESP"

echo ""
echo "Test 2: protected route rejects with 401 when no token"
RESP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/upload-file" || echo "000")
[ "$RESP" = "401" ] && pass "got 401 as expected" || fail "expected 401, got $RESP"

echo ""
echo "Test 3: CORS allows the frontend origin"
HDR=$(curl -sS -i -X OPTIONS "$BACKEND_URL/api/health" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null \
  | tr -d '\r' | grep -i "access-control-allow-origin" | head -1)
echo "  $HDR"
echo "$HDR" | grep -qi "$FRONTEND_URL" && pass "CORS allows $FRONTEND_URL" || fail "CORS does not allow $FRONTEND_URL"

echo ""
echo "Test 4: login returns a JWT (skip if DEMO_USER/DEMO_PASS not set)"
if [ -n "$DEMO_USER" ] && [ -n "$DEMO_PASS" ]; then
  TOKEN=$(curl -sS -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASS\"}" \
    | python -c "import sys, json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
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

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo ""
echo "Cost posture audit"
echo "Resources actually deployed in the resource group:"
az resource list --resource-group "${RG_NAME:-media-recon-rg}" \
  --query "[].{Name:name, Type:type}" --output table 2>/dev/null || \
  echo "  (RG_NAME not exported or RG missing; skip)"
echo ""
echo "Expected types only:"
echo "  - Microsoft.App/managedEnvironments"
echo "  - Microsoft.App/containerApps"
echo "  - Microsoft.OperationalInsights/workspaces  (free 5 GB/mo)"
echo "  - Microsoft.Web/staticSites"
echo ""
echo "Flag immediately if you also see:"
echo "  - Microsoft.Insights/components               (App Insights, metered)"
echo "  - Microsoft.ContainerRegistry/registries      (~\$5/mo Basic tier)"
echo ""
echo "All checks passed. Open $FRONTEND_URL in a browser, log in, upload an invoice."
