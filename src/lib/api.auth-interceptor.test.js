import { afterEach, describe, expect, it, vi } from 'vitest';
import api, {
  clearCsrfToken,
  configureApiAuth,
  setCsrfToken,
} from '@/lib/api';

const makeResponse = (config, status, data = {}) => ({
  data,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  headers: {},
  config,
});

const makeAxiosError = (config, status, data = {}) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.config = config;
  error.response = makeResponse(config, status, data);
  return error;
};

describe('api auth interceptor', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    clearCsrfToken();
    configureApiAuth({
      onAuthFailure: () => {},
      getCsrfToken: () => null,
    });
  });

  it('refreshes once on 401 and retries the original request', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    const onAuthFailure = vi.fn();
    configureApiAuth({
      onAuthFailure,
      getCsrfToken: () => null,
    });

    api.defaults.adapter = async (config) => {
      const path = String(config?.url || '');
      if (path === '/protected-resource') {
        protectedCalls += 1;
        if (protectedCalls === 1) {
          throw makeAxiosError(config, 401, { message: 'expired' });
        }
        return makeResponse(config, 200, { ok: true });
      }
      if (path === '/auth/refresh') {
        refreshCalls += 1;
        return makeResponse(config, 200, { ok: true });
      }
      return makeResponse(config, 200, {});
    };

    const response = await api.get('/protected-resource');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('triggers auth failure callback when refresh fails', async () => {
    let refreshCalls = 0;
    const onAuthFailure = vi.fn();
    configureApiAuth({
      onAuthFailure,
      getCsrfToken: () => null,
    });

    api.defaults.adapter = async (config) => {
      const path = String(config?.url || '');
      if (path === '/protected-resource') {
        throw makeAxiosError(config, 401, { message: 'expired' });
      }
      if (path === '/auth/refresh') {
        refreshCalls += 1;
        throw makeAxiosError(config, 401, { message: 'refresh expired' });
      }
      return makeResponse(config, 200, {});
    };

    await expect(api.get('/protected-resource')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('attaches the in-memory CSRF token on mutating requests', async () => {
    setCsrfToken('csrf-abc');
    let seenHeader;

    api.defaults.adapter = async (config) => {
      seenHeader = config.headers?.['x-csrf-token'];
      return makeResponse(config, 200, { ok: true });
    };

    await api.post('/me/favorites', { track: {} });

    expect(seenHeader).toBe('csrf-abc');
  });

  it('omits the CSRF header after the token is cleared', async () => {
    setCsrfToken('csrf-abc');
    clearCsrfToken();
    let seenHeader = 'unset';

    api.defaults.adapter = async (config) => {
      seenHeader = config.headers?.['x-csrf-token'];
      return makeResponse(config, 200, { ok: true });
    };

    await api.post('/me/favorites', { track: {} });

    expect(seenHeader).toBeUndefined();
  });

  it('does not attach the CSRF header on non-mutating requests', async () => {
    setCsrfToken('csrf-abc');
    let seenHeader = 'unset';

    api.defaults.adapter = async (config) => {
      seenHeader = config.headers?.['x-csrf-token'];
      return makeResponse(config, 200, { ok: true });
    };

    await api.get('/me/favorites');

    expect(seenHeader).toBeUndefined();
  });
});
