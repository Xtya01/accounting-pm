import { json, uid } from '../_utils';
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '2026-01-01';
  const end = url.searchParams.get('end') || '2026-03-31';
  
  const { results: collected } = await env.DB.prepare(`SELECT SUM(vat_amount) as total FROM invoices WHERE issue_date BETWEEN ?1 AND ?2 AND status!='draft'`).bind(start,end).all();
  const { results: paid } = await env.DB.prepare(`SELECT SUM(vat_amount) as total FROM bills WHERE issue_date BETWEEN ?1 AND ?2`).bind(start,end).all();
  
  const vatOut = collected[0].total || 0;
  const vatIn = paid[0].total || 0;
  
  return json({ period: `${start} to ${end}`, vat_collected: vatOut, vat_paid: vatIn, vat_payable: vatOut - vatIn });
};
