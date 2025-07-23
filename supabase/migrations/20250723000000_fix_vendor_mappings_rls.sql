-- Fix vendor_mappings RLS policies to allow global mappings

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own vendor mappings" ON vendor_mappings;

-- Create new INSERT policy that allows both user-specific and global mappings
CREATE POLICY "Users can insert vendor mappings"
  ON vendor_mappings FOR INSERT
  WITH CHECK (
    -- Allow user-specific mappings (user owns the mapping)
    auth.uid() = user_id OR 
    -- Allow global mappings (user_id is NULL for shared intelligence)
    user_id IS NULL
  );

-- Also update the UPDATE policy to handle global mappings
DROP POLICY IF EXISTS "Users can update their own vendor mappings" ON vendor_mappings;

CREATE POLICY "Users can update vendor mappings"
  ON vendor_mappings FOR UPDATE
  USING (
    -- Users can update their own mappings
    auth.uid() = user_id OR
    -- Users can update global mappings (for learning system)
    user_id IS NULL
  );

-- Keep DELETE policy restrictive (users can only delete their own mappings)
-- This prevents users from deleting global shared mappings