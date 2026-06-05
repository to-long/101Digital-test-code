import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvoiceStatusBadge from './components/invoice-status-badge';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const sortBy = searchParams.get('sortBy') || '';
  const ordering = searchParams.get('ordering') || 'DESC';
  const status = searchParams.get('status') || '';
  const keyword = searchParams.get('keyword') || '';

  const [searchInput, setSearchInput] = useState(keyword);

  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (sortBy) params.sortBy = sortBy;
  if (ordering) params.ordering = ordering;
  if (status) params.status = status;
  if (keyword) params.keyword = keyword;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => api.invoices.list(params),
  });

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!updates.page) next.set('page', '1');
    setSearchParams(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ keyword: searchInput });
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      updateParams({ sortBy: field, ordering: ordering === 'ASC' ? 'DESC' : 'ASC' });
    } else {
      updateParams({ sortBy: field, ordering: 'ASC' });
    }
  }

  const totalPages = data ? Math.ceil(data.paging.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Select value={status} onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/50">
              <th className="px-4 py-3 text-left font-medium">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort('invoiceDate')}>
                <span className="inline-flex items-center gap-1">
                  Invoice Date <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort('dueDate')}>
                <span className="inline-flex items-center gap-1">
                  Due Date <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-3 text-right font-medium cursor-pointer" onClick={() => handleSort('totalAmount')}>
                <span className="inline-flex items-center gap-1 justify-end">
                  Total <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No invoices found
                </td>
              </tr>
            ) : (
              data?.data.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/invoices/${inv.invoiceId}`)}
                >
                  <td className="px-4 py-3 font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.customer.fullname}</td>
                  <td className="px-4 py-3">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(inv.totalAmount, inv.currencySymbol)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status as InvoiceDisplayStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.paging.total)} of {data.paging.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
