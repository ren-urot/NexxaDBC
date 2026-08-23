import { NextResponse } from 'next/server';
import { listCustomerHistory } from '@/lib/db/customer-history';

function csvEscape(value: string): string {
  // Formula injection: Excel/Sheets treat a cell starting with =, +, -, @,
  // tab, or CR as an executable formula, not literal text — every value
  // here originates from unauthenticated Builder input, and this file's
  // whole purpose is to be opened directly in a spreadsheet. A leading
  // apostrophe forces literal-text interpretation without changing the
  // visible value. This also fixes a real (non-malicious) data bug: every
  // Philippine mobile number starts with "+" and would otherwise be
  // silently misparsed as a formula and stripped down to nothing.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

const HEADER = [
  'Order ID',
  'First Name',
  'Last Name',
  'Job Title',
  'Company',
  'Mobile',
  'Email',
  'Template',
  'Amount',
  'Order Date',
  'Archived At',
];

export async function GET() {
  try {
    const history = await listCustomerHistory();
    const rows = history.map(row => [
      row.orderId,
      row.firstName ?? '',
      row.lastName ?? '',
      row.jobTitle ?? '',
      row.company ?? '',
      row.mobile ?? '',
      row.email ?? '',
      row.templateId,
      String(row.amount),
      row.orderCreatedAt.toISOString(),
      row.archivedAt.toISOString(),
    ]);
    const csv = [HEADER, ...rows].map(fields => fields.map(csvEscape).join(',')).join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="customer-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
