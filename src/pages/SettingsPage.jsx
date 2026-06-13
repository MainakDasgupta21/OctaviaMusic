import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Volume2,
  Bell,
  User,
  Info,
  Keyboard,
  Palette,
  RotateCcw,
  Check,
  X as XIcon,
  Sparkles,
  Type,
  Download,
  Upload,
  Database,
  ExternalLink,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Input from '@/components/ui-v2/Input';
import Button from '@/components/ui-v2/Button';
import Kbd from '@/components/ui-v2/Kbd';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  ACCENT_PRESETS,
  DYNAMIC_ACCENT,
  accentPresetColor,
  getAccentPreset,
} from '@/lib/accent-presets';
import { smoothScrollIntoView } from '@/lib/scroll';
import { fadeUp } from '@/design/motion';
import { cn } from '@/lib/utils';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const modKey = isMac ? '\u2318' : 'Ctrl';

const shortcuts = [
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['\u2190', '\u2192'], label: 'Seek \u00B15 seconds' },
  { keys: ['Shift', '\u2190'], label: 'Previous track' },
  { keys: ['Shift', '\u2192'], label: 'Next track' },
  { keys: ['M'], label: 'Toggle mute' },
  { keys: ['L'], label: 'Like / unlike current track' },
  { keys: ['/'], label: 'Focus global search' },
  { keys: [modKey, 'K'], label: 'Open command palette' },
  { keys: ['Esc'], label: 'Close palette or mobile drawer' },
];

const formatMasthead = () => {
  const d = new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d).toUpperCase();
};

// Section anchors for the sticky quick-nav + scroll-spy.
const SECTIONS = [
  { id: 'set-playback', label: 'Playback' },
  { id: 'set-appearance', label: 'Appearance' },
  { id: 'set-shortcuts', label: 'Shortcuts' },
  { id: 'set-notifications', label: 'Alerts' },
  { id: 'set-account', label: 'Account' },
  { id: 'set-data', label: 'Data' },
  { id: 'set-about', label: 'About' },
];

// Theme preview swatches — gradients mirror the actual data-theme blocks in
// index.css so the picker reads true. `light: true` flips label legibility.
const THEMES = [
  {
    id: 'dark',
    label: 'Editorial night',
    family: 'Dark',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.18), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(350 35% 22% / 0.45), transparent 55%), hsl(30 11% 6%)',
  },
  {
    id: 'oled',
    label: 'OLED',
    family: 'Dark',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.18), transparent 55%), hsl(0 0% 0%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    family: 'Dark',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(224 76% 64% / 0.30), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(244 60% 40% / 0.50), transparent 55%), hsl(230 30% 7%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    family: 'Dark',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(152 56% 46% / 0.28), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(150 50% 30% / 0.50), transparent 55%), hsl(155 28% 7%)',
  },
  {
    id: 'slate',
    label: 'Slate',
    family: 'Dark',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(202 72% 58% / 0.28), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(210 30% 30% / 0.50), transparent 55%), hsl(215 19% 12%)',
  },
  {
    id: 'light',
    label: 'Editorial day',
    family: 'Light',
    light: true,
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.16), transparent 55%), hsl(38 32% 98%)',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    family: 'Light',
    light: true,
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(24 72% 46% / 0.20), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(28 60% 56% / 0.28), transparent 55%), hsl(38 46% 94%)',
  },
  {
    id: 'hicontrast',
    label: 'High contrast',
    family: 'Access',
    preview: 'linear-gradient(135deg, #000, #1a1a1a)',
  },
];

const TEXT_SIZES = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Large' },
];

/**
 * Editorial section card — sharp top, hairline border, ordinal eyebrow.
 * Reads like a magazine column with its own dateline.
 */
const SectionCard = ({ id, icon: Icon, ordinal, eyebrow, title, delay = 0, children }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className="scroll-mt-24 rounded-sharp bg-surface-2/40 backdrop-blur-md border border-white/[0.07] p-4 sm:p-6 md:p-7"
  >
    <header className="mb-6">
      <div className="flex items-center gap-2.5 mb-2">
        {typeof ordinal === 'number' ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4">
            §{String(ordinal).padStart(2, '0')}
          </span>
        ) : null}
        {ordinal && eyebrow ? (
          <span className="w-4 h-px bg-ink-4/40" aria-hidden="true" />
        ) : null}
        {eyebrow ? (
          <span className="eyebrow eyebrow-accent">{eyebrow}</span>
        ) : null}
      </div>
      <h2 className="font-display text-2xl md:text-3xl text-ink leading-tight flex items-center gap-3">
        {Icon ? <Icon className="w-5 h-5 text-ink-3" strokeWidth={1.75} /> : null}
        {title}
      </h2>
      <div className="editorial-rule mt-4" />
    </header>
    {children}
  </motion.section>
);

