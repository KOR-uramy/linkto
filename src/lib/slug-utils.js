import { RESERVED_SLUGS, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '../config/slug.js';

const SLUG_PATTERN = /^[a-z0-9_]+$/;

export function normalizeSlugInput(input = '') {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

export function getSlugValidationError(slug) {
  if (!slug) {
    return '주소를 입력해 주세요.';
  }
  if (slug.length < SLUG_MIN_LENGTH) {
    return `주소는 ${SLUG_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return `주소는 ${SLUG_MAX_LENGTH}자 이하여야 합니다.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return '영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.';
  }
  if (RESERVED_SLUGS.has(slug)) {
    return '사용할 수 없는 주소입니다.';
  }
  return null;
}

export const SLUG_TAKEN_MESSAGE = '이미 사용 중인 주소입니다. 다른 주소를 입력해 주세요.';
