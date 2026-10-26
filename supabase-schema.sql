-- ====================================================================
-- SUPABASE SCHEMA FOR INVOICE MAKER PRO
-- Run this in your Supabase Dashboard: SQL Editor -> "New Query" -> Paste & Run
-- ====================================================================

-- 1. Create Profiles Table (Stores user company settings)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT DEFAULT '',
  company_description TEXT DEFAULT '',
  your_name TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  company_phone TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  payment_details TEXT DEFAULT '',
  default_currency TEXT DEFAULT 'USD',
  default_notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);


-- 2. Create Invoices Table (Stores user invoice history)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  company_description TEXT DEFAULT '',
  your_name TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  client_description TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  items JSONB DEFAULT '[]'::jsonb,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  header_color TEXT DEFAULT '#1e293b',
  total_amount_color TEXT DEFAULT '#2563eb',
  visible_fields JSONB DEFAULT '{}'::jsonb,
  show_tax_column BOOLEAN DEFAULT true,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoices Policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
CREATE POLICY "Users can delete their own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: Index on user_id and invoice_number for instant searches
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS invoices_number_idx ON public.invoices (invoice_number);
