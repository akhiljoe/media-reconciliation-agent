#!/usr/bin/env bash
# Create the resource group.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "Creating resource group: $RG_NAME in $LOCATION"
az group create \
  --name "$RG_NAME" \
  --location "$LOCATION" \
  --output table

echo ""
echo "Done. Verify in portal:"
echo "  https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_NAME"
