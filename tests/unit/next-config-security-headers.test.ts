import { test } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '@/next.config.mjs';

test('next config exposes global security headers baseline', async () => {
  assert.equal(typeof nextConfig.headers, 'function');

  const rules = await nextConfig.headers();
  assert.ok(Array.isArray(rules));

  const globalRule = rules.find((rule) => rule.source === '/:path*');
  assert.ok(globalRule, 'expected global header rule for /:path*');

  const headerMap = new Map(globalRule.headers.map((header) => [header.key, header.value]));

  const csp = headerMap.get('Content-Security-Policy');
  assert.ok(csp, 'Content-Security-Policy header is required');
  assert.match(csp, /frame-ancestors 'none'/);

  assert.ok(
    headerMap.get('Strict-Transport-Security'),
    'Strict-Transport-Security header is required'
  );
  assert.ok(headerMap.get('Referrer-Policy'), 'Referrer-Policy header is required');
  assert.ok(headerMap.get('Permissions-Policy'), 'Permissions-Policy header is required');
  assert.equal(headerMap.get('X-Frame-Options'), 'DENY');
});
