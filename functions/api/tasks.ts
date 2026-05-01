// functions/api/tasks.ts
import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');
  let query = 'SELECT * FROM tasks';
  if (projectId) query += ' WHERE project_id = ?1';
  query += ' ORDER BY created_at DESC';
  const stmt = projectId ? env.DB.prepare(query).bind(projectId) : env.DB.prepare(query);
  const { results } = await stmt.all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const b = await request.json();
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO tasks (id, project_id, title, status, priority, assignee, due_date, hours_logged, billable, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)'
  ).bind(id, b.project_id, b.title, b.status || 'backlog', b.priority, b.assignee, b.due_date, b.hours_logged || 0, b.billable ? 1 : 0, getUser({data})).run();
  return json({ id });
};

export const onRequestPut: PagesFunction = async ({ request, env }) => {
  const b = await request.json();
  await env.DB.prepare(
    'UPDATE tasks SET status=?1, hours_logged=?2, title=?3 WHERE id=?4'
  ).bind(b.status, b.hours_logged, b.title, b.id).run();
  return json({ ok: true });
};
