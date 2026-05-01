import { json, uid } from '../_utils';
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const start = url.searchParams.get('start') || '2026-01-01';
  const end = url.searchParams.get('end') || '2026-12-31';
  
  const { results: [client] } = await env.DB.prepare('SELECT * FROM clients WHERE id=?1').bind(clientId).all();
  const { results: invoices } = await env.DB.prepare('SELECT * FROM invoices WHERE client_id=?1 AND issue_date BETWEEN ?2 AND ?3').bind(clientId, start, end).all();
  const { results: payments } = await env.DB.prepare('SELECT p.* FROM payments p JOIN invoices i ON p.invoice_id=i.id WHERE i.client_id=?1 AND p.date BETWEEN ?2 AND ?3').bind(clientId, start, end).all();
  
  const invoiced = invoices.reduce((s,i)=>s+i.total,0);
  const paid = payments.reduce((s,p)=>s+p.amount,0);
  
  return json({ client, period: {start, end}, opening: client.opening_balance||0, invoiced, paid, closing: (client.opening_balance||0)+invoiced-paid, invoices, payments });
};
