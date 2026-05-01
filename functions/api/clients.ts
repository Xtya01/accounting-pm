// functions/api/clients.ts
import { json, uid, getUser } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM clients ORDER BY created_at DESC'
  ).all();
  return json(results);
};

export const onRequestPost: PagesFunction = async ({ request, env, data }) => {
  const body = await request.json();
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO clients (id, name, company, email, phone, trn, created_by) VALUES (?1,?2,?3,?4,?5,?6,?7)'
  ).bind(id, body.name, body.company, body.email, body.phone, body.trn || '', getUser({data})).run();
  return json({ id, ...body });
};
