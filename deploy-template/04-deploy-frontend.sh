#!/usr/bin/env bash
# Build the SPA with VITE_API_BASE_URL pointing at the deployed backend.
# Create a Static Web App and push the built bundle via the SWA CLI (npx).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

: "${BACKEND_URL:?export BACKEND_URL first - the https://<fqdn> from 02b}"

FRONTEND_DIR="$SCRIPT_DIR/$FRONTEND_DIR_REL"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: package.json not found at $FRONTEND_DIR"
  exit 1
fi

echo "Writing .env.production for Vite"
{
  echo "VITE_API_BASE_URL=$BACKEND_URL/api"
  for v in "${FRONTEND_BUILD_VARS[@]}"; do
    echo "$v"
  done
} > "$FRONTEND_DIR/.env.production"

echo "Building frontend"
pushd "$FRONTEND_DIR" > /dev/null
npm install --no-audit --no-fund
npm run build
popd > /dev/null

echo ""
echo "Creating Static Web App: $SWA_NAME (location: $SWA_LOCATION)"
az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --location "$SWA_LOCATION" \
  --sku Free \
  --output none || echo "(SWA may already exist; continuing)"

echo "Reading deployment token"
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --query "properties.apiKey" \
  --output tsv)

if [ -z "$DEPLOY_TOKEN" ]; then
  echo "ERROR: could not read deployment token"
  exit 1
fi

echo ""
echo "Deploying built assets via SWA CLI (npx, no global install)"
npx -y @azure/static-web-apps-cli deploy "$FRONTEND_DIR/dist" \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production

echo ""
echo "Reading frontend hostname"
FRONTEND_HOSTNAME=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --query "defaultHostname" \
  --output tsv)

FRONTEND_URL="https://$FRONTEND_HOSTNAME"

echo ""
echo "================================================================"
echo "Frontend URL: $FRONTEND_URL"
echo "================================================================"
echo ""
echo "Save this. Export then re-run 03-set-secrets.sh to fix CORS:"
echo "  export FRONTEND_URL=\"$FRONTEND_URL\""
echo "  bash 03-set-secrets.sh"
