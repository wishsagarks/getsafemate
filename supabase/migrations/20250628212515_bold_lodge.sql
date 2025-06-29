/*
  # Create Insights and Analytics Tables

  1. New Tables
    - `mood_entries` - Track daily mood, energy, and stress levels
    - `activity_logs` - Log wellness activities and completions
    - `session_analytics` - Detailed session metrics and outcomes
    - `user_achievements` - Track badges, streaks, and milestones
    - `safety_events` - Log safety incidents and emergency activations

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own data
    - Proper foreign key relationships

  3. Indexes
    - Optimize for common query patterns
    - Support analytics and reporting
*/

-- Create mood_entries table
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('very-sad', 'sad', 'neutral', 'happy', 'very-happy')),
  energy_level integer NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),
  stress_level integer NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  notes text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('breathing', 'meditation', 'movement', 'mindfulness')),
  activity_name text NOT NULL,
  duration_seconds integer,
  completed boolean DEFAULT true,
  mood_before text CHECK (mood_before IN ('very-sad', 'sad', 'neutral', 'happy', 'very-happy')),
  mood_after text CHECK (mood_after IN ('very-sad', 'sad', 'neutral', 'happy', 'very-happy')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create session_analytics table
CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES ai_sessions(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('safewalk', 'heartmate')),
  duration_seconds integer NOT NULL DEFAULT 0,
  messages_exchanged integer DEFAULT 0,
  voice_interactions integer DEFAULT 0,
  video_calls integer DEFAULT 0,
  emergency_triggers integer DEFAULT 0,
  mood_improvement_score integer CHECK (mood_improvement_score >= -5 AND mood_improvement_score <= 5),
  user_satisfaction integer CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  location_shared boolean DEFAULT false,
  safety_score integer CHECK (safety_score >= 1 AND safety_score <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type text NOT NULL CHECK (achievement_type IN ('streak', 'milestone', 'safety', 'wellness', 'social')),
  achievement_name text NOT NULL,
  achievement_description text,
  badge_icon text,
  points_earned integer DEFAULT 0,
  unlocked_at timestamptz DEFAULT now(),
  is_featured boolean DEFAULT false
);

-- Create safety_events table
CREATE TABLE IF NOT EXISTS safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES ai_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('sos_triggered', 'emergency_contact_notified', 'location_shared', 'safe_arrival', 'route_deviation', 'panic_button')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location_lat decimal(10, 8),
  location_lng decimal(11, 8),
  location_accuracy integer,
  emergency_contacts_notified integer DEFAULT 0,
  response_time_seconds integer,
  resolution_status text CHECK (resolution_status IN ('resolved', 'ongoing', 'false_alarm', 'escalated')),
  notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mood_entries
CREATE POLICY "Users can read own mood entries"
  ON mood_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mood entries"
  ON mood_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mood entries"
  ON mood_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood entries"
  ON mood_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for activity_logs
CREATE POLICY "Users can read own activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for session_analytics
CREATE POLICY "Users can read own session analytics"
  ON session_analytics FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session analytics"
  ON session_analytics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session analytics"
  ON session_analytics FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_achievements
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for safety_events
CREATE POLICY "Users can read own safety events"
  ON safety_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own safety events"
  ON safety_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_mood_entries_updated_at
  BEFORE UPDATE ON mood_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_analytics_updated_at
  BEFORE UPDATE ON session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS mood_entries_user_date_idx ON mood_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS mood_entries_mood_idx ON mood_entries(mood);
CREATE INDEX IF NOT EXISTS mood_entries_created_at_idx ON mood_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_activity_type_idx ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS session_analytics_user_id_idx ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS session_analytics_session_type_idx ON session_analytics(session_type);
CREATE INDEX IF NOT EXISTS session_analytics_created_at_idx ON session_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_type_idx ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS user_achievements_unlocked_at_idx ON user_achievements(unlocked_at DESC);

CREATE INDEX IF NOT EXISTS safety_events_user_id_idx ON safety_events(user_id);
CREATE INDEX IF NOT EXISTS safety_events_type_idx ON safety_events(event_type);
CREATE INDEX IF NOT EXISTS safety_events_severity_idx ON safety_events(severity);
CREATE INDEX IF NOT EXISTS safety_events_created_at_idx ON safety_events(created_at DESC);