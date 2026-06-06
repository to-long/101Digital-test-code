import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';
import { and, asc, desc, eq, gte, ilike, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: 'A$', USD: '$', GBP: '£' };

@Injectable()
export class InvoicesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async list(query: InvoiceQueryDto) {
    const {
      page = 1,
      pageSize = 10,
      sortBy,
      ordering = 'DESC',
      status,
      keyword,
      fromDate,
      toDate,
    } = query;

    const conditions: ReturnType<typeof eq>[] = [];

    // Soft-delete handling:
    //  status=Deleted → show ONLY soft-deleted rows (recycle-bin view).
    //  everything else → hide soft-deleted rows.
    if (status === 'Deleted') {
      conditions.push(sql`${schema.invoices.deletedAt} IS NOT NULL`);
    } else {
      conditions.push(isNull(schema.invoices.deletedAt));
    }

    if (status === 'Overdue') {
      // Match the display logic in mapInvoiceResponse: only Pending invoices
      // past their due date show as Overdue.
      conditions.push(eq(schema.invoices.status, 'Pending'));
      conditions.push(lt(schema.invoices.dueDate, sql`CURRENT_DATE`));
    } else if (status && status !== 'Deleted') {
      // 'Deleted' is handled above (deletedAt IS NOT NULL) — don't try to
      // push it as a DB status, that column only knows Draft/Pending/Paid.
      conditions.push(eq(schema.invoices.status, status as 'Draft' | 'Pending' | 'Paid'));
    }

    if (keyword) {
      conditions.push(
        or(
          ilike(schema.invoices.invoiceNumber, `%${keyword}%`),
          ilike(schema.invoices.customerName, `%${keyword}%`),
        )!,
      );
    }

    if (fromDate) conditions.push(gte(schema.invoices.invoiceDate, fromDate));
    if (toDate) conditions.push(lte(schema.invoices.invoiceDate, toDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.invoices)
      .where(whereClause);

    const sortColumnMap: Record<string, any> = {
      invoiceDate: schema.invoices.invoiceDate,
      dueDate: schema.invoices.dueDate,
      totalAmount: schema.invoices.totalAmount,
    };
    const sortColumn = (sortBy && sortColumnMap[sortBy]) || schema.invoices.createdAt;
    const orderFn = ordering === 'ASC' ? asc : desc;

    const rows = await this.db
      .select()
      .from(schema.invoices)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = await Promise.all(rows.map((inv) => this.mapInvoiceWithItems(inv)));

    return { data, paging: { page, pageSize, total: count } };
  }

