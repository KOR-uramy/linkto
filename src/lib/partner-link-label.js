function decodeBasicEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isLegacyPlaceholderLabel(label) {
  const normalized = label?.trim();
  if (!normalized) {
    return false;
  }

  // 예전 자동 생성 CTA 문구 — 실제 fetch/설명 데이터가 있으면 무시
  return [
    '쿠팡에서 보기',
    '쿠팡 스토어프론트',
    '쿠팡',
    '네이버 스마트스토어',
    '구매 링크',
    '링크',
  ].includes(normalized);
}

function isWeakSlugLabel(label, url) {
  if (!label) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const pathSlug = parsed.pathname.split('/').filter(Boolean).pop() || '';
    if (pathSlug && label === pathSlug) {
      return true;
    }
    if (
      parsed.hostname.includes('influencers.coupang.com') &&
      /^[\w@.-]+$/.test(label)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function stripSiteSuffix(title) {
  return title
    .replace(/\s*-\s*쿠팡!$/i, '')
    .replace(/\s*:\s*네이버\s*쇼핑$/i, '')
    .replace(/\s*:\s*네이버\s*스마트스토어$/i, '')
    .trim();
}

/** 실제 페이지/설명에서 가져온 타이틀을 CTA 버튼용 라벨로 정리합니다. */
export function cleanPartnerLinkLabel(title, url) {
  if (!title?.trim()) {
    return '';
  }

  let cleaned = decodeBasicEntities(title.trim());
  cleaned = stripSiteSuffix(cleaned);

  if (!cleaned || isWeakSlugLabel(cleaned, url) || isLegacyPlaceholderLabel(cleaned)) {
    return '';
  }

  return cleaned;
}

export function isWeakPartnerLinkLabel(label, url) {
  return isWeakSlugLabel(label, url);
}

/** 저장·fetch·설명 맥락 중 표시할 최적 라벨을 고릅니다. */
export function resolvePartnerLinkDisplayLabel(storedLabel, url, fetchedLabel = '', contextLabel = '') {
  const candidates = [fetchedLabel, storedLabel, contextLabel]
    .map((label) => cleanPartnerLinkLabel(label, url))
    .filter(Boolean);

  return candidates[0] || '';
}

export function getInitialPartnerLinkLabel(storedLabel, url, contextLabel = '') {
  return resolvePartnerLinkDisplayLabel(storedLabel, url, '', contextLabel);
}

/** fetch 실패 시 표시할 URL 주소 */
export function getPartnerLinkUrlFallback(url) {
  return url?.trim() || '';
}
