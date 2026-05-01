import { json } from '../_utils';
export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM bank_transactions WHERE reconciled=0 ORDER BY date DESC LIMIT 100').all();
  return json(results);
};
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { id, entry_id } = await request.json();
  await env.DB.prepare('UPDATE bank_transactions SET reconciled=1, matched_entry_id=?1 WHERE id=?2').bind(entry_id, id).run();
  return json({ ok:true });
};
