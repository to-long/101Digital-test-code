import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { FileText } from 'lucide-react';
import SettingsDropdown from '@/features/layout/settings-dropdown';

export default function LoginPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setAuth(res.accessToken, res.user);
      toast.success(intl.formatMessage({ id: 'login.toast.success' }));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || intl.formatMessage({ id: 'login.toast.error' }), {
        description: intl.formatMessage({ id: 'login.toast.errorHint' }),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Guest header — gives unauthenticated visitors a way to switch
          theme/language before signing in. Mirrors the chrome they'll see
          inside the user dropdown once they log in. */}
      <header className="flex justify-end items-center px-4 sm:px-8 h-12 shrink-0">
        <SettingsDropdown />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[440px] rounded-xl shadow-sm shadow-lg border border-gray-200 bg-white p-12">
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-semibold">SimpleInvoice</span>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-[28px] font-semibold">
              <FormattedMessage id="login.welcome" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <FormattedMessage id="login.subtitle" />
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                <FormattedMessage id="login.email" />
              </label>
              <input
                id="email"
                type="email"
                placeholder={intl.formatMessage({ id: 'login.emailPlaceholder' })}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-full py-[18px] px-6 border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                <FormattedMessage id="login.password" />
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-full py-[18px] px-6 border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
              />
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white rounded-full py-4 text-[15px] font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <FormattedMessage id={loading ? 'login.signingIn' : 'login.signIn'} />
            </button>
          </form>
        </div>
        </div>
      </main>
    </div>
  );
}
