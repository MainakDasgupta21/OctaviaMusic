import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { getAccentPreset } from '@/lib/accent-presets';
import { lockPalette, unlockPalette } from '@/hooks/use-color-extraction';

/**
 * Applies user preferences to <html> app-wide, regardless of which route is
 * mounted. This is the single source of truth for theme / motion / interface
 * scale / accent so a signed-in user's saved preferences take effect
 * everywhere on load — not only while the Settings page happens to be open.
 *
 * Renders nothing; it just runs effects against document.documentElement.
 */
const SettingsEffects = () => {
  const { settings } = useSettings();
  const { theme, reduceMotion, textSize, accentColor } = settings;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!theme || theme === 'dark') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (textSize && textSize !== 'md') {
      root.setAttribute('data-text-size', textSize);
    } else {
      root.removeAttribute('data-text-size');
    }
  }, [textSize]);

  useEffect(() => {
    const preset = getAccentPreset(accentColor);
    if (preset) {
      lockPalette([{ h: preset.h, s: preset.s, l: preset.l }]);
    } else {
      unlockPalette();
    }
  }, [accentColor]);

  return null;
};

export default SettingsEffects;
