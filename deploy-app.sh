#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
APP_NAME="smart-cv-app"
STACK_NAME="${APP_NAME}-stack"
DEFAULT_IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%Y%m%d%H%M%S)"
IMAGE_TAG="${1:-$DEFAULT_IMAGE_TAG}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if ! aws cloudformation describe-stacks \
     --stack-name "$STACK_NAME" \
     --region "$REGION" \
     --output none 2>/dev/null; then
  echo "Stack '$STACK_NAME' does not exist. Run ./deploy.sh first to create infrastructure."
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$REGION")
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for deployment."
  exit 1
fi

echo "Logging in to ${ECR_REGISTRY}..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Building ${IMAGE} for ${DOCKER_PLATFORM}..."
docker build \
  --platform "$DOCKER_PLATFORM" \
  --tag "$IMAGE" \
  .

echo "Pushing ${IMAGE}..."
docker push "$IMAGE"

echo "Updating App Runner service with new image..."
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file aws/cloudformation.yml \
  --parameter-overrides \
      AppName="$APP_NAME" \
      ImageTag="$IMAGE_TAG" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

SERVICE_URL=$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ServiceUrl'].OutputValue" \
  --output text)

echo "Done. ${SERVICE_URL}"
