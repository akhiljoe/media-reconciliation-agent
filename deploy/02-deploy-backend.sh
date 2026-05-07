#!/usr/bin/env bash
# Builds the backend Docker image, pushes to GitHub Container Registry (free, private),
# then deploys it as an Azure Container App.
# Avoids Azure Container Registry entirely (~$5/mo charge sidestepped).
#
# Required env vars:
#   GHCR_PAT       GitHub PAT with scopes: repo, write:packages, read:packages
# Optional:
#   GH_USER        GitHub username (default: akhiljoe)
#   IMAGE_TAG      Image tag (default: latest)
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
LOCATION="${LOCATION:-centralindia}"
ENV_NAME="${ENV_NAME:-media-recon-env}"
APP_NAME="${APP_NAME:-media-recon-backend}"
GH_USER="${GH_USER:-akhiljoe}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE="ghcr.io/${GH_USER}/${APP_NAME}:${IMAGE_TAG}"

: "${GHCR_PAT:?export GHCR_PAT first - GitHub PAT with write:packages scope}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
  echo "ERROR: Dockerfile not found at $BACKEND_DIR/Dockerfile"
  exit 1
fi

echo "================================================================"
echo "Stage 1: Build image locally"
echo "================================================================"
docker build -t "$IMAGE" "$BACKEND_DIR"

echo ""
echo "================================================================"
echo "Stage 2: Login to GHCR and push"
echo "================================================================"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin
docker push "$IMAGE"

echo ""
echo "================================================================"
echo "Stage 3: Create Container Apps Environment (idempotent)"
echo "================================================================"
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --output none 2>/dev/null || echo "(Environment may already exist; continuing)"

echo ""
echo "================================================================"
echo "Stage 4: Create or update Container App from GHCR image"
echo "================================================================"
# If app exists, update it. Otherwise create it.
if az containerapp show --name "$APP_NAME" --resource-group "$RG_NAME" --output none 2>/dev/null; then
  echo "App exists, updating image"
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
  echo "Creating new app"
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
