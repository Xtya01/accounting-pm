import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT q.*, c.company as client_name FROM quotations q 
    LEFT JOIN clients c ON q.client_id = c.id ORDER BY q.issue_date DESC
  `).all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  const number = 'QT-' + new Date().getFullYear() + '-' + Math.floor(Math.random()*9000+1000);
  const vat = b.subtotal * 0.05;
  await env.DB.prepare(
    'INSERT INTO quotations (id, number, client_id, project_id, issue_date, expiry_date, subtotal, vat_rate, vat_amount, total, status, notes, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,8,?8,?9,?10,?11,?12)'
  ).bind(id, number, b.client_id, b.project_id, b.issue_date, b.expiry_date, b.subtotal, 5, vat, b.subtotal+vat, 'sent', b.notes, getUser({data})).run();
  
  for(const it of b.items||[]) {
    await env.DB.prepare('INSERT INTO quotation_items (id, quotation_id, description, quantity, rate, amount) VALUES (?1,?2,?3,?4,?5,?6)')
      .bind(uid(), id, it.description, it.quantity, it.rate, it.amount).run();
  }
  return json({ id, number });
};
