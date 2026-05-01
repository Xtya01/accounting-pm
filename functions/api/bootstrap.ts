import { json } from './_utils';
export const onRequestGet: PagesFunction = async ({ env }) => {
  const [clients, projects, invoices] = await Promise.all([
    env.DB.prepare('SELECT * FROM clients LIMIT 50').all(),
    env.DB.prepare('SELECT * FROM projects LIMIT 50').all(),
    env.DB.prepare('SELECT * FROM invoices ORDER BY issue_date DESC LIMIT 50').all(),
  ]);
  return json({ clients: clients.results, projects: projects.results, invoices: invoices.results });
};
