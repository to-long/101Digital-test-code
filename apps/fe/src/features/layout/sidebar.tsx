import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import SidebarAccountMenu from './sidebar-account-menu';
import {
  FileText,
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems: Array<{ labelKey: string; icon: typeof FileText; href: string | null }> = [
  { labelKey: 'sidebar.invoices', icon: FileText, href: '/' },
  { labelKey: 'sidebar.dashboard', icon: LayoutDashboard, href: null },
  { labelKey: 'sidebar.customers', icon: Users, href: null },
  { labelKey: 'sidebar.payments', icon: CreditCard, href: null },
  { labelKey: 'sidebar.reports', icon: BarChart3, href: null },
  { labelKey: 'sidebar.settings', icon: Settings, href: null },
];

const MOBILE_BREAKPOINT = 768;

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  // Auto-collapse on mobile, otherwise read user preference
  if (window.innerWidth < MOBILE_BREAKPOINT) return true;
  const saved = localStorage.getItem('sidebar:collapsed');
  return saved === '1';
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed);

  // Auto-collapse on resize to mobile, restore on desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setCollapsed(true);
      } else {
        const saved = localStorage.getItem('sidebar:collapsed');
        setCollapsed(saved === '1');
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      // Only persist preference on desktop
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        localStorage.setItem('sidebar:collapsed', next ? '1' : '0');
      }
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r bg-white transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header with collapse toggle */}
      <div
        className={`relative flex items-center py-5 ${
          collapsed ? 'justify-center px-2' : 'gap-2 px-6'
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500">
          <FileText className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold truncate">SimpleInvoice</span>
        )}
        {/* Toggle button positioned at the right edge */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex flex-1 flex-col gap-1 py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const isActive =
            item.href !== null &&
            (item.href === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/invoices')
              : location.pathname.startsWith(item.href));
          const Icon = item.icon;
          const label = intl.formatMessage({ id: item.labelKey });

          return (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => item.href && navigate(item.href)}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-xl text-base font-medium transition-colors ${
                collapsed
                  ? 'justify-center h-11 w-11 mx-auto'
                  : 'gap-2 px-6 py-3'
              } ${
                isActive
                  ? 'bg-gray-100/80 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50'
              } ${!item.href ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer — clickable account menu (theme / language / logout) */}
      <div className={`border-t ${collapsed ? 'p-2' : 'px-3 py-3'}`}>
        <SidebarAccountMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
