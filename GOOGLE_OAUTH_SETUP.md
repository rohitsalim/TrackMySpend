# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for TrackMySpend authentication.

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project**:
   - Click "Select a project" → "New Project"
   - Project name: `TrackMySpend` (or your preferred name)
   - Click "Create"

## Step 2: Enable Google OAuth API

1. **Navigate to APIs & Services**:
   - In the left sidebar, click "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity"
   - Enable the "Google+ API" (if available) or "Google Identity Services API"

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**:
   - Left sidebar → "APIs & Services" → "OAuth consent screen"
   
2. **Choose User Type**:
   - Select "Internal" if you're in Google Workspace organization
   - Select "External" for personal Gmail accounts
   - Click "Create"

3. **Fill in App Information**:
   - **App name**: `TrackMySpend`
   - **User support email**: Your email address
   - **Developer contact email**: Your email address
   - **App domain** (optional): Leave blank for now
   - **Authorized domains**: Add your domain when you have one

4. **Scopes** (Step 2):
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click "Update"

5. **Test Users** (Step 3):
   - Add your email address as a test user
   - Add your client's email for testing
   - Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. **Go to Credentials**:
   - Left sidebar → "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"

2. **Configure OAuth Client**:
   - **Application type**: Web application
   - **Name**: `TrackMySpend Web Client`
   
3. **Add Authorized URLs**:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production later)
   
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://your-domain.com/auth/callback` (for production later)

4. **Create and Save**:
   - Click "Create"
   - **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Configure Supabase

1. **Go to your Supabase Dashboard**:
   - Navigate to https://app.supabase.com/project/[your-project-id]
   - Go to "Authentication" → "Providers"

2. **Enable Google Provider**:
   - Find "Google" in the list and click to enable it
   - **Client ID**: Paste the Google Client ID from Step 4
   - **Client Secret**: Paste the Google Client Secret from Step 4
   - **Redirect URL**: Should be auto-filled as `https://[your-supabase-project].supabase.co/auth/v1/callback`
   - Click "Save"

## Step 6: Update Environment Variables

1. **Update `.env.local`**:
   ```bash
   # Google OAuth (for authentication)
   GOOGLE_CLIENT_ID=your-actual-google-client-id
   GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
   ```

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

## Step 7: Test the Authentication

1. **Navigate to**: http://localhost:3000/login
2. **Click "Google" button**
3. **You should be redirected to Google's OAuth consent screen**
4. **After approving, you should be redirected back to your app**

## Common Issues & Solutions

### Issue: "Error 400: redirect_uri_mismatch"
**Solution**: Check that your redirect URI in Google Cloud Console exactly matches:
- Development: `http://localhost:3000/auth/callback`
- Make sure there are no trailing slashes or extra characters

### Issue: "This app isn't verified"
**Solution**: This is normal during development. Click "Advanced" → "Go to TrackMySpend (unsafe)" to continue.

### Issue: "Access blocked: This app's request is invalid"
**Solution**: 
- Check that you've enabled the correct APIs in Google Cloud Console
- Verify your OAuth consent screen is configured correctly
- Ensure your domain is added to authorized domains

### Issue: "User not found" or authentication doesn't work
**Solution**:
- Verify your Supabase Google provider is configured correctly
- Check that your Google Client ID and Secret are correct in both places
- Ensure your redirect URLs match exactly

## Production Setup

When deploying to production:

1. **Update Google Cloud Console**:
   - Add your production domain to authorized origins
   - Add your production callback URL to authorized redirect URIs

2. **Update Supabase**:
   - No changes needed - Supabase handles the redirect automatically

3. **Update Environment Variables**:
   - Set the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production

## Client Transfer Process

### Option A: Transfer Project Ownership
1. In Google Cloud Console, go to "IAM & Admin" → "Manage Resources"
2. Select your project → "Add Principal"
3. Add your client's Google account with "Owner" role
4. Have client accept the invitation
5. Remove yourself as owner if desired

### Option B: Create New Project for Client
1. Client creates their own Google Cloud project
2. Client follows this same setup guide
3. Update environment variables in your deployed app
4. Test the authentication flow

## Security Notes

- Never commit your Google Client Secret to version control
- Use environment variables for all sensitive credentials
- Consider using Google Cloud Secret Manager for production
- Regularly rotate your OAuth credentials

## Support

If you encounter issues:
1. Check the Google Cloud Console logs
2. Check your browser's developer console for errors
3. Verify all URLs match exactly (no trailing slashes)
4. Test with an incognito/private window to avoid cache issues