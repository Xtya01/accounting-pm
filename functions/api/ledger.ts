// functions/api/ledger.ts
import { json } from './_utils';

export const onRequestGet: PagesFunction = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT je.date, je.description, coa.code, coa.name as account, jl.debit, jl.credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.entry_id = je.id
    JOIN chart_of_accounts coa ON jl.account_id = coa.id
    ORDER BY je.date DESC, je.id
    LIMIT 200
  `).all();
  return json(results);
};
