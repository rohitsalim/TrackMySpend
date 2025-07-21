# TrackMySpend Supabase Development Guide

This guide covers both **local development** and **production deployment** configurations for TrackMySpend.

## 🏠 Local Development Setup (Recommended)

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed globally
- Docker Desktop running (required for local Supabase)
- Node.js 18+ 

### Quick Start for Local Development

1. **Start local Supabase stack:**
   ```bash
   npm run supabase:start
   ```
   This will start:
   - Local PostgreSQL database (port 54322)
   - Local Supabase API (port 54321)
   - Supabase Studio (port 54323)
   - Email testing (port 54324)

2. **Switch to local environment:**
   ```bash
   npm run env:local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access services:**
   - App: http://localhost:3000
   - Supabase Studio: http://localhost:54323
   - Email testing: http://localhost:54324

### Local Development Commands

```bash
# Environment Management
npm run env:status      # Check current environment
npm run env:local       # Switch to local development
npm run env:production  # Switch to production (for testing)

# Supabase Local Management  
npm run supabase:start  # Start local Supabase
npm run supabase:stop   # Stop local Supabase
npm run supabase:reset  # Reset database with migrations
npm run supabase:status # Check service status
npm run supabase:studio # Open Supabase Studio

# Development
npm run dev:local       # Start local Supabase + dev server
npm run dev             # Just start dev server
```

### Local Environment Features

- ✅ **Automatic database migrations** - applied on startup
- ✅ **Google OAuth configured** - works with localhost
- ✅ **File storage enabled** - statements bucket auto-created
- ✅ **Email testing** - view sent emails at localhost:54324
- ✅ **Database browser** - Supabase Studio at localhost:54323
- ✅ **Hot reload** - code changes reflected instantly

## 🚀 Production Setup

### Supabase Cloud Configuration

1. **Create Supabase Project:**
   - Go to https://supabase.com/dashboard
   - Create new project
   - Wait for initialization

2. **Apply Database Schema:**
   - Option A: Use migrations (recommended)
     ```bash
     supabase link --project-ref your-project-ref
     supabase db push
     ```
   - Option B: Manual SQL execution
     - Go to SQL Editor in Supabase dashboard
     - Execute `migrations/20240101000000_initial_schema.sql`
     - Execute `migrations/20240102000000_create_storage_bucket.sql`

3. **Configure Authentication:**
   - Go to Authentication > Providers
   - Enable Google OAuth
   - Add redirect URLs:
     - `https://your-domain.vercel.app/auth/callback`

4. **Environment Variables (Vercel):**
   ```bash
   # Add to Vercel environment variables:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
   
   # Common variables (same for both environments)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   OPENAI_API_KEY=your-openai-key
   ```

## 🔄 Environment Switching

The project includes an automated environment switcher:

```bash
# Check current environment
npm run env:status

# Switch to local development (uses localhost:54321)
npm run env:local

# Switch to production testing (uses remote Supabase)
npm run env:production
```

**Note:** For actual production deployment, Vercel uses environment variables, not `.env.local`.

## 📁 Project Structure

```
supabase/
├── config.toml              # Local Supabase configuration
├── migrations/              # Database migrations
│   ├── 20240101000000_initial_schema.sql
│   └── 20240102000000_create_storage_bucket.sql
└── README.md               # This file

scripts/
└── switch-env.js           # Environment switching utility

.env.local                  # Current environment config
.env.local.example         # Example configuration
.env.production            # Production config backup
```

## 🔧 Configuration Details

### Google OAuth Setup
Works for both local and production:
- **Local**: `http://localhost:3000/auth/callback`
- **Production**: `https://your-domain.vercel.app/auth/callback`

### Database Features
- **Row Level Security (RLS)** - enabled on all tables
- **User isolation** - each user sees only their data
- **Automatic timestamps** - created_at/updated_at triggers
- **File storage** - statements bucket with user folders
- **Transaction deduplication** - fingerprint-based uniqueness

### Storage Configuration
- **Bucket**: `statements`
- **Privacy**: Private (authenticated users only)
- **Structure**: `/{user_id}/{filename}`
- **Policies**: Users can only access their own files

## 🐛 Troubleshooting

### Common Issues

**Local Supabase won't start:**
```bash
# Ensure Docker is running
docker --version

# Stop and restart
npm run supabase:stop
npm run supabase:start
```

**Authentication not working:**
```bash
# Check environment
npm run env:status

# Verify Google OAuth is configured in supabase/config.toml
```

**Database schema issues:**
```bash
# Reset database with fresh migrations
npm run supabase:reset
```

**Environment confusion:**
```bash
# Always check current environment
npm run env:status

# Switch to correct environment
npm run env:local      # For development
npm run env:production # For testing with production DB
```

## 📊 Development Workflow

### Recommended Daily Workflow

1. **Start development:**
   ```bash
   npm run env:status      # Check environment
   npm run supabase:start  # Start local services
   npm run dev            # Start Next.js
   ```

2. **Make database changes:**
   - Create new migration: `supabase migration new your_change`
   - Edit the generated SQL file
   - Apply: `npm run supabase:reset`

3. **Test production compatibility:**
   ```bash
   npm run env:production  # Switch to production DB
   npm run build          # Test build
   npm run env:local      # Switch back to local
   ```

### Migration Workflow

```bash
# Create new migration
supabase migration new add_new_table

# Edit the generated file in supabase/migrations/
# Apply locally
npm run supabase:reset

# Apply to production (when ready)
supabase db push
```

## 🔐 Security Best Practices

- ✅ Row Level Security enabled on all tables
- ✅ Service role key only used server-side
- ✅ File access restricted to user folders
- ✅ Authentication required for all operations
- ✅ No sensitive data in client-side code

This setup provides a seamless development experience with local Supabase while maintaining production compatibility.