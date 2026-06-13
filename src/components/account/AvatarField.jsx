import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Trash2, Link2 } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import Input from '@/components/ui-v2/Input';
import { useAuth } from '@/contexts/AuthContext';
import { ACCEPTED_TYPES } from '@/lib/image-crop';
import { cn } from '@/lib/utils';
import AvatarEditorDialog from './AvatarEditorDialog';

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ML';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const readFriendlyError = (error, fallback) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) console.error('[avatar]', error);
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Profile photo control: shows the current avatar (or initials), lets the user
 * upload + crop a new photo, paste an image URL, or remove it. All writes go
 * through `updateProfile` so the new avatar syncs everywhere immediately.
 */
const AvatarField = ({ className }) => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [pickedFile, setPickedFile] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const displayName = user?.displayName || 'Music Lover';
  const avatarUrl = user?.avatarUrl || '';

  const persist = async (avatarValue, successMessage) => {
    setSaving(true);
    try {
      await updateProfile({ avatarUrl: avatarValue });
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(readFriendlyError(error, "Couldn't update your photo"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPickedFile(file);
    setEditorOpen(true);
  };

  const handleEditorSave = async (dataUrl) => {
    const ok = await persist(dataUrl, 'Profile photo updated');
    if (ok) {
      setEditorOpen(false);
      setPickedFile(null);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl || saving) return;
    await persist(null, 'Profile photo removed');
  };

  const handleSaveUrl = async () => {
    const trimmed = urlDraft.trim();
    if (!isValidHttpUrl(trimmed)) {
      toast.error('Enter a valid image URL');
      return;
    }
    const ok = await persist(trimmed, 'Profile photo updated');
    if (ok) {
      setUrlMode(false);
      setUrlDraft('');
    }
  };

  return (
    <div className={cn('flex items-start gap-4', className)}>
      <span
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 flex items-center justify-center text-base font-semibold text-track-fg"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initialsOf(displayName)
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">Profile photo</p>
        <p className="font-editorial text-[12.5px] text-ink-3 mt-0.5 leading-snug">
          Upload a photo and crop it to a circle, or paste an image URL.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="editorial"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            leftIcon={<Camera className="h-3.5 w-3.5" />}
          >
            {avatarUrl ? 'Change' : 'Upload'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlDraft('');
              setUrlMode((v) => !v);
            }}
            disabled={saving}
            leftIcon={<Link2 className="h-3.5 w-3.5" />}
          >
            Use URL
          </Button>
          {avatarUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={saving}
              className="text-danger hover:bg-danger/10"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Remove
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handlePick}
          />
        </div>

        {urlMode ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveUrl();
                if (e.key === 'Escape') setUrlMode(false);
              }}
              type="url"
              placeholder="https://..."
              size="md"
              aria-label="Image URL"
              disabled={saving}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveUrl} loading={saving}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUrlMode(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AvatarEditorDialog
        file={pickedFile}
        open={editorOpen}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) setPickedFile(null);
        }}
        onSave={handleEditorSave}
        saving={saving}
      />
    </div>
  );
};

export default AvatarField;
