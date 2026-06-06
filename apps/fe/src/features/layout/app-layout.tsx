import { Home } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';
import UserDropdown from './user-dropdown';

function getPageNameKey(pathname: string): string {
  if (pathname === '/') return 'page.invoices';
  if (pathname === '/invoices/new') return 'page.createInvoice';
  if (/^\/invoices\/[^/]+\/edit$/.test(pathname)) return 'page.editInvoice';
  if (/^\/invoices\/[^/]+$/.test(pathname)) return 'page.invoiceDetail';
  return 'page.invoices';
}

export default function AppLayout() {
  const location = useLocation();
  const intl = useIntl();
  const pageName = intl.formatMessage({ id: getPageNameKey(location.pathname) });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top nav bar (sticky) */}
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Home className="h-4 w-4" />
            <span>/</span>
            <span className="text-gray-900">{pageName}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <UserDropdown />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-[#F7F8FA] px-4 sm:px-8 py-3 sm:py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
