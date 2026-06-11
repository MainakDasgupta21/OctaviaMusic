import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Input from '@/components/ui-v2/Input';
import Button from '@/components/ui-v2/Button';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(32, 'Username is too long')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, underscore, or hyphen'),
    displayName: z.string().trim().min(1, 'Display name is required').max(80),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const readFriendlyError = (error, fallback) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) {
      console.error('[auth] register failed', error);
    }
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register: registerAccount, status } = useAuth();
  const redirect = useMemo(() => params.get('redirect') || '/library', [params]);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerAccount({
        email: values.email,
        username: values.username,
        displayName: values.displayName,
        password: values.password,
      });
      toast.success('Account created');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(readFriendlyError(error, 'Unable to create account'));
    }
  });

  return (
    <div className="page-shell-content-narrow pt-10 pb-14">
      <div className="mx-auto max-w-md rounded-sharp border border-white/[0.10] bg-surface-2/50 p-6 sm:p-8 backdrop-blur-md">
        <p className="eyebrow eyebrow-accent mb-3">Join Octavia</p>
        <h1 className="font-display text-4xl text-ink leading-tight">Create account</h1>
        <p className="font-editorial text-sm text-ink-3 mt-3">
          Save your library in the cloud and keep it in sync everywhere.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="register-email">
              Email
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="register-username">
              Username
            </label>
            <Input
              id="register-username"
              autoComplete="username"
              placeholder="your.handle"
              {...form.register('username')}
            />
            {form.formState.errors.username ? (
              <p className="text-xs text-danger">{form.formState.errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="register-display-name">
              Display name
            </label>
            <Input
              id="register-display-name"
              autoComplete="name"
              placeholder="Music Lover"
              {...form.register('displayName')}
            />
            {form.formState.errors.displayName ? (
              <p className="text-xs text-danger">{form.formState.errors.displayName.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="register-password">
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="register-confirm-password">
              Confirm password
            </label>
            <Input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-danger">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            loading={form.formState.isSubmitting || status === 'loading'}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <p className="mt-5 text-sm text-ink-3">
          Already have an account?{' '}
          <Link className="text-accent hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
