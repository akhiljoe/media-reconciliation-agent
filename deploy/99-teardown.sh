#!/usr/bin/env bash
# Deletes the entire resource group and everything inside it.
# Stops all charges. Irreversible.
set -e

RG_NAME="${RG_NAME:-media-recon-rg}"

echo "About to delete resource group: $RG_NAME"
echo "This deletes EVERY resource inside it. This is irreversible."
echo ""
read -p "Type the resource group name to confirm: " CONFIRM

if [ "$CONFIRM" != "$RG_NAME" ]; then
  echo "Aborted. No changes made."
  exit 0
fi

echo ""
echo "Deleting (this returns immediately, deletion runs in background)"
az group delete --name "$RG_NAME" --yes --no-wait

echo ""
echo "Started. Check progress in portal:"
echo "  Resource groups -> $RG_NAME"
echo "  The group should disappear in 2 to 5 minutes."
