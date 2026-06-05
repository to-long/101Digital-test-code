import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import InvoiceStatusBadge from './components/invoice-status-badge';
import { ArrowLeft } from 'lucide-react';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.get(id!),
    enabled: !!id,
  });

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
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="link" onClick={() => navigate('/')}>Back to invoices</Button>
      </div>
    );
  }

  const sym = inv.currencySymbol;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{inv.invoiceNumber}</h1>
            <InvoiceStatusBadge status={inv.status as InvoiceDisplayStatus} />
          </div>
          {inv.invoiceReference && (
            <p className="text-sm text-muted-foreground">Ref: {inv.invoiceReference}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Invoice Date" value={formatDate(inv.invoiceDate)} />
            <Row label="Due Date" value={formatDate(inv.dueDate)} />
            <Row label="Currency" value={`${inv.currency} (${sym})`} />
            {inv.description && <Row label="Description" value={inv.description} />}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={inv.customer.fullname} />
            <Row label="Email" value={inv.customer.email} />
            {inv.customer.mobileNumber && <Row label="Mobile" value={inv.customer.mobileNumber} />}
            {inv.customer.address && <Row label="Address" value={inv.customer.address} />}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(item.rate, sym)}</td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(item.quantity * item.rate, sym)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <Row label="Subtotal" value={formatCurrency(inv.invoiceSubTotal, sym)} />
            <Row label="Tax" value={formatCurrency(inv.totalTax, sym)} />
            <Row label="Discount" value={`-${formatCurrency(inv.totalDiscount, sym)}`} />
            <div className="border-t pt-2">
              <Row label="Total Amount" value={formatCurrency(inv.totalAmount, sym)} bold />
            </div>
            <Row label="Total Paid" value={formatCurrency(inv.totalPaid, sym)} />
            <div className="border-t pt-2">
              <Row label="Balance Due" value={formatCurrency(inv.balanceAmount, sym)} bold />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
