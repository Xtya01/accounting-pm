-- Cloudflare D1 - Accounting + PM with Double-Entry
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  trn TEXT, -- UAE Tax Registration Number
  balance REAL DEFAULT 0,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id),
  budget REAL,
  hourly_rate REAL DEFAULT 350, -- AED default for Dubai
  status TEXT DEFAULT 'active',
  deadline DATE,
  description TEXT,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  assignee TEXT REFERENCES users(email),
  due_date DATE,
  hours_logged REAL DEFAULT 0,
  billable INTEGER DEFAULT 1,
  invoiced INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chart_of_accounts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
  parent_id TEXT
);

INSERT INTO chart_of_accounts (id, code, name, type) VALUES
('1000','1000','Cash','Asset'),
('1200','1200','Accounts Receivable','Asset'),
('2000','2000','Accounts Payable','Liability'),
('3000','3000','Owner Equity','Equity'),
('4000','4000','Service Revenue','Revenue'),
('5000','5000','Project Expenses','Expense'),
('5100','5100','Software Subscriptions','Expense'),
('5200','5200','Office Expenses','Expense');

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT,
  reference_type TEXT, -- invoice, expense, payment
  reference_id TEXT,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES chart_of_accounts(id),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  issue_date DATE,
  due_date DATE,
  subtotal REAL,
  vat_rate REAL DEFAULT 5.0,
  vat_amount REAL,
  total REAL,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by TEXT REFERENCES users(email)
);

CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity REAL,
  rate REAL,
  amount REAL
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  date DATE,
  category TEXT,
  description TEXT,
  amount REAL,
  vat_amount REAL DEFAULT 0,
  project_id TEXT REFERENCES projects(id),
  receipt_url TEXT,
  account_id TEXT DEFAULT '5000',
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id),
  date DATE,
  amount REAL,
  method TEXT,
  created_by TEXT REFERENCES users(email)
);

-- Indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_journal_date ON journal_entries(date);


-- === FULL ACCOUNTING MODULES ===

CREATE TABLE quotations (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  issue_date DATE,
  expiry_date DATE,
  subtotal REAL,
  vat_rate REAL DEFAULT 5.0,
  vat_amount REAL,
  total REAL,
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, invoiced
  notes TEXT,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT,
  quantity REAL,
  rate REAL,
  amount REAL
);

CREATE TABLE credit_notes (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  invoice_id TEXT REFERENCES invoices(id),
  client_id TEXT REFERENCES clients(id),
  date DATE,
  reason TEXT,
  subtotal REAL,
  vat_amount REAL,
  total REAL,
  status TEXT DEFAULT 'issued',
  created_by TEXT REFERENCES users(email)
);

CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  trn TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  vendor_id TEXT REFERENCES vendors(id),
  project_id TEXT REFERENCES projects(id),
  issue_date DATE,
  due_date DATE,
  subtotal REAL,
  vat_amount REAL,
  total REAL,
  status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  created_by TEXT REFERENCES users(email)
);

CREATE TABLE bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT REFERENCES bills(id) ON DELETE CASCADE,
  description TEXT,
  quantity REAL,
  rate REAL,
  amount REAL,
  account_id TEXT REFERENCES chart_of_accounts(id)
);

CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  currency TEXT DEFAULT 'AED',
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0
);

INSERT INTO bank_accounts (id, name, bank_name, currency, opening_balance, current_balance) 
VALUES ('bank1','Main Operating','Emirates NBD','AED',150000,150000);

CREATE TABLE bank_transactions (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT REFERENCES bank_accounts(id),
  date DATE,
  description TEXT,
  reference TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  reconciled INTEGER DEFAULT 0,
  matched_entry_id TEXT
);

CREATE TABLE tax_returns (
  id TEXT PRIMARY KEY,
  period_start DATE,
  period_end DATE,
  vat_collected REAL,
  vat_paid REAL,
  vat_payable REAL,
  status TEXT DEFAULT 'draft', -- draft, filed, paid
  filing_date DATE,
  fta_reference TEXT
);

CREATE TABLE recurring_invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  frequency TEXT, -- monthly, quarterly
  next_date DATE,
  template_data TEXT, -- JSON
  active INTEGER DEFAULT 1
);

-- === PROJECT BUILD-UP & TEARDOWN ===

CREATE TABLE project_estimates (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  version INTEGER DEFAULT 1,
  name TEXT,
  status TEXT DEFAULT 'draft',
  total_cost REAL,
  total_price REAL,
  margin_pct REAL,
  created_by TEXT REFERENCES users(email),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE estimate_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT REFERENCES project_estimates(id) ON DELETE CASCADE,
  category TEXT, -- labor, materials, subcontractor, overhead
  description TEXT,
  quantity REAL,
  unit_cost REAL,
  unit_price REAL,
  markup_pct REAL DEFAULT 0
);

