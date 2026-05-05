#!/usr/bin/env bash
# Sets Container App secrets and env vars.
# Run twice. Once after 02 with placeholder FRONTEND_URL.
# Then again after 04 with the real Static Web App URL.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
APP_NAME="${APP_NAME:-media-recon-backend}"

# Required env vars
: "${OPENAI_API_KEY:?export OPENAI_API_KEY first}"
: "${JWT_SECRET:?export JWT_SECRET first - use: python -c 'import secrets; print(secrets.token_urlsafe(48))'}"
: "${AUTH_USERS:?export AUTH_USERS first as JSON map of email to werkzeug hash}"

# Optional
JWT_TTL_HOURS="${JWT_TTL_HOURS:-8}"
if [ -z "$FRONTEND_URL" ]; then
  echo "WARN: FRONTEND_URL not set. CORS will reject browser calls."
  echo "      Re-run this script with FRONTEND_URL after deploying frontend."
  FRONTEND_URL="http://localhost:3000"
fi

echo "Setting Container App secrets"
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --secrets \
    "openai-key=$OPENAI_API_KEY" \
    "jwt-secret=$JWT_SECRET" \
    "auth-users=$AUTH_USERS" \
  --output none

echo ""
echo "Updating env vars"
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --set-env-vars \
    "OPENAI_API_KEY=secretref:openai-key" \
    "JWT_SECRET=secretref:jwt-secret" \
    "AUTH_USERS=secretref:auth-users" \
    "JWT_TTL_HOURS=$JWT_TTL_HOURS" \
    "ALLOWED_ORIGINS=$FRONTEND_URL" \
    "MAPPING_FOLDER=/app/mapping" \
    "UPLOAD_FOLDER=/tmp/uploads" \
    "OUTPUT_FOLDER=/tmp/output" \
  --output none

echo ""
echo "================================================================"
echo "Done. Container App will restart automatically."
echo "================================================================"
echo ""
echo "Verify in portal:"
echo "  Container App -> Settings -> Secrets"
echo "    Should show: openai-key, jwt-secret, auth-users"
echo "  Container App -> Settings -> Containers -> Edit"
echo "    Should show env vars including the secretref entries"
echo ""
echo "Sanity check (replace BACKEND_URL with your Container App URL):"
echo "  curl \$BACKEND_URL/api/health"
echo "  curl -X POST \$BACKEND_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"<email>\",\"password\":\"<pwd>\"}'"
