import { updateStoredUser } from './auth/google-sign-in';
import { getPublicAppUrl } from '../config/app';
import { getPublicPath, getPublicUrl } from './public-url';

export function isAuthExpiredStatus(status) {
  return status === 401 || status === 403;
}

/** API 응답 slug와 localStorage user.slug 중 유효한 값을 하나로 합칩니다. */
export function resolveEffectiveSlug(fetchedSlug, user) {
  return (fetchedSlug || user?.slug || '').trim();
}

export function seedSlugFromUser(user) {
  return (user?.slug || '').trim();
}

/** 서버 slug를 state·localStorage에 반영하고 정규화된 slug를 반환합니다. */
export function syncUserSlug(slug, user) {
  const nextSlug = resolveEffectiveSlug(slug, user);
  if (nextSlug) {
    updateStoredUser({ slug: nextSlug });
  }
  return nextSlug;
}

/** slug + user → 공개 경로·URL (홈·관리 페이지 공통) */
export function getPublicLinkInfo(fetchedSlug, user) {
  const effectiveSlug = resolveEffectiveSlug(fetchedSlug, user);
  const baseUrl = getPublicAppUrl();
  return {
    effectiveSlug,
    publicPath: getPublicPath(effectiveSlug),
    publicUrl: getPublicUrl(effectiveSlug, baseUrl),
  };
}
