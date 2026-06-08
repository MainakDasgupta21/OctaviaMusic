import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

const UIContext = createContext(undefined);

export const UIProvider = ({ children }) => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const searchInputRef = useRef(null);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);

  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const toggleMobileDrawer = useCallback(() => setMobileDrawerOpen((v) => !v), []);

  const focusGlobalSearch = useCallback(() => {
    const el = searchInputRef.current;
    if (el) {
      el.focus();
      try {
        el.select();
      } catch {
        /* noop */
      }
    } else {
      setPaletteOpen(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
      mobileDrawerOpen,
      openMobileDrawer,
      closeMobileDrawer,
      toggleMobileDrawer,
      searchInputRef,
      focusGlobalSearch,
    }),
    [
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
      mobileDrawerOpen,
      openMobileDrawer,
      closeMobileDrawer,
      toggleMobileDrawer,
      focusGlobalSearch,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
};
