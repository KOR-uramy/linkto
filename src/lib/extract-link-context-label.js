const URL_IN_LINE = /(https?:\/\/[^\s"'<>]+)/;

/** 영상 설명·프로필 한 줄에서 URL 주변 텍스트를 CTA 라벨 후보로 추출합니다. */
export function extractLinkContextLabel(line, url) {
  if (!line?.trim() || !url) {
    return '';
  }

  const withoutUrl = line.replace(URL_IN_LINE, ' ').trim();
  const cleaned = withoutUrl
    .replace(/^[👉🔗➡️→▶️\s:：\-–—|]+/u, '')
    .replace(/[👉🔗➡️→▶️\s:：\-–—|]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length > 80) {
    return '';
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return '';
  }

  return cleaned;
}
