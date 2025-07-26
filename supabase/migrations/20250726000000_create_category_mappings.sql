-- Create category_mappings table for caching vendor -> category assignments
CREATE TABLE category_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2),
  source TEXT NOT NULL CHECK (source IN ('user', 'pattern', 'llm')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_category_mappings_vendor_name ON category_mappings(vendor_name);
CREATE INDEX idx_category_mappings_user_id ON category_mappings(user_id);
CREATE INDEX idx_category_mappings_confidence ON category_mappings(confidence DESC);

-- Enable Row Level Security
ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view global and their own category mappings"
  ON category_mappings FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert category mappings"
  ON category_mappings FOR INSERT
  WITH CHECK (
    -- Allow user-specific mappings (user owns the mapping)
    auth.uid() = user_id OR 
    -- Allow global mappings (user_id is NULL for shared intelligence)
    user_id IS NULL
  );

CREATE POLICY "Users can update category mappings"
  ON category_mappings FOR UPDATE
  USING (
    -- Users can update their own mappings
    auth.uid() = user_id OR
    -- Users can update global mappings (for learning system)
    user_id IS NULL
  );

CREATE POLICY "Users can delete their own category mappings"
  ON category_mappings FOR DELETE
  USING (auth.uid() = user_id);