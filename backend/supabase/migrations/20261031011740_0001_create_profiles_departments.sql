/*
# Gola CyberAI — Core HR Foundation (Profiles, Departments, Designations)

This migration creates the foundational schema for the Gola CyberAI employee
management platform. It sets up user profiles (linked to Supabase auth), company
departments, and job designations, with row-level security so each signed-in
user can access the right data.

## 1. New Tables

### `profiles`
- `id` (uuid PK, references auth.users on delete cascade) — one row per account.
- `email` (text, unique, not null) — mirrors the auth email for convenience.
- `first_name`, `last_name` (text, nullable)
- `full_name` (generated column from first + last name)
- `avatar_url` (text, nullable)
- `phone` (text, nullable)
- `role` (enum: employee, manager, project_manager, hr, payroll, admin) — defaults to 'employee'.
- `department_id` (uuid FK -> departments, nullable)
- `designation_id` (uuid FK -> designations, nullable)
- `status` (enum: active, inactive) — defaults to 'active'.
- `hired_at` (date, nullable)
- `created_at`, `updated_at` (timestamptz)

### `departments`
- `id` (uuid PK)
- `name` (text, unique, not null)
- `description` (text, nullable)
- `head_id` (uuid FK -> profiles, nullable)
- `created_at` (timestamptz)

### `designations`
- `id` (uuid PK)
- `title` (text, not null)
- `department_id` (uuid FK -> departments, nullable)
- `created_at` (timestamptz)

## 2. Security

### profiles
- RLS enabled.
- Grant SELECT to authenticated (everyone can see the directory).
- Grant UPDATE of contact fields to authenticated, own row only.
- Profiles are created automatically on signup via trigger.

### departments / designations
- RLS enabled.
- SELECT: all authenticated users can read.
- INSERT/UPDATE/DELETE: only hr or admin role (checked via requester_role()).

## 3. Trigger
- `handle_new_user` function: after a new auth.users row is inserted, create a
  matching profiles row with email + default role 'employee'.
- Trigger `on_auth_user_created` fires AFTER INSERT on auth.users.

## 4. Important notes
- Role enum values: employee, manager, project_manager, hr, payroll, admin. Admin is the highest privilege.
- `full_name` is a stored generated column.
- Profiles are created automatically when someone signs up.
*/

-- ── Enums ──────────────────────────────────────────────────────────────
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

-- ── Departments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  head_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Designations (must exist before profiles FK) ───────────────────────
CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Profiles ───────────────────────────────────────────────────────────
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

-- back-fill head_id FK now that profiles exists
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

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_designations_department ON designations(department_id);

-- ── updated_at trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Auto-create profile on signup ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── RLS: profiles ────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (first_name, last_name, avatar_url, phone) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── RLS: departments ────────────────────────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON departments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON departments TO authenticated;

-- helper: requester role
CREATE OR REPLACE FUNCTION requester_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "departments_insert_hr_admin" ON departments;
CREATE POLICY "departments_insert_hr_admin"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "departments_update_hr_admin" ON departments;
CREATE POLICY "departments_update_hr_admin"
  ON departments FOR UPDATE
  TO authenticated
  USING (requester_role() IN ('hr', 'admin'))
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "departments_delete_hr_admin" ON departments;
CREATE POLICY "departments_delete_hr_admin"
  ON departments FOR DELETE
  TO authenticated
  USING (requester_role() IN ('hr', 'admin'));

-- ── RLS: designations ───────────────────────────────────────────────────
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON designations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON designations TO authenticated;

DROP POLICY IF EXISTS "designations_select_authenticated" ON designations;
CREATE POLICY "designations_select_authenticated"
  ON designations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "designations_insert_hr_admin" ON designations;
CREATE POLICY "designations_insert_hr_admin"
  ON designations FOR INSERT
  TO authenticated
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "designations_update_hr_admin" ON designations;
CREATE POLICY "designations_update_hr_admin"
  ON designations FOR UPDATE
  TO authenticated
  USING (requester_role() IN ('hr', 'admin'))
  WITH CHECK (requester_role() IN ('hr', 'admin'));

DROP POLICY IF EXISTS "designations_delete_hr_admin" ON designations;
CREATE POLICY "designations_delete_hr_admin"
  ON designations FOR DELETE
  TO authenticated
  USING (requester_role() IN ('hr', 'admin'));
