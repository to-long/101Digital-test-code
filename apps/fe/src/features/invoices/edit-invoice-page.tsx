import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FormattedMessage, useIntl } from 'react-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateInvoiceSchema,
  type UpdateInvoiceInput,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  INVOICE_DB_STATUSES,
  type InvoiceDbStatus,
} from '@simple-invoice/shared';
import { useInvoice, useUpdateInvoice } from '@/lib/swr';
import { errorMessageKey } from '@/lib/form-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, Info } from 'lucide-react';

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const intl = useIntl();

  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(id);
  const { trigger, isMutating } = useUpdateInvoice(id!);

  // Follow the browser history so back/cancel returns to wherever the user
  // came from (list / detail / search results / etc). When the user landed
  // here directly (e.g. opened the URL in a new tab — location.key is
  // 'default'), fall back to the invoice detail page rather than leaving the
  // app entirely.
  function goBack() {
    if (location.key === 'default') {
      navigate(`/invoices/${id}`);
    } else {
      navigate(-1);
    }
  }

  // Defense in depth: Paid invoices are immutable on the server. If the user
  // deep-links to /edit for one (e.g. old bookmark), bounce them to the
  // detail page instead of showing a non-savable form.
  useEffect(() => {
    if (invoice && invoice.status === 'Paid') {
      navigate(`/invoices/${id}`, { replace: true });
    }
  }, [invoice, id, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateInvoiceInput>({
    resolver: zodResolver(updateInvoiceSchema),
    values: invoice
      ? {
          customer: {
            fullname: invoice.customer.fullname,
            email: invoice.customer.email,
            mobileNumber: invoice.customer.mobileNumber ?? undefined,
            address: invoice.customer.address ?? undefined,
          },
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          description: invoice.description ?? undefined,
          status: (invoice.status === 'Overdue' ? 'Pending' : invoice.status) as InvoiceDbStatus,
          item: {
            name: invoice.items[0]?.name ?? '',
            quantity: invoice.items[0]?.quantity ?? 1,
            rate: invoice.items[0]?.rate ?? 0,
          },
          taxPercent:
            invoice.invoiceSubTotal > 0
              ? Math.round((invoice.totalTax / invoice.invoiceSubTotal) * 100 * 100) / 100
              : 10,
          discount: invoice.totalDiscount,
        }
      : undefined,
  });

  const quantity = watch('item.quantity') || 0;
  const rate = watch('item.rate') || 0;
  const taxPercent = watch('taxPercent') || 0;
  const discount = watch('discount') || 0;
  const currency = watch('currency') || 'AUD';
  const status = watch('status') || 'Draft';
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';

  const subTotal = quantity * rate;
  const taxAmount = subTotal * (taxPercent / 100);
  const totalAmount = subTotal + taxAmount - discount;

  async function onSubmit(data: UpdateInvoiceInput) {
    try {
      await trigger(data);
      toast.success(intl.formatMessage({ id: 'edit.toast.success' }), {
        description: intl.formatMessage(
          { id: 'edit.toast.successDesc' },
          { number: invoice?.invoiceNumber ?? '' },
        ),
      });
      navigate(`/invoices/${id}`);
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'edit.toast.error' }), {
        description: err.message,
      });
    }
  }

  function FieldError({ name }: { name: string }) {
    const err = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
    if (!err?.message) return null;
    const message = err.message as string;
    const key = errorMessageKey(message);
    const text = key ? intl.formatMessage({ id: key, defaultMessage: message }) : message;
    return <p className="text-[11px] text-red-600 mt-0.5">{text}</p>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          <FormattedMessage id="detail.notFound" />
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-blue-500 hover:underline text-sm mt-2 cursor-pointer"
        >
          <FormattedMessage id="detail.backToInvoices" />
        </button>
      </div>
    );
  }

  const isPaid = invoice.status === 'Paid';

  return (
    <div className="space-y-4 max-w-[1280px] mx-auto">
      {/* TOP BAR — sticky, matches the detail page chrome */}
      <div className="sticky -top-3 sm:-top-4 z-20 -mx-4 sm:-mx-8 -mt-3 sm:-mt-4 px-4 sm:px-8 py-2 bg-white border-b border-gray-100 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">
              <FormattedMessage id="edit.title" />
            </h1>
            <p className="hidden lg:block text-[11px] text-gray-500 truncate">
              <FormattedMessage id="edit.subtitle" />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={goBack}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <FormattedMessage id="common.cancel" />
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isMutating || isPaid}
            className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Check className="h-3.5 w-3.5" />
            <FormattedMessage id={isMutating ? 'common.updating' : 'common.update'} />
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Customer Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4"><FormattedMessage id="form.customerInfo" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.customerName" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('customer.fullname')}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="customer.fullname" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.customerEmail" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('customer.email')}
                  type="email"
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="customer.email" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700"><FormattedMessage id="form.mobile" /></label>
                <input
                  {...register('customer.mobileNumber')}
                  placeholder="+61400000000"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700"><FormattedMessage id="form.address" /></label>
                <input
                  {...register('customer.address')}
                  placeholder="City, Country"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4"><FormattedMessage id="form.invoiceInfo" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.invoiceNumber" /> <span className="text-red-500">*</span>
                </label>
                <input
                  value={invoice.invoiceNumber}
                  disabled
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-gray-100 text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.currency" /> <span className="text-red-500">*</span>
                </label>
                <Select
                  value={currency}
                  onValueChange={(v) => setValue('currency', v as any)}
                >
                  <SelectTrigger className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c} ({CURRENCY_SYMBOLS[c]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.status" /> <span className="text-red-500">*</span>
                </label>
                <Select
                  value={status}
                  onValueChange={(v) => setValue('status', v as InvoiceDbStatus)}
                >
                  <SelectTrigger className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_DB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {intl.formatMessage({ id: `status.${s}`, defaultMessage: s })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.invoiceDate" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('invoiceDate')}
                  type="date"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="invoiceDate" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.dueDate" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="dueDate" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[13px] font-medium text-gray-700"><FormattedMessage id="form.description" /></label>
                <input
                  {...register('description')}
                  placeholder="Optional description"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Line Item Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4"><FormattedMessage id="form.lineItem" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.itemName" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('item.name')}
                  placeholder="Service or product name"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="item.name" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.quantity" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('item.quantity', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  step="1"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="item.quantity" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.rate" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('item.rate', { valueAsNumber: true })}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="item.rate" />
              </div>
            </div>
          </div>

          {/* Tax & Discount Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4"><FormattedMessage id="form.taxDiscount" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700"><FormattedMessage id="form.taxPercent" /></label>
                <input
                  {...register('taxPercent', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="taxPercent" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700"><FormattedMessage id="form.discount" /> ({sym})</label>
                <input
                  {...register('discount', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="discount" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
          {/* Preview Total Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h3 className="text-sm font-semibold"><FormattedMessage id="form.previewTotal" /></h3>
            <p className="text-[11px] text-gray-500 mt-0.5"><FormattedMessage id="form.previewSubtitle" /></p>
            <div className="border-t border-gray-200 mt-3 pt-3 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500"><FormattedMessage id="detail.subtotal" /></span>
                <span className="font-mono">{sym}{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500"><FormattedMessage id="detail.tax" /> ({taxPercent}%)</span>
                <span className="font-mono">{sym}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500"><FormattedMessage id="detail.discount" /></span>
                <span className="font-mono">-{sym}{discount.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span><FormattedMessage id="detail.total" /></span>
                <span className="font-mono">{sym}{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  <FormattedMessage id="form.editNotice" />
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <FormattedMessage id="form.editNoticeBody" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
