-- ==============================================================================
-- GOLA CYBERAI — PHASE 3: EMPLOYEE MANAGEMENT, HR, LEAVES, PAYSLIPS, DOCUMENTS
-- ==============================================================================

-- 1. ADD EMPLOYEE ID & MANAGER ID TO PROFILES
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS employee_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address text;

-- 2. LEAVE TYPES
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL, -- 'CL', 'SL', 'PL', 'ML', 'LOP'
  days_per_year numeric NOT NULL DEFAULT 12,
  description text,
  is_paid boolean NOT NULL DEFAULT true,
  requires_doc boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default corporate leave types
INSERT INTO leave_types (name, code, days_per_year, description, is_paid)
VALUES
  ('Casual Leave', 'CL', 12, 'Annual casual and personal emergency leave', true),
  ('Sick Leave', 'SL', 10, 'Medical and sickness leave with self-attestation', true),
  ('Privilege / Earned Leave', 'PL', 18, 'Vacation and planned annual leave', true),
  ('Loss of Pay', 'LOP', 0, 'Unpaid leave beyond accrued balance', false)
ON CONFLICT (code) DO NOTHING;

-- 3. LEAVE BALANCES
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  allocated_days numeric NOT NULL DEFAULT 12,
  used_days numeric NOT NULL DEFAULT 0,
  pending_days numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_leave_year UNIQUE (user_id, leave_type_id, year)
);

-- 4. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL,
  is_half_day boolean NOT NULL DEFAULT false,
  half_day_period text CHECK (half_day_period IN ('first_half', 'second_half')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- 5. COMPANY HOLIDAYS
CREATE TABLE IF NOT EXISTS company_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date UNIQUE NOT NULL,
  day_of_week text NOT NULL,
  type text NOT NULL DEFAULT 'gazetted' CHECK (type IN ('gazetted', 'optional', 'restricted')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO company_holidays (name, date, day_of_week, type, description)
VALUES
  ('New Year''s Day', '2026-01-01', 'Thursday', 'gazetted', 'Public Holiday'),
  ('Republic Day', '2026-01-26', 'Monday', 'gazetted', 'National Holiday'),
  ('Holi', '2026-03-04', 'Wednesday', 'gazetted', 'Festival of Colours'),
  ('Independence Day', '2026-08-15', 'Saturday', 'gazetted', 'National Holiday'),
  ('Mahatma Gandhi Jayanti', '2026-10-02', 'Friday', 'gazetted', 'National Holiday'),
  ('Dussehra (Vijayadashami)', '2026-10-20', 'Tuesday', 'gazetted', 'Festival Holiday'),
  ('Diwali (Deepavali)', '2026-11-08', 'Sunday', 'gazetted', 'Festival of Lights'),
  ('Christmas Day', '2026-12-25', 'Friday', 'gazetted', 'Public Holiday')
ON CONFLICT (date) DO NOTHING;

-- 6. PAYSLIPS
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- 'October'
  year integer NOT NULL, -- 2026
  pay_period text NOT NULL, -- 'Oct 2026'
  basic_salary numeric NOT NULL DEFAULT 45000,
  hra numeric NOT NULL DEFAULT 22500,
  special_allowance numeric NOT NULL DEFAULT 15000,
  gross_earnings numeric NOT NULL DEFAULT 82500,
  pf_deduction numeric NOT NULL DEFAULT 5400,
  professional_tax numeric NOT NULL DEFAULT 200,
  tds_deduction numeric NOT NULL DEFAULT 3500,
  total_deductions numeric NOT NULL DEFAULT 9100,
  net_salary numeric NOT NULL DEFAULT 73400,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('processing', 'paid', 'on_hold')),
  paid_on date DEFAULT CURRENT_DATE,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_user ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(year, month);

-- 7. HR DOCUMENTS & LETTERS
CREATE TABLE IF NOT EXISTS hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means company-wide policy
  title text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'offer_letter', 'appointment_letter', 'experience_letter', 
    'relieving_letter', 'nda_policy', 'handbook', 'compensation_letter', 'code_of_conduct'
  )),
  file_name text NOT NULL,
  file_size text NOT NULL DEFAULT '245 KB',
  category text NOT NULL CHECK (category IN ('personal_letter', 'company_policy')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  version text NOT NULL DEFAULT 'v1.0',
  access_role text NOT NULL DEFAULT 'all' CHECK (access_role IN ('all', 'hr', 'admin', 'manager')),
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_user ON hr_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_category ON hr_documents(category);

-- 8. ROW LEVEL SECURITY POLICIES
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON leave_types, company_holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_types, company_holidays TO service_role;

GRANT SELECT, INSERT, UPDATE ON leave_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO authenticated;
GRANT SELECT ON payslips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payslips TO service_role;
GRANT SELECT ON hr_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_documents TO service_role;
