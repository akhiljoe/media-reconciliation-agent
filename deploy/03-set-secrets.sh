#!/usr/bin/env bash
# Sets Container App secrets and env vars.
# Run twice. Once after 02 with placeholder FRONTEND_URL.
# Then again after 04 with the real Static Web App URL.
#
# Reads OPENAI_API_KEY, JWT_SECRET, AUTH_USERS, JWT_TTL_HOURS from backend/.env
# unless those vars are already exported in the shell. Shell wins on conflicts.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
APP_NAME="${APP_NAME:-media-recon-backend}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend/.env"

# Auto-load from backend/.env (only sets vars that aren't already in the shell)
if [ -f "$ENV_FILE" ]; then
  echo "Loading missing values from $ENV_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue

    # Strip trailing carriage return (Windows line endings)
    line="${line%$'\r'}"

    if [[ "$line" == *"="* ]]; then
      key="${line%%=*}"
      key="${key//[[:space:]]/}"
      value="${line#*=}"

      # Strip surrounding double quotes
      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      # Strip surrounding single quotes
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      # Only export if shell hasn't already set it
      if [ -z "${!key+x}" ]; then
        export "$key=$value"
      fi
    fi
  done < "$ENV_FILE"
else
  echo "WARN: $ENV_FILE not found. All secrets must come from shell exports."
fi

# Required (now possibly populated from .env)
: "${OPENAI_API_KEY:?Missing OPENAI_API_KEY (export in shell or set in backend/.env)}"
: "${JWT_SECRET:?Missing JWT_SECRET (export or set in backend/.env)}"
: "${AUTH_USERS:?Missing AUTH_USERS (export or set in backend/.env)}"

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
