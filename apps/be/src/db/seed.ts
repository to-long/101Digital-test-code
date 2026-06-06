import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { invoiceItems, invoices, users } from './schema';

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: 'A$', USD: '$', GBP: '£' };

const CUSTOMERS = [
  { fullname: 'Paul', email: 'paul@101digital.io', mobile: '947717364111', address: 'Singapore' },
  {
    fullname: 'Alice Wong',
    email: 'alice@acme.com',
    mobile: '+61400111222',
    address: 'Sydney, Australia',
  },
  { fullname: 'Bob Smith', email: 'bob@widgets.co', mobile: '+44700123456', address: 'London, UK' },
  {
    fullname: 'Charlie Lee',
    email: 'charlie@techstart.io',
    mobile: '+1650555888',
    address: 'San Francisco, USA',
  },
  {
    fullname: 'Diana Patel',
    email: 'diana@globalserv.com',
    mobile: '+61412333444',
    address: 'Melbourne, Australia',
  },
  {
    fullname: 'Edward Kim',
    email: 'edward@nexus.kr',
    mobile: '+82101234567',
    address: 'Seoul, South Korea',
  },
  {
    fullname: 'Fiona Chen',
    email: 'fiona@skyline.hk',
    mobile: '+85291234567',
    address: 'Hong Kong',
  },
  {
    fullname: 'George Martin',
    email: 'george@crafted.co.uk',
    mobile: '+44701234567',
    address: 'Manchester, UK',
  },
];

const ITEMS = [
  'Honda RC150',
  'Web Development Service',
  'Cloud Hosting (12 months)',
  'UI/UX Design Package',
  'SEO Optimization',
  'Mobile App Development',
  'Data Analytics Dashboard',
  'Server Maintenance',
  'Consulting Services',
  'Logo Design',
  'API Integration',
  'Cybersecurity Audit',
];

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);

  console.log('Seeding database...');

  // Clear existing data
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(users);

  // Create user
  const passwordHash = await bcrypt.hash('password123', 10);
  const [user] = await db
    .insert(users)
    .values({
      email: 'admin@simpleinvoice.com',
      passwordHash,
      fullname: 'Admin User',
    })
    .returning();

  console.log(`Created user: ${user.email}`);

  // Seed the mock data from Appendix A first
  const mockInvoice = await db
    .insert(invoices)
    .values({
      invoiceNumber: 'IV1780488206995',
      invoiceReference: '#5721662',
      invoiceDate: '2026-06-03',
      dueDate: '2026-07-03',
      currency: 'AUD',
      currencySymbol: 'A$',
      description: 'Invoice is issued to Kanglee',
      status: 'Pending',
      customerName: 'Paul',
      customerEmail: 'paul@101digital.io',
      customerMobileNumber: '947717364111',
      customerAddress: 'Singapore',
      invoiceSubTotal: '2000.00',
      totalTax: '200.00',
      totalDiscount: '20.00',
      totalAmount: '2180.00',
      totalPaid: '1451.34',
      balanceAmount: '728.66',
      createdBy: user.id,
    })
    .returning();

  await db.insert(invoiceItems).values({
    invoiceId: mockInvoice[0].invoiceId,
    name: 'Honda RC150',
    quantity: 2,
    rate: '1000.00',
  });

  // Generate 99 additional invoices (total 100 → 10 pages × 10 rows)
  // Distribute statuses so every filter has plenty of results:
  //   - ~40% Pending (some past-due → Overdue), ~30% Paid, ~30% Draft
  const currencies = ['AUD', 'USD', 'GBP'] as const;
  const taxRates = [0, 5, 10, 15];

  function pickStatus(i: number): 'Draft' | 'Pending' | 'Paid' {
    const m = i % 10;
    if (m < 3) return 'Draft'; // 30%
    if (m < 7) return 'Pending'; // 40%
    return 'Paid'; // 30%
  }

  const TOTAL_GENERATED = 99;
  for (let i = 1; i <= TOTAL_GENERATED; i++) {
    const customer = randomChoice(CUSTOMERS);
    const currency = randomChoice([...currencies]);
    const status = pickStatus(i);

    // Wider date spread — Jan 2025 through Jun 2026 — so date range filter is meaningful.
    const invoiceDate = randomDate(new Date('2025-01-01'), new Date('2026-06-05'));

    // Mix due-date offsets. For Pending invoices, ~40% are intentionally past-due
    // (negative offset) so the Overdue filter has results too.
    let dueDays: number;
    if (status === 'Pending' && Math.random() < 0.4) {
      dueDays = randomInt(-90, -1); // past due → Overdue
    } else {
      dueDays = randomInt(15, 60);
    }
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + dueDays);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const quantity = randomInt(1, 50);
    const rate = randomInt(10, 5000);
    const taxPercent = randomChoice(taxRates);
    const discount = Math.random() > 0.5 ? randomInt(0, 200) : 0;

    const subTotal = quantity * rate;
    const taxAmount = subTotal * (taxPercent / 100);
    const totalAmount = subTotal + taxAmount - discount;
    const totalPaid =
      status === 'Paid'
        ? totalAmount
        : status === 'Pending'
          ? randomInt(0, Math.floor(totalAmount * 0.8))
          : 0;
    const balanceAmount = totalAmount - totalPaid;

    const invNum = `INV-${String(i).padStart(3, '0')}`;

    const [inv] = await db
      .insert(invoices)
      .values({
        invoiceNumber: invNum,
        invoiceReference: Math.random() > 0.5 ? `#REF-${randomInt(1000, 9999)}` : undefined,
        invoiceDate,
        dueDate: dueDateStr,
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency],
        description: Math.random() > 0.3 ? `Invoice for ${randomChoice(ITEMS)}` : undefined,
        status,
        customerName: customer.fullname,
        customerEmail: customer.email,
        customerMobileNumber: customer.mobile,
        customerAddress: customer.address,
        invoiceSubTotal: subTotal.toFixed(2),
        totalTax: taxAmount.toFixed(2),
        totalDiscount: discount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        balanceAmount: balanceAmount.toFixed(2),
        createdBy: user.id,
      })
      .returning();

    await db.insert(invoiceItems).values({
      invoiceId: inv.invoiceId,
      name: randomChoice(ITEMS),
      quantity,
      rate: rate.toFixed(2),
    });
  }

  console.log(
    `Seeded ${TOTAL_GENERATED + 1} invoices (1 fixed mock + ${TOTAL_GENERATED} generated)`,
  );
  console.log('Default login: admin@simpleinvoice.com / password123');

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
