/*
  # Fix Profile Insert RLS Policy

  1. Policy Changes
    - Drop existing restrictive INSERT policy
    - Create new policy that allows profile creation during signup
    - Add service role policy for signup process

  2. Security
    - Maintains security by checking auth.uid() = id
    - Allows profile creation during signup flow
    - Service role can insert profiles (needed for auth flow)
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop the service role policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create a new INSERT policy that allows profile creation during signup
-- This policy allows inserting a profile record if the ID matches auth.uid()
CREATE POLICY "Users can insert own profile during signup"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create service role policy for signup process
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);