// Unified toast voice. One line, active voice, optional Undo.
//
// Pattern: <Verb> · <Subject>
// Examples:
//   Added · Bohemian Rhapsody
//   Liked · Daft Punk — One More Time
//   Removed · Late night drive
//   Saved · Settings
import { toast } from 'sonner';

const compose = (verb, subject) =>
  subject ? `${verb} \u00b7 ${subject}` : verb;

const goToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  window.location.assign('/login');
};

export const notify = {
  added: (subject, undo) =>
    toast.success(compose('Added', subject), undo ? { action: { label: 'Undo', onClick: undo } } : undefined),
  removed: (subject, undo) =>
    toast(compose('Removed', subject), undo ? { action: { label: 'Undo', onClick: undo } } : undefined),
  liked: (subject) => toast.success(compose('Liked', subject)),
  unliked: (subject) => toast(compose('Unliked', subject)),
  saved: (subject = 'Changes') => toast.success(compose('Saved', subject)),
  copied: (subject = 'Link') => toast.success(compose('Copied', subject)),
  reset: (subject = 'Settings') => toast(compose('Reset', subject)),
  signInRequired: (subject = 'save to your library') =>
    toast('Sign in required', {
      description: `Please sign in to ${subject}.`,
      action: { label: 'Sign in', onClick: goToLogin },
    }),
  error: (message = 'Something went wrong') => toast.error(message),
  info: (message) => toast(message),
};

export default notify;
