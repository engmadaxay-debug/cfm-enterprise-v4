CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'STAFF'
    CHECK (role IN ('ADMIN','STAFF')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe upgrades for databases created with CFM Simple v1.0.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'STAFF';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(60),
  email VARCHAR(180),
  person_type VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER'
    CHECK (person_type IN ('CUSTOMER','SUPPLIER','VENDOR','AGENT','OTHER')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE people ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS vault_accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE vault_accounts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE vault_accounts DROP CONSTRAINT IF EXISTS vault_accounts_name_currency_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_owner_name_currency
  ON vault_accounts ((COALESCE(created_by, 0)), name, currency_code);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS exchange_transactions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  from_vault_id INTEGER NOT NULL REFERENCES vault_accounts(id),
  to_vault_id INTEGER NOT NULL REFERENCES vault_accounts(id),
  from_amount NUMERIC(18,2) NOT NULL CHECK (from_amount > 0),
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  fee NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  to_amount NUMERIC(18,2) NOT NULL CHECK (to_amount >= 0),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS money_records (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('RECEIVABLE','PAYABLE','HELD')),
  original_amount NUMERIC(18,2) NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC(18,2) NOT NULL CHECK (remaining_amount >= 0),
  currency_code VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','PARTIAL','PAID','RELEASED')),
  due_date DATE,
  description TEXT,
  held_vault_id INTEGER REFERENCES vault_accounts(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS money_payments (
  id SERIAL PRIMARY KEY,
  money_record_id INTEGER NOT NULL REFERENCES money_records(id) ON DELETE CASCADE,
  vault_id INTEGER NOT NULL REFERENCES vault_accounts(id),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(10) NOT NULL
    CHECK (transaction_type IN ('INCOME','EXPENSE')),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  vault_id INTEGER NOT NULL REFERENCES vault_accounts(id),
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_created_by ON people(created_by);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_created_by ON vault_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_money_records_category_status ON money_records(category, status);
CREATE INDEX IF NOT EXISTS idx_money_records_created_by ON money_records(created_by);
CREATE INDEX IF NOT EXISTS idx_money_payments_created_by ON money_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_by ON cash_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_date ON exchange_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_created_by ON exchange_transactions(created_by);


-- CFM v2.0 upgrade tables
ALTER TABLE people ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR(40) UNIQUE NOT NULL,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  invoice_type VARCHAR(20) NOT NULL DEFAULT 'SALE' CHECK (invoice_type IN ('SALE','PURCHASE','SERVICE')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','PAID','CANCELLED')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(18,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  module VARCHAR(80) NOT NULL,
  record_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  backup_name VARCHAR(180) NOT NULL,
  backup_data JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_type ON people(person_type);
CREATE INDEX IF NOT EXISTS idx_invoices_person ON invoices(person_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- CFM v3.0 Phase 1: Transaction Journal, Ledgers, Opening Balance, Automatic Numbering
CREATE TABLE IF NOT EXISTS number_sequences (
  id SERIAL PRIMARY KEY,
  sequence_key VARCHAR(60) UNIQUE NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  padding INTEGER NOT NULL DEFAULT 6,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO number_sequences (sequence_key, prefix, current_value, padding) VALUES
('transaction','TRX',0,6),
('invoice','INV',0,6),
('receipt','REC',0,6),
('payment','PAY',0,6),
('exchange','EXC',0,6),
('customer','CUS',0,6),
('supplier','SUP',0,6),
('opening_balance','OB',0,6)
ON CONFLICT (sequence_key) DO NOTHING;

ALTER TABLE people ADD COLUMN IF NOT EXISTS code VARCHAR(40) UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference_no VARCHAR(40);

CREATE TABLE IF NOT EXISTS transaction_journal (
  id SERIAL PRIMARY KEY,
  transaction_no VARCHAR(40) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  module VARCHAR(60) NOT NULL,
  transaction_type VARCHAR(60) NOT NULL,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  vault_id INTEGER REFERENCES vault_accounts(id) ON DELETE SET NULL,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  reference_no VARCHAR(80),
  description TEXT,
  source_table VARCHAR(80),
  source_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_journal_date ON transaction_journal(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_journal_person ON transaction_journal(person_id);
CREATE INDEX IF NOT EXISTS idx_transaction_journal_module ON transaction_journal(module);
CREATE INDEX IF NOT EXISTS idx_transaction_journal_created_by ON transaction_journal(created_by);

CREATE TABLE IF NOT EXISTS opening_balances (
  id SERIAL PRIMARY KEY,
  balance_no VARCHAR(40) UNIQUE NOT NULL,
  balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  balance_type VARCHAR(30) NOT NULL CHECK (balance_type IN ('CUSTOMER','SUPPLIER','VAULT','CASH','BANK')),
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  vault_id INTEGER REFERENCES vault_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_type ON opening_balances(balance_type);
CREATE INDEX IF NOT EXISTS idx_opening_balances_person ON opening_balances(person_id);

CREATE OR REPLACE VIEW customer_ledger AS
SELECT tj.*, p.name AS person_name
FROM transaction_journal tj
JOIN people p ON p.id=tj.person_id
WHERE p.person_type='CUSTOMER';

CREATE OR REPLACE VIEW supplier_ledger AS
SELECT tj.*, p.name AS person_name
FROM transaction_journal tj
JOIN people p ON p.id=tj.person_id
WHERE p.person_type IN ('SUPPLIER','VENDOR');


-- CFM v3.0 Phase 2: Reconciliation, Daily Closing, Multi Currency, Exchange Profit
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(80) NOT NULL,
  symbol VARCHAR(12),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies (code, name, symbol) VALUES
('USD','US Dollar','$'),('CAD','Canadian Dollar','$'),('SOS','Somali Shilling','S'),
('KES','Kenyan Shilling','KSh'),('EUR','Euro','€'),('AED','UAE Dirham','د.إ')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE exchange_transactions ADD COLUMN IF NOT EXISTS reference_no VARCHAR(40);
ALTER TABLE exchange_transactions ADD COLUMN IF NOT EXISTS profit_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE exchange_transactions ADD COLUMN IF NOT EXISTS profit_currency VARCHAR(10);
ALTER TABLE exchange_transactions ADD COLUMN IF NOT EXISTS cost_rate NUMERIC(18,6);

CREATE TABLE IF NOT EXISTS reconciliations (
  id SERIAL PRIMARY KEY,
  reconciliation_no VARCHAR(40) UNIQUE NOT NULL,
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reconciliation_type VARCHAR(30) NOT NULL CHECK (reconciliation_type IN ('CASH','VAULT','BANK','CUSTOMER','SUPPLIER')),
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  vault_id INTEGER REFERENCES vault_accounts(id) ON DELETE SET NULL,
  system_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  counted_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','MATCHED','DIFFERENCE','APPROVED')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON reconciliations(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_reconciliations_type ON reconciliations(reconciliation_type);

CREATE TABLE IF NOT EXISTS daily_closings (
  id SERIAL PRIMARY KEY,
  closing_no VARCHAR(40) UNIQUE NOT NULL,
  closing_date DATE NOT NULL,
  vault_id INTEGER REFERENCES vault_accounts(id) ON DELETE SET NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_exchange_in NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_exchange_out NUMERIC(18,2) NOT NULL DEFAULT 0,
  exchange_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  expected_closing NUMERIC(18,2) NOT NULL DEFAULT 0,
  counted_closing NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','DIFFERENCE')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(closing_date, vault_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings(closing_date);

INSERT INTO number_sequences (sequence_key, prefix, current_value, padding) VALUES
('reconciliation','RECX',0,6),
('daily_closing','DCL',0,6),
('currency','CUR',0,6)
ON CONFLICT (sequence_key) DO NOTHING;


-- CFM v3.0 Phase 3: Search, Dashboard Statistics, Activity Log, Roles & Permissions, Export Reports
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','MANAGER','ACCOUNTANT','CASHIER','AUDITOR','STAFF'));

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_key VARCHAR(40) UNIQUE NOT NULL,
  role_name VARCHAR(80) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_key VARCHAR(40) NOT NULL,
  module_key VARCHAR(80) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_export BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(role_key, module_key)
);

INSERT INTO roles(role_key, role_name, description) VALUES
('ADMIN','Admin','Full system access'),
('MANAGER','Manager','Can review reports and manage daily work'),
('ACCOUNTANT','Accountant','Can manage accounts, reports and reconciliation'),
('CASHIER','Cashier','Can process daily transactions'),
('AUDITOR','Auditor','Read-only audit and reports access'),
('STAFF','Staff','Basic staff access')
ON CONFLICT(role_key) DO NOTHING;

INSERT INTO role_permissions(role_key,module_key,can_view,can_create,can_update,can_delete,can_export) VALUES
('ADMIN','ALL',true,true,true,true,true),
('MANAGER','ALL',true,true,true,false,true),
('ACCOUNTANT','REPORTS',true,true,true,false,true),
('ACCOUNTANT','RECONCILIATION',true,true,true,false,true),
('ACCOUNTANT','JOURNAL',true,true,false,false,true),
('CASHIER','VAULT',true,true,true,false,false),
('CASHIER','EXCHANGE',true,true,true,false,false),
('CASHIER','RECEIVABLES',true,true,true,false,false),
('AUDITOR','ALL',true,false,false,false,true),
('STAFF','BASIC',true,true,false,false,false)
ON CONFLICT(role_key,module_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(160) NOT NULL,
  module VARCHAR(80) NOT NULL DEFAULT 'GENERAL',
  record_id INTEGER,
  details JSONB,
  ip_address VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE OR REPLACE VIEW dashboard_statistics AS
SELECT 'people' AS stat_group, person_type AS stat_name, COUNT(*)::numeric AS stat_value, NULL::varchar AS currency_code FROM people GROUP BY person_type
UNION ALL
SELECT 'vaults', currency_code, SUM(balance), currency_code FROM vault_accounts GROUP BY currency_code
UNION ALL
SELECT 'journal', module, COUNT(*)::numeric, NULL::varchar FROM transaction_journal GROUP BY module;

-- CFM Enterprise v3.1 Phase 5: Calendar, Staff Isolation, Notifications, Security
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE people ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE vault_accounts ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE exchange_transactions ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE money_records ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE money_payments ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE transaction_journal ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE opening_balances ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE reconciliations ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  event_title VARCHAR(180) NOT NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'REMINDER'
    CHECK (event_type IN ('REMINDER','DUE_RECEIVABLE','DUE_PAYABLE','OVERDUE','DAILY_CLOSING','MONTHLY_CLOSING','CUSTOM')),
  event_date DATE NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DONE','CANCELLED')),
  related_module VARCHAR(80),
  related_id INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  message TEXT,
  notification_type VARCHAR(60) NOT NULL DEFAULT 'INFO',
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);

CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  email VARCHAR(180),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address VARCHAR(80),
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(120) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(80),
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_seen_at);

CREATE TABLE IF NOT EXISTS password_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_teams (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(manager_id, staff_id)
);

INSERT INTO app_settings(setting_key, setting_value) VALUES
('staff_isolation_enabled','true'),
('manager_can_view_all','false'),
('restrict_reports','true'),
('restrict_search','true'),
('session_timeout_minutes','720')
ON CONFLICT(setting_key) DO NOTHING;

CREATE OR REPLACE VIEW online_users AS
SELECT u.id, u.full_name, u.email, u.role, MAX(s.last_seen_at) AS last_seen_at
FROM users u
JOIN user_sessions s ON s.user_id=u.id
WHERE s.is_active=true AND s.last_seen_at > NOW() - INTERVAL '30 minutes'
GROUP BY u.id, u.full_name, u.email, u.role;


-- CFM Enterprise v3.2 Phase 6
-- CFM Enterprise v3.2 Phase 6: production, security, backups, API logs
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(200) UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(120) NOT NULL,
  ip_address VARCHAR(80),
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_access_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address VARCHAR(80),
  request_id VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_backups (
  id SERIAL PRIMARY KEY,
  backup_name VARCHAR(220) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(80),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_created ON api_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_backups_created ON production_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

INSERT INTO schema_migrations (migration_name) VALUES ('001_phase6_production') ON CONFLICT DO NOTHING;
