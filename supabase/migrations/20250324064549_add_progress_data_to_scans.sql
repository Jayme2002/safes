-- Add progress fields to scans table
ALTER TABLE public.scans
ADD COLUMN progress_stage TEXT,
ADD COLUMN progress_percent INTEGER,
ADD COLUMN progress_message TEXT,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create an update trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scans_updated_at
BEFORE UPDATE ON public.scans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
