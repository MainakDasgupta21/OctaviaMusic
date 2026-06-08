import { useEffect, useId, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Input from '@/components/ui-v2/Input';
import Button from '@/components/ui-v2/Button';
import Kbd from '@/components/ui-v2/Kbd';
import { useSettings } from '@/contexts/SettingsContext';
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

/**
 * Editorial section card — sharp top, hairline border, ordinal eyebrow.
 * Reads like a magazine column with its own dateline.
 */
const SectionCard = ({ icon: Icon, ordinal, eyebrow, title, delay = 0, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className="rounded-sharp bg-surface-2/40 backdrop-blur-md border border-white/[0.07] p-6 md:p-7"
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
  <div className="flex items-center justify-between gap-5 py-1">
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="font-editorial text-[12.5px] text-ink-3 mt-0.5 leading-snug">
          {description}
        </p>
      ) : null}
    </div>
    {children}
  </div>
);

const EditableField = ({ label, value, onSave, type = 'text' }) => {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = (draft || '').trim();
    if (!trimmed) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (trimmed !== value) {
      onSave(trimmed);
      toast.success(`${label} updated`);
    }
    setEditing(false);
  };

  const cancel = () => {
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
            className="p-2 rounded-sharp text-accent hover:bg-track/15 focus-ring"
            aria-label="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            className="p-2 rounded-sharp text-ink-3 hover:bg-white/5 focus-ring"
            aria-label="Cancel"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-2 py-1 flex-shrink-0"
        >
          Edit
        </button>
      )}
    </div>
  );
};

// Theme preview swatches — match the actual data-theme gradients.
const THEMES = [
  {
    id: 'dark',
    label: 'Editorial night',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.18), transparent 55%), radial-gradient(ellipse at 90% 110%, hsl(350 35% 22% / 0.45), transparent 55%), hsl(30 11% 6%)',
  },
  {
    id: 'oled',
    label: 'OLED',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.18), transparent 55%), hsl(0 0% 0%)',
  },
  {
    id: 'light',
    label: 'Editorial day',
    preview:
      'radial-gradient(ellipse at 25% 0%, hsl(16 82% 56% / 0.16), transparent 55%), hsl(38 32% 98%)',
  },
  {
    id: 'hicontrast',
    label: 'High contrast',
    preview: 'linear-gradient(135deg, #000, #1a1a1a)',
  },
];

const SettingsPage = () => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const masthead = useMemo(() => formatMasthead(), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (settings.reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
    }
  }, [settings.reduceMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!settings.theme || settings.theme === 'dark') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  const handleReset = () => {
    resetSettings();
    toast.success('Settings restored to defaults');
  };

  return (
    <div className="p-5 md:p-10 max-w-3xl mx-auto pb-12">
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
      <motion.div
        {...fadeUp}
        className="mb-10 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
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
        </div>
        <Button
          variant="editorial"
          size="sm"
          onClick={handleReset}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset to defaults
        </Button>
      </motion.div>

      <div className="space-y-5">
        {/* ============================ */}
        {/* PLAYBACK */}
        {/* ============================ */}
        <SectionCard
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
              <div className="w-32 flex-shrink-0">
                <Slider
                  value={[settings.crossfadeSeconds]}
                  max={12}
                  step={1}
                  onValueChange={(v) => updateSetting('crossfadeSeconds', v[0])}
                  aria-label="Crossfade seconds"
                />
              </div>
            </Row>
            <div className="editorial-rule" />
            <Row
              title="Autoplay"
              description="Continue playing when your queue ends."
            >
              <Switch
                checked={settings.autoplay}
                onCheckedChange={(v) => updateSetting('autoplay', v)}
              />
            </Row>
          </div>
        </SectionCard>

        {/* ============================ */}
        {/* APPEARANCE */}
        {/* ============================ */}
        <SectionCard
          ordinal={2}
          eyebrow="Appearance"
          icon={Palette}
          title="Look and feel"
          delay={0.06}
        >
          <div className="space-y-7">
            <div>
              <p className="text-[14px] font-medium text-ink mb-1">Theme</p>
              <p className="font-editorial text-[12.5px] text-ink-3 mb-4">
                Four palettes. Pick the one that suits the light you read in.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEMES.map((t) => {
                  const active = settings.theme === t.id;
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
                    >
                      <span
                        className={cn(
                          'absolute inset-x-0 bottom-0 px-2.5 py-1.5 text-[11px] font-medium',
                          t.id === 'light' ? 'text-zinc-900' : 'text-white',
                        )}
                        style={{
                          background:
                            t.id === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
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

        {/* ============================ */}
        {/* SHORTCUTS */}
        {/* ============================ */}
        <SectionCard
          ordinal={3}
          eyebrow="Shortcuts"
          icon={Keyboard}
          title="Hands on the keyboard"
          delay={0.10}
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

        {/* ============================ */}
        {/* NOTIFICATIONS */}
        {/* ============================ */}
        <SectionCard
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

        {/* ============================ */}
        {/* ACCOUNT */}
        {/* ============================ */}
        <SectionCard
          ordinal={5}
          eyebrow="Account"
          icon={User}
          title="Who's listening"
          delay={0.18}
        >
          <div className="space-y-6">
            <EditableField
              label="Display name"
              value={settings.displayName}
              onSave={(v) => updateSetting('displayName', v)}
            />
            <div className="editorial-rule" />
            <EditableField
              label="Email"
              type="email"
              value={settings.email}
              onSave={(v) => updateSetting('email', v)}
            />
          </div>
        </SectionCard>

        {/* ============================ */}
        {/* ABOUT — the colophon */}
        {/* ============================ */}
        <SectionCard
          ordinal={6}
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
              Built with React, Tailwind CSS, Framer Motion, and react-player.
              Typeset in Roboto and Roboto Mono.
            </p>
            <p className="font-mono not-italic text-[11px] uppercase tracking-[0.18em] text-ink-4 mt-5">
              Configure the backend URL with{' '}
              <code className="text-ink-3">VITE_API_BASE</code>. Defaults to{' '}
              <code className="text-ink-3">http://localhost:5000/api</code>.
            </p>
          </div>
        </SectionCard>

        <div className="sm:hidden">
          <Button
            variant="editorial"
            onClick={handleReset}
            className="w-full"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset all settings
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-14 pt-5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        <span>End of preferences</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
};

export default SettingsPage;
