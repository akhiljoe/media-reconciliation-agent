#!/usr/bin/env bash
# Creates the Azure resource group that holds every other resource.
# Cost: free.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"
LOCATION="${LOCATION:-centralindia}"

echo "Creating resource group: $RG_NAME in $LOCATION"

az group create \
  --name "$RG_NAME" \
  --location "$LOCATION" \
  --output table

echo ""
echo "Done."
echo ""
echo "Verify in portal:"
echo "  Resource groups -> $RG_NAME"
echo "  https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Resources%2Fsubscriptions%2FresourceGroups"
