# TrackMySpend Implementation Guide

## Overview
This document outlines the technical implementation plan for TrackMySpend MVP - a secure, intuitive web app that helps users understand their spending by uploading financial statements and getting categorized insights.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **Server State**: React Query (TanStack Query)

### Backend
- **Database & Auth**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **LLM Integration**: Vercel AI SDK (with OpenAI)
- **API Routes**: Next.js Edge Functions

### Testing
- **Unit Tests**: Vitest
- **Component Tests**: React Testing Library
- **API Mocking**: MSW (Mock Service Worker)

## Database Schema (MVP-focused, Future-ready)

### Core Tables

#### users (via Supabase Auth)
```sql
- id: uuid (primary key)
- email: string (unique)
- created_at: timestamp
- updated_at: timestamp
- profile_data: jsonb (name, avatar_url)
```

#### bank_accounts
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- bank_name: string
- account_type: enum (CHECKING, SAVINGS)
- last_4_digits: string
- created_at: timestamp
- updated_at: timestamp
```

#### credit_cards
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- card_type: enum (VISA, MASTERCARD, AMEX, etc.)
- last_4_digits: string
- created_at: timestamp
- updated_at: timestamp
```

#### files
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- filename: string
- file_url: string
- file_type: string
- status: enum (pending, processing, completed, failed)
- uploaded_at: timestamp
- processed_at: timestamp
- total_transactions: integer
- total_income: decimal
- total_expenses: decimal
- person_inferred: string (for future multi-user)
```

#### raw_transactions
```sql
- id: uuid (primary key)
- file_id: uuid (foreign key)
- user_id: uuid (foreign key)
- date: date
- description: string
- reference_number: string
- raw_text: text
- amount: decimal
- type: enum (DEBIT, CREDIT)
- original_currency: string
- original_amount: decimal
- fingerprint: string (unique index)
- parsing_confidence: decimal
- created_at: timestamp
```

#### transactions
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- raw_transaction_id: uuid (foreign key)
- vendor_name: string
- vendor_name_original: string
- category_id: uuid (foreign key)
- amount: decimal
- type: enum (DEBIT, CREDIT)
- transaction_date: date
- notes: text
- is_duplicate: boolean
- duplicate_of_id: uuid
- is_internal_transfer: boolean
- related_transaction_id: uuid
- bank_account_id: uuid (foreign key, nullable)
- credit_card_id: uuid (foreign key, nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### categories
```sql
- id: uuid (primary key)
- name: string
- parent_id: uuid (self-reference)
- icon: string
- color: string
- is_system: boolean
- user_id: uuid (nullable, for custom categories)
- created_at: timestamp
```

#### vendor_mappings
```sql
- id: uuid (primary key)
- original_text: string
- mapped_name: string
- user_id: uuid (nullable for global mappings)
- confidence: decimal
- source: enum (user, llm, google)
- created_at: timestamp
```

#### monthly_insights
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- month_year: date
- insights_json: jsonb
- generated_at: timestamp
```

### Indexes
- raw_transactions.fingerprint (unique)
- transactions.user_id + transaction_date
- vendor_mappings.original_text
- categories.user_id + name

## File Structure

