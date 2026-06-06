import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Languages,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/theme';
import { useLocale, type Locale } from '@/lib/i18n';

function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [ref, handler]);
}

export default function UserDropdown() {
  const navigate = useNavigate();
  const intl = useIntl();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  if (!user) return null;
  const initial = user.fullname?.charAt(0)?.toUpperCase() ?? 'U';

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  const themeOptions: Array<{ value: Theme; labelKey: string; Icon: typeof Sun }> = [
    { value: 'light', labelKey: 'user.theme.light', Icon: Sun },
    { value: 'dark', labelKey: 'user.theme.dark', Icon: Moon },
    { value: 'system', labelKey: 'user.theme.system', Icon: Monitor },
  ];

  const langOptions: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 text-white text-[11px] font-bold">
          {initial}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-[0_2px_4px_#00000008,0_12px_32px_#0000000f] border border-gray-200 z-50 overflow-hidden"
        >
          {/* User header */}
          <div className="flex items-center gap-3 p-3.5">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 text-white text-sm font-bold shrink-0">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {user.fullname}
              </span>
              <span className="text-[11px] text-gray-500 truncate">{user.email}</span>
            </div>
          </div>

          <div className="h-px bg-gray-200" />

          {/* Theme picker */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Sun className="h-3.5 w-3.5" />
              <FormattedMessage id="user.theme" />
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
              {themeOptions.map(({ value, labelKey, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                    theme === value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={intl.formatMessage({ id: labelKey })}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <FormattedMessage id={labelKey} />
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-200" />

          {/* Language picker */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Languages className="h-3.5 w-3.5" />
              <FormattedMessage id="user.language" />
            </div>
            <div className="flex flex-col gap-0.5">
              {langOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocale(value)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span>{label}</span>
                  {locale === value && <Check className="h-4 w-4 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-200" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3.5 py-3 hover:bg-red-50 text-left cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-600" />
            <span className="text-[13px] font-medium text-red-600">
              <FormattedMessage id="user.logout" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
