import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModuleFromRoot } from '../_helpers/load-module';

type HeaderEntry = {
  key: string;
  value: string;
};

type HeaderRule = {
  source: string;
  headers: HeaderEntry[];
};

type NextConfigWithHeaders = {
  headers?: () => Promise<HeaderRule[]>;
};

test('next config exposes global security headers baseline', async () => {
  const nextConfig = await loadModuleFromRoot<NextConfigWithHeaders>('next.config.mjs');

  assert.equal(typeof nextConfig.headers, 'function');
  if (!nextConfig.headers) {
    throw new Error('expected next config headers() function');
  }

  const rules = await nextConfig.headers();
  assert.ok(Array.isArray(rules));

  const globalRule = rules.find((rule) => rule.source === '/:path*');
  assert.ok(globalRule, 'expected global header rule for /:path*');

  const headerMap = new Map(globalRule.headers.map((header: HeaderEntry) => [header.key, header.value]));

  const csp = headerMap.get('Content-Security-Policy');
  assert.equal(typeof csp, 'string', 'Content-Security-Policy header is required');
  if (typeof csp !== 'string') {
    throw new Error('Content-Security-Policy header is required');
  }
  assert.match(csp, /frame-ancestors 'none'/);

  assert.ok(
    headerMap.get('Strict-Transport-Security'),
    'Strict-Transport-Security header is required'
  );
  assert.ok(headerMap.get('Referrer-Policy'), 'Referrer-Policy header is required');
  assert.ok(headerMap.get('Permissions-Policy'), 'Permissions-Policy header is required');
  assert.equal(headerMap.get('X-Frame-Options'), 'DENY');
});
