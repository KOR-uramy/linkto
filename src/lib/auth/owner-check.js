import { normalizeSlugInput } from '../slug-utils.js';

export function slugsMatch(a, b) {
  if (!a || !b) {
    return false;
  }
  return normalizeSlugInput(a) === normalizeSlugInput(b);
}

export function isOwnerOfHandle(viewer, handle) {
  if (!viewer?.sub || !handle) {
    return false;
  }
  return slugsMatch(viewer.slug, handle);
}
