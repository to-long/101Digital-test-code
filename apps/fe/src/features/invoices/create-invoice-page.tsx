import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvoiceSchema, type CreateInvoiceInput, CURRENCIES, CURRENCY_SYMBOLS } from '@simple-invoice/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

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

  const mutation = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.invoices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/');
    },
    onError: (err: Error) => {
      setServerError(err.message);
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

  function onSubmit(data: CreateInvoiceInput) {
    setServerError('');
    mutation.mutate(data);
  }

  function FieldError({ name }: { name: string }) {
    const err = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
    if (!err?.message) return null;
    return <p className="text-sm text-red-600">{err.message as string}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Invoice</h1>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...register('customer.fullname')} placeholder="Customer name" />
              <FieldError name="customer.fullname" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input {...register('customer.email')} type="email" placeholder="customer@example.com" />
              <FieldError name="customer.email" />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input {...register('customer.mobileNumber')} placeholder="+61400000000" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input {...register('customer.address')} placeholder="City, Country" />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Invoice Number *</Label>
              <Input {...register('invoiceNumber')} placeholder="INV-001" />
              <FieldError name="invoiceNumber" />
            </div>
            <div className="space-y-1">
              <Label>Reference</Label>
              <Input {...register('invoiceReference')} placeholder="#REF-123" />
            </div>
            <div className="space-y-1">
              <Label>Invoice Date *</Label>
              <Input {...register('invoiceDate')} type="date" />
              <FieldError name="invoiceDate" />
            </div>
            <div className="space-y-1">
              <Label>Due Date *</Label>
              <Input {...register('dueDate')} type="date" />
              <FieldError name="dueDate" />
            </div>
            <div className="space-y-1">
              <Label>Currency *</Label>
              <Select
                value={currency}
                onValueChange={(v) => setValue('currency', v as any)}
              >
                <SelectTrigger>
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
            <div className="space-y-1">
              <Label>Description</Label>
              <Input {...register('description')} placeholder="Optional description" />
            </div>
          </CardContent>
        </Card>

        {/* Line Item */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Item</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label>Item Name *</Label>
              <Input {...register('item.name')} placeholder="Service or product name" />
              <FieldError name="item.name" />
            </div>
            <div className="space-y-1">
              <Label>Quantity *</Label>
              <Input {...register('item.quantity', { valueAsNumber: true })} type="number" min="1" step="1" />
              <FieldError name="item.quantity" />
            </div>
            <div className="space-y-1">
              <Label>Rate *</Label>
              <Input {...register('item.rate', { valueAsNumber: true })} type="number" min="0.01" step="0.01" />
              <FieldError name="item.rate" />
            </div>
            <div className="space-y-1">
              <Label>Subtotal</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-gray-50 text-sm font-mono">
                {sym}{subTotal.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax & Discount */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax & Discount</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tax (%)</Label>
              <Input {...register('taxPercent', { valueAsNumber: true })} type="number" min="0" step="0.01" />
              <FieldError name="taxPercent" />
            </div>
            <div className="space-y-1">
              <Label>Discount ({sym})</Label>
              <Input {...register('discount', { valueAsNumber: true })} type="number" min="0" step="0.01" />
              <FieldError name="discount" />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calculated Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{sym}{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                <span className="font-mono">{sym}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono">-{sym}{discount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{sym}{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
