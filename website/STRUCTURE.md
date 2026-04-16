# Newsly - Complete Project Structure

This document provides a comprehensive overview of the Newsly project structure, all files created, and how they work together.

## Quick Summary

**Newsly** is a full-stack news recommendation system where users:
1. Sign up with email, username, password, and category preferences
2. View a personalized feed of articles in their selected categories
3. Manage their preferences anytime
4. Get updated articles every 2 hours automatically

---

## Folder Structure

```
newsly/
├── app/                              # Next.js app directory
│   ├── layout.tsx                    # Root layout with AuthProvider
│   ├── RootLayoutClient.tsx          # Auth provider wrapper
│   ├── page.tsx                      # Home/landing page
│   ├── globals.css                   # Global styles
│   ├── favicon.ico                   # App icon
│   │
│   ├── signup/
│   │   └── page.tsx                  # 4-step signup flow
│   │
│   ├── signin/
│   │   └── page.tsx                  # Sign in page
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Main feed/dashboard
│   │   └── preferences/
│   │       └── page.tsx              # Category preferences manager
│   │
│   └── api/                          # API routes
│       ├── auth/
│       │   ├── signup/route.ts       # Create new user
│       │   ├── signin/route.ts       # Authenticate user
│       │   └── logout/route.ts       # Sign out user
│       ├── categories/
│       │   └── route.ts              # Get all categories
│       ├── articles/
│       │   └── route.ts              # Get/create articles
│       ├── preferences/
│       │   └── route.ts              # Get/update user preferences
│       └── cron/
│           └── scrape-articles/
│               └── route.ts          # Background scraping job (every 2 hours)
│
├── components/
│   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── badge.tsx
│   │   ├── field.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ... (and others)
│   │
│   ├── auth/                         # Authentication components
│   │   ├── SignupStep1.tsx           # Email entry
│   │   ├── SignupStep2.tsx           # Username entry
│   │   ├── SignupStep3.tsx           # Password entry
│   │   └── SignupStep4.tsx           # Category selection
│   │
│   └── dashboard/                    # Dashboard components
│       ├── Header.tsx                # Navigation header
│       └── ArticleCard.tsx           # Article display card
│
├── context/
│   └── AuthContext.tsx               # Global auth state & hooks
│
├── lib/
│   ├── auth.ts                       # Authentication utilities
│   ├── session.ts                    # Session management
│   ├── supabase.ts                   # Supabase client & types
│   ├── validations.ts                # Zod validation schemas
│   └── utils.ts                      # General utilities
│
├── scripts/
│   └── 01-setup-database.sql         # Database schema + RLS policies
│
├── public/                           # Static assets
│   ├── favicon.ico
│   └── ... (other static files)
│
├── .env.local                        # Environment variables
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind CSS config
├── next.config.mjs                   # Next.js config
├── vercel.json                       # Vercel cron configuration
├── README.md                         # Full documentation
├── QUICKSTART.md                     # Quick start guide
├── API.md                            # API documentation
└── STRUCTURE.md                      # This file
```

---

## File-by-File Breakdown

### Core Application Files

#### `app/layout.tsx`
- Root layout for entire app
- Wraps all pages with AuthProvider
- Sets metadata (title, description, favicon)
- Includes Analytics

#### `app/RootLayoutClient.tsx`
- Client component that provides AuthContext
- Enables hooks like `useAuth()` throughout the app

#### `app/page.tsx`
- Landing page with:
  - Hero section introducing Newsly
  - Sign up and sign in buttons
  - Feature cards (Personalized, Real-time, Easy to manage)

#### `app/globals.css`
- Global styles including shadcn/ui defaults
- CSS variables for theming
- Tailwind CSS imports

---

### Authentication Pages

#### `app/signup/page.tsx`
- Multi-step signup flow:
  1. Email entry with validation
  2. Username selection with availability check
  3. Password creation with confirmation
  4. Category selection (at least 1 required)
- Creates user, sets preferences, and signs them in
- Redirects to dashboard on success

#### `app/signin/page.tsx`
- Simple email + password login
- Creates JWT session cookie on success
- Redirects to dashboard

#### `components/auth/SignupStep1.tsx`
- Email input field with Zod validation
- Checks format and minimum requirements

#### `components/auth/SignupStep2.tsx`
- Username input with:
  - 3-100 character length requirement
  - Alphanumeric + underscore/hyphen support
  - Back/Next navigation

#### `components/auth/SignupStep3.tsx`
- Password and confirm password fields
- Validation rules: min 8 chars, 1 uppercase, 1 number
- Password match verification

#### `components/auth/SignupStep4.tsx`
- Grid of checkboxes for all 10 categories
- Requires selecting at least 1 category
- Back/Complete button navigation

---

### Dashboard Pages

#### `app/dashboard/page.tsx`
- Main feed showing personalized articles
- Protected route (redirects to signin if not authenticated)
- Features:
  - Articles from user's selected categories
  - Article count and category names
  - "Edit Preferences" button
  - Empty state with CTA to select categories
  - Auto-fetches articles on load

