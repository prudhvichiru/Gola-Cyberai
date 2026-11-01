-- ==============================================================================
-- GOLA CYBERAI — COMPLETE DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor and click RUN
-- ==============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0001: Profiles, Departments, Designations
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('employee', 'manager', 'project_manager', 'hr', 'payroll', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  head_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  full_name text GENERATED ALWAYS AS (
    COALESCE(
      NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
      email
    )
  ) STORED,
  avatar_url text,
  phone text,
  role user_role NOT NULL DEFAULT 'employee',
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  designation_id uuid REFERENCES designations(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'active',
  hired_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'departments_head_id_fkey'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT departments_head_id_fkey
      FOREIGN KEY (head_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_designations_department ON designations(department_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (first_name, last_name, avatar_url, phone) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON departments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON departments TO authenticated;

CREATE OR REPLACE FUNCTION requester_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated" ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_insert_hr_admin" ON departments;
CREATE POLICY "departments_insert_hr_admin" ON departments FOR INSERT TO authenticated
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "departments_update_hr_admin" ON departments;
CREATE POLICY "departments_update_hr_admin" ON departments FOR UPDATE TO authenticated
  USING (requester_role() IN ('hr', 'admin')) WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "departments_delete_hr_admin" ON departments;
CREATE POLICY "departments_delete_hr_admin" ON departments FOR DELETE TO authenticated
  USING (requester_role() IN ('hr', 'admin'));

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON designations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON designations TO authenticated;

DROP POLICY IF EXISTS "designations_select_authenticated" ON designations;
CREATE POLICY "designations_select_authenticated" ON designations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "designations_insert_hr_admin" ON designations;
CREATE POLICY "designations_insert_hr_admin" ON designations FOR INSERT TO authenticated
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "designations_update_hr_admin" ON designations;
CREATE POLICY "designations_update_hr_admin" ON designations FOR UPDATE TO authenticated
  USING (requester_role() IN ('hr', 'admin')) WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "designations_delete_hr_admin" ON designations;
CREATE POLICY "designations_delete_hr_admin" ON designations FOR DELETE TO authenticated
  USING (requester_role() IN ('hr', 'admin'));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0002: Attendance
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('working', 'on_break', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  total_break_seconds integer NOT NULL DEFAULT 0,
  total_work_seconds integer NOT NULL DEFAULT 0,
  status attendance_status NOT NULL DEFAULT 'working',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_attendance_date UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  break_type text NOT NULL DEFAULT 'break',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_breaks_session ON attendance_breaks(session_id);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_sessions_select" ON attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON attendance_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin')
  ));

DROP POLICY IF EXISTS "attendance_sessions_insert_own" ON attendance_sessions;
CREATE POLICY "attendance_sessions_insert_own" ON attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_sessions_update_own" ON attendance_sessions;
CREATE POLICY "attendance_sessions_update_own" ON attendance_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_breaks_select" ON attendance_breaks;
CREATE POLICY "attendance_breaks_select" ON attendance_breaks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM attendance_sessions WHERE id = session_id AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin'))
    )
  ));

DROP POLICY IF EXISTS "attendance_breaks_insert_own" ON attendance_breaks;
CREATE POLICY "attendance_breaks_insert_own" ON attendance_breaks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM attendance_sessions WHERE id = session_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "attendance_breaks_update_own" ON attendance_breaks;
CREATE POLICY "attendance_breaks_update_own" ON attendance_breaks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM attendance_sessions WHERE id = session_id AND user_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0003: HR Module
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employee_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  days_per_year numeric NOT NULL DEFAULT 12,
  description text,
  is_paid boolean NOT NULL DEFAULT true,
  requires_doc boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO leave_types (name, code, days_per_year, description, is_paid) VALUES
  ('Casual Leave', 'CL', 12, 'Annual casual and personal emergency leave', true),
  ('Sick Leave', 'SL', 10, 'Medical and sickness leave with self-attestation', true),
  ('Privilege / Earned Leave', 'PL', 18, 'Vacation and planned annual leave', true),
  ('Loss of Pay', 'LOP', 0, 'Unpaid leave beyond accrued balance', false)
ON CONFLICT (code) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS company_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date UNIQUE NOT NULL,
  day_of_week text NOT NULL,
  type text NOT NULL DEFAULT 'gazetted' CHECK (type IN ('gazetted', 'optional', 'restricted')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO company_holidays (name, date, day_of_week, type, description) VALUES
  ('New Year''s Day', '2026-01-01', 'Thursday', 'gazetted', 'Public Holiday'),
  ('Republic Day', '2026-01-26', 'Monday', 'gazetted', 'National Holiday'),
  ('Holi', '2026-03-04', 'Wednesday', 'gazetted', 'Festival of Colours'),
  ('Independence Day', '2026-08-15', 'Saturday', 'gazetted', 'National Holiday'),
  ('Mahatma Gandhi Jayanti', '2026-10-02', 'Friday', 'gazetted', 'National Holiday'),
  ('Dussehra (Vijayadashami)', '2026-10-20', 'Tuesday', 'gazetted', 'Festival Holiday'),
  ('Diwali (Deepavali)', '2026-11-08', 'Sunday', 'gazetted', 'Festival of Lights'),
  ('Christmas Day', '2026-12-25', 'Friday', 'gazetted', 'Public Holiday')
ON CONFLICT (date) DO NOTHING;

CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  pay_period text NOT NULL,
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

CREATE TABLE IF NOT EXISTS hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
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

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON leave_types, company_holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE ON leave_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO authenticated;
GRANT SELECT ON payslips TO authenticated;
GRANT SELECT ON hr_documents TO authenticated;

DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "leave_balances_own" ON leave_balances;
CREATE POLICY "leave_balances_own" ON leave_balances FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin', 'manager')
  ));

