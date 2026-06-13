import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'octavia.settings.v1';

export const settingsDefaults = Object.freeze({
  highQualityAudio: true,
  crossfadeSeconds: 0,
  autoplay: true,
  reduceMotion: false,
  notifyNewReleases: true,
  notifyPlaylistUpdates: false,
  displayName: 'Music Lover',
  email: 'user@example.com',
  // UI prefs
  sidebarExpanded: false,
  theme: 'dark', // 'dark' | 'oled' | 'light' | 'hicontrast' | 'midnight' | 'sepia' | 'forest' | 'slate'
  accentColor: 'dynamic', // 'dynamic' | accent preset id (see lib/accent-presets)
  textSize: 'md', // 'sm' | 'md' | 'lg' — interface scale
  vimNavigation: false,
  soundEffects: false,
});
const SETTINGS_QUERY_KEY = ['me', 'settings'];

const readFromStorage = () => {
  if (typeof window === 'undefined') return { ...settingsDefaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...settingsDefaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...settingsDefaults };
    return { ...settingsDefaults, ...parsed };
  } catch {
    return { ...settingsDefaults };
  }
};

const SettingsContext = createContext(undefined);

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const mergedUserRef = useRef(null);
  const [guestSettings, setGuestSettings] = useState(() => readFromStorage());

  const settingsQuery = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await api.get('/me/settings');
      return { ...settingsDefaults, ...(response.data?.settings || {}) };
    },
    staleTime: 30000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch) => {
      await api.patch('/me/settings', patch);
    },
  });

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestSettings));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [guestSettings, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      mergedUserRef.current = null;
      setGuestSettings(readFromStorage());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !settingsQuery.isSuccess) return;
    const userId = user?.id || user?._id;
    if (!userId || mergedUserRef.current === userId) return;

    const guest = readFromStorage();
    const server = settingsQuery.data || { ...settingsDefaults };
    const patch = {};
    Object.keys(settingsDefaults).forEach((key) => {
      const serverValue = server[key];
      const guestValue = guest[key];
      const defaultValue = settingsDefaults[key];
      if (serverValue === defaultValue && guestValue !== undefined && guestValue !== defaultValue) {
        patch[key] = guestValue;
      }
    });

    const clearGuestData = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      setGuestSettings({ ...settingsDefaults });
      mergedUserRef.current = userId;
    };

    if (Object.keys(patch).length === 0) {
      clearGuestData();
      return;
    }

    let active = true;
    const mergeGuestSettings = async () => {
      try {
        await api.patch('/me/settings', patch);
        if (!active) return;
        await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
        clearGuestData();
      } catch {
        if (!active) return;
        mergedUserRef.current = userId;
      }
    };

    void mergeGuestSettings();

    return () => {
      active = false;
    };
  }, [isAuthenticated, queryClient, settingsQuery.data, settingsQuery.isSuccess, user?.id, user?._id]);

  const settings = isAuthenticated
    ? { ...settingsDefaults, ...(settingsQuery.data || {}) }
    : guestSettings;

  const updateSetting = useCallback((key, value) => {
    if (!isAuthenticated) {
      setGuestSettings((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
      return;
    }

    const previous = queryClient.getQueryData(SETTINGS_QUERY_KEY) || {
      ...settingsDefaults,
    };
    const optimistic = { ...previous, [key]: value };
    queryClient.setQueryData(SETTINGS_QUERY_KEY, optimistic);
    updateSettingsMutation.mutate({ [key]: value }, {
      onError: () => {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, previous);
        toast.error("Couldn't save that change. Please try again.");
      },
    });
  }, [isAuthenticated, queryClient, updateSettingsMutation]);

  const resetSettings = useCallback(() => {
    if (!isAuthenticated) {
      setGuestSettings({ ...settingsDefaults });
      return;
    }

    const previous = queryClient.getQueryData(SETTINGS_QUERY_KEY) || {
      ...settingsDefaults,
    };
    queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...settingsDefaults });
    updateSettingsMutation.mutate({ ...settingsDefaults }, {
      onError: () => {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, previous);
        toast.error("Couldn't reset settings. Please try again.");
      },
    });
  }, [isAuthenticated, queryClient, updateSettingsMutation]);

  // Bulk-apply a patch (used by Settings import). Only known keys are kept so
  // an imported file can never inject arbitrary fields into storage / server.
  const importSettings = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    const clean = {};
    Object.keys(settingsDefaults).forEach((key) => {
      if (patch[key] !== undefined) clean[key] = patch[key];
    });
    if (Object.keys(clean).length === 0) return;

    if (!isAuthenticated) {
      setGuestSettings((prev) => ({ ...prev, ...clean }));
      return;
    }

    const previous = queryClient.getQueryData(SETTINGS_QUERY_KEY) || {
      ...settingsDefaults,
    };
    queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...previous, ...clean });
    updateSettingsMutation.mutate(clean, {
      onError: () => {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, previous);
        toast.error("Couldn't import settings. Please try again.");
      },
    });
  }, [isAuthenticated, queryClient, updateSettingsMutation]);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings, importSettings }),
    [settings, updateSetting, resetSettings, importSettings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};
