// Curated accent presets for the Settings "Accent color" control.
//
// `dynamic` is the default: the accent is driven by the playing track's cover
// art (and the idle rotator). Any other id pins a fixed accent via
// `lockPalette` in use-color-extraction. Hue/sat/light are tuned to stay
// legible against the UI and to keep the auto-picked foreground WCAG-safe
// (saturation 45-85, lightness 45-65 — same envelope the rotator uses).

export const DYNAMIC_ACCENT = 'dynamic';

export const ACCENT_PRESETS = Object.freeze([
  { id: 'ember', label: 'Ember', h: 16, s: 82, l: 56 },
  { id: 'rose', label: 'Rose', h: 345, s: 72, l: 60 },
  { id: 'amber', label: 'Amber', h: 42, s: 80, l: 56 },
  { id: 'lime', label: 'Lime', h: 96, s: 55, l: 50 },
  { id: 'emerald', label: 'Emerald', h: 158, s: 60, l: 48 },
  { id: 'teal', label: 'Teal', h: 184, s: 64, l: 50 },
  { id: 'azure', label: 'Azure', h: 205, s: 72, l: 56 },
  { id: 'indigo', label: 'Indigo', h: 244, s: 64, l: 64 },
  { id: 'violet', label: 'Violet', h: 268, s: 64, l: 64 },
  { id: 'magenta', label: 'Magenta', h: 312, s: 62, l: 60 },
]);

const PRESET_BY_ID = new Map(ACCENT_PRESETS.map((p) => [p.id, p]));

// Returns the preset object for a fixed accent id, or null for `dynamic`
// (or any unknown id, which falls back to dynamic behavior).
export const getAccentPreset = (id) => {
  if (!id || id === DYNAMIC_ACCENT) return null;
  return PRESET_BY_ID.get(id) || null;
};

// CSS color string for rendering a preset swatch in the UI.
export const accentPresetColor = (preset) =>
  `hsl(${preset.h} ${preset.s}% ${preset.l}%)`;
