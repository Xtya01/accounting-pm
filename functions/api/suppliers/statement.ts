import { json } from '../_utils';
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const vendorId = url.searchParams.get('vendor_id');
  const start = url.searchParams.get('start') || '2026-01-01';
  const end = url.searchParams.get('end') || '2026-12-31';
  
  const { results: [vendor] } = await env.DB.prepare('SELECT * FROM vendors WHERE id=?1').bind(vendorId).all();
  const { results: bills } = await env.DB.prepare('SELECT * FROM bills WHERE vendor_id=?1 AND issue_date BETWEEN ?2 AND ?3').bind(vendorId, start, end).all();
  
  const billed = bills.reduce((s,b)=>s+b.total,0);
  // payments to suppliers not implemented yet, assume 0
  const paid = 0;
  
  return json({ vendor, period:{start,end}, opening: vendor.opening_balance||0, billed, paid, closing: (vendor.opening_balance||0)+billed-paid, bills });
};
