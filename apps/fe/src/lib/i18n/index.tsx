import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { catalogs } from './messages';

export type Locale = 'en' | 'vi' | 'zh';

const LOCALES: Locale[] = ['en', 'vi', 'zh'];
const STORAGE_KEY = 'lang';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && LOCALES.includes(saved)) return saved;
  // Auto-detect from browser
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('vi')) return 'vi';
  if (browser.startsWith('zh')) return 'zh';
  return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={catalogs[locale]} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
