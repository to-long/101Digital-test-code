import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorMessageKey } from '@/lib/form-error';
import { useCreateInvoice } from '@/lib/swr';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  type CreateInvoiceInput,
  createInvoiceSchema,
} from '@simple-invoice/shared';
import { ArrowLeft, Info, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const { trigger, isMutating } = useCreateInvoice();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      taxPercent: 10,
      discount: 0,
      currency: 'AUD',
      item: { quantity: 1, rate: 0 },
    },
  });

  const quantity = watch('item.quantity') || 0;
  const rate = watch('item.rate') || 0;
  const taxPercent = watch('taxPercent') || 0;
  const discount = watch('discount') || 0;
  const currency = watch('currency') || 'AUD';
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';

  const subTotal = quantity * rate;
  const taxAmount = subTotal * (taxPercent / 100);
  const totalAmount = subTotal + taxAmount - discount;

  async function onSubmit(data: CreateInvoiceInput) {
    try {
      await trigger(data);
      toast.success(intl.formatMessage({ id: 'create.toast.success' }), {
        description: intl.formatMessage(
          { id: 'create.toast.successDesc' },
          { number: data.invoiceNumber },
        ),
      });
      navigate('/');
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'create.toast.error' }), {
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

  return (
    <div className="space-y-4 max-w-[1280px] mx-auto">
      {/* TOP BAR — sticky, matches the detail page chrome */}
      <div className="sticky -top-3 sm:-top-4 z-20 -mx-4 sm:-mx-8 -mt-3 sm:-mt-4 px-4 sm:px-8 py-2 bg-white border-b border-gray-100 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back"
            className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">
              <FormattedMessage id="create.title" />
            </h1>
            <p className="hidden lg:block text-[11px] text-gray-500 truncate">
              <FormattedMessage id="create.subtitle" />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <FormattedMessage id="common.cancel" />
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isMutating}
            className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Save className="h-3.5 w-3.5" />
            <FormattedMessage id={isMutating ? 'common.saving' : 'common.save'} />
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col lg:flex-row gap-4">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Customer Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4">
              <FormattedMessage id="form.customerInfo" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.customerName" />{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('customer.fullname')}
                  placeholder={intl.formatMessage({ id: 'form.customerName' })}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="customer.fullname" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.customerEmail" />{' '}
                  <span className="text-red-500">*</span>
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
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.mobile" />
                </label>
                <input
                  {...register('customer.mobileNumber')}
                  placeholder="+61400000000"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.address" />
                </label>
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
            <h2 className="text-base font-semibold mb-4">
              <FormattedMessage id="form.invoiceInfo" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.invoiceNumber" />{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('invoiceNumber')}
                  placeholder="INV-001"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <FieldError name="invoiceNumber" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.currency" /> <span className="text-red-500">*</span>
                </label>
                <Select value={currency} onValueChange={(v) => setValue('currency', v as any)}>
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
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.status" />
                </label>
                <div className="w-full rounded-xl border border-gray-300 bg-[#F5F5F5] py-2.5 px-3.5 text-sm text-gray-700">
                  <FormattedMessage id="status.Draft" />
                </div>
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
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.description" />
                </label>
                <input
                  {...register('description')}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Line Item Card */}
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold mb-4">
              <FormattedMessage id="form.lineItem" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.itemName" /> <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('item.name')}
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
            <h2 className="text-base font-semibold mb-4">
              <FormattedMessage id="form.taxDiscount" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.taxPercent" />
                </label>
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
                <label className="text-[13px] font-medium text-gray-700">
                  <FormattedMessage id="form.discount" /> ({sym})
                </label>
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
            <h3 className="text-sm font-semibold">
              <FormattedMessage id="form.previewTotal" />
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              <FormattedMessage id="form.previewSubtitle" />
            </p>
            <div className="border-t border-gray-200 mt-3 pt-3 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">
                  <FormattedMessage id="detail.subtotal" />
                </span>
                <span className="font-mono">
                  {sym}
                  {subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">
                  <FormattedMessage id="detail.tax" /> ({taxPercent}%)
                </span>
                <span className="font-mono">
                  {sym}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">
                  <FormattedMessage id="detail.discount" />
                </span>
                <span className="font-mono">
                  -{sym}
                  {discount.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>
                  <FormattedMessage id="detail.total" />
                </span>
                <span className="font-mono">
                  {sym}
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Draft Info Alert */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  <FormattedMessage id="form.draftNotice" />
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <FormattedMessage id="form.draftNoticeBody" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
