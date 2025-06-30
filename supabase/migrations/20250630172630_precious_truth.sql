/*
  # Fix Profiles RLS Policy

  1. Security
    - Drop existing INSERT policies that might be too restrictive
    - Create proper INSERT policies for authenticated users and service role
    - Ensure users can create their own profiles during signup

  2. Changes
    - Drop existing INSERT policies for profiles table
    - Add new INSERT policy for authenticated users
    - Add new INSERT policy for service role
*/

-- Drop the existing INSERT policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create a new INSERT policy that allows authenticated users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a policy for service role (needed for some auth flows)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);