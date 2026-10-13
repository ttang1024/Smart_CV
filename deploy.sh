#!/usr/bin/env bash
# Build the container locally, push it to ECR and deploy the CloudFormation stack.
#
#   ./deploy.sh [tag]             first deploy or full deploy (creates the ECR repo if needed)
#   ./deploy.sh --app-only [tag]  redeploy a new image to an existing stack
set -euo pipefail

APP_ONLY=false
if [[ "${1:-}" == "--app-only" ]]; then
  APP_ONLY=true
  shift
fi

REGION="${AWS_REGION:-ap-southeast-2}"
APP_NAME="smart-cv-app"
STACK_NAME="${APP_NAME}-stack"
DEFAULT_IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%Y%m%d%H%M%S)"
IMAGE_TAG="${1:-$DEFAULT_IMAGE_TAG}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required: this script builds the image locally before pushing to ECR."
  exit 1
fi

if [[ "$APP_ONLY" == true ]] && ! aws cloudformation describe-stacks \
     --stack-name "$STACK_NAME" --region "$REGION" --output none 2>/dev/null; then
  echo "Stack '$STACK_NAME' does not exist. Run ./deploy.sh without --app-only first."
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$REGION")
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"

if [[ "$APP_ONLY" == false ]] && ! aws ecr describe-repositories \
     --repository-names "$APP_NAME" --region "$REGION" --output none 2>/dev/null; then
  echo "Creating ECR repository '${APP_NAME}'..."
  aws ecr create-repository \
    --repository-name "$APP_NAME" \
    --region "$REGION" \
    --image-scanning-configuration scanOnPush=true \
    --output none
fi

echo "Logging in to ${ECR_REGISTRY}..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Building ${IMAGE} for ${DOCKER_PLATFORM}..."
docker build --platform "$DOCKER_PLATFORM" --tag "$IMAGE" .

echo "Pushing ${IMAGE}..."
docker push "$IMAGE"

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
