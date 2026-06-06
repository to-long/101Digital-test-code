import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { FileText } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
                className="rounded-full py-[18px] px-6 border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                className="rounded-full py-[18px] px-6 border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Options row */}
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-[18px] h-[18px] border border-gray-300 rounded-sm accent-blue-500"
                />
                <span className="text-[13px] text-gray-500">
                  <FormattedMessage id="login.rememberMe" />
                </span>
              </label>
              <button
                type="button"
                className="text-[13px] text-blue-500 font-medium hover:underline cursor-pointer"
              >
                <FormattedMessage id="login.forgotPassword" />
              </button>
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

          {/* Footer */}
          <div className="text-center">
            <span className="text-[13px] text-gray-500">
              <FormattedMessage id="login.noAccount" />{' '}
            </span>
            <button
              type="button"
              className="text-[13px] text-blue-500 font-semibold hover:underline cursor-pointer"
            >
              <FormattedMessage id="login.createOne" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
