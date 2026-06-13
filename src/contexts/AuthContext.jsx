import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, {
  clearCsrfToken,
  configureApiAuth,
  getCurrentUser,
  loginAccount,
  logoutSession,
  refreshSession,
  registerAccount,
} from '@/lib/api';

const AuthContext = createContext(undefined);
const LEGACY_LIBRARY_STORAGE_KEYS = [
  'octavia.favorites.v1',
  'octavia.liked-albums.v1',
  'octavia.followed-artists.v1',
  'octavia.playlists.v1',
  'octavia.player.v1',
  // Guest search history fallback — cleared on auth change so one account's
  // searches never bleed into another on a shared browser.
  'octavia.recent-searches.v1',
];

const readCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const chunks = document.cookie.split(';');
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
};

const useGuestState = (setUser, setStatus) =>
  useCallback(() => {
    setUser(null);
    setStatus('guest');
  }, [setStatus, setUser]);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const queryClient = useQueryClient();

  const goGuest = useGuestState(setUser, setStatus);

  const clearPerUserClientState = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['me'] });
    clearCsrfToken();
    if (typeof window === 'undefined') return;
    for (const key of LEGACY_LIBRARY_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* storage unavailable */
      }
    }
  }, [queryClient]);

  const applySession = useCallback((payload) => {
    const nextUser = payload?.user || null;
    if (!nextUser) {
      setUser(null);
      setStatus('guest');
      return null;
    }
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  useEffect(() => {
    configureApiAuth({
      onAuthFailure: () => {
        clearPerUserClientState();
        goGuest();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      },
      getCsrfToken: () => readCookie('csrfToken'),
    });
  }, [clearPerUserClientState, goGuest]);

  const refresh = useCallback(async () => {
    const payload = await refreshSession();
    if (payload?.user) return applySession(payload);
    const mePayload = await getCurrentUser();
    return applySession(mePayload);
  }, [applySession]);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const payload = await getCurrentUser();
      applySession(payload);
      return;
    } catch (error) {
      if (error?.response?.status !== 401) {
        if (import.meta.env?.DEV) {
          console.error('[auth] /auth/me failed', error);
        }
        goGuest();
        return;
      }
    }

    try {
      await refreshSession();
      const payload = await getCurrentUser();
      applySession(payload);
    } catch (_error) {
      goGuest();
    }
  }, [applySession, goGuest]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (credentials) => {
      const payload = await loginAccount(credentials);
      return applySession(payload);
    },
    [applySession],
  );

  const register = useCallback(
    async (registrationInput) => {
      const payload = await registerAccount(registrationInput);
      return applySession(payload);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } catch (_error) {
      // ignore network/auth failures, client state still needs to clear
    }
    clearPerUserClientState();
    goGuest();
  }, [clearPerUserClientState, goGuest]);

  const updateProfile = useCallback(
    async (patch) => {
      const response = await api.patch('/users/me', patch);
      if (response?.data?.user) {
        setUser(response.data.user);
        setStatus('authenticated');
      }
      return response.data?.user || null;
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      refresh,
      updateProfile,
      isAuthenticated: Boolean(user),
    }),
    [user, status, login, register, logout, refresh, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
