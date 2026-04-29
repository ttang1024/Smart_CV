#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="smart-cv-rg"
APP_NAME="smart-cv-app"
ACR_NAME="smartcvappacr"
IMAGE_TAG="${1:-latest}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if ! az group show --name "$RESOURCE_GROUP" --output none 2>/dev/null; then
  echo "Resource group '$RESOURCE_GROUP' does not exist. Run ./deploy.sh first to create infrastructure."
  exit 1
fi

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer -o tsv)

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

echo "Updating Container App image..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE" \
  --output none

echo "Done. https://$(az containerapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query properties.configuration.ingress.fqdn -o tsv)"
