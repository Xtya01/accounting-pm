// functions/api/invoices/generate.ts
import { json, uid, getUser } from '../_utils';

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const { project_id } = await request.json();
  
  // Get unbilled tasks
  const { results: tasks } = await env.DB.prepare(
    'SELECT * FROM tasks WHERE project_id = ?1 AND billable = 1 AND invoiced = 0 AND status = "done"'
  ).bind(project_id).all();
  
  if (tasks.length === 0) return json({ error: 'No billable hours' }, 400);
  
  const { results: [project] } = await env.DB.prepare('SELECT * FROM projects WHERE id = ?1').bind(project_id).all();
  const subtotal = tasks.reduce((sum, t) => sum + (t.hours_logged * project.hourly_rate), 0);
  
  // Create invoice via same logic as invoices.ts
  const id = uid();
  const number = 'INV-' + new Date().getFullYear() + '-' + Math.floor(Math.random()*9000+1000);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
  
  await env.DB.prepare(
    'INSERT INTO invoices (id, number, client_id, project_id, issue_date, due_date, subtotal, vat_rate, vat_amount, total, status, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,8,?8,?9,?10,?11)'
  ).bind(id, number, project.client_id, project_id, today, due, subtotal, 5, vat, total, 'sent', getUser({data})).run();
  
  // Add line items per task
  for (const t of tasks) {
    await env.DB.prepare(
      'INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount) VALUES (?1,?2,?3,?4,?5,?6)'
    ).bind(uid(), id, t.title, t.hours_logged, project.hourly_rate, t.hours_logged * project.hourly_rate).run();
  }
  
  // Mark tasks invoiced
  await env.DB.prepare('UPDATE tasks SET invoiced = 1 WHERE project_id = ?1').bind(project_id).run();
  
  // Double-entry
  const entryId = uid();
  await env.DB.prepare('INSERT INTO journal_entries (id, date, description, reference_type, reference_id, created_by) VALUES (?1,?2,?3,?4,?5,?6)')
    .bind(entryId, today, 'Auto-invoice ' + number, 'invoice', id, getUser({data})).run();
  
  await env.DB.batch([
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, debit) VALUES (?1,?2,?3,?4)').bind(uid(), entryId, '1200', total),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, credit) VALUES (?1,?2,?3,?4)').bind(uid(), entryId, '4000', subtotal),
    env.DB.prepare('INSERT INTO journal_lines (id, entry_id, account_id, credit) VALUES (?1,?2,?3,?4)').bind(uid(), entryId, '2000', vat),
  ]);
  
  return json({ id, number, total, hours: tasks.reduce((s,t)=>s+t.hours_logged,0) });
};
