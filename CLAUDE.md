# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrackMySpend is a financial management web application that helps users understand their spending by uploading bank/credit card statements and getting categorized insights. The MVP focuses on PDF statement processing, transaction categorization, vendor resolution, and spending analytics.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run tests (when implemented)
npm test
npm run test:watch
npm run test:coverage
```

The development server runs on http://localhost:3000 with hot reloading enabled.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **Backend**: Supabase (Auth, Database, Storage)
- **LLM Integration**: Vercel AI SDK with OpenAI
- **Testing**: Vitest, React Testing Library, MSW (Mock Service Worker)

### Key Architectural Decisions

1. **App Router Structure**: Uses Next.js 14 App Router with route groups:
   - `(auth)` - Login/signup pages
   - `(dashboard)` - Protected pages (dashboard, transactions, profile)
   - `api` - API routes for upload, processing, insights

2. **State Management**: Zustand stores for:
   - `authStore` - User session management
   - `transactionStore` - Transaction data and filters
   - `uploadStore` - File upload and processing status
   - `uiStore` - UI state (modals, loading states)

3. **Database Design**: PostgreSQL via Supabase with:
   - Transaction deduplication using fingerprints
   - Vendor mapping with user overrides
   - Category hierarchy (system + custom)
   - Raw transaction storage for reprocessing

4. **PDF Processing Pipeline**:
   - Upload to Supabase Storage
   - LLM parsing with structured output
   - Fingerprint generation for deduplication
   - Vendor resolution (LLM + Google fallback)
   - Auto-categorization with user overrides

5. **Security**: 
   - Supabase Row Level Security (RLS)
   - Google OAuth authentication
   - No full account numbers stored

## Project Rules and Standards

**Important**: All coding standards and development rules are comprehensively defined in `.cursorrules`. Always refer to this file for detailed guidelines on:

- Code formatting and TypeScript standards
- Financial data handling and security practices
- Database patterns and Supabase integration
- Testing requirements and coverage targets
- Performance optimization guidelines
- UI/UX standards for financial applications

Key highlights from `.cursorrules`:

1. **TypeScript**: Strict mode enforced, no `any` types
2. **Financial Data**: Use Decimal types or strings for monetary values
3. **Security**: RLS on all tables, signed URLs for files
4. **Testing**: 80% coverage target, 100% for financial calculations
5. **Performance**: Server Components by default, pagination for lists

## Implementation Status

The project has detailed planning in:
- `prd.md` - Product Requirements Document
- `implementation.md` - Technical Implementation Guide
- `.cursorrules` - Comprehensive development standards

Currently in initial setup phase with Next.js boilerplate.

## Critical Implementation Notes

1. **Deduplication Logic**: 
   - Generate SHA256 fingerprint from normalized date+amount+vendor
   - Detect internal transfers (credit card payments)
   - Handle duplicate statement uploads

2. **LLM Integration Pattern**:
   ```typescript
   const { object } = await generateObject({
     model: openai('gpt-4-turbo'),
     schema: transactionSchema,
     prompt: STATEMENT_PARSER_PROMPT,
     temperature: 0, // For consistency
   });
   ```

3. **Testing Requirements**:
   - Target 80% code coverage
   - Mock LLM responses for consistent tests
   - Test with multiple Indian bank formats (ICICI, HDFC, etc.)
   - Focus on unit and integration tests only

4. **Path Aliases**: Uses `@/*` for imports from project root

## File Processing Prompt

When parsing bank/credit card statements, use the structured prompt defined in prd.md (lines 424-554) which handles:
- Statement type detection
- Foreign currency transactions
- Transaction fingerprinting
- Raw text preservation

## Common Patterns

### API Route Pattern
```typescript
export async function POST(request: Request) {
  try {
    // Validate auth
    const user = await validateUser(request);
    
    // Validate input
    const body = await request.json();
    const validated = schema.parse(body);
    
    // Process
    const result = await processData(validated);
    
    // Return success
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    // Return error
    return NextResponse.json({
      success: false,
      error: {
        code: 'ERROR_CODE',
        message: error.message
      }
    }, { status: 400 });
  }
}
```

### Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('transactions')
  .select('*, categories(*)')
  .eq('user_id', userId)
  .order('transaction_date', { ascending: false })
  .range(offset, offset + limit - 1);

if (error) throw error;
```

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (for Vercel AI SDK)
OPENAI_API_KEY=

# Google Search API (for vendor resolution)
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
```

## Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification for consistent commit messages:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation only changes
- **style**: Changes that do not affect meaning (white-space, formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process, auxiliary tools, or dependencies
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies

### Scopes (optional)
- **auth**: Authentication related changes
- **dashboard**: Dashboard component changes
- **transactions**: Transaction-related functionality
- **upload**: File upload functionality
- **db**: Database schema or queries
- **api**: API route changes
- **ui**: UI component changes
- **store**: State management changes
- **utils**: Utility function changes
- **types**: TypeScript type definitions

### Examples
```bash
# Feature commits
feat(auth): add Google OAuth integration
feat(transactions): implement transaction deduplication logic
feat(dashboard): add monthly spending insights chart

# Bug fixes
fix(upload): handle PDF parsing errors gracefully
fix(api): prevent duplicate transaction creation
fix(ui): correct currency formatting for negative amounts

# Documentation
docs: add API documentation for transaction endpoints
docs: update README with deployment instructions

# Refactoring
refactor(store): simplify transaction store actions
refactor(utils): extract common date formatting functions

# Performance
perf(dashboard): optimize chart rendering with React.memo
perf(api): add database indexing for transaction queries

# Tests
test(utils): add unit tests for fingerprint generation
test(api): add integration tests for upload endpoints

# Chores
chore: update dependencies to latest versions
chore: add ESLint rules for financial data handling
```

### Breaking Changes
For breaking changes, add `!` after the type/scope:
```bash
feat(api)!: change transaction response format
refactor(store)!: restructure transaction state interface
```

### Multi-line Commits
For more complex changes, use the body and footer:
```bash
feat(transactions): implement advanced filtering system

Add support for filtering transactions by:
- Date range with custom periods
- Multiple category selection
- Amount range filtering
- Vendor name search

Closes #123
```

### Financial Data Specific Guidelines
- Always mention when changes affect financial calculations
- Include security considerations in commit messages when relevant
- Reference specific bank formats when adding parsing support

```bash
fix(parser): handle HDFC statement date format variations
feat(security): add input validation for monetary amounts
perf(calculations): optimize monthly summary aggregations
```