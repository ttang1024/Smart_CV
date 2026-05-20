#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
APP_NAME="smart-cv-app"
STACK_NAME="${APP_NAME}-stack"
DEFAULT_IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%Y%m%d%H%M%S)"
IMAGE_TAG="${1:-$DEFAULT_IMAGE_TAG}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

# Step 1 — Resolve ECR registry endpoint.
echo "Fetching AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$REGION")
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"

# Step 2 — Ensure ECR repository exists.
if ! aws ecr describe-repositories \
     --repository-names "$APP_NAME" \
     --region "$REGION" \
     --output text 2>/dev/null 1>/dev/null; then
  echo "Creating ECR repository '${APP_NAME}'..."
  aws ecr create-repository \
    --repository-name "$APP_NAME" \
    --region "$REGION" \
    --image-scanning-configuration scanOnPush=true \
    --output text 1>/dev/null
fi

# Step 3 — Build locally and push to ECR.
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for deployment because this script builds locally before pushing to ECR."
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

# Step 4 — Deploy / update CloudFormation stack.
echo "Deploying CloudFormation stack '${STACK_NAME}'..."
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
