import LoginPage from '@/features/auth/login-page';
import CreateInvoicePage from '@/features/invoices/create-invoice-page';
import EditInvoicePage from '@/features/invoices/edit-invoice-page';
import InvoiceDetailPage from '@/features/invoices/invoice-detail-page';
import InvoicesPage from '@/features/invoices/invoices-page';
import AppLayout from '@/features/layout/app-layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

/**
 * Bootstrap auth on first render:
 *   - Call /auth/me. If the httpOnly cookie is valid → user is authed.
 *   - If 401 / network → guest.
 *
 * This runs once on app start. After that, login/logout flip the
 * store directly.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const setGuest = useAuthStore((s) => s.setGuest);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (status !== 'idle') return;
    setLoading();
    api.auth
      .me()
      .then((user) => setUser(user))
      .catch(() => setGuest());
  }, [status, setUser, setGuest, setLoading]);

  // Splash while we figure out if the cookie is valid — otherwise the
  // guarded route would briefly redirect to /login then back to / when
  // the user resolves.
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status !== 'authed') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'authed') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            errorRetryCount: 1,
            dedupingInterval: 2000,
          }}
        >
          <AuthBootstrap>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<InvoicesPage />} />
                  <Route path="/invoices/new" element={<CreateInvoicePage />} />
                  <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthBootstrap>
          <Toaster position="bottom-right" richColors closeButton />
        </SWRConfig>
      </LocaleProvider>
    </ThemeProvider>
  );
}
