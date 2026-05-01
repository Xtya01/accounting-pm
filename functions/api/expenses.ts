// functions/api/expenses.ts
import { json, uid, getUser } from './_utils';

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  const vat = b.vat_amount || 0;
  
  await env.DB.prepare(
    'INSERT INTO expenses (id, date, category, description, amount, vat_amount, project_id, account_id, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)'
  ).bind(id, b.date, b.category, b.description, b.amount, vat, b.project_id, b.account_id || '5000', getUser({data})).run();
  
  // Double-entry: Debit Expense, Credit Cash/Payable
  const entryId = uid();
  await env.DB.prepare('INSERT INTO journal_entries (id, date, description, reference_type, reference_id, created_by) VALUES (?1,?2,?3,?4,?5,?6)')
    .bind(entryId, b.date, b.description, 'expense', id, getUser({data})).run();
  
  await env.DB.batch([
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit) VALUES (?1,?2,?3,?4)').bind(uid(), entryId, b.account_id || '5000', b.amount),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, credit) VALUES (?1,?2,?3,?4)').bind(uid(), entryId, '1000', b.amount + vat),
  ]);
  
  return json({ id });
};

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  return json(results);
};
