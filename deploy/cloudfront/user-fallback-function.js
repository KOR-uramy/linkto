function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.indexOf('.') !== -1) {
    return request;
  }

  if (
    uri === '/' ||
    uri.indexOf('/admin') === 0 ||
    uri.indexOf('/manage') === 0 ||
    uri.indexOf('/user') === 0 ||
    uri.indexOf('/api') === 0 ||
    uri.indexOf('/_next') === 0
  ) {
    return request;
  }

  if (/^\/[^\/]+\/?$/.test(uri)) {
    request.uri = '/user/index.html';
  }

  return request;
}