#### `app/dashboard/preferences/page.tsx`
- Category preference management
- Features:
  - All 10 categories with checkboxes
  - Save/Cancel buttons
  - Success/error messages
  - Redirects back to dashboard on save
  - Protected route

#### `components/dashboard/Header.tsx`
- Navigation header appearing on all dashboard pages
- Shows:
  - Newsly logo (links to dashboard)
  - Welcome message with username
  - Dropdown menu with:
    - My Preferences link
    - Profile link (placeholder)
    - Sign Out button

#### `components/dashboard/ArticleCard.tsx`
- Displays individual article with:
  - Title, description, author
  - Article image
  - Category badge
  - Publish date
  - Link to source URL

---

### API Endpoints

#### `app/api/auth/signup/route.ts`
- POST endpoint to create new user
- Input validation with Zod
- Checks for duplicate email/username
- Hashes password with bcrypt
- Returns user object (without password hash)

#### `app/api/auth/signin/route.ts`
- POST endpoint to authenticate user
- Verifies credentials with bcrypt compare
- Creates JWT token and sets HTTP-only cookie
- Returns user object

#### `app/api/auth/logout/route.ts`
- POST endpoint to clear session
- Deletes HTTP-only session cookie
- Always succeeds (no auth required)

#### `app/api/categories/route.ts`
- GET endpoint to fetch all categories
- Queries Supabase directly
- Returns sorted by name

#### `app/api/articles/route.ts`
- GET: Fetches articles for user's preferred categories
  - Requires authentication
  - Returns latest 50 articles ordered by publish date
- POST: Creates new article (for testing/manual entry)
  - Requires category_id and title
  - Returns created article

#### `app/api/preferences/route.ts`
- GET: Fetches user's selected category IDs
  - Requires authentication
  - Returns array of category IDs
- POST: Updates user's selected categories
  - Requires authentication
  - Deletes old preferences and inserts new ones
  - Validates at least 1 category selected

#### `app/api/cron/scrape-articles/route.ts`
- GET endpoint called by Vercel Cron every 2 hours
- Requires Bearer token (CRON_SECRET)
- For each category:
  - Creates scrape_logs entry
  - Generates/fetches articles (currently placeholder)
  - Inserts articles into database
  - Updates scrape_logs with status and count
- Returns results for all categories

---

### Utility Files

#### `lib/auth.ts`
Functions:
- `hashPassword(password)` - Hash with bcryptjs
- `comparePassword(plain, hashed)` - Verify password
- `createUser(email, username, password)` - Insert new user
- `getUserByEmail(email)` - Query user by email
- `getUserByUsername(username)` - Query user by username
- `getUserById(userId)` - Query user by ID
- `verifyCredentials(email, password)` - Verify login
- `updateUserPreferences(userId, categoryIds)` - Update preferences
- `getUserPreferences(userId)` - Fetch user's categories

#### `lib/session.ts`
Functions:
- `createToken(data)` - Generate JWT token with jose
- `verifyToken(token)` - Validate JWT token
- `setSessionCookie(data)` - Create HTTP-only session cookie
- `getSession()` - Retrieve session from cookie
- `clearSession()` - Delete session cookie

#### `lib/supabase.ts`
- Supabase client initialization
- TypeScript interfaces for database tables:
  - User
  - Category
  - UserPreference
  - Article
  - ScrapeLog

#### `lib/validations.ts`
Zod schemas for validation:
- `emailSchema` - Email format
- `usernameSchema` - Username format (3-100 chars, alphanumeric)
- `passwordSchema` - Strong password (8+ chars, 1 upper, 1 number)
- `signupEmailSchema` - Email signup step
- `signupUsernameSchema` - Username signup step
- `signupPasswordSchema` - Password with confirmation
- `signupCategoriesSchema` - Category selection (min 1)
- `signinSchema` - Email + password login
- `profileUpdateSchema` - Profile fields
- `categoryPreferenceSchema` - Category preferences

#### `context/AuthContext.tsx`
React Context providing:
- `user` - Current authenticated user
- `isLoading` - Loading state
- `isSignedIn` - Boolean check
- `setUser()` - Update user state
- `setIsLoading()` - Update loading state
- `logout()` - Sign out function
- `useAuth()` hook to access context

#### `lib/utils.ts` (shadcn)
- `cn()` function for conditional class merging with clsx

---

### Configuration Files

