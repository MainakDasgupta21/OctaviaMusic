/* global describe, it, expect */
const { buildAuthCookieOptions, resolveSameSite } = require('./auth');

describe('auth cookie SameSite resolution', () => {
  it('uses SameSite=None when cookies are secure (cross-site production)', () => {
    expect(resolveSameSite({ cookieSecure: true })).toBe('none');
    const options = buildAuthCookieOptions({
      cookieSecure: true,
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '30d',
    });
    expect(options.access.sameSite).toBe('none');
    expect(options.access.secure).toBe(true);
    expect(options.refresh.sameSite).toBe('none');
    expect(options.csrf.sameSite).toBe('none');
  });

  it('falls back to Lax for insecure local dev', () => {
    expect(resolveSameSite({ cookieSecure: false })).toBe('lax');
    const options = buildAuthCookieOptions({
      cookieSecure: false,
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '30d',
    });
    expect(options.access.sameSite).toBe('lax');
  });

  it('honours an explicit COOKIE_SAMESITE override when valid', () => {
    expect(resolveSameSite({ cookieSecure: true, cookieSameSite: 'strict' })).toBe('strict');
    expect(resolveSameSite({ cookieSecure: true, cookieSameSite: 'LAX' })).toBe('lax');
  });

  it('never emits SameSite=None without Secure (browsers reject it)', () => {
    expect(resolveSameSite({ cookieSecure: false, cookieSameSite: 'none' })).toBe('lax');
  });
});
