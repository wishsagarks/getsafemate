/*
  # Fix profiles table RLS policies for user signup

  1. Security Updates
    - Update INSERT policy to allow users to insert their own profile during signup
    - Ensure the policy works for both authenticated and public users during signup process
    - Keep existing SELECT and UPDATE policies intact

  2. Changes Made
    - Drop and recreate the INSERT policy with proper conditions
    - Allow users to insert profiles where the ID matches their auth.uid()
    - Handle the case where users are inserting during the signup process
*/

-- Drop the existing problematic INSERT policies
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create a comprehensive INSERT policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

-- Also create a policy for the service role to insert profiles if needed
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure RLS is enabled (it should already be, but let's be explicit)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;