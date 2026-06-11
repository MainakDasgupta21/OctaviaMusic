import { Link } from 'react-router-dom';
import Button from '@/components/ui-v2/Button';

const ForgotPasswordPage = () => (
  <div className="page-shell-content-narrow pt-12 pb-16">
    <div className="mx-auto max-w-md rounded-sharp border border-white/[0.10] bg-surface-2/50 p-6 sm:p-8 backdrop-blur-md">
      <p className="eyebrow eyebrow-accent mb-3">Password recovery</p>
      <h1 className="font-display text-4xl text-ink leading-tight">Coming soon</h1>
      <p className="font-editorial text-sm text-ink-3 mt-3 leading-relaxed">
        Forgot-password flow is not wired yet. Contact support or create a new account in local
        development while this feature is being completed.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
        <Button asChild variant="editorial">
          <Link to="/register">Create account</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default ForgotPasswordPage;
