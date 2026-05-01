import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT b.*, v.name as vendor_name FROM bills b LEFT JOIN vendors v ON b.vendor_id=v.id ORDER BY b.due_date
  `).all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  const number = 'BILL-' + Math.floor(Math.random()*90000+10000);
  await env.DB.prepare('INSERT INTO bills (id, number, vendor_id, project_id, issue_date, due_date, subtotal, vat_amount, total, status, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
    .bind(id, number, b.vendor_id, b.project_id, b.issue_date, b.due_date, b.subtotal, b.vat_amount, b.total, 'unpaid', getUser({data})).run();
  
  // Double-entry: Debit Expense, Credit AP
  const entry = uid();
  await env.DB.prepare('INSERT INTO journal_entries (id, date, description, reference_type, reference_id, created_by) VALUES (?1,?2,?3,?4,?5,?6)')
    .bind(entry, b.issue_date, 'Bill '+number, 'bill', id, getUser({data})).run();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit) VALUES (?1,?2,?3,?4)').bind(uid(), entry, '5000', b.subtotal),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, credit) VALUES (?1,?2,?3,?4)').bind(uid(), entry, '2000', b.total),
  ]);
  return json({ id, number });
};
