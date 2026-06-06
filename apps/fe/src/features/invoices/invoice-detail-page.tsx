import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice } from '@/lib/swr';
import { formatDate, formatCurrency } from '@/lib/format';
import InvoiceStatusBadge from './components/invoice-status-badge';
import { ArrowLeft, Pencil, Printer } from 'lucide-react';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inv, isLoading, error } = useInvoice(id);

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
        <p className="text-gray-500">Invoice not found</p>
        <button
          className="text-blue-500 hover:underline text-sm mt-2"
          onClick={() => navigate('/')}
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const sym = inv.currencySymbol;

  return (
    <div className="space-y-6">
      {/* TOP BAR */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="h-9 w-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Invoice Detail</h1>
            <p className="hidden md:block text-[13px] text-gray-500">
              Issued {formatDate(inv.invoiceDate)} &middot; Due {formatDate(inv.dueDate)} &middot; {inv.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="rounded-full border border-gray-200 bg-white px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span className="text-sm font-medium">Print</span>
          </button>
          {inv.status !== 'Paid' && (
            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="rounded-full bg-blue-500 text-white px-[18px] py-2.5 flex items-center gap-2 hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              <span className="text-sm font-semibold">Edit Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* WHITE SHEET CARD */}
      <div className="rounded-xl border border-gray-200 shadow-sm shadow-lg bg-white p-5 sm:p-10 flex flex-col gap-8">
        {/* a. INVOICE HEADER */}
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 tracking-[1.5px]">INVOICE</p>
            <p className="text-[32px] font-semibold leading-tight mt-1">{inv.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <InvoiceStatusBadge status={inv.status as InvoiceDisplayStatus} />
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-xs text-gray-500 tracking-wide">Issued</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(inv.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 tracking-wide">Due</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(inv.dueDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* b. PARTIES */}
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">FROM</p>
            <p className="text-[15px] font-semibold mt-2">SimpleInvoice</p>
            <p className="text-[13px] text-gray-500 mt-0.5">admin@simpleinvoice.com</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">BILL TO</p>
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
            <div className="flex-1 text-xs font-medium text-gray-500 tracking-wide">DESCRIPTION</div>
            <div className="w-20 text-right text-xs font-medium text-gray-500 tracking-wide">QTY</div>
            <div className="w-[140px] text-right text-xs font-medium text-gray-500 tracking-wide">RATE</div>
            <div className="w-[140px] text-right text-xs font-medium text-gray-500 tracking-wide">AMOUNT</div>
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
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          {/* Notes */}
          <div className="flex-1">
            <p className="text-[11px] font-medium text-gray-500 tracking-[1.5px]">NOTES</p>
            <p className="text-[13px] text-gray-500 leading-relaxed mt-2">
              {inv.description || 'No notes.'}
            </p>
          </div>

          {/* Financial Summary */}
          <div className="w-full md:w-[380px] flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">Subtotal</span>
              <span className="text-[13px] font-medium">{formatCurrency(inv.invoiceSubTotal, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">Tax</span>
              <span className="text-[13px] font-medium">{formatCurrency(inv.totalTax, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-gray-500">Discount</span>
              <span className="text-[13px] font-medium">&minus; {formatCurrency(inv.totalDiscount, sym)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-semibold">{formatCurrency(inv.totalAmount, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-green-600">Paid</span>
              <span className="text-[13px] text-green-600">{formatCurrency(inv.totalPaid, sym)}</span>
            </div>
            <div className="rounded-sm bg-blue-50 border border-blue-500 px-4 py-3.5 flex justify-between">
              <span className="text-[13px] font-semibold">Outstanding balance</span>
              <span className="text-lg font-semibold text-blue-500">{formatCurrency(inv.balanceAmount, sym)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
