#!/usr/bin/env bash
# Delete the resource group and everything inside it.
# Stops every billing clock. Irreversible.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "About to delete resource group: $RG_NAME"
echo "This deletes EVERY resource inside it. Irreversible."
echo ""
read -p "Type the resource group name to confirm: " CONFIRM

if [ "$CONFIRM" != "$RG_NAME" ]; then
  echo "Aborted. No changes made."
  exit 0
fi

echo "Deleting (returns immediately, deletion runs in background)"
az group delete --name "$RG_NAME" --yes --no-wait

echo ""
echo "Started. Check progress in portal:"
echo "  Resource groups -> $RG_NAME"
echo "  Group disappears in 2 to 5 minutes."
echo ""
echo "Bonus cleanup (optional):"
echo "  - Delete the GHCR package: github.com/${GH_USER}?tab=packages"
echo "  - Revoke the GitHub PAT: github.com/settings/tokens"
