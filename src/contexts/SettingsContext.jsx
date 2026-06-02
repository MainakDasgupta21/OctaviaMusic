import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'harmony.settings.v1';

const defaults = {
  highQualityAudio: false,
  crossfadeSeconds: 0,
  autoplay: true,
  reduceMotion: false,
  notifyNewReleases: true,
  notifyPlaylistUpdates: false,
  displayName: 'Music Lover',
  email: 'user@example.com',
  // UI prefs
  sidebarExpanded: false,
  theme: 'dark', // 'dark' | 'oled' | 'light' | 'hicontrast'
  vimNavigation: false,
  soundEffects: false,
};

const readFromStorage = () => {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

const SettingsContext = createContext(undefined);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => readFromStorage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const resetSettings = useCallback(() => setSettings(defaults), []);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings],
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
