#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '../.env.local');
const PRODUCTION_BACKUP = path.join(__dirname, '../.env.production');

function switchToLocal() {
  const localConfig = `# TrackMySpend Environment Configuration
# 
# This file is configured for LOCAL DEVELOPMENT using local Supabase
# For production deployment, update these values to use remote Supabase

# =============================================================================
# SUPABASE CONFIGURATION - LOCAL DEVELOPMENT
# =============================================================================
# Local Supabase instance (started with \`npm run supabase:start\`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Site URL for local development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# =============================================================================
# PRODUCTION SUPABASE CONFIGURATION (commented out for local development)
# =============================================================================
# Uncomment these and comment out the local ones above for production:
# NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
# NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# =============================================================================
# COMMON CONFIGURATION
# =============================================================================

# OpenAI Configuration (for Vercel AI SDK)
OPENAI_API_KEY=your-openai-api-key

# Google OAuth (for authentication)
# These work for both local and production environments
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Search API (optional for MVP - can be added later)
# GOOGLE_SEARCH_API_KEY=your-google-search-api-key
# GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id

# Environment detection
NODE_ENV=development`;

  fs.writeFileSync(ENV_FILE, localConfig);
  console.log('✅ Switched to LOCAL development configuration');
  console.log('   Supabase URL: http://127.0.0.1:54321');
  console.log('   Run: npm run supabase:start (if not already running)');
}

function switchToProduction() {
  if (!fs.existsSync(PRODUCTION_BACKUP)) {
    console.error('❌ Production backup file not found!');
    console.log('   Expected: .env.production');
    process.exit(1);
  }

  const productionConfig = fs.readFileSync(PRODUCTION_BACKUP, 'utf8');
  fs.writeFileSync(ENV_FILE, productionConfig);
  console.log('✅ Switched to PRODUCTION configuration');
  console.log('   Supabase URL: [from .env.production file]');
  console.log('   NOTE: This is for testing only - production uses Vercel env vars');
}

function showStatus() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ No .env.local file found');
    return;
  }

  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const isLocal = content.includes('http://127.0.0.1:54321');
  const isProduction = content.includes('.supabase.co') && !isLocal;

  console.log('📋 Current environment configuration:');
  if (isLocal) {
    console.log('   ✅ LOCAL development (using local Supabase)');
    console.log('   🔗 http://127.0.0.1:54321');
  } else if (isProduction) {
    console.log('   ✅ PRODUCTION (using remote Supabase)');
    console.log('   🔗 [remote Supabase URL]');
  } else {
    console.log('   ❓ Unknown configuration');
  }
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'local':
    switchToLocal();
    break;
  case 'production':
    switchToProduction();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log(`
🔧 Environment Switcher for TrackMySpend

Usage:
  node scripts/switch-env.js <command>

Commands:
  local       Switch to local development (uses local Supabase)
  production  Switch to production (uses remote Supabase)
  status      Show current environment configuration

Examples:
  npm run env:local       # Switch to local development
  npm run env:production  # Switch to production  
  npm run env:status      # Check current environment
    `);
    break;
}