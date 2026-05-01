# FlowBooks — Accounting & Project Management for Cloudflare Pages

Complete ERP-lite built for Dubai SMEs. Runs 100% on Cloudflare: Pages + Functions + D1 + R2 + Access.

## What's included
- Frontend: index.html (Tailwind, Chart.js, Lucide)
- Backend: 18 Pages Functions (TypeScript)
- Database: schema.sql (28 tables, 2 views, UAE chart of accounts)
- Config: wrangler.toml

Features: quotations, invoices, bills, expenses, double-entry GL, VAT returns, banking reconciliation, project build-up estimates, teardown closeouts, debtor/creditor aging, statements of account, multi-user via Cloudflare Access.

## 1. Prerequisites
- Cloudflare account (free tier works)
- Wrangler CLI: npm install -g wrangler
- GitHub account

## 2. Create Cloudflare resources

```bash
# Login
wrangler login

# Create D1 database
wrangler d1 create accounting_pm_db
# Copy the database_id from output

# Create R2 bucket for receipts
wrangler r2 bucket create accounting-receipts

# Create Pages project
wrangler pages project create accounting-pm --production-branch main
```

## 3. Configure

Edit `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "accounting_pm_db"
database_id = "PASTE_YOUR_ID_HERE"

[[r2_buckets]]
binding = "RECEIPTS"
bucket_name = "accounting-receipts"
```

## 4. Deploy database schema

```bash
wrangler d1 execute accounting_pm_db --file=./schema.sql --remote
```

This creates all tables, views, and seeds UAE chart of accounts.

## 5. Deploy to Pages

Option A — GitHub (recommended):
1. Push all files to GitHub repo
2. Cloudflare Dashboard → Pages → Create → Connect GitHub
3. Select repo, build command: (leave empty), output: `/`
4. Add bindings in Settings → Functions:
   - D1: DB → accounting_pm_db
   - R2: RECEIPTS → accounting-receipts
   - Variables: ENVIRONMENT=production, DEFAULT_CURRENCY=AED, DEFAULT_VAT=5.0

Option B — Direct upload:
```bash
wrangler pages deploy . --project-name=accounting-pm
```

## 6. Enable Cloudflare Access (multi-user)

1. Zero Trust Dashboard → Access → Applications → Add
2. Type: Self-hosted
3. Domain: your-pages-url.pages.dev
4. Policy: Allow → Emails ending in @yourcompany.ae (or specific emails)
5. Save

Now every API call receives `Cf-Access-Authenticated-User-Email` header. The middleware auto-creates users in D1.

## 7. Switch frontend to API mode

In `index.html`, find line ~50:
```js
const USE_API = location.hostname.includes('pages.dev') || !location.hostname.includes('localhost');
```

Already included. When deployed, app automatically uses `/api/*` instead of localStorage.

## 8. Test checklist

- Visit your pages.dev URL, login via Access
- Dashboard loads, user name appears bottom-left
- Create Customer → check D1: `wrangler d1 execute accounting_pm_db --command="SELECT * FROM clients"`
- Create Quotation → Convert to Invoice → check General Ledger
- Create Project → Add Estimate → Teardown → check project_closeouts
- Clients & Vendors → Debtors → click SOA → PDF prints
- Accounting → VAT Returns → Calculate Q1 → verify numbers

## 9. Production hardening

- Custom domain: Pages → Custom domains → add accounting.yourcompany.ae
- Backups: `wrangler d1 backup create accounting_pm_db`
- Rate limiting: Zero Trust → Gateway policies
- Add second admin: Zero Trust → Access → add email to policy

## 10. UAE compliance notes

- VAT 5% hardcoded, change in wrangler vars if needed
- TRN stored on clients/vendors
- All dates stored ISO, displayed DD/MM/YYYY
- Invoices numbered INV-YYYY-XXXX, quotations QT-YYYY-XXXX
- SOA includes opening/closing for FTA audits

## File structure
```
/
├── index.html
├── schema.sql
├── wrangler.toml
└── functions/
    ├── _middleware.ts
    └── api/
        ├── _utils.ts
        ├── clients.ts
        ├── projects.ts
        ├── tasks.ts
        ├── invoices.ts
        ├── expenses.ts
        ├── quotations.ts
        ├── bills.ts
        ├── ledger.ts
        ├── customers/
        │   ├── debtors.ts
        │   └── statement.ts
        ├── suppliers/
        │   ├── creditors.ts
        │   └── statement.ts
        ├── banking/
        │   └── reconcile.ts
        ├── tax/
        │   └── vat.ts
        └── projects/
            ├── estimate.ts
            └── closeout.ts
```

## Support
All data stays in your Cloudflare account. No third-party services. For help, check wrangler logs: `wrangler pages deployment tail`
