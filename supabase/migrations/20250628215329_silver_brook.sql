/*
  # Fix Database Constraints for Mood Entries and Session Analytics

  1. Database Schema Updates
    - Ensure proper unique constraints exist for upsert operations
    - Add missing constraints that are referenced in the application code
    - Fix any constraint naming issues

  2. Tables Updated
    - `mood_entries`: Ensure unique constraint on (user_id, entry_date)
    - `session_analytics`: Remove problematic unique constraint on session_id
    - Verify all foreign key relationships are properly established

  3. Security
    - All existing RLS policies remain unchanged
    - No changes to user permissions or access controls
*/

-- Ensure the unique constraint exists for mood_entries (user_id, entry_date)
-- This constraint should already exist based on the schema, but let's make sure
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mood_entries_user_id_entry_date_key' 
    AND table_name = 'mood_entries'
  ) THEN
    -- Add the unique constraint if it doesn't exist
    ALTER TABLE mood_entries 
    ADD CONSTRAINT mood_entries_user_id_entry_date_key 
    UNIQUE (user_id, entry_date);
  END IF;
END $$;

-- For session_analytics, we don't want a unique constraint on session_id alone
-- because multiple analytics entries might share the same session_id
-- Let's remove any problematic unique constraint on session_id if it exists
DO $$
BEGIN
  -- Check if there's a unique constraint on session_id that's causing issues
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_analytics_session_id_key' 
    AND table_name = 'session_analytics'
    AND constraint_type = 'UNIQUE'
  ) THEN
    -- Drop the problematic unique constraint
    ALTER TABLE session_analytics 
    DROP CONSTRAINT session_analytics_session_id_key;
  END IF;
END $$;

-- Ensure session_analytics has proper indexing for performance
-- but not unique constraints that would prevent multiple entries
CREATE INDEX IF NOT EXISTS session_analytics_session_id_created_at_idx 
ON session_analytics (session_id, created_at DESC);

-- Verify all foreign key constraints are properly named and functional
-- This is mainly for documentation and verification

-- Verify mood_entries foreign key to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mood_entries_user_id_fkey' 
    AND table_name = 'mood_entries'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE mood_entries 
    ADD CONSTRAINT mood_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify session_analytics foreign key to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_analytics_user_id_fkey' 
    AND table_name = 'session_analytics'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE session_analytics 
    ADD CONSTRAINT session_analytics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;