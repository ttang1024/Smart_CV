#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="smart-cv-rg"
APP_NAME="smart-cv-app"
ACR_NAME="smartcvappacr"
IMAGE_TAG="${1:-latest}"

echo "Building and pushing image..."
az acr build --registry "$ACR_NAME" --image "${APP_NAME}:${IMAGE_TAG}" .

echo "Restarting app..."
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo "Done. https://$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query defaultHostName -o tsv)"
