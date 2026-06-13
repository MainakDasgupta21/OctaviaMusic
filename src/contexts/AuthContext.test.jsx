import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const {
  apiPatch,
  clearCsrfToken,
  configureApiAuth,
  getCurrentUser,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
} = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  clearCsrfToken: vi.fn(),
  configureApiAuth: vi.fn(),
  getCurrentUser: vi.fn(),
  loginAccount: vi.fn(),
  logoutSession: vi.fn(),
  refreshSession: vi.fn(),
  registerAccount: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  __esModule: true,
  default: { patch: apiPatch },
  clearCsrfToken,
  configureApiAuth,
  getCurrentUser,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
}));

const createWrapper = (queryClient) =>
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

describe('AuthContext bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('hydrates authenticated user from /auth/me', async () => {
    const queryClient = new QueryClient();
    getCurrentUser.mockResolvedValueOnce({
      user: { id: 'u-1', email: 'user@example.com', role: 'user' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user?.email).toBe('user@example.com');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('falls back to /auth/refresh once after initial 401', async () => {
    const queryClient = new QueryClient();
    getCurrentUser
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({
        user: { id: 'u-2', email: 'refresh@example.com', role: 'user' },
      });
    refreshSession.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(result.current.user?.email).toBe('refresh@example.com');
  });

  it('enters guest mode when /auth/me and /auth/refresh both fail', async () => {
    const queryClient = new QueryClient();
    getCurrentUser.mockRejectedValueOnce({ response: { status: 401 } });
    refreshSession.mockRejectedValueOnce(new Error('refresh failed'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(result.current.user).toBeNull();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('clears per-user cache and legacy storage on logout', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    getCurrentUser.mockResolvedValueOnce({
      user: { id: 'u-3', email: 'logout@example.com', role: 'user' },
    });
    logoutSession.mockResolvedValueOnce({ ok: true });

    window.localStorage.setItem('octavia.favorites.v1', '{"track-1":true}');
    queryClient.setQueryData(['me', 'favorites', 'u-3'], { track: true });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(queryClient.getQueryData(['me', 'favorites', 'u-3'])).toBeUndefined();
    expect(window.localStorage.getItem('octavia.favorites.v1')).toBeNull();
    expect(clearCsrfToken).toHaveBeenCalled();
  });
});
