#!/usr/bin/env bash
# Deploys the GHCR image to Azure Container Apps.
# Run this in Azure Cloud Shell (or anywhere az works).
# Requires the image to already be pushed to GHCR (run 02a-build-and-push.sh first).
#
# Required env vars:
#   GHCR_PAT       Same PAT used to push (Container App needs read:packages to pull)
# Optional:
#   GH_USER        GitHub username (default: akhiljoe)
#   APP_NAME       Container App name and image component (default: media-recon-backend)
#   IMAGE_TAG      Image tag (default: latest)
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
LOCATION="${LOCATION:-centralindia}"
ENV_NAME="${ENV_NAME:-media-recon-env}"
APP_NAME="${APP_NAME:-media-recon-backend}"
GH_USER="${GH_USER:-akhiljoe}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE="ghcr.io/${GH_USER}/${APP_NAME}:${IMAGE_TAG}"

: "${GHCR_PAT:?export GHCR_PAT first - GitHub PAT with read:packages scope}"

echo "================================================================"
echo "Stage 1: Create Container Apps Environment (idempotent)"
echo "================================================================"
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --output none 2>/dev/null || echo "(Environment may already exist; continuing)"

echo ""
echo "================================================================"
echo "Stage 2: Create or update Container App from GHCR image"
echo "Image: $IMAGE"
echo "================================================================"
if az containerapp show --name "$APP_NAME" --resource-group "$RG_NAME" --output none 2>/dev/null; then
  echo "App exists. Updating image and registry credentials."
  az containerapp registry set \
    --name "$APP_NAME" \
    --resource-group "$RG_NAME" \
    --server ghcr.io \
    --username "$GH_USER" \
    --password "$GHCR_PAT" \
    --output none
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RG_NAME" \
    --image "$IMAGE" \
    --output none
else
  echo "Creating new app."
  az containerapp create \
    --name "$APP_NAME" \
    --resource-group "$RG_NAME" \
    --environment "$ENV_NAME" \
    --image "$IMAGE" \
    --target-port 5000 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 0 \
    --max-replicas 1 \
    --registry-server ghcr.io \
    --registry-username "$GH_USER" \
    --registry-password "$GHCR_PAT" \
    --env-vars \
      "MAPPING_FOLDER=/app/mapping" \
      "UPLOAD_FOLDER=/tmp/uploads" \
      "OUTPUT_FOLDER=/tmp/output" \
    --output none
fi

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
echo "Sanity check:"
echo "  curl https://$FQDN/api/health"
echo ""
echo "Note: secrets and CORS are set in the next step (03-set-secrets.sh)."
