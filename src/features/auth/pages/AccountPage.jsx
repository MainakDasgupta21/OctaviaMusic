import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Button from '@/components/ui-v2/Button';
import Input from '@/components/ui-v2/Input';
import AvatarField from '@/components/account/AvatarField';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(80),
  email: z.string().trim().email('Enter a valid email'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const readFriendlyError = (error, fallback, scope) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) {
      console.error(`[auth] ${scope} failed`, error);
    }
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const AccountPage = () => {
  const { user, updateProfile, logout } = useAuth();

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    profileForm.reset({
      displayName: user?.displayName || '',
      email: user?.email || '',
    });
  }, [user?.displayName, user?.email, profileForm]);

  const submitProfile = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile({
        displayName: values.displayName,
        email: values.email,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(readFriendlyError(error, 'Unable to update profile', 'profile update'));
    }
  });

  const submitPassword = passwordForm.handleSubmit(async (values) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed. Sign in again.');
      await logout();
    } catch (error) {
      toast.error(readFriendlyError(error, 'Unable to change password', 'password change'));
    }
  });

  return (
    <div className="page-shell-content-narrow pt-6 md:pt-10 pb-12 space-y-6">
      <div>
        <p className="eyebrow eyebrow-accent mb-3">Account</p>
        <h1 className="font-display text-display-lg text-ink leading-tight">Your profile</h1>
      </div>

      <section className="rounded-sharp border border-white/[0.10] bg-surface-2/50 p-5 sm:p-6 backdrop-blur-md">
        <h2 className="text-lg font-medium text-ink">Profile details</h2>

        <div className="mt-4">
          <AvatarField />
        </div>

        <div className="editorial-rule my-5" />

        <form className="space-y-4" onSubmit={submitProfile} noValidate>
          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="account-display-name">
              Display name
            </label>
            <Input id="account-display-name" {...profileForm.register('displayName')} />
            {profileForm.formState.errors.displayName ? (
              <p className="text-xs text-danger">
                {profileForm.formState.errors.displayName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="account-email">
              Email
            </label>
            <Input id="account-email" type="email" {...profileForm.register('email')} />
            {profileForm.formState.errors.email ? (
              <p className="text-xs text-danger">{profileForm.formState.errors.email.message}</p>
            ) : null}
          </div>

          <Button type="submit" loading={profileForm.formState.isSubmitting}>
            Save profile
          </Button>
        </form>
      </section>

      <section className="rounded-sharp border border-white/[0.10] bg-surface-2/50 p-5 sm:p-6 backdrop-blur-md">
        <h2 className="text-lg font-medium text-ink">Change password</h2>
        <form className="mt-4 space-y-4" onSubmit={submitPassword} noValidate>
          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="account-current-password">
              Current password
            </label>
            <Input
              id="account-current-password"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
            />
            {passwordForm.formState.errors.currentPassword ? (
              <p className="text-xs text-danger">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="account-new-password">
              New password
            </label>
            <Input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('newPassword')}
            />
            {passwordForm.formState.errors.newPassword ? (
              <p className="text-xs text-danger">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="account-confirm-password">
              Confirm new password
            </label>
            <Input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('confirmPassword')}
            />
            {passwordForm.formState.errors.confirmPassword ? (
              <p className="text-xs text-danger">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" variant="editorial" loading={passwordForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
};

export default AccountPage;
