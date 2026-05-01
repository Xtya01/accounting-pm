// functions/api/projects.ts
import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT p.*, c.name as client_name 
    FROM projects p 
    LEFT JOIN clients c ON p.client_id = c.id 
    ORDER BY p.created_at DESC
  `).all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO projects (id, name, client_id, budget, hourly_rate, status, deadline, description, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)'
  ).bind(id, b.name, b.client_id, b.budget, b.hourly_rate || 350, b.status || 'active', b.deadline, b.description, getUser({data})).run();
  return json({ id });
};
