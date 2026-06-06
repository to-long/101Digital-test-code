import LoginPage from '@/features/auth/login-page';
import CreateInvoicePage from '@/features/invoices/create-invoice-page';
import EditInvoicePage from '@/features/invoices/edit-invoice-page';
import InvoiceDetailPage from '@/features/invoices/invoice-detail-page';
import InvoicesPage from '@/features/invoices/invoices-page';
import AppLayout from '@/features/layout/app-layout';
import { useAuthStore } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
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
          <Toaster position="bottom-right" richColors closeButton />
        </SWRConfig>
      </LocaleProvider>
    </ThemeProvider>
  );
}
