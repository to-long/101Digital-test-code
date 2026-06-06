import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'sonner';
import { useInvoice, useDeleteInvoice } from '@/lib/swr';
import { formatDate, formatCurrency } from '@/lib/format';
import InvoiceStatusBadge from './components/invoice-status-badge';
import { ArrowLeft, Pencil, Printer, Trash2 } from 'lucide-react';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intl = useIntl();

  const { data: inv, isLoading, error } = useInvoice(id);
  const { trigger: triggerDelete, isMutating: isDeleting } = useDeleteInvoice(id!);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!inv) return;
    try {
      await triggerDelete();
      toast.success(intl.formatMessage({ id: 'detail.toast.deleted' }), {
        description: intl.formatMessage(
          { id: 'detail.toast.deletedDesc' },
          { number: inv.invoiceNumber },
        ),
      });
      navigate('/');
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'detail.toast.deleteError' }), {
        description: err.message,
      });
    } finally {
      setConfirmOpen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          <FormattedMessage id="detail.notFound" />
        </p>
        <button
          className="text-blue-500 hover:underline text-sm mt-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <FormattedMessage id="detail.backToInvoices" />
        </button>
      </div>
    );
  }

  const sym = inv.currencySymbol;

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto">
      {/* TOP BAR — sticky directly below the app header.
       * <main> has p-4 sm:p-8 padding, so a plain `top: 0` sticky only
       * reaches main's CONTENT edge (below padding) — a 16/32px strip of
       * padding above it lets card content show through while scrolling.
       * Using `-top-4 sm:-top-8` (negative top matching main's padding)
       * pulls the sticky stop point all the way up to main's BORDER edge,
       * so the bar sits flush against the breadcrumb header with no gap.
       * `-mx`/`-mt` extend the white background full-bleed; `px`/`py` keep
       * the content properly inset. */}
      <div className="sticky -top-3 sm:-top-4 z-20 -mx-4 sm:-mx-8 -mt-3 sm:-mt-4 px-4 sm:px-8 py-2 bg-white border-b border-gray-100 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/')}
            aria-label="Back"
            className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">
              <FormattedMessage id="detail.title" />
            </h1>
            <p className="hidden lg:block text-[11px] text-gray-500 truncate">
              <FormattedMessage
                id="detail.subtitle"
                values={{
                  issued: formatDate(inv.invoiceDate),
                  due: formatDate(inv.dueDate),
                  status: intl.formatMessage({
                    id: `status.${inv.status}`,
                    defaultMessage: inv.status,
                  }),
                }}
              />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 flex items-center gap-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="text-[13px] font-medium">
              <FormattedMessage id="common.print" />
            </span>
          </button>
          {inv.status !== 'Paid' && (
            <>
              <button
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete"
                title={intl.formatMessage({ id: 'detail.delete' })}
                className="rounded-full border border-gray-200 bg-white text-red-600 p-1.5 flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => navigate(`/invoices/${id}/edit`)}
                className="rounded-full bg-blue-500 text-white px-3.5 py-1.5 flex items-center gap-1.5 hover:bg-blue-600 transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="text-[13px] font-semibold">
                  <FormattedMessage id="detail.editInvoice" />
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* WHITE SHEET CARD */}
      <div className="rounded-xl border border-gray-200 shadow-sm shadow-lg bg-white p-5 sm:p-10 flex flex-col gap-8">
        {/* a. INVOICE HEADER */}
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 tracking-[1.5px]">
              <FormattedMessage id="detail.invoice" />
            </p>
            <p className="text-[32px] font-semibold leading-tight mt-1">{inv.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <InvoiceStatusBadge status={inv.status as InvoiceDisplayStatus} />
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-xs text-gray-500 tracking-wide">
                  <FormattedMessage id="detail.issued" />
                </p>
                <p className="text-sm font-medium mt-0.5">{formatDate(inv.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 tracking-wide">
                  <FormattedMessage id="detail.due" />
                </p>
                <p className="text-sm font-medium mt-0.5">{formatDate(inv.dueDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* b. PARTIES */}
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">
              <FormattedMessage id="detail.from" />
            </p>
            <p className="text-[15px] font-semibold mt-2">SimpleInvoice</p>
            <p className="text-[13px] text-gray-500 mt-0.5">admin@simpleinvoice.com</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">
              <FormattedMessage id="detail.billTo" />
            </p>
            <p className="text-[15px] font-semibold mt-2">{inv.customer.fullname}</p>
            <p className="text-[13px] text-gray-500 mt-0.5">{inv.customer.email}</p>
            {inv.customer.mobileNumber && (
              <p className="text-[13px] text-gray-500 mt-0.5">{inv.customer.mobileNumber}</p>
            )}
            {inv.customer.address && (
              <p className="text-[13px] text-gray-500 mt-0.5 leading-[1.5]">{inv.customer.address}</p>
            )}
          </div>
        </div>

        {/* c. LINE ITEMS TABLE */}
        <div className="rounded-sm border border-gray-200">
          {/* Header */}
          <div className="flex bg-[#F7F8FA] px-5 py-3.5">
            <div className="flex-1 text-xs font-medium text-gray-500 tracking-wide">
              <FormattedMessage id="detail.description" />
            </div>
            <div className="w-20 text-right text-xs font-medium text-gray-500 tracking-wide">
              <FormattedMessage id="detail.qty" />
            </div>
            <div className="w-[140px] text-right text-xs font-medium text-gray-500 tracking-wide">
              <FormattedMessage id="detail.rate" />
            </div>
            <div className="w-[140px] text-right text-xs font-medium text-gray-500 tracking-wide">
              <FormattedMessage id="detail.amount" />
            </div>
          </div>
          {/* Rows */}
          {inv.items.map((item) => (
            <div key={item.id} className="flex px-5 py-[18px] border-t border-gray-200 items-start">
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.name}</p>
              </div>
              <div className="w-20 text-right text-sm">{item.quantity}</div>
              <div className="w-[140px] text-right text-sm">{formatCurrency(item.rate, sym)}</div>
              <div className="w-[140px] text-right text-sm">{formatCurrency(item.quantity * item.rate, sym)}</div>
            </div>
          ))}
        </div>

        {/* d. BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          {/* Notes */}
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">
              <FormattedMessage id="detail.notes" />
            </p>
            <p className="text-[13px] text-gray-500 leading-relaxed mt-2">
              {inv.description || intl.formatMessage({ id: 'detail.noNotes' })}
            </p>
          </div>

          {/* Financial Summary */}
          <div className="w-full lg:w-[380px] flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">
                <FormattedMessage id="detail.subtotal" />
              </span>
              <span className="text-[13px] font-medium">{formatCurrency(inv.invoiceSubTotal, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">
                <FormattedMessage id="detail.tax" />
              </span>
              <span className="text-[13px] font-medium">{formatCurrency(inv.totalTax, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">
                <FormattedMessage id="detail.discount" />
              </span>
              <span className="text-[13px] font-medium">&minus; {formatCurrency(inv.totalDiscount, sym)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between">
              <span className="text-lg font-semibold">
                <FormattedMessage id="detail.total" />
              </span>
              <span className="text-lg font-semibold">{formatCurrency(inv.totalAmount, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-green-600">
                <FormattedMessage id="detail.paid" />
              </span>
              <span className="text-[13px] text-green-600">{formatCurrency(inv.totalPaid, sym)}</span>
            </div>
            <div className="rounded-sm bg-blue-50 border border-blue-500 px-4 py-3.5 flex justify-between">
              <span className="text-[13px] font-semibold">
                <FormattedMessage id="detail.outstanding" />
              </span>
              <span className="text-lg font-semibold text-blue-500">{formatCurrency(inv.balanceAmount, sym)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isDeleting && setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">
              <FormattedMessage id="detail.deleteConfirm.title" />
            </h2>
            <p className="mt-2 text-[13px] text-gray-600">
              <FormattedMessage
                id="detail.deleteConfirm.body"
                values={{ number: inv.invoiceNumber }}
              />
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FormattedMessage id="detail.deleteConfirm.cancel" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-600 text-white px-4 py-1.5 text-[13px] font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FormattedMessage id="detail.deleteConfirm.confirm" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
