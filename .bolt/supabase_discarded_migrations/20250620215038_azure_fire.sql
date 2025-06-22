/*
  # Fix profile insert policy for signup

  1. Security Changes
    - Drop existing INSERT policy that requires authentication
    - Create new INSERT policy that allows profile creation during signup
    - Ensure users can only create profiles with their own user ID

  This fixes the RLS violation that occurs when creating profiles during user signup,
  since the user isn't fully authenticated yet when the profile record is created.
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new INSERT policy that allows profile creation during signup
-- This policy allows inserting a profile record if:
-- 1. The user is authenticated (for regular inserts), OR
-- 2. The ID matches the current auth.uid() (for signup flow)
CREATE POLICY "Users can insert own profile during signup"
  ON profiles
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated and ID matches
    (auth.role() = 'authenticated' AND auth.uid() = id) OR
    -- Allow if this is during signup (user exists but may not be fully authenticated yet)
    (auth.uid() = id)
  );

-- Also ensure we have a policy for service role (used during signup)
CREATE POLICY IF NOT EXISTS "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);