CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'custom',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS weekly_goal_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (weekday BETWEEN 1 AND 7),
  CHECK (target_minutes >= 0),
  UNIQUE (goal_id, weekday)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  goal_id UUID REFERENCES learning_goals(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Study session',
  note TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  work_mode TEXT NOT NULL DEFAULT 'focus_clock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (duration_minutes >= 0),
  CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id ON learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_goal_id ON study_sessions(goal_id);

-- Row-Level Security: each authenticated user can only access their own rows.
-- auth.uid() returns the Supabase user UUID; user_id columns are TEXT so we
-- compare with ::text. weekly_goal_targets has no user_id and is gated via
-- ownership of the parent goal.

ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goal_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_goals_select_own ON learning_goals;
CREATE POLICY learning_goals_select_own ON learning_goals
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS learning_goals_insert_own ON learning_goals;
CREATE POLICY learning_goals_insert_own ON learning_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS learning_goals_update_own ON learning_goals;
CREATE POLICY learning_goals_update_own ON learning_goals
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS learning_goals_delete_own ON learning_goals;
CREATE POLICY learning_goals_delete_own ON learning_goals
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS subjects_select_own ON subjects;
CREATE POLICY subjects_select_own ON subjects
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS subjects_insert_own ON subjects;
CREATE POLICY subjects_insert_own ON subjects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS subjects_update_own ON subjects;
CREATE POLICY subjects_update_own ON subjects
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS subjects_delete_own ON subjects;
CREATE POLICY subjects_delete_own ON subjects
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS study_sessions_select_own ON study_sessions;
CREATE POLICY study_sessions_select_own ON study_sessions
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS study_sessions_insert_own ON study_sessions;
CREATE POLICY study_sessions_insert_own ON study_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS study_sessions_update_own ON study_sessions;
CREATE POLICY study_sessions_update_own ON study_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS study_sessions_delete_own ON study_sessions;
CREATE POLICY study_sessions_delete_own ON study_sessions
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS weekly_goal_targets_select_own ON weekly_goal_targets;
CREATE POLICY weekly_goal_targets_select_own ON weekly_goal_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learning_goals g
      WHERE g.id = weekly_goal_targets.goal_id
        AND auth.uid()::text = g.user_id
    )
  );

DROP POLICY IF EXISTS weekly_goal_targets_insert_own ON weekly_goal_targets;
CREATE POLICY weekly_goal_targets_insert_own ON weekly_goal_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_goals g
      WHERE g.id = weekly_goal_targets.goal_id
        AND auth.uid()::text = g.user_id
    )
  );

DROP POLICY IF EXISTS weekly_goal_targets_update_own ON weekly_goal_targets;
CREATE POLICY weekly_goal_targets_update_own ON weekly_goal_targets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learning_goals g
      WHERE g.id = weekly_goal_targets.goal_id
        AND auth.uid()::text = g.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_goals g
      WHERE g.id = weekly_goal_targets.goal_id
        AND auth.uid()::text = g.user_id
    )
  );

DROP POLICY IF EXISTS weekly_goal_targets_delete_own ON weekly_goal_targets;
CREATE POLICY weekly_goal_targets_delete_own ON weekly_goal_targets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learning_goals g
      WHERE g.id = weekly_goal_targets.goal_id
        AND auth.uid()::text = g.user_id
    )
  );
