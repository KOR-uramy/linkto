#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AWS_PROFILE="${AWS_PROFILE:-imuramy}"
FUNC_NAME="${CLOUDFRONT_FUNCTION_NAME:-linkto-user-fallback}"
FUNC_FILE="${ROOT}/deploy/cloudfront/user-fallback-function.js"

echo "==> Update CloudFront function ${FUNC_NAME}"
ETAG=$(aws cloudfront describe-function \
  --profile "$AWS_PROFILE" \
  --name "$FUNC_NAME" \
  --query ETag \
  --output text)

NEW_ETAG=$(aws cloudfront update-function \
  --profile "$AWS_PROFILE" \
  --name "$FUNC_NAME" \
  --if-match "$ETAG" \
  --function-config "Comment=LinkTo static path rewrite,Runtime=cloudfront-js-2.0" \
  --function-code "fileb://${FUNC_FILE}" \
  --query ETag \
  --output text)

aws cloudfront publish-function \
  --profile "$AWS_PROFILE" \
  --name "$FUNC_NAME" \
  --if-match "$NEW_ETAG" >/dev/null

echo "==> Published ${FUNC_NAME}"

DIST_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E18PZ7R0X0E7RG}"
if [ -n "$DIST_ID" ]; then
  echo "==> Invalidate CloudFront ${DIST_ID}"
  aws cloudfront create-invalidation \
    --profile "$AWS_PROFILE" \
    --distribution-id "$DIST_ID" \
    --paths "/manage" "/manage/*" "/admin" "/admin/*" >/dev/null
fi

echo "==> CloudFront function deploy done"
