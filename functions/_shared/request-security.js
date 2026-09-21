export class RequestSecurityError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = 'RequestSecurityError';
    this.code = code;
    this.status = status;
  }
}

export const API_RESPONSE_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-origin',
  vary: 'Origin, Sec-Fetch-Site',
});

export function assertSameOriginRequest(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');

  if (!origin) {
    throw new RequestSecurityError(
      'ORIGIN_REQUIRED',
      'このAPIは同一サイトからのブラウザ要求のみ利用できます'
    );
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch {
    throw new RequestSecurityError(
      'INVALID_ORIGIN',
      'Originヘッダーを確認できません'
    );
  }

  if (parsedOrigin !== requestOrigin) {
    throw new RequestSecurityError(
      'CROSS_ORIGIN_NOT_ALLOWED',
      'このAPIは同一サイトからのみ利用できます'
    );
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new RequestSecurityError(
      'CROSS_SITE_NOT_ALLOWED',
      'cross-site要求は利用できません'
    );
  }
}
