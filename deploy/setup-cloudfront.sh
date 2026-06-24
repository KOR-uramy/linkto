#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-imuramy}"
BUCKET="${S3_BUCKET:-linkto-static-nxnl}"
DOMAIN="${DOMAIN:-linkto.nxnl.app}"
EC2_ORIGIN="${EC2_ORIGIN:-13.125.241.128}"
ZONE_ID="${ROUTE53_ZONE_ID:-Z06535861JD06TB27ZCN5}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Create S3 bucket s3://${BUCKET}"
if ! aws s3api head-bucket --bucket "$BUCKET" --profile "$AWS_PROFILE" 2>/dev/null; then
  aws s3api create-bucket \
    --profile "$AWS_PROFILE" \
    --bucket "$BUCKET" \
    --region ap-northeast-2 \
    --create-bucket-configuration LocationConstraint=ap-northeast-2
fi

aws s3api put-public-access-block \
  --profile "$AWS_PROFILE" \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

CALLER_REF="linkto-$(date +%s)"
OAI_COMMENT="linkto-oai"

echo "==> Create CloudFront Origin Access Control"
OAC_ID=$(aws cloudfront list-origin-access-controls --profile "$AWS_PROFILE" \
  --query "OriginAccessControlList.Items[?Name=='linkto-static-oac'].Id" --output text)

if [ -z "$OAC_ID" ] || [ "$OAC_ID" = "None" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --profile "$AWS_PROFILE" \
    --origin-access-control-config "{
      \"Name\": \"linkto-static-oac\",
      \"Description\": \"LinkTo static S3\",
      \"SigningProtocol\": \"sigv4\",
      \"SigningBehavior\": \"always\",
      \"OriginAccessControlOriginType\": \"s3\"
    }" --query OriginAccessControl.Id --output text)
fi

FUNC_NAME="linkto-user-fallback"
FUNC_ARN=$(aws cloudfront list-functions --profile "$AWS_PROFILE" \
  --query "FunctionList.Items[?Name=='${FUNC_NAME}'].FunctionMetadata.FunctionARN" --output text 2>/dev/null || true)

if [ -z "$FUNC_ARN" ] || [ "$FUNC_ARN" = "None" ]; then
  ETAG=$(aws cloudfront create-function \
    --profile "$AWS_PROFILE" \
    --name "$FUNC_NAME" \
    --function-config Comment="LinkTo user fallback",Runtime="cloudfront-js-2.0" \
    --function-code "fileb://${ROOT}/deploy/cloudfront/user-fallback-function.js" \
    --query ETag --output text)
  FUNC_ARN=$(aws cloudfront describe-function --profile "$AWS_PROFILE" --name "$FUNC_NAME" --query FunctionSummary.FunctionMetadata.FunctionARN --output text)
  aws cloudfront publish-function --profile "$AWS_PROFILE" --name "$FUNC_NAME" --if-match "$ETAG" >/dev/null
fi

DIST_ID=$(aws cloudfront list-distributions --profile "$AWS_PROFILE" \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '${DOMAIN}')].Id" --output text)

if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
  echo "CloudFront distribution already exists: ${DIST_ID}"
  echo "export CLOUDFRONT_DISTRIBUTION_ID=${DIST_ID}"
  exit 0
fi

echo "==> Create CloudFront distribution (manual step recommended for first time)"
cat <<EOF
Run AWS Console or extend this script with create-distribution JSON.

Origins:
  1. S3 ${BUCKET} (OAC ${OAC_ID})
  2. Custom ${EC2_ORIGIN} (HTTP only, port 80)

Behaviors:
  - /api/* → EC2 origin
  - Default → S3 origin
  - Viewer request function: ${FUNC_ARN}

Alias: ${DOMAIN}
Certificate: ACM in us-east-1 for ${DOMAIN}

Route53 ${ZONE_ID}: ${DOMAIN} A/AAAA alias → CloudFront
EOF
