export function getPublicPath(slug) {
  return slug ? `/${slug}` : '/';
}

export function getPublicUrl(slug, baseUrl) {
  const origin = (baseUrl || '').replace(/\/$/, '');
  return `${origin}${getPublicPath(slug)}`;
}
