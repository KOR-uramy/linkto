import { extractPageTitleFromHtml } from './extract-page-title.js';
import { cleanPartnerLinkLabel, getPartnerLinkUrlFallback } from './partner-link-label.js';

function buildFetchHeaders(url) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'upgrade-insecure-requests': '1',
  };

  if (/coupang\.com/i.test(url)) {
    headers.Referer = 'https://www.coupang.com/';
    headers['sec-fetch-site'] = 'cross-site';
  }

  return headers;
}

/** 제휴 URL의 실제 페이지 타이틀을 가져옵니다. 실패 시 URL 주소를 반환합니다. */
export async function fetchPartnerLinkTitle(url, contextLabel = '') {
  if (!url) {
    return '';
  }

  try {
    const response = await fetch(url, {
      headers: buildFetchHeaders(url),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();
      const finalUrl = response.url || url;
      const rawTitle = extractPageTitleFromHtml(html, finalUrl);
      const cleaned = cleanPartnerLinkLabel(rawTitle, url);
      if (cleaned) {
        return cleaned;
      }
    } else {
      console.warn(`Partner link fetch returned ${response.status} for ${url}`);
    }
  } catch (error) {
    console.error(`Failed to fetch partner link title for ${url}:`, error);
  }

  const context = cleanPartnerLinkLabel(contextLabel, url);
  return context || getPartnerLinkUrlFallback(url);
}

/** metadata 감지용 — URL + 설명 맥락 라벨 */
export async function fetchPartnerLinkTitleWithContext(entry) {
  const url = typeof entry === 'string' ? entry : entry?.url;
  const contextLabel = typeof entry === 'string' ? '' : entry?.contextLabel || '';
  const title = await fetchPartnerLinkTitle(url, contextLabel);
  return { url, label: title || getPartnerLinkUrlFallback(url) };
}
