#!/usr/bin/env bash
# Builds the frontend with VITE_API_BASE_URL pointing at the deployed backend,
# creates a Static Web App, and pushes the built bundle.
# Cost: free SKU.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
LOCATION="${LOCATION:-centralindia}"
SWA_NAME="${SWA_NAME:-media-recon-frontend}"

# Required
: "${BACKEND_URL:?export BACKEND_URL first - the https://<fqdn> from step 02}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../MediaBillingReconcilliation"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: package.json not found at $FRONTEND_DIR"
  exit 1
fi

echo "Writing .env.production for Vite"
cat > "$FRONTEND_DIR/.env.production" <<EOF
VITE_API_BASE_URL=$BACKEND_URL/api
EOF

echo "Building frontend"
pushd "$FRONTEND_DIR" > /dev/null
npm install --no-audit --no-fund
npm run build
popd > /dev/null

echo ""
echo "Creating Static Web App: $SWA_NAME"
# SKU Free. No location needed for the SWA resource itself, but az requires it.
az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --sku Free \
  --output none || echo "(SWA may already exist; continuing)"

echo ""
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
echo "Deploying built assets via SWA CLI"
swa deploy "$FRONTEND_DIR/dist" \
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
echo "Save this. Re-run 03-set-secrets.sh with this URL to fix CORS:"
echo "  export FRONTEND_URL=\"$FRONTEND_URL\""
echo "  ./03-set-secrets.sh"
echo ""
echo "Verify in portal:"
echo "  Resource groups -> $RG_NAME -> Static Web Apps -> $SWA_NAME"
echo "  Click Browse on the Overview page."
