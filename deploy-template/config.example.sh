#!/usr/bin/env bash
# Copy this to config.sh and edit. config.sh is gitignored (add it to your .gitignore).
# Sourced by every other script in this folder.

# ----- Project naming -----
export PROJECT_PREFIX="my-app"        # used for RG, env, app, image, SWA
export RG_NAME="${PROJECT_PREFIX}-rg"
export ENV_NAME="${PROJECT_PREFIX}-env"
export APP_NAME="${PROJECT_PREFIX}-backend"
export SWA_NAME="${PROJECT_PREFIX}-frontend"

# ----- Regions -----
# Backend: any region where Container Apps is available.
export LOCATION="centralindia"

# Frontend: must be one of: westus2, centralus, eastus2, westeurope, eastasia
export SWA_LOCATION="eastasia"

# ----- Container sizing -----
# Defaults are safe for ~1 GiB Python apps with ML deps.
export CPU="0.5"
export MEMORY="1.0Gi"
export MIN_REPLICAS="0"
export MAX_REPLICAS="1"

# ----- Repo paths (relative to the deploy folder) -----
export BACKEND_DIR_REL="../backend"     # contains Dockerfile
export FRONTEND_DIR_REL="../frontend"   # contains package.json
export BACKEND_PORT="5000"

# ----- GHCR settings -----
export GH_USER="your-github-username"
export IMAGE_NAME="${APP_NAME}"
export IMAGE_TAG="latest"
export IMAGE="ghcr.io/${GH_USER}/${IMAGE_NAME}:${IMAGE_TAG}"

# ----- Backend env-var contract -----
# Vars passed via --set-env-vars (non-secret).
# Customize for your app.
export PUBLIC_ENV_VARS=(
  "MAPPING_FOLDER=/app/mapping"
  "UPLOAD_FOLDER=/tmp/uploads"
  "OUTPUT_FOLDER=/tmp/output"
)

# Secret keys expected in the .env file. Each becomes a Container App secret
# named lower-case-with-dashes, then injected as an env var of the original name.
# Example: OPENAI_API_KEY in .env -> secret 'openai-api-key' -> env OPENAI_API_KEY=secretref:openai-api-key
export SECRET_ENV_KEYS=(
  "OPENAI_API_KEY"
  "JWT_SECRET"
  "AUTH_USERS"
)

# ----- Frontend build env vars -----
# The frontend's .env.production gets these lines written by 04-deploy-frontend.sh
# Add anything Vite needs at build time. BACKEND_URL is added automatically.
export FRONTEND_BUILD_VARS=(
  # "VITE_FEATURE_FLAG_X=true"
)
