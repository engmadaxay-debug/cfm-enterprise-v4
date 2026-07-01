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
