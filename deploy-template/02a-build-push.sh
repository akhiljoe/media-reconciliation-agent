#!/usr/bin/env bash
# Build the backend image locally, push to GHCR.
# Run this from a machine that has Docker.
#
# Required env: GHCR_PAT
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

: "${GHCR_PAT:?export GHCR_PAT first - GitHub PAT with write:packages scope}"

BACKEND_DIR="$SCRIPT_DIR/$BACKEND_DIR_REL"

if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
  echo "ERROR: Dockerfile not found at $BACKEND_DIR/Dockerfile"
  exit 1
fi

echo "================================================================"
echo "Stage 1: Build image"
echo "  Image: $IMAGE"
echo "================================================================"
docker build -t "$IMAGE" "$BACKEND_DIR"

echo ""
echo "================================================================"
echo "Stage 2: Login to GHCR"
echo "================================================================"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin

echo ""
echo "================================================================"
echo "Stage 3: Push to GHCR"
echo "================================================================"
docker push "$IMAGE"

echo ""
echo "================================================================"
echo "Done. Image at: $IMAGE"
echo "================================================================"
echo ""
echo "Verify visibility on GitHub:"
echo "  https://github.com/${GH_USER}?tab=packages"
echo "  Click the package -> Settings -> Visibility = Private"
echo ""
echo "Next: in Azure Cloud Shell, run bash 02b-deploy-backend.sh"
