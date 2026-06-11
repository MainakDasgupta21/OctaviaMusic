import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Input from '@/components/ui-v2/Input';
import Button from '@/components/ui-v2/Button';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const readFriendlyError = (error, fallback) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) {
      console.error('[auth] login failed', error);
    }
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, status } = useAuth();
  const redirect = useMemo(() => params.get('redirect') || '/library', [params]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
      toast.success('Signed in');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(readFriendlyError(error, 'Unable to sign in'));
    }
  });

  return (
    <div className="page-shell-content-narrow pt-10 pb-14">
      <div className="mx-auto max-w-md rounded-sharp border border-white/[0.10] bg-surface-2/50 p-6 sm:p-8 backdrop-blur-md">
        <p className="eyebrow eyebrow-accent mb-3">Welcome back</p>
        <h1 className="font-display text-4xl text-ink leading-tight">Sign in</h1>
        <p className="font-editorial text-sm text-ink-3 mt-3">
          Continue with your account to sync favorites, playlists, and settings across devices.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-sm text-ink-2" htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
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
            <label className="text-sm text-ink-2" htmlFor="login-password">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            loading={form.formState.isSubmitting || status === 'loading'}
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link className="text-accent hover:underline" to="/register">
            Create account
          </Link>
          <Link className="text-ink-3 hover:text-ink hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
