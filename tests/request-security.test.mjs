import assert from 'node:assert/strict';
import {
  API_RESPONSE_HEADERS,
  RequestSecurityError,
  assertSameOriginRequest,
} from '../functions/_shared/request-security.js';

function request(headers = {}) {
  return new Request('https://omoi-no-hougaku.pages.dev/api/resolve-location', {
    method: 'POST',
    headers,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof RequestSecurityError);
    assert.equal(error.code, code);
    assert.equal(error.status, 403);
    return true;
  });
}

assert.doesNotThrow(() =>
  assertSameOriginRequest(
    request({
      origin: 'https://omoi-no-hougaku.pages.dev',
      'sec-fetch-site': 'same-origin',
    })
  )
);

assert.doesNotThrow(() =>
  assertSameOriginRequest(
    request({
      origin: 'https://omoi-no-hougaku.pages.dev',
    })
  )
);

expectCode(() => assertSameOriginRequest(request()), 'ORIGIN_REQUIRED');

expectCode(
  () =>
    assertSameOriginRequest(
      request({
        origin: 'https://example.com',
        'sec-fetch-site': 'cross-site',
      })
    ),
  'CROSS_ORIGIN_NOT_ALLOWED'
);

expectCode(
  () =>
    assertSameOriginRequest(
      request({
        origin: 'not-a-url',
      })
    ),
  'INVALID_ORIGIN'
);

expectCode(
  () =>
    assertSameOriginRequest(
      request({
        origin: 'https://omoi-no-hougaku.pages.dev',
        'sec-fetch-site': 'cross-site',
      })
    ),
  'CROSS_SITE_NOT_ALLOWED'
);

assert.equal(API_RESPONSE_HEADERS['cache-control'], 'no-store');
assert.equal(API_RESPONSE_HEADERS['cross-origin-resource-policy'], 'same-origin');
assert.equal(API_RESPONSE_HEADERS.vary, 'Origin, Sec-Fetch-Site');

console.log('request security tests: OK');
