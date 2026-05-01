import { json, uid, getUser } from '../_utils';
export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  const totalCost = b.items.reduce((s,i)=> s + (i.quantity * i.unit_cost), 0);
  const totalPrice = b.items.reduce((s,i)=> s + (i.quantity * i.unit_price), 0);
  await env.DB.prepare('INSERT INTO project_estimates (id, project_id, name, total_cost, total_price, margin_pct, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7)')
    .bind(id, b.project_id, b.name, totalCost, totalPrice, ((totalPrice-totalCost)/totalPrice*100), getUser({data})).run();
  for(const it of b.items){
    await env.DB.prepare('INSERT INTO estimate_items (id, estimate_id, category, description, quantity, unit_cost, unit_price) VALUES (?1,?2,?3,?4,?5,?6,?7)')
      .bind(uid(), id, it.category, it.description, it.quantity, it.unit_cost, it.unit_price).run();
  }
  return json({ id, totalCost, totalPrice });
};
