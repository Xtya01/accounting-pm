import { json, uid } from '../_utils';
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { project_id } = await request.json();
  const { results: [rev] } = await env.DB.prepare('SELECT SUM(total) as r FROM invoices WHERE project_id=?1').bind(project_id).all();
  const { results: [cost] } = await env.DB.prepare('SELECT SUM(amount) as c FROM expenses WHERE project_id=?1').bind(project_id).all();
  const id = uid();
  await env.DB.prepare('INSERT INTO project_closeouts (id, project_id, close_date, final_revenue, final_cost, final_profit) VALUES (?1,?2,?3,?4,?5,?6)')
    .bind(id, project_id, new Date().toISOString().split('T')[0], rev.r||0, cost.c||0, (rev.r||0)-(cost.c||0)).run();
  await env.DB.prepare('UPDATE projects SET status=?1 WHERE id=?2').bind('Closed', project_id).run();
  return json({ id, profit: (rev.r||0)-(cost.c||0) });
};
