import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Settings, Sun, Moon, Monitor, Languages } from 'lucide-react';
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

/**
 * A standalone theme + language picker dropdown, usable on guest pages
 * (login, signup, etc.) where there's no authenticated user but we still
 * want to give visitors control over the UI chrome.
 *
 * The shape mirrors the equivalent sections inside <UserDropdown> so the
 * two feel consistent when users move between them.
 */
export default function SettingsDropdown() {
  const intl = useIntl();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  const themeOptions: Array<{ value: Theme; labelKey: string; Icon: typeof Sun }> = [
    { value: 'light', labelKey: 'user.theme.light', Icon: Sun },
    { value: 'dark', labelKey: 'user.theme.dark', Icon: Moon },
    { value: 'system', labelKey: 'user.theme.system', Icon: Monitor },
  ];

  const langOptions: Array<{ value: Locale; short: string; label: string }> = [
    { value: 'en', short: 'EN', label: 'English' },
    { value: 'vi', short: 'VI', label: 'Tiếng Việt' },
    { value: 'zh', short: '中', label: '中文' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-[0_2px_4px_#00000008,0_12px_32px_#0000000f] border border-gray-200 z-50 overflow-hidden"
        >
          {/* Theme picker */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Sun className="h-3.5 w-3.5" />
              <FormattedMessage id="user.theme" />
            </div>
            <div
              className="flex gap-1 rounded-lg bg-gray-100 p-0.5"
              role="radiogroup"
              aria-label="Theme"
            >
              {themeOptions.map(({ value, labelKey, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  role="radio"
                  aria-checked={theme === value}
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
            <div
              className="flex gap-1 rounded-lg bg-gray-100 p-0.5"
              role="radiogroup"
              aria-label="Language"
            >
              {langOptions.map(({ value, short, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocale(value)}
                  role="radio"
                  aria-checked={locale === value}
                  title={label}
                  className={`flex-1 flex items-center justify-center rounded-md py-1.5 text-[12px] font-semibold cursor-pointer transition-colors ${
                    locale === value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {short}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
