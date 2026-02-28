-- ============================================
-- FBA Academy Dashboard - Supabase Schema COMPLETO
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Incluye TODAS las tablas: sales, reports, team, projections, payment_fees, n8n_config


-- =============================================
-- 1. SALES (ventas)
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  client_name text DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  instagram text DEFAULT '',
  product text DEFAULT '',
  producto_interes text DEFAULT '',
  payment_type text DEFAULT 'Pago único',
  installment_number text DEFAULT 'Pago único',
  payment_method text DEFAULT 'Transferencia',
  revenue numeric DEFAULT 0,
  cash_collected numeric DEFAULT 0,
  closer text DEFAULT '',
  setter text DEFAULT '',
  triager text DEFAULT '',
  gestor_asignado text DEFAULT '',
  utm_source text DEFAULT '',
  utm_medium text DEFAULT '',
  utm_campaign text DEFAULT '',
  utm_content text DEFAULT '',
  pais text DEFAULT '',
  capital_disponible text DEFAULT '',
  situacion_actual text DEFAULT '',
  exp_amazon text DEFAULT '',
  decisor_confirmado text DEFAULT '',
  fecha_llamada text DEFAULT '',
  status text DEFAULT 'Completada',
  notes text DEFAULT '',
  source text DEFAULT 'manual',
  close_activity_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_closer ON sales(closer);
CREATE INDEX IF NOT EXISTS idx_sales_setter ON sales(setter);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_utm_source ON sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_sales_close_activity_id ON sales(close_activity_id);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on sales" ON sales
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 2. REPORTS (reportes diarios de setters y closers)
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  role text NOT NULL CHECK (role IN ('setter', 'closer')),
  name text NOT NULL DEFAULT '',

  -- Setter fields
  conversations_opened integer DEFAULT 0,
  follow_ups integer DEFAULT 0,

  -- Shared field (both setter and closer use offers_launched)
  offers_launched integer DEFAULT 0,

  -- Setter field
  appointments_booked integer DEFAULT 0,

  -- Closer fields
  scheduled_calls integer DEFAULT 0,
  calls_made integer DEFAULT 0,
  deposits integer DEFAULT 0,
  closes integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
