// functions/api/reports/profitability.ts
import { json } from '../_utils';

export const onRequestGet: PagesFunction = async ({ env, request }) => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');
  
  const query = `
    SELECT 
      p.id, p.name, p.budget,
      COALESCE(i.revenue,0) as revenue,
      COALESCE(e.expenses,0) as expenses,
      COALESCE(i.revenue,0) - COALESCE(e.expenses,0) as profit,
      ROUND((COALESCE(i.revenue,0) - COALESCE(e.expenses,0)) * 100.0 / NULLIF(i.revenue,0), 1) as margin_pct
    FROM projects p
    LEFT JOIN (
      SELECT project_id, SUM(total) as revenue FROM invoices WHERE status != 'draft' GROUP BY project_id
    ) i ON p.id = i.project_id
    LEFT JOIN (
      SELECT project_id, SUM(amount) as expenses FROM expenses GROUP BY project_id
    ) e ON p.id = e.project_id
    ${projectId ? 'WHERE p.id = ?1' : ''}
  `;
  
  const stmt = projectId ? env.DB.prepare(query).bind(projectId) : env.DB.prepare(query);
  const { results } = await stmt.all();
  return json(results);
};
