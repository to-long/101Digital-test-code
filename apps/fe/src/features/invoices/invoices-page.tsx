import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { useInvoices } from '@/lib/swr';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';
import { endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { mutate as globalMutate } from 'swr';

const STATUS_COLORS: Record<InvoiceDisplayStatus, string> = {
  Overdue: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
  Paid: 'bg-green-100 text-green-700',
  Draft: 'bg-gray-100 text-gray-600',
};

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const intl = useIntl();

  const page = Number.parseInt(searchParams.get('page') || '1');
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '10');
  const sortBy = searchParams.get('sortBy') || '';
  const ordering = searchParams.get('ordering') || 'DESC';
  const status = searchParams.get('status') || '';
  const keyword = searchParams.get('keyword') || '';
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';

  const [searchInput, setSearchInput] = useState(keyword);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.invoices.remove(deleteTarget.id);
      toast.success(intl.formatMessage({ id: 'detail.toast.deleted' }), {
        description: intl.formatMessage(
          { id: 'detail.toast.deletedDesc' },
          { number: deleteTarget.number },
        ),
      });
      // Revalidate every list cache so the row disappears immediately.
      await globalMutate((key) => Array.isArray(key) && key[0] === 'invoices', undefined, {
        revalidate: true,
      });
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'detail.toast.deleteError' }), {
        description: err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (sortBy) params.sortBy = sortBy;
  if (ordering) params.ordering = ordering;
  if (status) params.status = status;
  if (keyword) params.keyword = keyword;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const { data, isLoading } = useInvoices(params);

  // Delay skeleton appearance by 200ms — if data arrives faster, skip the
  // skeleton entirely to avoid a perceived "flash". keepPreviousData on the
  // SWR hook already prevents the table from emptying during refetches, so
  // the skeleton only ever matters on the first hard load.
  const [delayedShowSkeleton, setDelayedShowSkeleton] = useState(false);
  const skeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading || !data) {
      skeletonTimer.current = setTimeout(() => setDelayedShowSkeleton(true), 200);
    } else {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      setDelayedShowSkeleton(false);
    }
    return () => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
    };
  }, [isLoading, data]);
  const showSkeleton = (isLoading || !data) && delayedShowSkeleton;

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Reset to page 1 when other params change; don't put page=1 in URL
    if (!updates.page) {
      next.delete('page');
    } else if (updates.page === '1') {
      next.delete('page');
    }
    setSearchParams(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ keyword: searchInput });
  }

  function handleSort(field: string) {
    // 3-state cycle: ASC → DESC → cleared → ASC → ...
    if (sortBy !== field) {
      updateParams({ sortBy: field, ordering: 'ASC' });
    } else if (ordering === 'ASC') {
      updateParams({ sortBy: field, ordering: 'DESC' });
    } else {
      // Third click clears the sort entirely
      updateParams({ sortBy: '', ordering: '' });
    }
  }

  // Date range popover with calendar picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const parsedRange: DateRange | undefined =
    fromDate || toDate
      ? {
          from: fromDate ? new Date(fromDate) : undefined,
          to: toDate ? new Date(toDate) : undefined,
        }
      : undefined;
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(parsedRange);

  useEffect(() => {
    setDraftRange(parsedRange);
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!datePickerOpen) return;
    function onClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [datePickerOpen]);

  function toIso(d: Date | undefined): string {
    return d ? format(d, 'yyyy-MM-dd') : '';
  }

  function applyDateRange() {
    updateParams({
      fromDate: toIso(draftRange?.from),
      toDate: toIso(draftRange?.to),
    });
    setDatePickerOpen(false);
  }

  function clearDateRange() {
    setDraftRange(undefined);
    updateParams({ fromDate: '', toDate: '' });
    setDatePickerOpen(false);
  }

  function applyPreset(from: Date, to: Date) {
    setDraftRange({ from, to });
    updateParams({ fromDate: toIso(from), toDate: toIso(to) });
    setDatePickerOpen(false);
  }

  const today = new Date();
  const PRESETS = [
    { labelKey: 'invoices.dateRange.preset.today', from: today, to: today },
    { labelKey: 'invoices.dateRange.preset.last7', from: subDays(today, 6), to: today },
    { labelKey: 'invoices.dateRange.preset.last30', from: subDays(today, 29), to: today },
    { labelKey: 'invoices.dateRange.preset.thisMonth', from: startOfMonth(today), to: today },
    {
      labelKey: 'invoices.dateRange.preset.lastMonth',
      from: startOfMonth(subMonths(today, 1)),
      to: endOfMonth(subMonths(today, 1)),
    },
  ];

  function dateRangeLabel(): string {
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const sameYear = from.getFullYear() === to.getFullYear();
      const sameMonth = sameYear && from.getMonth() === to.getMonth();
      const thisYear = to.getFullYear() === new Date().getFullYear();
      if (sameMonth) {
        return thisYear
          ? `${format(from, 'MMM d')} – ${format(to, 'd')}`
          : `${format(from, 'MMM d')} – ${format(to, 'd, yyyy')}`;
      }
      if (sameYear) {
        return thisYear
          ? `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`
          : `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
      }
      return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
    }
    if (fromDate)
      return intl.formatMessage(
        { id: 'invoices.from' },
        { date: format(new Date(fromDate), 'MMM d, yyyy') },
      );
    if (toDate)
      return intl.formatMessage(
        { id: 'invoices.until' },
        { date: format(new Date(toDate), 'MMM d, yyyy') },
      );
    return intl.formatMessage({ id: 'invoices.allTime' });
  }

  function SortIcon({ field }: { field: string }) {
    // ChevronsUpDown visually reads heavier than single Up/Down at the same
    // box size (two stacked arrows vs one). Use 3.5 across all three so they
    // appear visually consistent in the column header.
    if (sortBy !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />;
    return ordering === 'ASC' ? (
      <ChevronUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
    );
  }

  const totalPages = data ? Math.ceil(data.paging.total / pageSize) : 0;
  const totalItems = data?.paging.total ?? 0;
  const showFrom = (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, totalItems);

  function getPageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (page > 3) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5rem)]">
      {/* TOP SECTION */}
      <div className="flex justify-between items-center mb-3 shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold leading-tight truncate">
            <FormattedMessage id="invoices.title" />
          </h1>
          <p className="hidden md:block text-[12px] text-gray-500 mt-0.5 truncate">
            <FormattedMessage id="invoices.subtitle" />
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="bg-blue-500 text-white rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-sm flex items-center gap-1.5 hover:bg-blue-600 transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <FormattedMessage id="invoices.newInvoice" />
        </Link>
      </div>

      {/* SEARCH / FILTER BAR */}
      <div className="rounded-xl border shadow-sm bg-white p-3.5 flex items-center gap-2.5 mb-5 shrink-0">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={intl.formatMessage({ id: 'invoices.searchPlaceholder' })}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-2.5 pl-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </form>

        <div className="relative">
          <select
            value={status || 'all'}
            onChange={(e) =>
              updateParams({ status: e.target.value === 'all' ? '' : e.target.value })
            }
            className="appearance-none rounded-xl border px-3.5 py-2.5 pr-8 text-[13px] font-medium cursor-pointer outline-none focus:border-blue-400 bg-white"
          >
            <option value="all">{intl.formatMessage({ id: 'invoices.allStatuses' })}</option>
            <option value="Draft">{intl.formatMessage({ id: 'status.Draft' })}</option>
            <option value="Pending">{intl.formatMessage({ id: 'status.Pending' })}</option>
            <option value="Paid">{intl.formatMessage({ id: 'status.Paid' })}</option>
            <option value="Overdue">{intl.formatMessage({ id: 'status.Overdue' })}</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => setDatePickerOpen((v) => !v)}
            className="rounded-xl border bg-white px-3.5 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-[13px] font-medium text-gray-800 whitespace-nowrap">
              {dateRangeLabel()}
            </span>
            {(fromDate || toDate) && (
              <X
                className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDateRange();
                }}
              />
            )}
          </button>

          {datePickerOpen && (
            <div className="absolute right-0 top-full mt-2 z-30 rounded-xl border border-gray-200 bg-white shadow-lg flex">
              {/* Presets */}
              <div className="border-r border-gray-200 p-1.5 flex flex-col gap-0.5 w-28">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.labelKey}
                    type="button"
                    onClick={() => applyPreset(preset.from, preset.to)}
                    className="text-left text-[12px] text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors"
                  >
                    <FormattedMessage id={preset.labelKey} />
                  </button>
                ))}
                <div className="border-t border-gray-200 my-0.5" />
                <button
                  type="button"
                  onClick={clearDateRange}
                  className="text-left text-[12px] text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors"
                >
                  <FormattedMessage id="invoices.allTime" />
                </button>
              </div>

              {/* Calendar + footer */}
              <div className="p-2.5 flex flex-col gap-2.5">
                <CalendarPicker
                  mode="range"
                  numberOfMonths={1}
                  selected={draftRange}
                  onSelect={setDraftRange}
                />
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-500">
                    {draftRange?.from && draftRange?.to
                      ? `${format(draftRange.from, 'MMM d')} – ${format(draftRange.to, 'MMM d, yyyy')}`
                      : draftRange?.from
                        ? `From ${format(draftRange.from, 'MMM d, yyyy')}`
                        : 'Select a date range'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDatePickerOpen(false)}
                      aria-label="Cancel"
                      title="Cancel"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={applyDateRange}
                      disabled={!draftRange?.from}
                      aria-label="Apply"
                      title="Apply"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="rounded-xl border shadow-sm bg-white flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-20">
            <tr className="h-12 border-b">
              {/* Every <th> gets its own bg — putting bg only on <tr> doesn't
                  paint the sticky cells, so body content leaks through on
                  scroll. The Invoice # column needs a higher z-index because
                  it's ALSO sticky horizontally. */}
              <th className="px-[18px] text-left w-40 sticky left-0 z-30 bg-[#FAFAFA] border-b border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.invoiceNumber" />
                </span>
              </th>
              <th className="px-[18px] text-left bg-[#FAFAFA] border-b border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.customer" />
                </span>
              </th>
              <th
                className="px-[18px] text-left w-[140px] cursor-pointer select-none bg-[#FAFAFA] border-b border-gray-200"
                onClick={() => handleSort('invoiceDate')}
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.invoiceDate" />
                  <SortIcon field="invoiceDate" />
                </span>
              </th>
              <th
                className="px-[18px] text-left w-[140px] cursor-pointer select-none bg-[#FAFAFA] border-b border-gray-200"
                onClick={() => handleSort('dueDate')}
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.dueDate" />
                  <SortIcon field="dueDate" />
                </span>
              </th>
              <th
                className="px-[18px] text-right w-[140px] cursor-pointer select-none bg-[#FAFAFA] border-b border-gray-200"
                onClick={() => handleSort('totalAmount')}
              >
                <span className="inline-flex items-center gap-1 justify-end text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.total" />
                  <SortIcon field="totalAmount" />
                </span>
              </th>
              <th className="px-[18px] text-center w-[160px] bg-[#FAFAFA] border-b border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="invoices.column.status" />
                </span>
              </th>
              <th className="px-[18px] text-right w-[100px] bg-[#FAFAFA] border-b border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <FormattedMessage id="common.actions" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="h-16 border-b group bg-white">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td
                      key={j}
                      className={`px-[18px] ${j === 0 ? 'sticky left-0 z-10 bg-white' : ''}`}
                    >
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-[18px] py-12 text-center text-gray-400 text-sm">
                  <FormattedMessage id="invoices.empty" />
                </td>
              </tr>
            ) : (
              data?.data.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  className="h-16 border-b group bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* z-10: above other body cells (horizontal sticky),
                      below thead (which is z-20 / z-30). */}
                  <td className="px-[18px] sticky left-0 z-10 bg-white group-hover:bg-gray-50 transition-colors">
                    <Link
                      to={`/invoices/${inv.invoiceId}`}
                      className="text-[13px] font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-[18px]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{inv.customer.fullname}</span>
                      <span className="text-[11px] text-gray-400">{inv.customer.email}</span>
                    </div>
                  </td>
                  <td className="px-[18px]">
                    <span className="text-[13px] text-gray-800">{formatDate(inv.invoiceDate)}</span>
                  </td>
                  <td className="px-[18px]">
                    <span className="text-[13px] text-gray-800">{formatDate(inv.dueDate)}</span>
                  </td>
                  <td className="px-[18px] text-right">
                    <span className="text-sm font-semibold">
                      {formatCurrency(inv.totalAmount, inv.currencySymbol)}
                    </span>
                  </td>
                  <td className="px-[18px] text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_COLORS[inv.status as InvoiceDisplayStatus] || 'bg-gray-100 text-gray-600'}`}
                    >
                      <FormattedMessage id={`status.${inv.status}`} defaultMessage={inv.status} />
                    </span>
                  </td>
                  <td className="px-[18px] text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* Edit + Delete are hidden for Paid invoices — same
                          rule the server enforces. View stays on the right. */}
                      {inv.status !== 'Paid' && (
                        <>
                          <Link
                            to={`/invoices/${inv.invoiceId}/edit`}
                            aria-label="Edit"
                            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({
                                id: inv.invoiceId,
                                number: inv.invoiceNumber,
                              });
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <Link
                        to={`/invoices/${inv.invoiceId}`}
                        aria-label="View"
                        className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION — reserved space (h-8 mt-4) so layout doesn't jump on first load */}
      <div className="min-h-8 mt-4 shrink-0">
        {data && totalPages > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              <FormattedMessage
                id="invoices.pagination.showing"
                values={{ from: showFrom, to: showTo, total: totalItems }}
              />
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((p, i) =>
                p === 'ellipsis' ? (
                  <span
                    key={`e-${i}`}
                    className="w-8 h-8 flex items-center justify-center text-[13px] text-gray-400"
                  >
                    &hellip;
                  </span>
                ) : (
                  <button
                    type="button"
                    key={p}
                    onClick={() => updateParams({ page: String(p) })}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl border text-[13px] cursor-pointer transition-colors ${
                      p === page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm dialog — shared across rows, parameterized by deleteTarget */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
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
                values={{ number: deleteTarget.number }}
              />
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FormattedMessage id="detail.deleteConfirm.cancel" />
              </button>
              <button
                type="button"
                onClick={confirmDelete}
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