DROP POLICY IF EXISTS "leave_requests_insert_own" ON leave_requests;
CREATE POLICY "leave_requests_insert_own" ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin', 'manager')
  ));

DROP POLICY IF EXISTS "company_holidays_select" ON company_holidays;
CREATE POLICY "company_holidays_select" ON company_holidays FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payslips_select_own" ON payslips;
CREATE POLICY "payslips_select_own" ON payslips FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin', 'payroll')
  ));

DROP POLICY IF EXISTS "hr_documents_select" ON hr_documents;
CREATE POLICY "hr_documents_select" ON hr_documents FOR SELECT TO authenticated
  USING (access_role = 'all' OR auth.uid() = user_id OR requester_role()::text = access_role OR requester_role() IN ('admin'));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0004: Projects, Tasks, Timesheets
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  client_id uuid,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  budget numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN ('lead', 'contributor', 'reviewer', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  estimated_hours numeric NOT NULL DEFAULT 0,
  recorded_hours numeric NOT NULL DEFAULT 0,
  checklists jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  paused_time timestamptz,
  accumulated_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'stopped')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_week_timesheet UNIQUE (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  date date NOT NULL,
  requested_check_in timestamptz NOT NULL,
  requested_check_out timestamptz NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON projects, project_members, tasks, task_timers, timesheets, timesheet_entries, attendance_corrections TO authenticated;

DROP POLICY IF EXISTS "projects_all_authenticated" ON projects;
CREATE POLICY "projects_all_authenticated" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "project_members_all_authenticated" ON project_members;
CREATE POLICY "project_members_all_authenticated" ON project_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_all_authenticated" ON tasks;
CREATE POLICY "tasks_all_authenticated" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "task_timers_own" ON task_timers;
CREATE POLICY "task_timers_own" ON task_timers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "timesheets_own" ON timesheets;
CREATE POLICY "timesheets_own" ON timesheets FOR ALL TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin')
  )) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "timesheet_entries_own" ON timesheet_entries;
CREATE POLICY "timesheet_entries_own" ON timesheet_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_corrections_select" ON attendance_corrections;
CREATE POLICY "attendance_corrections_select" ON attendance_corrections FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin')
  ));

DROP POLICY IF EXISTS "attendance_corrections_insert_own" ON attendance_corrections;
CREATE POLICY "attendance_corrections_insert_own" ON attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0005: Collaboration — Conversations, Messages, Meetings
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(32) NOT NULL DEFAULT 'direct',
  name VARCHAR(255),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  mentions JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  agenda TEXT,
  meeting_link VARCHAR(512),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.meeting_invitees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'message',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_meetings_time ON public.meetings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- RLS for collaboration tables (open within authenticated)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_members, public.messages, public.meetings, public.meeting_invitees, public.notifications TO authenticated;

-- Conversations: member can see their own conversations
DROP POLICY IF EXISTS "conversations_member_select" ON public.conversations;
CREATE POLICY "conversations_member_select" ON public.conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Conversation members
DROP POLICY IF EXISTS "conv_members_select" ON public.conversation_members;
CREATE POLICY "conv_members_select" ON public.conversation_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm2 WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "conv_members_insert" ON public.conversation_members;
CREATE POLICY "conv_members_insert" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true);

-- Messages: only members of the conversation can read
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

-- Meetings: all authenticated users can see meetings
DROP POLICY IF EXISTS "meetings_select" ON public.meetings;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "meetings_update_organizer" ON public.meetings;
CREATE POLICY "meetings_update_organizer" ON public.meetings FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_id);

-- Meeting invitees
DROP POLICY IF EXISTS "meeting_invitees_select" ON public.meeting_invitees;
CREATE POLICY "meeting_invitees_select" ON public.meeting_invitees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "meeting_invitees_insert" ON public.meeting_invitees;
CREATE POLICY "meeting_invitees_insert" ON public.meeting_invitees FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "meeting_invitees_update_own" ON public.meeting_invitees;
CREATE POLICY "meeting_invitees_update_own" ON public.meeting_invitees FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.meetings WHERE id = meeting_id AND organizer_id = auth.uid()
  ));

-- Notifications: own only
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0006: Enable Supabase Realtime
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'meetings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'meeting_invitees') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_invitees;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
