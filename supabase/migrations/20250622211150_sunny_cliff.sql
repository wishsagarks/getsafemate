/*
  # Create AI Sessions Table

  1. New Tables
    - `ai_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `session_type` (text, safewalk or heartmate)
      - `room_name` (text, LiveKit room name)
      - `avatar_id` (text, Tavus avatar ID)
      - `emergency_contacts` (jsonb, emergency contact info)
      - `status` (text, active/completed/error)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `duration_seconds` (integer, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `ai_sessions` table
    - Add policy for users to read their own sessions
    - Add policy for users to insert their own sessions
    - Add policy for users to update their own sessions

  3. Indexes
    - Index on user_id for fast lookups
    - Index on session_type for filtering
    - Index on status for monitoring
*/

-- Create ai_sessions table
CREATE TABLE IF NOT EXISTS ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('safewalk', 'heartmate')),
  room_name text NOT NULL,
  avatar_id text NOT NULL,
  emergency_contacts jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own sessions"
  ON ai_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON ai_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON ai_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_sessions_updated_at
  BEFORE UPDATE ON ai_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ai_sessions_user_id_idx ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_sessions_session_type_idx ON ai_sessions(session_type);
CREATE INDEX IF NOT EXISTS ai_sessions_status_idx ON ai_sessions(status);
CREATE INDEX IF NOT EXISTS ai_sessions_started_at_idx ON ai_sessions(started_at);