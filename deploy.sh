#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="smart-cv-rg"
APP_NAME="smart-cv-app"
ACR_NAME=$(echo "${APP_NAME}acr" | tr -d '-')   # "smartcvappacr"
IMAGE_TAG="${1:-latest}"

# Step 1 — Deploy / update infrastructure (ACR + App Service Plan + Web App)
echo "Deploying infrastructure..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file azure/main.bicep \
  --parameters appName="$APP_NAME" imageTag="$IMAGE_TAG"

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer -o tsv)

# Step 2 — Build and push Docker image using ACR Tasks (no local Docker required)
echo "Building and pushing image to ${ACR_LOGIN_SERVER}..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${APP_NAME}:${IMAGE_TAG}" \
  .

# Step 3 — Restart the web app to pull the new image
echo "Restarting app..."
az webapp restart \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

echo "Done. https://$(az webapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --query defaultHostName -o tsv)"