```
trackmyspend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts
│   │   ├── process/
│   │   │   └── route.ts
│   │   └── insights/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── dashboard/
│   │   ├── income-expense-chart.tsx
│   │   ├── category-breakdown.tsx
│   │   └── monthly-insights.tsx
│   ├── transactions/
│   │   ├── transaction-list.tsx
│   │   ├── transaction-filters.tsx
│   │   └── transaction-edit-modal.tsx
│   └── upload/
│       ├── file-upload.tsx
│       └── processing-status.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── parser.ts
│   │   ├── vendor-resolver.ts
│   │   └── insights-generator.ts
│   └── utils/
│       ├── deduplication.ts
│       ├── fingerprint.ts
│       └── formatters.ts
├── store/
│   ├── auth.ts
│   ├── transactions.ts
│   ├── upload.ts
│   └── ui.ts
├── types/
│   ├── database.ts
│   ├── transactions.ts
│   └── api.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Phases

### Phase 1: Project Setup & Auth (3 days)

**Tasks:**
1. Initialize Next.js project with TypeScript
2. Set up Supabase project and configure auth
3. Create database schema and migrations
4. Implement Google OAuth flow
5. Create auth middleware and protected routes
6. Set up Zustand stores for auth state
7. Create basic layout components with navigation

**Deliverables:**
- Working auth flow with Google OAuth
- Protected route middleware
- Basic responsive layout
- Auth state management

**Tests:**
- Auth flow unit tests
- Protected route tests
- Auth store tests

### Phase 2: File Upload & Storage (2 days)

**Tasks:**
1. Create file upload component with drag-and-drop
2. Implement Supabase storage integration
3. Add file management UI in profile
4. Create upload progress tracking
5. Handle multiple file uploads (up to 20)

**Deliverables:**
- Working file upload with progress
- File storage in Supabase
- File list view in profile

**Tests:**
- File upload component tests
- Storage integration tests
- Error handling tests

### Phase 3: PDF Processing Engine (5 days)

**Tasks:**
1. Set up Vercel AI SDK with OpenAI
2. Create PDF parsing prompt based on PRD
3. Implement structured data extraction
4. Store raw transactions with fingerprints
5. Add error handling and retry logic
6. Create processing status updates

**Deliverables:**
- PDF parsing with LLM
- Raw transaction storage
- Processing status tracking
- Error recovery

**Tests:**
- Parser accuracy tests
- Fingerprint generation tests
- Error handling tests
- Mock LLM responses

### Phase 4: Transaction Management (4 days)

**Tasks:**
1. Implement transaction deduplication logic
2. Create internal transfer detection
3. Build transaction list view with pagination
4. Add filters (date, category, vendor, person)
5. Create edit modal for vendor name & category
6. Add custom category creation

**Deliverables:**
- Transaction list with filters
- Deduplication system
- Edit capabilities
- Category management

**Tests:**
- Deduplication algorithm tests
- Filter logic tests
- Transaction CRUD tests
- Category management tests

### Phase 5: Vendor & Categories (3 days)

**Tasks:**
1. Implement vendor deanonymization with LLM
2. Add Google search fallback for vendors
3. Create category auto-assignment logic
4. Build vendor mapping persistence
5. Add user override capabilities

**Deliverables:**
- Vendor resolution system
- Auto-categorization
- User override tracking
- Shared vendor mappings

**Tests:**
- Vendor resolution tests
- Categorization tests
- Mapping persistence tests

### Phase 6: Dashboard & Insights (4 days)

**Tasks:**
1. Create income vs expense chart
2. Build category breakdown chart
3. Implement monthly insights with LLM
4. Add view toggles (placeholder for family views)
5. Ensure responsive design for all charts

**Deliverables:**
- Interactive dashboard
- Data visualizations
- AI-generated insights
- Responsive design

**Tests:**
- Chart calculation tests
- Insights generation tests
- Responsive design tests

### Phase 7: Polish & Deploy (3 days)

**Tasks:**
1. Add loading states and error boundaries
2. Optimize performance (lazy loading, pagination)
3. Complete mobile responsiveness
4. Set up Vercel deployment
5. Create documentation and README

**Deliverables:**
- Production-ready app
- Deployment configuration
- Documentation
- Test coverage report

**Tests:**
- Performance tests
- Cross-browser compatibility validation

## Key Implementation Details

### Zustand Store Structure

```typescript
// authStore
interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// transactionStore
interface TransactionStore {
  transactions: Transaction[];
  categories: Category[];
  filters: TransactionFilters;
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  setFilters: (filters: TransactionFilters) => void;
}

// uploadStore
interface UploadStore {
  files: UploadedFile[];
  processingStatus: Record<string, ProcessingStatus>;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
}
```

### Vercel AI SDK Integration

```typescript
// PDF Parser
const parsePDFStatement = async (pdfContent: string) => {
  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: statementSchema,
    prompt: `Parse this bank statement...`,
  });
  return object;
};

// Vendor Resolution
const resolveVendor = async (description: string) => {
  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: `Identify the vendor from: ${description}`,
  });
  return text;
};

// Monthly Insights
const generateInsights = async (transactions: Transaction[]) => {
  const { text } = await generateText({
    model: openai('gpt-4'),
    prompt: `Generate insights for these transactions...`,
  });
  return text;
};
```

### Deduplication Strategy

1. **Fingerprint Generation**:
   - Normalize vendor name (remove special chars, lowercase)
   - Combine: `${date}-${amount}-${normalizedVendor}`
   - Generate SHA256 hash

2. **Duplicate Detection**:
   - Check exact fingerprint matches
   - Flag with confidence score
   - Mark `is_duplicate` and reference `duplicate_of_id`

3. **Internal Transfer Detection**:
   - Find opposite transactions (same amount, opposite type)
   - Within 3-day window
   - Mark both as internal transfers

### Testing Strategy

**Unit Tests (80% coverage target)**:
- All utility functions
- Store actions and state changes
- API route handlers
- Deduplication logic

**Integration Tests**:
- Database operations
- File upload flow
- LLM integrations with mocks
- Auth flow

**Component Tests**:
- React components with user interactions
- Form validation and error states
- Chart components with different data sets
- Mobile responsive behavior

## Security Considerations

1. **Authentication**: Supabase RLS policies on all tables
2. **File Access**: Signed URLs for file downloads
3. **Data Privacy**: No full account numbers stored
4. **API Security**: Rate limiting on all endpoints
5. **Input Validation**: Zod schemas for all inputs

## Performance Optimizations

1. **Lazy Loading**: Charts and heavy components
2. **Pagination**: Transaction lists (50 per page)
3. **Caching**: React Query for server state
4. **Background Processing**: Queue PDF processing
5. **Database Indexes**: On frequently queried fields

## Future Extensibility

The schema is designed to easily support:
- Family accounts (via family_members table)
- Budget tracking (add budgets table)
- Recurring transaction detection
- SMS/Email parsing
- Real-time notifications
- Mobile app via API endpoints

## Success Metrics

1. **MVP Launch Goals**:
   - 10 users complete at least 1 upload session
   - Users return to check dashboards at least once
   - 1-2 users manually edit expenses
   - Collect feedback from all users

2. **Technical Metrics**:
   - 80%+ test coverage
   - <3s page load time
   - 99% uptime
   - Successful parsing of 5+ bank formats