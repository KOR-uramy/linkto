const RESERVED_SEGMENTS = new Set(['admin', 'manage', 'user', 'api', '_next']);

export function getUserIdFromPathname(pathname = '') {
  const segment = pathname.split('/').filter(Boolean)[0] || '';
  if (!segment || RESERVED_SEGMENTS.has(segment)) {
    return '';
  }
  return segment;
}
