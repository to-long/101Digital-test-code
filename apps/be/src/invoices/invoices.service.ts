import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, ne, lt, or, ilike, gte, lte, asc, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';
import type { InvoiceQueryDto } from './dto/invoice-query.dto';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: 'A$', USD: '$', GBP: '£' };

@Injectable()
export class InvoicesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async list(query: InvoiceQueryDto) {
    const { page = 1, pageSize = 10, sortBy, ordering = 'DESC', status, keyword, fromDate, toDate } =
      query;

    const conditions: ReturnType<typeof eq>[] = [];

    if (status === 'Overdue') {
      conditions.push(ne(schema.invoices.status, 'Paid'));
      conditions.push(lt(schema.invoices.dueDate, sql`CURRENT_DATE`));
    } else if (status) {
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
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceId, id))
      .limit(1);

    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.mapInvoiceWithItems(invoice);
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

    const displayStatus: InvoiceDisplayStatus =
      inv.status !== 'Paid' && dueDate < today ? 'Overdue' : inv.status;

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
        rate: parseFloat(i.rate),
      })),
      invoiceSubTotal: parseFloat(inv.invoiceSubTotal),
      totalTax: parseFloat(inv.totalTax),
      totalDiscount: parseFloat(inv.totalDiscount),
      totalAmount: parseFloat(inv.totalAmount),
      totalPaid: parseFloat(inv.totalPaid),
      balanceAmount: parseFloat(inv.balanceAmount),
      createdAt: inv.createdAt.toISOString(),
    };
  }
}
