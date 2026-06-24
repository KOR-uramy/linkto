/** 영상 설명·프로필에서 스캔하는 제휴/구매 링크 상한 */
export const PARTNER_LINKS_DETECT_MAX = 10;

/** 카드·공개 페이지에 표시하는 제휴/구매 링크 상한 */
export const PARTNER_LINKS_DISPLAY_MAX = 2;

export const PARTNER_LINKS_CARD_HINT = '카드에는 최대 2개만 표시됩니다';

export function getPartnerLinksLimitHint() {
  return `영상 설명·프로필에서 제휴 링크를 최대 ${PARTNER_LINKS_DETECT_MAX}개까지 감지합니다. ${PARTNER_LINKS_CARD_HINT}`;
}

/** 감지 목록에서 카드에 넣을 링크만 남기고 초과분은 거부합니다. */
export function acceptPartnerLinksForCard(links = []) {
  const list = Array.isArray(links) ? links : [];
  const accepted = list.slice(0, PARTNER_LINKS_DISPLAY_MAX);
  return {
    accepted,
    rejectedCount: Math.max(0, list.length - PARTNER_LINKS_DISPLAY_MAX),
    detectedTotal: list.length,
  };
}

export function clampPartnerLinksForDisplay(links = []) {
  return (Array.isArray(links) ? links : []).slice(0, PARTNER_LINKS_DISPLAY_MAX);
}
