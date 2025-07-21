-- Create storage bucket for statement files
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', true);

-- Create RLS policies for the storage bucket
CREATE POLICY "Allow authenticated users to upload to statements bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'statements' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Allow users to view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'statements'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Allow users to delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'statements'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );