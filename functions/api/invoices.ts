// functions/api/invoices.ts
import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT i.*, c.name as client_name, c.company 
    FROM invoices i 
    LEFT JOIN clients c ON i.client_id = c.id 
    ORDER BY i.issue_date DESC
  `).all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  const number = 'INV-' + new Date().getFullYear() + '-' + Math.floor(Math.random()*9000+1000);
  const vatAmount = (b.subtotal * (b.vat_rate || 5)) / 100;
  const total = b.subtotal + vatAmount;
  
  // 1. Create invoice
  await env.DB.prepare(
    'INSERT INTO invoices (id, number, client_id, project_id, issue_date, due_date, subtotal, vat_rate, vat_amount, total, status, notes, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)'
  ).bind(id, number, b.client_id, b.project_id, b.issue_date, b.due_date, b.subtotal, b.vat_rate || 5, vatAmount, total, 'sent', b.notes, getUser({data})).run();
  
  // 2. Add items
  for (const item of b.items || []) {
    await env.DB.prepare(
      'INSERT INTO invoice_items (id, description, quantity, rate, amount, invoice_id) VALUES (?1,?2,?3,?4,?5,?6)'
    ).bind(uid(), item.description, item.quantity, item.rate, item.amount, id).run();
  }
  
  // 3. DOUBLE-ENTRY POSTING
  const entryId = uid();
  await env.DB.prepare(
    'INSERT INTO journal_entries (id, date, description, reference_type, reference_id, created_by) VALUES (?1,?2,?3,?4,?5,?6)'
  ).bind(entryId, b.issue_date, 'Invoice ' + number, 'invoice', id, getUser({data})).run();
  
  // Debit Accounts Receivable, Credit Revenue, Credit VAT Payable
  await env.DB.batch([
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit, credit) VALUES (?1,?2,?3,?4,0)').bind(uid(), entryId, '1200', total),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit, credit) VALUES (?1,?2,?3,0,?4)').bind(uid(), entryId, '4000', b.subtotal),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit, credit) VALUES (?1,?2,?3,0,?4)').bind(uid(), entryId, '2000', vatAmount),
  ]);
  
  return json({ id, number, total });
};
