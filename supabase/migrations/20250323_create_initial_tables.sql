-- Create scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  paid BOOLEAN DEFAULT false NOT NULL,
  payment_id TEXT
);

-- Create vulnerabilities table
CREATE TABLE public.vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  ai_fix TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  code_snippet TEXT
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  stripe_payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create domain_verifications table
CREATE TABLE public.domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verification_type TEXT NOT NULL,
  verification_value TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create RLS policies
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for scans table
CREATE POLICY "Users can view their own scans" ON public.scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans" ON public.scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" ON public.scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for vulnerabilities table
CREATE POLICY "Users can view vulnerabilities for their scans" ON public.vulnerabilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = vulnerabilities.scan_id
      AND scans.user_id = auth.uid()
    )
  );

-- Create policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for domain_verifications table
CREATE POLICY "Users can view their own domain verifications" ON public.domain_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domain verifications" ON public.domain_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domain verifications" ON public.domain_verifications
  FOR UPDATE USING (auth.uid() = user_id);
