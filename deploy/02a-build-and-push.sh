#!/usr/bin/env bash
# Builds the backend Docker image and pushes to GitHub Container Registry.
# Run this LOCALLY on a machine that has Docker (your Windows + Git Bash works).
# Network requirement: github.com only. No Azure calls.
#
# Required env vars:
#   GHCR_PAT       GitHub PAT with write:packages and read:packages scopes
# Optional:
#   GH_USER        GitHub username (default: akhiljoe)
#   APP_NAME       Image name component (default: media-recon-backend)
#   IMAGE_TAG      Image tag (default: latest)
set -e

GH_USER="${GH_USER:-akhiljoe}"
APP_NAME="${APP_NAME:-media-recon-backend}"
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
echo "Stage 1: Build image"
echo "Image: $IMAGE"
echo "================================================================"
docker build -t "$IMAGE" "$BACKEND_DIR"

echo ""
echo "================================================================"
echo "Stage 2: Login to GHCR"
echo "================================================================"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin

echo ""
echo "================================================================"
echo "Stage 3: Push image to GHCR"
echo "================================================================"
docker push "$IMAGE"

echo ""
echo "================================================================"
echo "Done. Image is at: $IMAGE"
echo "================================================================"
echo ""
echo "Verify on GitHub:"
echo "  https://github.com/${GH_USER}?tab=packages"
echo ""
echo "Make sure visibility is Private:"
echo "  Click the package -> Package settings -> Change visibility"
echo ""
echo "Next: in Azure Cloud Shell, run bash 02b-deploy-backend.sh"