#### `.env.local`
Environment variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
JWT_SECRET
CRON_SECRET
```

#### `vercel.json`
Cron job configuration:
- Path: `/api/cron/scrape-articles`
- Schedule: `0 */2 * * *` (every 2 hours)

#### `package.json`
Key dependencies:
- `next` - React framework
- `react` - React library
- `tailwindcss` - Styling
- `zod` - Validation
- `bcryptjs` - Password hashing
- `jose` - JWT tokens
- `@supabase/supabase-js` - Database
- `@radix-ui/*` - UI component primitives

#### `tsconfig.json`
TypeScript configuration with:
- `@/` alias for root imports
- Strict mode enabled
- Modern JavaScript target

#### `tailwind.config.ts`
Tailwind CSS configuration with:
- shadcn/ui theme
- Custom animations
- Extended color palette

#### `next.config.mjs`
Next.js configuration with:
- Analytics enabled
- Image optimization

---

### Database Schema

#### `scripts/01-setup-database.sql`

**tables:**

1. **categories** - All news categories
   - id, name, description, created_at
   - 10 default categories pre-inserted

2. **users** - User accounts
   - id (UUID), email, username, password_hash
   - full_name, avatar_url, bio, timestamps

3. **user_preferences** - User ↔ Category junction table
   - user_id (FK), category_id (FK)
   - Unique constraint on (user_id, category_id)

4. **articles** - News articles
   - id, category_id (FK), title, description, content
   - author, source_url, image_url, published_at
   - created_at, updated_at

5. **scrape_logs** - Scraping job history
   - id, category_id (FK), status, articles_count
   - error_message, started_at, completed_at

**Indexes:**
- user_preferences(user_id)
- user_preferences(category_id)
- articles(category_id)
- articles(published_at DESC) - For sorting latest first
- scrape_logs(category_id)

**RLS Policies:**
- Users can only read/update their own data
- Everyone can read articles
- Users can manage their own preferences

---

## Data Flow

### Sign Up Flow
```
User enters email
    ↓
Validates format
    ↓
User enters username
    ↓
Checks availability via API
    ↓
User enters password + confirm
    ↓
Validates strength
    ↓
User selects categories
    ↓
POST /api/auth/signup
    ↓
Backend: Hash password, create user, verify no duplicates
    ↓
POST /api/preferences (auto-called)
    ↓
Backend: Insert user preferences
    ↓
POST /api/auth/signin (auto-called)
    ↓
Backend: Verify credentials, set session cookie
    ↓
User redirected to /dashboard
```

### Articles Feed Flow
```
User visits /dashboard
    ↓
Check session (getSession())
    ↓
Not signed in → Redirect to /signin
    ↓
Fetch GET /api/categories
    ↓
Fetch GET /api/articles (uses user's preferences)
    ↓
Database: SELECT articles WHERE category_id IN (user_preferences)
    ↓
Display articles in grid
    ↓
Link to source or read article
```

### Background Scraping Flow
```
Vercel Cron trigger every 2 hours
    ↓
Call GET /api/cron/scrape-articles
    ↓
Verify CRON_SECRET header
    ↓
For each category:
    ↓
    Create scrape_logs entry (status: pending)
        ↓
    Fetch articles from news API (or generate placeholders)
        ↓
    Insert articles into database
        ↓
    Update scrape_logs (status: completed, count: X)
    ↓
Return results summary
```

---

## Dependencies

### Main Dependencies
- `next` - React framework
- `react` & `react-dom` - UI library
- `tailwindcss` - Utility CSS
- `zod` - Schema validation
- `@supabase/supabase-js` - Database client
- `bcryptjs` - Password hashing
- `jose` - JWT handling
- `lucide-react` - Icons
- `@radix-ui/*` - Unstyled components

### Dev Dependencies
- `typescript` - Type checking
- `@types/react`, `@types/node` - Type definitions
- `tailwindcss`, `autoprefixer`, `postcss` - CSS tools
- `eslint` - Code linting

---

## Security Features

1. **Password Security**: bcrypt hashing with 10 salt rounds
2. **Session Management**: JWT in HTTP-only cookies
3. **Input Validation**: Zod schemas on all inputs
4. **SQL Injection Protection**: Parameterized queries via Supabase
5. **Row Level Security**: RLS policies in Supabase
6. **CORS**: Restricted to same-origin
7. **HTTP-only Cookies**: Prevents XSS attacks

---

## Performance Features

1. **Background Scraping**: Articles pre-fetched every 2 hours (not on-demand)
2. **Database Indexes**: Optimized queries on common filters
3. **Lazy Loading**: Components load only when needed
4. **Static Exports**: Home page can be pre-rendered
5. **Image Optimization**: Next.js Image component

---

## Testing

To manually test the app:

1. **Sign Up**: Go to `/signup` and complete 4-step flow
2. **Dashboard**: Should see articles from selected categories
3. **Edit Preferences**: Change categories and verify feed updates
4. **Sign Out**: Click menu → Sign Out
5. **Sign In**: Go to `/signin` with previous credentials

---

## Deployment

### Local Development
```bash
pnpm install
pnpm dev
```

### Production Deployment
```bash
git push origin main
# Vercel auto-deploys on push
```

### Environment Setup
Add to Vercel dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- JWT_SECRET
- CRON_SECRET

---

## Future Enhancements

1. **Real News APIs**: Replace placeholder scraper
2. **User Profiles**: Allow profile customization
3. **Search**: Search articles by keyword
4. **Comments**: Comment on articles
5. **Bookmarks**: Save favorite articles
6. **Email Digest**: Daily/weekly email summaries
7. **Social Sharing**: Share articles on social media
8. **Dark Mode**: Theme toggle
9. **Mobile App**: Native mobile apps
10. **Advanced Analytics**: Track reading habits

---

## Support & Documentation

- **README.md** - Full documentation and setup
- **QUICKSTART.md** - Quick start guide
- **API.md** - Complete API reference
- **STRUCTURE.md** - This file (project structure)
