/*
  # Fix profiles table RLS policy for user registration

  1. Security Updates
    - Update INSERT policy to allow users to create their own profiles during registration
    - Ensure the policy works with Supabase Auth's user creation flow
    
  2. Changes
    - Modify the INSERT policy to properly handle new user registration
    - The policy should allow insertion when the user is authenticated and the ID matches their auth.uid()
*/

-- Drop the existing INSERT policy that might be too restrictive
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new INSERT policy that allows authenticated users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a policy for service role (needed for some auth flows)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);