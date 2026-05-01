import { json } from '../_utils';
export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM debtor_aging ORDER BY total_due DESC').all();
  return json(results);
};
