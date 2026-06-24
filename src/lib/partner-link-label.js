function decodeBasicEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function getPartnerLinkFallbackLabel(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('influencers.coupang.com')) {
      return '쿠팡 스토어프론트';
    }
    if (hostname.includes('link.coupang.com')) {
      return '쿠팡에서 보기';
    }
    if (hostname.includes('coupang.com')) {
      return '쿠팡';
    }
    if (hostname.includes('smartstore.naver.com') || hostname.includes('brand.naver.com')) {
      return '네이버 스마트스토어';
    }
    return hostname.replace(/^www\./i, '');
  } catch {
    return '구매 링크';
  }
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

/** HTML title·og:title 등을 CTA 버튼용 짧은 라벨로 정리합니다. */
export function cleanPartnerLinkLabel(title, url) {
  const fallback = getPartnerLinkFallbackLabel(url);
  if (!title?.trim()) {
    return fallback;
  }

  let cleaned = decodeBasicEntities(title.trim());

  const pipeMatch = cleaned.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipeMatch) {
    const prefix = pipeMatch[1].trim();
    const suffix = pipeMatch[2].trim();
    // "ddubi_home_ | 쿠팡 스토어프론트" → 뒷부분(사이트/매장명) 사용
    if (/^[\w@.-]+$/.test(prefix) && suffix) {
      cleaned = suffix;
    } else {
      cleaned = prefix;
    }
  }

  cleaned = cleaned
    .replace(/\s*-\s*쿠팡!$/i, '')
    .replace(/\s*:\s*네이버\s*쇼핑$/i, '')
    .replace(/\s*:\s*네이버\s*스마트스토어$/i, '')
    .trim();

  if (!cleaned || isWeakSlugLabel(cleaned, url)) {
    return fallback;
  }

  return cleaned;
}

export function isWeakPartnerLinkLabel(label, url) {
  return isWeakSlugLabel(label, url);
}

export function getInitialPartnerLinkLabel(storedLabel, url) {
  const fallback = getPartnerLinkFallbackLabel(url);
  const cleaned = cleanPartnerLinkLabel(storedLabel || '', url);

  if (cleaned && cleaned !== fallback && !isWeakSlugLabel(cleaned, url)) {
    return cleaned;
  }

  return fallback;
}

export function resolvePartnerLinkDisplayLabel(storedLabel, url) {
  return getInitialPartnerLinkLabel(storedLabel, url);
}
