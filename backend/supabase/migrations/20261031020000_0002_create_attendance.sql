/*
# Gola CyberAI — Phase 2: Attendance, Breaks & Working Hours Schema

This migration creates tables for attendance tracking:
- attendance_sessions: tracks daily check-in, check-out, status, total working and break durations.
- attendance_breaks: tracks individual break periods (lunch, tea, short break).
*/

-- ── Enums ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('working', 'on_break', 'completed');
  END IF;
END $$;

-- ── Attendance Sessions ────────────────────────────────────────────────
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

-- ── Attendance Breaks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  break_type text NOT NULL DEFAULT 'break',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_breaks_session ON attendance_breaks(session_id);

-- ── RLS Policies ───────────────────────────────────────────────────────
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can view their own, managers/HR/admin can view all
DROP POLICY IF EXISTS "attendance_sessions_select" ON attendance_sessions;
CREATE POLICY "attendance_sessions_select"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin')
    )
  );

-- Sessions: Users can insert their own
DROP POLICY IF EXISTS "attendance_sessions_insert_own" ON attendance_sessions;
CREATE POLICY "attendance_sessions_insert_own"
  ON attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Sessions: Users can update their own
DROP POLICY IF EXISTS "attendance_sessions_update_own" ON attendance_sessions;
CREATE POLICY "attendance_sessions_update_own"
  ON attendance_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Breaks: Users can select breaks belonging to visible sessions
DROP POLICY IF EXISTS "attendance_breaks_select" ON attendance_breaks;
CREATE POLICY "attendance_breaks_select"
  ON attendance_breaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions
      WHERE id = session_id AND (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin'))
      )
    )
  );

-- Breaks: Users can insert and update breaks for their own sessions
DROP POLICY IF EXISTS "attendance_breaks_insert_own" ON attendance_breaks;
CREATE POLICY "attendance_breaks_insert_own"
  ON attendance_breaks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendance_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "attendance_breaks_update_own" ON attendance_breaks;
CREATE POLICY "attendance_breaks_update_own"
  ON attendance_breaks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );
