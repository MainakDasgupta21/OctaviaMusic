import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const {
  apiPatch,
  configureApiAuth,
  getCurrentUser,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
} = vi.hoisted(() => ({
  apiPatch: vi.fn(),
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
  configureApiAuth,
  getCurrentUser,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates authenticated user from /auth/me', async () => {
    getCurrentUser.mockResolvedValueOnce({
      user: { id: 'u-1', email: 'user@example.com', role: 'user' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user?.email).toBe('user@example.com');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('falls back to /auth/refresh once after initial 401', async () => {
    getCurrentUser
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({
        user: { id: 'u-2', email: 'refresh@example.com', role: 'user' },
      });
    refreshSession.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(result.current.user?.email).toBe('refresh@example.com');
  });

  it('enters guest mode when /auth/me and /auth/refresh both fail', async () => {
    getCurrentUser.mockRejectedValueOnce({ response: { status: 401 } });
    refreshSession.mockRejectedValueOnce(new Error('refresh failed'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(result.current.user).toBeNull();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
