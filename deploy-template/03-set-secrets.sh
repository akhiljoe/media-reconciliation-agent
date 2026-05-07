#!/usr/bin/env bash
# Set Container App secrets and env vars.
# Reads SECRET_ENV_KEYS from config.sh.
# Each key: value comes from $key in shell, or from backend/.env if not in shell.
#
# Run twice. First time after 02b with no FRONTEND_URL set (placeholder CORS).
# Then after 04 with FRONTEND_URL exported (real CORS).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

ENV_FILE="$SCRIPT_DIR/$BACKEND_DIR_REL/.env"

# Auto-load missing values from .env
if [ -f "$ENV_FILE" ]; then
  echo "Loading missing values from $ENV_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue

    line="${line%$'\r'}"

    if [[ "$line" == *"="* ]]; then
      key="${line%%=*}"
      key="${key//[[:space:]]/}"
      value="${line#*=}"

      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      if [ -z "${!key+x}" ]; then
        export "$key=$value"
      fi
    fi
  done < "$ENV_FILE"
else
  echo "WARN: $ENV_FILE not found. Secrets must come from shell exports."
fi

# Validate required secret keys are now set
for key in "${SECRET_ENV_KEYS[@]}"; do
  if [ -z "${!key+x}" ] || [ -z "${!key}" ]; then
    echo "ERROR: $key is not set (export it or put in $ENV_FILE)"
    exit 1
  fi
done

# CORS
if [ -z "$FRONTEND_URL" ]; then
  echo "WARN: FRONTEND_URL not set. Using placeholder. Re-run after 04."
  FRONTEND_URL="http://localhost:3000"
fi

# Build the --secrets list and --set-env-vars list
SECRET_ARGS=()
ENV_VAR_ARGS=()

for key in "${SECRET_ENV_KEYS[@]}"; do
  # Convert KEY_NAME to key-name for the secret name
  secret_name=$(echo "$key" | tr '[:upper:]_' '[:lower:]-')
  SECRET_ARGS+=("$secret_name=${!key}")
  ENV_VAR_ARGS+=("$key=secretref:$secret_name")
done

# Add public env vars
for v in "${PUBLIC_ENV_VARS[@]}"; do
  ENV_VAR_ARGS+=("$v")
done

# Add CORS
ENV_VAR_ARGS+=("ALLOWED_ORIGINS=$FRONTEND_URL")

echo ""
echo "Setting Container App secrets"
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --secrets "${SECRET_ARGS[@]}" \
  --output none

echo "Updating env vars"
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --set-env-vars "${ENV_VAR_ARGS[@]}" \
  --output none

echo ""
echo "================================================================"
echo "Done. Container App is restarting."
echo "================================================================"
echo ""
echo "Verify in portal:"
echo "  Container App -> Settings -> Secrets"
echo "  Container App -> Settings -> Containers -> Edit"
