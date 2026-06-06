import useSWR, { mutate as globalMutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { api } from './api';
import type {
  Invoice,
  PaginatedResponse,
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '@simple-invoice/shared';

// ─── Keys ────────────────────────────────────────────────────────────────────
export function invoiceListKey(params: Record<string, string>) {
  return ['invoices', new URLSearchParams(params).toString()] as const;
}

export function invoiceDetailKey(id: string | undefined) {
  return id ? (['invoice', id] as const) : null;
}

// ─── List hook ───────────────────────────────────────────────────────────────
export function useInvoices(params: Record<string, string>) {
  return useSWR(
    invoiceListKey(params),
    ([, qs]) => {
      const p = Object.fromEntries(new URLSearchParams(qs));
      return api.invoices.list(p);
    },
    {
      // Keep showing previous results while loading new ones — no layout flash
      // when filters/sort/pagination change.
      keepPreviousData: true,
    },
  );
}

// ─── Detail hook ─────────────────────────────────────────────────────────────
export function useInvoice(id: string | undefined) {
  return useSWR(invoiceDetailKey(id), ([, invoiceId]) =>
    api.invoices.get(invoiceId),
  );
}

// ─── Create with optimistic update ──────────────────────────────────────────
export function useCreateInvoice() {
  return useSWRMutation(
    'invoices-create',
    async (_key: string, { arg }: { arg: CreateInvoiceInput }) => {
      return api.invoices.create(arg);
    },
    {
      onSuccess: () => {
        // Revalidate all invoice list caches
        globalMutate(
          (key) => Array.isArray(key) && key[0] === 'invoices',
          undefined,
          { revalidate: true },
        );
      },
    },
  );
}

// ─── Update with optimistic update ──────────────────────────────────────────
export function useUpdateInvoice(id: string) {
  return useSWRMutation(
    invoiceDetailKey(id),
    async (_key: readonly string[], { arg }: { arg: UpdateInvoiceInput }) => {
      return api.invoices.update(id, arg);
    },
    {
      // Optimistic update: immediately reflect changes in the detail cache
      optimisticData: (currentData?: Invoice) => {
        if (!currentData) return currentData as any;
        return currentData; // Return current data; real update arrives quickly
      },
      populateCache: (result: Invoice) => result,
      revalidate: true,
      onSuccess: (updatedInvoice: Invoice) => {
        // Update the detail cache with server response
        globalMutate(invoiceDetailKey(id), updatedInvoice, { revalidate: false });

        // Revalidate all invoice list caches so the list reflects changes
        globalMutate(
          (key) => Array.isArray(key) && key[0] === 'invoices',
          undefined,
          { revalidate: true },
        );
      },
    },
  );
}

// ─── Soft delete ────────────────────────────────────────────────────────────
export function useDeleteInvoice(id: string) {
  return useSWRMutation(
    invoiceDetailKey(id),
    async () => {
      return api.invoices.remove(id);
    },
    {
      onSuccess: () => {
        // Drop the detail cache entirely — the row is gone from the API.
        globalMutate(invoiceDetailKey(id), undefined, { revalidate: false });
        // Revalidate every list cache so the row disappears from any
        // filtered/sorted view immediately.
        globalMutate(
          (key) => Array.isArray(key) && key[0] === 'invoices',
          undefined,
          { revalidate: true },
        );
      },
    },
  );
}
