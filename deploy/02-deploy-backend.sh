#!/usr/bin/env bash
# Builds the backend Dockerfile in the cloud and deploys it as a Container App.
# First run takes 5 to 8 minutes. Subsequent runs ~3 minutes.
# Cost: free under quota (180k vCPU-sec/mo, 360k GiB-sec/mo) with scale-to-zero.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
LOCATION="${LOCATION:-centralindia}"
ENV_NAME="${ENV_NAME:-media-recon-env}"
APP_NAME="${APP_NAME:-media-recon-backend}"

# Resolve backend dir relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
  echo "ERROR: Dockerfile not found at $BACKEND_DIR/Dockerfile"
  exit 1
fi

echo "Deploying backend Container App"
echo "  RG:       $RG_NAME"
echo "  ENV:      $ENV_NAME"
echo "  APP:      $APP_NAME"
echo "  SOURCE:   $BACKEND_DIR"
echo ""

az containerapp up \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --environment "$ENV_NAME" \
  --source "$BACKEND_DIR" \
  --ingress external \
  --target-port 5000 \
  --env-vars \
    "MAPPING_FOLDER=/app/mapping" \
    "UPLOAD_FOLDER=/tmp/uploads" \
    "OUTPUT_FOLDER=/tmp/output"

echo ""
echo "Reading public FQDN"
FQDN=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo ""
echo "================================================================"
echo "Backend URL: https://$FQDN"
echo "================================================================"
echo ""
echo "Save this. Export it for the next step:"
echo "  export BACKEND_URL=\"https://$FQDN\""
echo ""
echo "Verify in portal:"
echo "  Resource groups -> $RG_NAME -> Container Apps -> $APP_NAME"
echo "  Click the Application URL on the Overview page."
echo ""
echo "Sanity check from terminal:"
echo "  curl https://$FQDN/api/health"
echo ""
echo "Note: secrets and CORS are set in the next step (03-set-secrets.sh)."
