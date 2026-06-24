#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AWS_PROFILE="${AWS_PROFILE:-imuramy}"
BUCKET="${S3_BUCKET:-linkto-static-nxnl}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E18PZ7R0X0E7RG}"
APP_URL="${NEXT_PUBLIC_APP_URL:-https://linkto.nxnl.app}"

echo "==> Build static frontend"
NEXT_PUBLIC_APP_URL="$APP_URL" npm run build:static

echo "==> Ensure S3 bucket s3://${BUCKET}"
if ! aws s3api head-bucket --bucket "$BUCKET" --profile "$AWS_PROFILE" 2>/dev/null; then
  aws s3api create-bucket \
    --profile "$AWS_PROFILE" \
    --bucket "$BUCKET" \
    --region ap-northeast-2 \
    --create-bucket-configuration LocationConstraint=ap-northeast-2
fi

echo "==> Upload to s3://${BUCKET}"
aws s3 sync out/ "s3://${BUCKET}/" \
  --delete \
  --profile "$AWS_PROFILE" \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html" \
  --exclude "user/*"

aws s3 sync out/ "s3://${BUCKET}/" \
  --profile "$AWS_PROFILE" \
  --cache-control "public,max-age=0,must-revalidate" \
  --exclude "*" \
  --include "*.html"

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "==> Invalidate CloudFront ${DISTRIBUTION_ID}"
  aws cloudfront create-invalidation \
    --profile "$AWS_PROFILE" \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" >/dev/null
fi

echo "==> Static deploy done"

if [ -x "$(dirname "$0")/cloudfront/update-function.sh" ]; then
  bash "$(dirname "$0")/cloudfront/update-function.sh"
fi
