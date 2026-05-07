#!/usr/bin/env bash
# Deploy the GHCR image to Azure Container Apps.
# Run this in Azure Cloud Shell.
#
# Required env: GHCR_PAT (Container App needs read:packages to pull)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

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
echo "  Image: $IMAGE"
echo "================================================================"

# Build the env-vars argument list for create/update
ENV_VAR_ARGS=()
for v in "${PUBLIC_ENV_VARS[@]}"; do
  ENV_VAR_ARGS+=("$v")
done

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
    --target-port "$BACKEND_PORT" \
    --ingress external \
    --cpu "$CPU" \
    --memory "$MEMORY" \
    --min-replicas "$MIN_REPLICAS" \
    --max-replicas "$MAX_REPLICAS" \
    --registry-server ghcr.io \
    --registry-username "$GH_USER" \
    --registry-password "$GHCR_PAT" \
    --env-vars "${ENV_VAR_ARGS[@]}" \
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
echo "Save this. Export for the next step:"
echo "  export BACKEND_URL=\"https://$FQDN\""
echo ""
echo "Sanity check:"
echo "  curl https://$FQDN/<your-health-route>"
echo ""
echo "Next: bash 03-set-secrets.sh"
