import { cleanPartnerLinkLabel, getPartnerLinkFallbackLabel } from './partner-link-label.js';

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

function extractRawTitle(html) {
  return (
    html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)?.[1] ||
    html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i)?.[1] ||
    html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ||
    ''
  );
}

/** 제휴 URL의 브라우저 탭 타이틀을 가져옵니다. */
export async function fetchPartnerLinkTitle(url) {
  if (!url) {
    return getPartnerLinkFallbackLabel(url);
  }

  try {
    const response = await fetch(url, {
      headers: buildFetchHeaders(url),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();
      const rawTitle = extractRawTitle(html);
      if (rawTitle) {
        return cleanPartnerLinkLabel(rawTitle, url);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch partner link title for ${url}:`, error);
  }

  return getPartnerLinkFallbackLabel(url);
}