const Row = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-5 py-1">
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="font-editorial text-[12.5px] text-ink-3 mt-0.5 leading-snug">
          {description}
        </p>
      ) : null}
    </div>
    <div className="self-start sm:self-auto">{children}</div>
  </div>
);

const EditableField = ({ label, value, onSave, type = 'text', validate }) => {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    if (saving) return;
    const trimmed = (draft || '').trim();
    if (!trimmed) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (validate && !validate(trimmed)) {
      toast.error(`That doesn't look like a valid ${label.toLowerCase()}`);
      return;
    }
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      toast.success(`${label} updated`);
      setEditing(false);
    } catch (error) {
      toast.error(
        readFriendlyError(error, `Couldn't update ${label.toLowerCase()}`, `${label} update`),
      );
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (saving) return;
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <label htmlFor={fieldId} className="text-[14px] font-medium text-ink">
            {label}
          </label>
        ) : (
          <p className="text-[14px] font-medium text-ink">{label}</p>
        )}
        {editing ? (
          <div className="mt-2">
            <Input
              id={fieldId}
              autoFocus
              type={type}
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
              size="md"
              aria-label={label}
            />
          </div>
        ) : (
          <p className="font-editorial text-[13px] text-ink-3 truncate mt-0.5">{value}</p>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="touch-target p-2 rounded-sharp text-accent hover:bg-track/15 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="touch-target p-2 rounded-sharp text-ink-3 hover:bg-white/5 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="touch-target font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-2 py-1 flex-shrink-0"
        >
          Edit
        </button>
      )}
    </div>
  );
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Mirrors the AccountPage error mapping: hide 5xx internals, surface the
// server's friendly message (e.g. "That email is already in use") otherwise.
const readFriendlyError = (error, fallback, scope) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) {
      console.error(`[settings] ${scope} failed`, error);
    }
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const SettingsPage = () => {
  const { settings, updateSetting, resetSettings, importSettings } = useSettings();
  const { user, updateProfile } = useAuth();
  const masthead = useMemo(() => formatMasthead(), []);
  const fileInputRef = useRef(null);
  const navRailRef = useRef(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const accentMode = settings.accentColor || DYNAMIC_ACCENT;
  const activeAccentPreset = getAccentPreset(accentMode);
  const textSize = settings.textSize || 'md';
  const reduceMotion = settings.reduceMotion === true;
  const navPillTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 460, damping: 38, mass: 0.8 };

  // Scroll-spy: highlight the quick-nav chip for the section nearest the top.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const root = document.getElementById('main-content');
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (els.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { root: root || null, rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Keep the active chip centered within the (horizontally scrollable) rail on
  // narrow viewports as the user scrolls through sections.
  useEffect(() => {
    const rail = navRailRef.current;
    if (!rail) return;
    const btn = rail.querySelector(`[data-section="${activeSection}"]`);
    if (!btn) return;
    const railRect = rail.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const delta = btnRect.left - railRect.left - (rail.clientWidth - btn.clientWidth) / 2;
    rail.scrollTo({
      left: rail.scrollLeft + delta,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeSection, reduceMotion]);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      setActiveSection(sectionId);
      smoothScrollIntoView(el, { offset: -96, block: 'start' });
    }
  };

  const handleReset = () => {
    resetSettings();
    toast.success('Settings restored to defaults');
  };

  const handleExport = () => {
    try {
      // Identity (name/email) belongs to the account, not a portable backup.
      const preferences = { ...settings };
      delete preferences.displayName;
      delete preferences.email;
      const payload = {
        app: 'octavia',
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: preferences,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'octavia-settings.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Settings exported');
    } catch {
      toast.error('Could not export settings');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming =
        parsed && typeof parsed === 'object' && parsed.settings && typeof parsed.settings === 'object'
          ? parsed.settings
          : parsed;
      if (!incoming || typeof incoming !== 'object') throw new Error('invalid');
      importSettings(incoming);
      toast.success('Settings imported');
    } catch {
      toast.error('That file is not a valid settings export');
    }
  };

  return (
    <div className="page-shell-content-narrow pt-5 md:pt-8 pb-12">
      {/* Editorial masthead */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Colophon · Preferences</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Vol. 01</span>
      </div>

      {/* Page header */}
      <motion.div {...fadeUp} className="mb-6">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          The colophon
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
          <span>
            Settings,{' '}
            <em className="font-editorial text-track not-italic">tailored.</em>
          </span>
        </h1>
        <p className="font-editorial text-[14px] text-ink-3 mt-3 max-w-md leading-snug">
          Make Octavia look, sound, and behave exactly how you want.
        </p>
      </motion.div>

      {/* Sticky quick-nav — a floating glass pill with a sliding accent chip.
          The wrapper is transparent (no rectangular band); only the oval rail
          is visible, and its own blur keeps it legible over scrolling content. */}
      <nav
        aria-label="Settings sections"
        className="sticky top-2 z-20 mb-6 flex justify-start"
      >
        <div
          ref={navRailRef}
          className={cn(
            'flex w-max max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1',
            'border border-white/[0.10] bg-surface-2/85 backdrop-blur-xl',
            'shadow-[inset_0_1px_0_hsl(var(--ink-primary)/0.08),0_12px_34px_-12px_rgba(0,0,0,0.78)]',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {SECTIONS.map((s, i) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-section={s.id}
                onClick={() => scrollToSection(s.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'group relative shrink-0 rounded-full px-3 sm:px-3.5 py-1.5 focus-ring',
                  'text-[11px] font-mono uppercase tracking-[0.16em] transition-colors duration-200',
                  active ? 'text-track-fg' : 'text-ink-3 hover:text-ink',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="settings-nav-pill"
                    transition={navPillTransition}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full ring-1 ring-white/15 shadow-[0_3px_12px_-2px_hsl(var(--track-accent)/0.6)]"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 20%, hsl(var(--ink-primary) / 0.24), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                    }}
                  />
                ) : null}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-mono text-[8.5px] tabular-nums transition-colors',
                      active ? 'text-track-fg/65' : 'text-ink-4 group-hover:text-ink-3',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="space-y-5">
        {/* ============================ PLAYBACK ============================ */}
        <SectionCard
          id="set-playback"
          ordinal={1}
          eyebrow="Playback"
          icon={Volume2}
          title="How the music plays"
          delay={0.02}
        >
          <div className="space-y-6">
            <Row
              title="High-quality audio"
              description="Request the highest-quality stream available from the source."
            >
              <Switch
                checked={settings.highQualityAudio}
                onCheckedChange={(v) => updateSetting('highQualityAudio', v)}
              />
            </Row>
            <div className="editorial-rule" />
            <Row
              title={
                <>
                  Crossfade{' '}
                  <span className="font-editorial text-ink-3 text-[12.5px] font-normal">
                    {settings.crossfadeSeconds > 0 ? `${settings.crossfadeSeconds}s` : 'off'}
                  </span>
                </>
              }
              description="Overlap adjacent tracks for smoother transitions."
            >
              <div className="w-32 sm:w-40 flex-shrink-0">
                <Slider
                  className="settings-slider"
                  value={[settings.crossfadeSeconds]}
                  max={12}
                  step={1}
                  onValueChange={(v) => updateSetting('crossfadeSeconds', v[0])}
                  aria-label="Crossfade seconds"
                />
              </div>
            </Row>
            <div className="editorial-rule" />
            <Row title="Autoplay" description="Continue playing when your queue ends.">
              <Switch
                checked={settings.autoplay}
                onCheckedChange={(v) => updateSetting('autoplay', v)}
              />
            </Row>
          </div>
        </SectionCard>

        {/* ============================ APPEARANCE ============================ */}
        <SectionCard
          id="set-appearance"
          ordinal={2}
          eyebrow="Appearance"
          icon={Palette}
          title="Look and feel"
          delay={0.06}
        >
          <div className="space-y-7">
            {/* Theme */}
            <div>
              <p className="text-[14px] font-medium text-ink mb-1">Theme</p>
              <p className="font-editorial text-[12.5px] text-ink-3 mb-4">
                Eight palettes, dark to daylight. Pick the one that suits the light you read in.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {THEMES.map((t) => {
                  const active = (settings.theme || 'dark') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateSetting('theme', t.id)}
                      className={cn(
                        'group relative aspect-[3/2] rounded-sharp overflow-hidden border focus-ring transition-all',
                        active
                          ? 'border-track shadow-[0_0_0_1px_hsl(var(--track-accent)/0.4)]'
                          : 'border-white/[0.10] hover:border-white/25',
                      )}
                      style={{ background: t.preview }}
                      aria-pressed={active}
                      title={t.label}
                    >
                      <span
                        className="absolute top-2 left-2 font-mono text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full"
                        style={{
                          color: t.light ? '#1a1a1a' : '#fff',
                          background: t.light
                            ? 'rgba(255,255,255,0.55)'
                            : 'rgba(0,0,0,0.42)',
                        }}
                      >
                        {t.family}
                      </span>
                      <span
                        className={cn(
                          'absolute inset-x-0 bottom-0 px-2.5 py-1.5 text-[11px] font-medium',
                          t.light ? 'text-zinc-900' : 'text-white',
                        )}
                        style={{
                          background: t.light
                            ? 'rgba(255,255,255,0.55)'
                            : 'rgba(0,0,0,0.50)',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        {t.label}
                      </span>
                      {active ? (
                        <span
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-track-fg ring-1 ring-white/20"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editorial-rule" />

            {/* Accent color */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-[14px] font-medium text-ink">Accent color</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                  {activeAccentPreset ? activeAccentPreset.label : 'Dynamic'}
                </span>
              </div>
              <p className="font-editorial text-[12.5px] text-ink-3 mb-4">
                Dynamic follows the album art as it plays. Or pin a color you love.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => updateSetting('accentColor', DYNAMIC_ACCENT)}
                  aria-pressed={!activeAccentPreset}
                  aria-label="Dynamic accent from album art"
                  title="Dynamic — follows the album art"
                  className={cn(
                    'relative w-9 h-9 rounded-full flex items-center justify-center focus-ring transition-transform',
                    !activeAccentPreset
                      ? 'ring-2 ring-track ring-offset-2 ring-offset-background scale-105'
                      : 'ring-1 ring-white/15 hover:scale-105',
                  )}
                  style={{
                    backgroundImage:
                      'conic-gradient(from 210deg, hsl(var(--accent-iris-a)), hsl(var(--accent-iris-b)), hsl(var(--accent-iris-c)), hsl(var(--accent-iris-a)))',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white drop-shadow" />
                </button>
                {ACCENT_PRESETS.map((preset) => {
                  const active = accentMode === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateSetting('accentColor', preset.id)}
                      aria-pressed={active}
                      aria-label={`${preset.label} accent`}
                      title={preset.label}
                      className={cn(
                        'relative w-9 h-9 rounded-full flex items-center justify-center focus-ring transition-transform',
                        active
                          ? 'ring-2 ring-track ring-offset-2 ring-offset-background scale-105'
                          : 'ring-1 ring-white/15 hover:scale-105',
                      )}
                      style={{ background: accentPresetColor(preset) }}
                    >
                      {active ? (
                        <Check className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editorial-rule" />

            {/* Interface scale */}
            <Row
              title="Interface size"
              description="Scale the whole interface up or down for comfortable reading."
            >
              <div
                role="group"
                aria-label="Interface size"
                className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.03] p-0.5"
              >
                {TEXT_SIZES.map((opt) => {
                  const active = textSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSetting('textSize', opt.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors focus-ring',
                        active
                          ? 'bg-track text-track-fg'
                          : 'text-ink-3 hover:text-ink',
                      )}
                    >
                      {opt.id === 'sm' ? (
                        <Type className="w-3 h-3" />
                      ) : opt.id === 'lg' ? (
                        <Type className="w-4 h-4" />
                      ) : (
                        <Type className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden tiny:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </Row>

            <div className="editorial-rule" />
            <Row
              title="Reduce motion"
              description="Disable non-essential animations across the app."
            >
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(v) => updateSetting('reduceMotion', v)}
              />
            </Row>
            <div className="editorial-rule" />
            <Row
              title="UI sound effects"
              description="Synthesized clicks and pops for actions. Off by default."
            >
              <Switch
                checked={settings.soundEffects}
                onCheckedChange={(v) => updateSetting('soundEffects', v)}
              />
            </Row>
            <div className="editorial-rule" />
            <Row
              title="Vim-style list navigation"
              description={
                <>
                  Use <Kbd keys={['j']} /> <Kbd keys={['k']} /> Enter, Q, L on any tracklist.
                </>
              }
            >
              <Switch
                checked={settings.vimNavigation !== false}
                onCheckedChange={(v) => updateSetting('vimNavigation', v)}
              />
            </Row>
          </div>
        </SectionCard>

        {/* ============================ SHORTCUTS ============================ */}
        <SectionCard
          id="set-shortcuts"
          ordinal={3}
          eyebrow="Shortcuts"
          icon={Keyboard}
          title="Hands on the keyboard"
          delay={0.1}
        >
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
            {shortcuts.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between text-[13px] border-b border-white/[0.05] last:border-0 pb-3 last:pb-0"
              >
                <span className="font-editorial text-ink-3">{s.label}</span>
                <Kbd keys={s.keys} />
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* ============================ NOTIFICATIONS ============================ */}
        <SectionCard
          id="set-notifications"
          ordinal={4}
          eyebrow="Notifications"
          icon={Bell}
          title="What you'll hear from us"
          delay={0.14}
        >
          <div className="space-y-6">
            <Row
              title="New releases"
              description="Get notified about new music from artists you follow."
            >
              <Switch
                checked={settings.notifyNewReleases}
                onCheckedChange={(v) => updateSetting('notifyNewReleases', v)}
              />
            </Row>
            <div className="editorial-rule" />
            <Row
              title="Playlist updates"
              description="Notifications when playlists are updated."
            >
              <Switch
                checked={settings.notifyPlaylistUpdates}
                onCheckedChange={(v) => updateSetting('notifyPlaylistUpdates', v)}
              />
            </Row>
          </div>
        </SectionCard>

        {/* ============================ ACCOUNT ============================ */}
        <SectionCard
          id="set-account"
          ordinal={5}
          eyebrow="Account"
          icon={User}
          title="Who's listening"
          delay={0.18}
        >
          <div className="space-y-6">
            <EditableField
              label="Display name"
              value={user?.displayName ?? settings.displayName}
              onSave={(v) => updateProfile({ displayName: v })}
            />
            <div className="editorial-rule" />
            <EditableField
              label="Email"
              type="email"
              value={user?.email ?? settings.email}
              validate={isValidEmail}
              onSave={(v) => updateProfile({ email: v })}
            />
            <div className="editorial-rule" />
            <Row
              title="Avatar & password"
              description="Update your photo or change your password on the full account page."
            >
              <Button asChild variant="editorial" size="sm">
                <Link to="/account">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open account
                </Link>
              </Button>
            </Row>
          </div>
        </SectionCard>

        {/* ============================ DATA & BACKUP ============================ */}
        <SectionCard
          id="set-data"
          ordinal={6}
          eyebrow="Data"
          icon={Database}
          title="Backup and reset"
          delay={0.2}
        >
          <div className="space-y-6">
            <Row
              title="Export settings"
              description="Download a JSON backup of all your preferences."
            >
              <Button
                variant="editorial"
                size="sm"
                onClick={handleExport}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export
              </Button>
            </Row>
            <div className="editorial-rule" />
            <Row
              title="Import settings"
              description="Restore preferences from a previously exported file."
            >
              <Button
                variant="editorial"
                size="sm"
                onClick={handleImportClick}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </Row>
            <div className="editorial-rule" />
            <Row
              title="Reset to defaults"
              description="Restore every preference on this page to its original value."
            >
              <Button
                variant="danger"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset all
              </Button>
            </Row>
          </div>
        </SectionCard>

        {/* ============================ ABOUT — the colophon ============================ */}
        <SectionCard
          id="set-about"
          ordinal={7}
          eyebrow="Colophon"
          icon={Info}
          title="About this edition"
          delay={0.22}
        >
          <div className="space-y-3 font-editorial text-[13px] text-ink-2 leading-relaxed">
            <p>
              <span className="font-display text-base text-ink not-italic">
                Octavia — Volume 1.
              </span>{' '}
              An editorial product for listening, slow-built with care.
            </p>
            <p className="text-ink-3">
              Built with React, Tailwind CSS, Framer Motion, and react-player. Typeset in
              Roboto and Roboto Mono.
            </p>
            <p className="font-mono not-italic text-[11px] uppercase tracking-[0.18em] text-ink-4 mt-5">
              Configure the backend URL with{' '}
              <code className="text-ink-3">VITE_API_BASE</code>. Defaults to{' '}
              <code className="text-ink-3">http://localhost:5000/api</code>.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Footer */}
      <div className="mt-14 pt-5 border-t border-white/[0.06] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        <span>End of preferences</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
};

export default SettingsPage;
