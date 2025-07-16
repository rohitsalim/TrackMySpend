-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS');
CREATE TYPE card_type AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER');
CREATE TYPE file_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE transaction_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE vendor_source AS ENUM ('user', 'llm', 'google');

-- Create bank_accounts table
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_type account_type NOT NULL,
  last_4_digits TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_cards table
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type card_type NOT NULL,
  last_4_digits TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status file_status DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  total_transactions INTEGER,
  total_income DECIMAL(10, 2),
  total_expenses DECIMAL(10, 2),
  person_inferred TEXT
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  icon TEXT,
  color TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create raw_transactions table
CREATE TABLE raw_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  raw_text TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type transaction_type NOT NULL,
  original_currency TEXT DEFAULT 'INR',
  original_amount DECIMAL(10, 2),
  fingerprint TEXT NOT NULL,
  parsing_confidence DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on fingerprint for deduplication
CREATE UNIQUE INDEX idx_raw_transactions_fingerprint ON raw_transactions(fingerprint);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_transaction_id UUID NOT NULL REFERENCES raw_transactions(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_name_original TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type transaction_type NOT NULL,
  transaction_date DATE NOT NULL,
  notes TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  is_internal_transfer BOOLEAN DEFAULT FALSE,
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendor_mappings table
CREATE TABLE vendor_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_text TEXT NOT NULL,
  mapped_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence DECIMAL(3, 2),
  source vendor_source NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monthly_insights table
CREATE TABLE monthly_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  insights_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_vendor_mappings_original_text ON vendor_mappings(original_text);
CREATE INDEX idx_categories_user_id_name ON categories(user_id, name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert system categories
INSERT INTO categories (name, icon, color, is_system) VALUES
  ('Food & Dining', 'utensils', '#22c55e', true),
  ('Transportation', 'car', '#3b82f6', true),
  ('Shopping', 'shopping-bag', '#8b5cf6', true),
  ('Entertainment', 'film', '#f59e0b', true),
  ('Bills & Utilities', 'receipt', '#ef4444', true),
  ('Healthcare', 'heart', '#ec4899', true),
  ('Education', 'graduation-cap', '#06b6d4', true),
  ('Personal Care', 'user', '#a855f7', true),
  ('Travel', 'plane', '#0ea5e9', true),
  ('Investments', 'trending-up', '#10b981', true),
  ('Insurance', 'shield', '#6366f1', true),
  ('Rent', 'home', '#f97316', true),
  ('Other', 'more-horizontal', '#6b7280', true);

-- Row Level Security (RLS) Policies
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- Bank accounts policies
CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Credit cards policies
CREATE POLICY "Users can view their own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Files policies
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view system categories and their own categories"
  ON categories FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Raw transactions policies
CREATE POLICY "Users can view their own raw transactions"
  ON raw_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw transactions"
  ON raw_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Vendor mappings policies
CREATE POLICY "Users can view global and their own vendor mappings"
  ON vendor_mappings FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendor mappings"
  ON vendor_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor mappings"
  ON vendor_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendor mappings"
  ON vendor_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Monthly insights policies
CREATE POLICY "Users can view their own monthly insights"
  ON monthly_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly insights"
  ON monthly_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly insights"
  ON monthly_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly insights"
  ON monthly_insights FOR DELETE
  USING (auth.uid() = user_id);