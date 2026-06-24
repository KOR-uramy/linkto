function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.indexOf('.') !== -1) {
    return request;
  }

  // S3 정적 호스팅: 디렉터리 경로는 index.html 로 명시 rewrite
  if (uri === '/manage' || uri === '/manage/') {
    request.uri = '/manage/index.html';
    return request;
  }
  if (uri === '/admin' || uri === '/admin/') {
    request.uri = '/admin/index.html';
    return request;
  }
  if (uri === '/user' || uri === '/user/') {
    request.uri = '/user/index.html';
    return request;
  }

  if (uri === '/' || uri.indexOf('/api') === 0 || uri.indexOf('/_next') === 0) {
    return request;
  }

  // /{slug} 공개 페이지
  if (/^\/[^\/]+\/?$/.test(uri)) {
    request.uri = '/user/index.html';
  }

  return request;
}