  async findOne(id: string) {
    // We DO return soft-deleted rows from this endpoint — the recycle-bin
    // view needs to open their detail to restore them. The displayStatus
    // ('Deleted') signals to the UI which actions are valid (restore vs
    // edit/delete). If you want to hard-hide a row, drop it instead.
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceId, id))
      .limit(1);

    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.mapInvoiceWithItems(invoice);
  }

  /**
   * Restore a soft-deleted invoice by clearing its deletedAt timestamp.
   * No-op if the row was never deleted (returns 200 with the current
   * state — idempotent). 404 if the id is unknown.
   */
  async restore(id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceId, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Invoice not found');

    if (existing.deletedAt) {
      await this.db
        .update(schema.invoices)
        .set({ deletedAt: null })
        .where(eq(schema.invoices.invoiceId, id));
    }

    return this.findOne(id);
  }

  /**
   * Soft delete: stamps `deletedAt = NOW()` on the row instead of removing
   * it, so audit history is preserved. List and detail queries filter on
   * `deletedAt IS NULL`, so the row becomes invisible to the API while the
   * record itself stays. Restoring it later is a single UPDATE.
   *
   * Paid invoices cannot be deleted — same immutability rule as update.
   */
  async softDelete(id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.invoices)
      .where(and(eq(schema.invoices.invoiceId, id), isNull(schema.invoices.deletedAt)))
      .limit(1);

    if (!existing) throw new NotFoundException('Invoice not found');
    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be deleted');
    }

    await this.db
      .update(schema.invoices)
      .set({ deletedAt: sql`NOW()` })
      .where(eq(schema.invoices.invoiceId, id));

    return { invoiceId: id, deleted: true };
  }

  async create(dto: CreateInvoiceDto, userId: string) {
    const existing = await this.db
      .select({ id: schema.invoices.invoiceId })
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceNumber, dto.invoiceNumber))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Invoice number already exists');
    }

    if (new Date(dto.dueDate) < new Date(dto.invoiceDate)) {
      throw new BadRequestException('Due date must be on or after invoice date');
    }

    const subTotal = dto.item.quantity * dto.item.rate;
    const taxAmount = subTotal * (dto.taxPercent / 100);
    const totalAmount = subTotal + taxAmount - dto.discount;
    const balanceAmount = totalAmount;

    return await this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(schema.invoices)
        .values({
          invoiceNumber: dto.invoiceNumber,
          invoiceReference: dto.invoiceReference,
          invoiceDate: dto.invoiceDate,
          dueDate: dto.dueDate,
          currency: dto.currency,
          currencySymbol: CURRENCY_SYMBOLS[dto.currency] || dto.currency,
          description: dto.description,
          status: 'Draft',
          customerName: dto.customer.fullname,
          customerEmail: dto.customer.email,
          customerMobileNumber: dto.customer.mobileNumber,
          customerAddress: dto.customer.address,
          invoiceSubTotal: subTotal.toFixed(2),
          totalTax: taxAmount.toFixed(2),
          totalDiscount: dto.discount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          totalPaid: '0.00',
          balanceAmount: balanceAmount.toFixed(2),
          createdBy: userId,
        })
        .returning();

      const [item] = await tx
        .insert(schema.invoiceItems)
        .values({
          invoiceId: invoice.invoiceId,
          name: dto.item.name,
          quantity: dto.item.quantity,
          rate: dto.item.rate.toFixed(2),
        })
        .returning();

      return this.mapInvoiceResponse(invoice, [item]);
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const [existing] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceId, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Invoice not found');

    // A deleted invoice must be restored before it can be edited again,
    // otherwise edits could silently bring an archived row "back to life"
    // and surprise the user.
    if (existing.deletedAt) {
      throw new BadRequestException('Deleted invoices cannot be edited — restore first');
    }

    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be modified');
    }

    if (new Date(dto.dueDate) < new Date(dto.invoiceDate)) {
      throw new BadRequestException('Due date must be on or after invoice date');
    }

    const subTotal = dto.item.quantity * dto.item.rate;
    const taxAmount = subTotal * (dto.taxPercent / 100);
    const totalAmount = subTotal + taxAmount - dto.discount;
    const totalPaid = Number.parseFloat(existing.totalPaid);
    const balanceAmount = totalAmount - totalPaid;

    return await this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .update(schema.invoices)
        .set({
          invoiceDate: dto.invoiceDate,
          dueDate: dto.dueDate,
          currency: dto.currency,
          currencySymbol: CURRENCY_SYMBOLS[dto.currency] || dto.currency,
          description: dto.description,
          status: dto.status as 'Draft' | 'Pending' | 'Paid',
          customerName: dto.customer.fullname,
          customerEmail: dto.customer.email,
          customerMobileNumber: dto.customer.mobileNumber,
          customerAddress: dto.customer.address,
          invoiceSubTotal: subTotal.toFixed(2),
          totalTax: taxAmount.toFixed(2),
          totalDiscount: dto.discount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          balanceAmount: balanceAmount.toFixed(2),
        })
        .where(eq(schema.invoices.invoiceId, id))
        .returning();

      await tx.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, id));

      const [item] = await tx
        .insert(schema.invoiceItems)
        .values({
          invoiceId: id,
          name: dto.item.name,
          quantity: dto.item.quantity,
          rate: dto.item.rate.toFixed(2),
        })
        .returning();

      return this.mapInvoiceResponse(invoice, [item]);
    });
  }

  private async mapInvoiceWithItems(invoice: typeof schema.invoices.$inferSelect) {
    const items = await this.db
      .select()
      .from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, invoice.invoiceId));

    return this.mapInvoiceResponse(invoice, items);
  }

  private mapInvoiceResponse(
    inv: typeof schema.invoices.$inferSelect,
    items: (typeof schema.invoiceItems.$inferSelect)[],
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.dueDate);

    // Soft-deleted rows surface their state to the UI as 'Deleted' so the
    // recycle-bin view can show a distinct badge + restore action. Overdue
    // is still derived (Pending past-due) for non-deleted rows.
    const displayStatus: InvoiceDisplayStatus = inv.deletedAt
      ? 'Deleted'
      : inv.status === 'Pending' && dueDate < today
        ? 'Overdue'
        : inv.status;

    return {
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber,
      invoiceReference: inv.invoiceReference,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      currencySymbol: inv.currencySymbol,
      description: inv.description,
      status: displayStatus,
      customer: {
        fullname: inv.customerName,
        email: inv.customerEmail,
        mobileNumber: inv.customerMobileNumber,
        address: inv.customerAddress,
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        rate: Number.parseFloat(i.rate),
      })),
      invoiceSubTotal: Number.parseFloat(inv.invoiceSubTotal),
      totalTax: Number.parseFloat(inv.totalTax),
      totalDiscount: Number.parseFloat(inv.totalDiscount),
      totalAmount: Number.parseFloat(inv.totalAmount),
      totalPaid: Number.parseFloat(inv.totalPaid),
      balanceAmount: Number.parseFloat(inv.balanceAmount),
      createdAt: inv.createdAt.toISOString(),
    };
  }
}
