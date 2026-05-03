#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="smart-cv-rg"
LOCATION="${AZURE_LOCATION:-eastus}"
APP_NAME="smart-cv-app"
ACR_NAME=$(echo "${APP_NAME}acr" | tr -d '-')   # "smartcvappacr"
DEFAULT_IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%Y%m%d%H%M%S)"
IMAGE_TAG="${1:-$DEFAULT_IMAGE_TAG}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

# Step 1 — Ensure the resource group and registry exist.
echo "Preparing Azure resources..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --output none 2>/dev/null; then
  az acr create \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Basic \
    --admin-enabled true \
    --output none
fi

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer -o tsv)

# Step 2 — Build locally and push to ACR. This avoids ACR Tasks, which can be
# blocked on Azure Free subscriptions.
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for deployment because this script builds locally before pushing to ACR."
  exit 1
fi

IMAGE="${ACR_LOGIN_SERVER}/${APP_NAME}:${IMAGE_TAG}"

echo "Logging in to ${ACR_LOGIN_SERVER}..."
az acr login --name "$ACR_NAME"

echo "Building ${IMAGE} for ${DOCKER_PLATFORM}..."
docker build \
  --platform "$DOCKER_PLATFORM" \
  --tag "$IMAGE" \
  .

echo "Pushing ${IMAGE}..."
docker push "$IMAGE"

# Step 3 — Deploy / update Container Apps infrastructure and point it at the new image.
echo "Deploying Container App..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file azure/main.bicep \
  --parameters location="$LOCATION" appName="$APP_NAME" imageTag="$IMAGE_TAG"

echo "Done. https://$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --query properties.configuration.ingress.fqdn -o tsv)"