CREATE INDEX IF NOT EXISTS idx_reports_role ON reports(role);
CREATE INDEX IF NOT EXISTS idx_reports_name ON reports(name);
CREATE INDEX IF NOT EXISTS idx_reports_date_role ON reports(date, role);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on reports" ON reports
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 3. TEAM (miembros del equipo + login)
-- =============================================
CREATE TABLE IF NOT EXISTS team (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL UNIQUE,
  password text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'closer',  -- Supports multi-role: comma-separated e.g. 'manager,closer'
  active boolean DEFAULT true,
  commission_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_email ON team(email);
CREATE INDEX IF NOT EXISTS idx_team_role ON team(role);
CREATE INDEX IF NOT EXISTS idx_team_active ON team(active);

ALTER TABLE team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on team" ON team
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 4. PROJECTIONS (proyecciones semanales/mensuales)
-- =============================================
CREATE TABLE IF NOT EXISTS projections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text NOT NULL,                -- e.g. '2026-02' or '2026-W09'
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly')),
  type text NOT NULL DEFAULT 'company' CHECK (type IN ('company', 'closer', 'setter')),
  member_id text,                      -- nullable, null = company-level
  name text NOT NULL DEFAULT '',       -- display name (e.g. 'Emi', 'Empresa')
  cash_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  appointment_target integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projections_period ON projections(period);
CREATE INDEX IF NOT EXISTS idx_projections_period_type ON projections(period_type);
CREATE INDEX IF NOT EXISTS idx_projections_type ON projections(type);
CREATE INDEX IF NOT EXISTS idx_projections_member_id ON projections(member_id);

ALTER TABLE projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on projections" ON projections
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 5. PAYMENT_FEES (comisiones por método de pago)
-- =============================================
CREATE TABLE IF NOT EXISTS payment_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  method text NOT NULL UNIQUE,
  fee_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on payment_fees" ON payment_fees
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 6. N8N_CONFIG (configuración de integración N8n - fila única)
-- =============================================
CREATE TABLE IF NOT EXISTS n8n_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url text DEFAULT '',
  api_key text DEFAULT '',
  enabled boolean DEFAULT false,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE n8n_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on n8n_config" ON n8n_config
  FOR ALL USING (true) WITH CHECK (true);


-- =============================================
-- 7. VIEW: Sales with net cash (computed from payment_fees)
-- =============================================
CREATE OR REPLACE VIEW sales_with_net_cash AS
SELECT
  s.*,
  ROUND(s.cash_collected * (1 - COALESCE(pf.fee_rate, 0)), 2) AS net_cash
FROM sales s
LEFT JOIN payment_fees pf ON pf.method = s.payment_method;


-- =============================================================
--  MIGRATION: Multi-role support
--  Run this if you already have the team table with the old CHECK constraint
-- =============================================================
-- ALTER TABLE team DROP CONSTRAINT IF EXISTS team_role_check;


-- =============================================================
--  SEED DATA
-- =============================================================

-- ── Payment Fees ──
INSERT INTO payment_fees (method, fee_rate) VALUES
  ('Transferencia', 0),
  ('Stripe', 0.029),
  ('PayPal', 0.035),
  ('Tarjeta', 0.015)
ON CONFLICT (method) DO NOTHING;

-- ── Team Members ──
INSERT INTO team (name, email, password, role, active, commission_rate) VALUES
  ('Emi', 'emi@fbaacademy.com', 'emi123', 'closer', true, 0.10),
  ('Alejandro', 'alejandro@fbaacademy.com', 'ale123', 'closer', true, 0.10),
  ('Víctor', 'victor@fbaacademy.com', 'vic123', 'setter', true, 0.05),
  ('Marta', 'marta@fbaacademy.com', 'mar123', 'setter', true, 0.05),
  ('Emi de la Sierra', 'emidelasierra@fbaacademypro.com', 'fba2026', 'director', true, 0.03)
ON CONFLICT (email) DO NOTHING;

-- ── Sales (seed data) ──
INSERT INTO sales (date, client_name, client_email, client_phone, instagram, product, producto_interes, payment_type, installment_number, payment_method, revenue, cash_collected, closer, setter, triager, gestor_asignado, utm_source, utm_medium, utm_campaign, utm_content, pais, capital_disponible, situacion_actual, exp_amazon, decisor_confirmado, fecha_llamada, status, notes, source) VALUES
  ('2026-02-20', 'Carlos Méndez', 'carlos@gmail.com', '+34 612 345 678', '@carlosm_fba', 'FBA Academy Pro', 'FBA Academy Pro', 'Pago único', 'Pago único', 'Transferencia', 2997, 2997, 'Emi', 'Víctor', '', '', 'instagram', 'paid', 'webinar_feb', 'story_ad', 'España', '5000-10000€', 'Empleado buscando alternativa', 'Sin experiencia', 'Sí', '2026-02-19', 'Completada', '', 'manual'),
  ('2026-02-21', 'María López', 'maria.lopez@hotmail.com', '+34 623 456 789', '@maria.lopez', 'Mentoring 1:1', 'Mentoring 1:1', '2 cuotas', '1/2', 'Stripe', 5000, 2500, 'Emi', 'Marta', '', '', 'google', 'cpc', 'search_brand', '', 'México', '10000-20000€', 'Emprendedora activa', '6 meses', 'Sí', '2026-02-20', 'Pendiente', 'Primera cuota de 2', 'manual'),
  ('2026-02-22', 'Andrés Ruiz', 'andres.r@gmail.com', '+52 55 1234 5678', '@andresruiz', 'FBA Academy Pro', 'FBA Academy Pro', 'Pago único', 'Pago único', 'Tarjeta', 2997, 2997, 'Alejandro', 'Víctor', '', '', 'facebook', 'paid', 'reel_viral', 'testimonio', 'Colombia', '3000-5000€', 'Estudiante universitario', 'Sin experiencia', 'Sí', '2026-02-21', 'Completada', '', 'manual'),
  ('2026-02-23', 'Laura Sánchez', 'laura.s@yahoo.com', '+34 634 567 890', '@laura.sanchez', 'China Bootcamp', 'China Bootcamp', '3 cuotas', '1/3', 'PayPal', 10000, 4000, 'Emi', 'Víctor', '', '', 'instagram', 'organic', '', '', 'España', '20000+€', 'Vendedora Amazon activa', '1 año', 'Sí', '2026-02-22', 'Pendiente', 'Primera cuota de 3', 'manual'),
  ('2026-02-24', 'Diego Fernández', 'diego.f@outlook.com', '+34 645 678 901', '@diegof', 'FBA Academy Pro', 'FBA Academy Pro', 'Pago único', 'Pago único', 'Stripe', 2997, 2997, 'Alejandro', 'Marta', '', '', 'youtube', 'organic', '', '', 'Argentina', '5000-10000€', 'Freelancer', 'Sin experiencia', 'Sí', '2026-02-23', 'Completada', '', 'manual'),
  ('2026-02-25', 'Paula García', 'paula.g@gmail.com', '+34 656 789 012', '@paulag', 'Mentoring 1:1', 'Mentoring 1:1', 'Pago único', 'Pago único', 'Transferencia', 5000, 5000, 'Emi', 'Marta', '', '', 'referral', 'organic', '', '', 'España', '10000-20000€', 'Emprendedora activa', '3 meses', 'Sí', '2026-02-24', 'Completada', 'Referida por cliente anterior', 'manual'),
  ('2026-02-25', 'Javier Martín', 'javi.m@gmail.com', '+34 667 890 123', '@javim', 'FBA Academy Pro', 'FBA Academy Pro', '2 cuotas', '1/2', 'Tarjeta', 2997, 1500, 'Alejandro', 'Víctor', '', '', 'instagram', 'paid', 'webinar_feb', 'carousel', 'España', '3000-5000€', 'Empleado buscando alternativa', 'Sin experiencia', 'Sí', '2026-02-24', 'Pendiente', '', 'manual'),
  ('2026-02-26', 'Sofía Romero', 'sofia.r@gmail.com', '+34 678 901 234', '@sofiarom', 'China Bootcamp', 'China Bootcamp', 'Pago único', 'Pago único', 'Transferencia', 10000, 10000, 'Emi', 'Víctor', '', '', 'tiktok', 'organic', '', '', 'Chile', '20000+€', 'Vendedora Amazon activa', '2 años', 'Sí', '2026-02-25', 'Completada', '', 'manual'),
  ('2026-02-26', 'María López', 'maria.lopez@hotmail.com', '+34 623 456 789', '@maria.lopez', 'Mentoring 1:1', 'Mentoring 1:1', '2 cuotas', '2/2', 'Stripe', 0, 2500, 'Emi', 'Marta', '', '', 'google', 'cpc', 'search_brand', '', 'México', '10000-20000€', 'Emprendedora activa', '6 meses', 'Sí', '2026-02-20', 'Completada', 'Segunda y última cuota', 'manual');

-- ── Reports (seed data) ──
-- Setters
INSERT INTO reports (date, role, name, conversations_opened, follow_ups, offers_launched, appointments_booked, scheduled_calls, calls_made, deposits, closes) VALUES
  ('2026-02-24', 'setter', 'Víctor', 45, 22, 8, 5, 0, 0, 0, 0),
  ('2026-02-24', 'setter', 'Marta', 38, 18, 6, 4, 0, 0, 0, 0),
  ('2026-02-25', 'setter', 'Víctor', 52, 25, 10, 7, 0, 0, 0, 0),
  ('2026-02-25', 'setter', 'Marta', 41, 20, 7, 3, 0, 0, 0, 0),
  ('2026-02-26', 'setter', 'Víctor', 48, 30, 12, 6, 0, 0, 0, 0),
  ('2026-02-26', 'setter', 'Marta', 35, 15, 5, 4, 0, 0, 0, 0);

-- Closers
INSERT INTO reports (date, role, name, conversations_opened, follow_ups, offers_launched, appointments_booked, scheduled_calls, calls_made, deposits, closes) VALUES
  ('2026-02-24', 'closer', 'Emi', 0, 0, 4, 0, 6, 5, 2, 2),
  ('2026-02-24', 'closer', 'Alejandro', 0, 0, 3, 0, 5, 4, 1, 1),
  ('2026-02-25', 'closer', 'Emi', 0, 0, 5, 0, 8, 7, 3, 2),
  ('2026-02-25', 'closer', 'Alejandro', 0, 0, 4, 0, 6, 5, 2, 1),
  ('2026-02-26', 'closer', 'Emi', 0, 0, 5, 0, 7, 6, 2, 2),
  ('2026-02-26', 'closer', 'Alejandro', 0, 0, 3, 0, 5, 5, 1, 1);

-- ── N8n Config (single default row) ──
INSERT INTO n8n_config (webhook_url, api_key, enabled, last_sync) VALUES
  ('', '', false, NULL);


-- =============================================================
--  VERIFICATION QUERIES (uncomment to test)
-- =============================================================
-- SELECT 'sales' AS table_name, count(*) FROM sales
-- UNION ALL SELECT 'reports', count(*) FROM reports
-- UNION ALL SELECT 'team', count(*) FROM team
-- UNION ALL SELECT 'projections', count(*) FROM projections
-- UNION ALL SELECT 'payment_fees', count(*) FROM payment_fees
-- UNION ALL SELECT 'n8n_config', count(*) FROM n8n_config;
