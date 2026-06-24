function decodeBasicEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function normalizeTitle(raw) {
  if (!raw?.trim()) {
    return '';
  }
  return decodeBasicEntities(raw.trim());
}

function extractMetaContent(html, attr, value) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*${attr}=["']${value}["'][^>]*content=["'](.*?)["']`,
    'i'
  );
  const reversePattern = new RegExp(
    `<meta\\s+[^>]*content=["'](.*?)["'][^>]*${attr}=["']${value}["']`,
    'i'
  );
  return normalizeTitle(html.match(pattern)?.[1] || html.match(reversePattern)?.[1] || '');
}

function extractTitleTag(html) {
  return normalizeTitle(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function extractJsonLdTitles(html) {
  const titles = [];
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const [, rawJson] of scripts) {
    try {
      const data = JSON.parse(rawJson.trim());
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const name = normalizeTitle(node?.name || node?.headline || node?.title);
        if (name) {
          titles.push(name);
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  return titles;
}

/** Coupang 스토어프론트 RSC 페이로드에 포함된 profile.title */
export function extractStorefrontProfileTitle(html) {
  const patterns = [
    /"profile"\s*:\s*\{[^}]*"title"\s*:\s*"([^"]+)"/,
    /\\"profile\\":\{[^}]*\\"title\\":\\"([^\\"]+)\\"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return normalizeTitle(match[1]);
    }
  }

  return '';
}

/** HTML에서 og/twitter/title/JSON-LD 기반 페이지 타이틀 후보를 수집합니다. */
export function extractPageTitleCandidates(html) {
  const candidates = [
    extractMetaContent(html, 'property', 'og:title'),
    extractMetaContent(html, 'name', 'twitter:title'),
    extractTitleTag(html),
    ...extractJsonLdTitles(html),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

/** URL 종류에 맞게 HTML에서 가장 적합한 페이지 타이틀을 반환합니다. */
export function extractPageTitleFromHtml(html, url = '') {
  if (/influencers\.coupang\.com/i.test(url)) {
    const profileTitle = extractStorefrontProfileTitle(html);
    if (profileTitle) {
      return profileTitle;
    }
  }

  const [first] = extractPageTitleCandidates(html);
  return first || '';
}