CREATE TABLE project_budgets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  category TEXT,
  budgeted_amount REAL,
  actual_amount REAL DEFAULT 0,
  variance REAL DEFAULT 0
);

CREATE TABLE project_closeouts (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  close_date DATE,
  final_revenue REAL,
  final_cost REAL,
  final_profit REAL,
  retention_amount REAL,
  warranty_end DATE,
  lessons_learned TEXT,
  archived INTEGER DEFAULT 0
);

-- Extended chart of accounts for UAE
INSERT INTO chart_of_accounts (id, code, name, type) VALUES
('1100','1100','Bank - ENBD','Asset'),
('1300','1300','VAT Input','Asset'),
('2100','2100','VAT Output Payable','Liability'),
('2200','2200','Wages Payable','Liability'),
('4100','4100','Quotation Revenue','Revenue'),
('5300','5300','Subcontractor Costs','Expense'),
('5400','5400','Materials','Expense');


-- === CUSTOMER / SUPPLIER / DEBTOR / CREDITOR MANAGEMENT ===

ALTER TABLE clients ADD COLUMN credit_limit REAL DEFAULT 50000;
ALTER TABLE clients ADD COLUMN payment_terms INTEGER DEFAULT 30; -- days
ALTER TABLE clients ADD COLUMN customer_type TEXT DEFAULT 'debtor';
ALTER TABLE clients ADD COLUMN opening_balance REAL DEFAULT 0;

ALTER TABLE vendors ADD COLUMN balance REAL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN credit_limit REAL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN payment_terms INTEGER DEFAULT 30;
ALTER TABLE vendors ADD COLUMN supplier_type TEXT DEFAULT 'creditor';
ALTER TABLE vendors ADD COLUMN opening_balance REAL DEFAULT 0;

CREATE TABLE customer_statements (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  period_start DATE,
  period_end DATE,
  opening_balance REAL,
  invoiced REAL,
  paid REAL,
  closing_balance REAL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_statements (
  id TEXT PRIMARY KEY,
  vendor_id TEXT REFERENCES vendors(id),
  period_start DATE,
  period_end DATE,
  opening_balance REAL,
  billed REAL,
  paid REAL,
  closing_balance REAL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Views for aging (SQLite compatible)
CREATE VIEW debtor_aging AS
SELECT 
  c.id, c.company, c.name, c.credit_limit, c.payment_terms,
  COALESCE(SUM(CASE WHEN i.status IN ('Sent','Overdue') THEN i.total ELSE 0 END),0) as total_due,
  COALESCE(SUM(CASE WHEN i.status IN ('Sent','Overdue') AND julianday('now') - julianday(i.due_date) BETWEEN 0 AND 30 THEN i.total ELSE 0 END),0) as bucket_0_30,
  COALESCE(SUM(CASE WHEN i.status IN ('Sent','Overdue') AND julianday('now') - julianday(i.due_date) BETWEEN 31 AND 60 THEN i.total ELSE 0 END),0) as bucket_31_60,
  COALESCE(SUM(CASE WHEN i.status IN ('Sent','Overdue') AND julianday('now') - julianday(i.due_date) BETWEEN 61 AND 90 THEN i.total ELSE 0 END),0) as bucket_61_90,
  COALESCE(SUM(CASE WHEN i.status IN ('Sent','Overdue') AND julianday('now') - julianday(i.due_date) > 90 THEN i.total ELSE 0 END),0) as bucket_90_plus
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
GROUP BY c.id;

CREATE VIEW creditor_aging AS
SELECT 
  v.id, v.name as company, v.payment_terms,
  COALESCE(SUM(CASE WHEN b.status IN ('unpaid','partial') THEN b.total ELSE 0 END),0) as total_due,
  COALESCE(SUM(CASE WHEN b.status IN ('unpaid','partial') AND julianday('now') - julianday(b.due_date) BETWEEN 0 AND 30 THEN b.total ELSE 0 END),0) as bucket_0_30,
  COALESCE(SUM(CASE WHEN b.status IN ('unpaid','partial') AND julianday('now') - julianday(b.due_date) BETWEEN 31 AND 60 THEN b.total ELSE 0 END),0) as bucket_31_60,
  COALESCE(SUM(CASE WHEN b.status IN ('unpaid','partial') AND julianday('now') - julianday(b.due_date) BETWEEN 61 AND 90 THEN b.total ELSE 0 END),0) as bucket_61_90,
  COALESCE(SUM(CASE WHEN b.status IN ('unpaid','partial') AND julianday('now') - julianday(b.due_date) > 90 THEN b.total ELSE 0 END),0) as bucket_90_plus
FROM vendors v
LEFT JOIN bills b ON v.id = b.vendor_id
GROUP BY v.id;
