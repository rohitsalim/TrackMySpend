# Supabase Setup Instructions

## Database Migration

To apply the database schema to your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migrations/20240101000000_initial_schema.sql`
4. Paste and run the SQL in the editor

## Authentication Setup

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Google OAuth provider
3. Add the following redirect URLs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-domain.com/auth/callback` (for production)

## Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `statements`
3. Set the bucket to private (authenticated users only)
4. Add the following policy for authenticated users:
   ```sql
   -- Allow users to upload their own files
   CREATE POLICY "Users can upload their own files"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'statements' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow users to view their own files
   CREATE POLICY "Users can view their own files"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'statements' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow users to delete their own files
   CREATE POLICY "Users can delete their own files"
   ON storage.objects FOR DELETE
   USING (bucket_id = 'statements' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

## Environment Variables

Make sure to update your `.env.local` file with the actual values from your Supabase project:

1. Go to Settings > API in your Supabase dashboard
2. Copy the `URL` to `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the `anon public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`

## Testing the Setup

After completing the setup:

1. Run `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to `/login` if not authenticated
4. The Google OAuth flow should work after proper configuration