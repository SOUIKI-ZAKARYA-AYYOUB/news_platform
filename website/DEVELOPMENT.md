# Newsly Development Guide

Complete guide for developing, extending, and maintaining Newsly.

## Development Environment Setup

### Prerequisites
- Node.js 18+ (check with `node --version`)
- pnpm (check with `pnpm --version` or install with `npm install -g pnpm`)
- Git (check with `git --version`)
- Supabase account (free tier is fine)

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd newsly

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local  # or manually create with values below

# Start development server
pnpm dev
```

### Environment Variables (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xabhtfxpgzkhsfrjtjjg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmh0ZnhwZ3praHNmcmp0ampnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDA2MTgsImV4cCI6MjA5MTE3NjYxOH0.IL7ltbyI8oZafU4MlMQR_NSGsuD0rCQ1YiUq1UlAme0

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# Cron Jobs
CRON_SECRET=your_cron_secret_key_here
```

### Database Setup
1. Log into [Supabase Dashboard](https://supabase.com)
2. Go to project `xabhtfxpgzkhsfrjtjjg`
3. Open **SQL Editor**
4. Create new query and paste contents from `scripts/01-setup-database.sql`
5. Execute query

Verify tables created:
- users
- categories (with 10 categories pre-inserted)
- user_preferences
- articles
- scrape_logs

## Development Workflow

### Starting Development Server
```bash
pnpm dev
```

Server runs on `http://localhost:3000`

Hot Module Replacement (HMR) enabled - changes update instantly.

### Building for Production
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

Uses ESLint with Next.js default config.

## Code Structure & Patterns

### Component Organization

**Location**: `/components`

**Pattern**:
```tsx
'use client';  // Mark as client component if using hooks

import { ReactNode } from 'react';

interface ComponentProps {
  title: string;
  onAction: (value: string) => void;
  isLoading?: boolean;
}

export function MyComponent({ 
  title, 
  onAction, 
  isLoading = false 
}: ComponentProps) {
  return (
    <div>
      {title}
    </div>
  );
}
```

**Best Practices**:
- Use TypeScript interfaces for props
- Mark client components with `'use client'`
- Use semantic HTML (button, form, etc.)
- Pass data via props, not context (unless global)
- Use shadcn/ui components for consistency

### Page Organization

**Location**: `/app`

**Pattern**:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PageName() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch data
    const fetchData = async () => {
      try {
        // API call
      } catch (error) {
        setError('Error message');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return <div>Content</div>;
}
```

**Best Practices**:
- Fetch data in useEffect (or use server components)
- Handle loading and error states
- Redirect unauthenticated users
- Use meaningful variable names

### API Route Organization

**Location**: `/app/api`

**Pattern**:
```tsx
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Validate auth/input
    // Query database
    // Return success
    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input with Zod
    const validation = mySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Process and save
    // Return result
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Best Practices**:
- Always include try/catch
- Validate input with Zod
- Return appropriate status codes
- Log errors to console
- Never expose sensitive data in responses

### Database Queries

**Pattern**:
```tsx
import { supabase } from '@/lib/supabase';

// Fetch
const { data, error } = await supabase
  .from('table_name')
  .select()
  .eq('column', value)
  .single();

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ field: value })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from('table_name')
  .update({ field: newValue })
  .eq('id', id);

// Delete
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

**Best Practices**:
- Always check for errors
- Use `.select()` after insert/update to get result
- Use `.single()` when expecting one row
- Use indexes for frequently queried columns
- Implement RLS policies for security

### Validation Pattern

**Location**: `/lib/validations.ts`

**Pattern**:
```tsx
import { z } from 'zod';

export const mySchema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
  name: z.string().min(1, 'Name required'),
});

// Usage
const validation = mySchema.safeParse(inputData);
if (!validation.success) {
  const errors = validation.error.errors;
  // Handle errors
}
```

**Best Practices**:
- Define all schemas in one file
- Use `.safeParse()` to avoid exceptions
- Provide clear error messages
- Reuse schemas across routes

## Common Tasks

### Adding a New Page

1. **Create page file**
```tsx
// app/new-page/page.tsx
export default function NewPage() {
  return <div>New page</div>;
}
```

2. **If using data/state, add at top**
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function NewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
  }, []);

  return <div>New page</div>;
}
```

3. **Add navigation link in Header or menu**

### Adding a New API Endpoint

1. **Create route file**
```tsx
// app/api/new-endpoint/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'test' });
}
```

2. **Add validation schema** (if needed)
```tsx
// lib/validations.ts - add schema
export const newEndpointSchema = z.object({
  // fields
});
```

3. **Call from frontend**
```tsx
const response = await fetch('/api/new-endpoint', {
  method: 'GET',
});
const data = await response.json();
```

### Adding a New Component

1. **Create component file** with proper structure
2. **Export from components/index.ts** (optional, for easy imports)
3. **Use in pages**

### Modifying Database Schema

1. **Create SQL migration** in `scripts/`
2. **Run migration in Supabase SQL Editor**
3. **Update types** in `lib/supabase.ts`
4. **Update queries** as needed

### Adding New Category

1. **Add to database** via Supabase SQL Editor:
```sql
INSERT INTO categories (name, description) VALUES 
  ('New Category', 'Description');
```

2. **App automatically picks up** when querying categories

### Integrating Real News API

1. **Get API key** from news source (NewsAPI, Guardian, etc.)

2. **Add to env variables**:
```env
NEWS_API_KEY=your_api_key
```

3. **Update scraper** in `/app/api/cron/scrape-articles/route.ts`:
```tsx
async function fetchArticles(category: string) {
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${category}&apiKey=${process.env.NEWS_API_KEY}`
  );
  const data = await response.json();
  
  return data.articles.map(article => ({
    category_id: categoryId,
    title: article.title,
    description: article.description,
    content: article.content,
    author: article.author,
    source_url: article.url,
    image_url: article.urlToImage,
    published_at: article.publishedAt,
  }));
}
```

4. **Test** by visiting `/api/cron/scrape-articles` with proper auth

## Debugging

### Using Console.log

```tsx
// In components/pages
console.log('Debug message:', variable);

// Check browser DevTools Console tab
```

### Using Supabase Dashboard

1. Go to SQL Editor
2. Run queries to check data:
```sql
SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM user_preferences WHERE user_id = 'uuid';
SELECT * FROM articles LIMIT 10;
SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT 5;
```

### Common Issues

**Issue**: Articles not showing
- Check user has selected categories: `SELECT * FROM user_preferences WHERE user_id = 'id'`
- Check articles exist: `SELECT * FROM articles`
- Check article dates are recent enough

**Issue**: Sign up fails
- Check email not already in users table
- Check username not already in users table
- Check password meets requirements

**Issue**: Cron job not running
- Check CRON_SECRET is set in environment
- Manually visit `/api/cron/scrape-articles` with Bearer token
- Check Vercel Cron setup in vercel.json

**Issue**: Database connection error
- Verify Supabase credentials in .env.local
- Check Supabase project status
- Verify database isn't full or locked

## Testing Checklist

### Manual Testing
- [ ] Sign up flow (all 4 steps)
- [ ] Sign in with created account
- [ ] Dashboard shows articles
- [ ] Can change preferences
- [ ] Can sign out
- [ ] Can sign back in
- [ ] Home page accessible without auth

### Edge Cases
- [ ] Sign up with invalid email
- [ ] Sign up with short password
- [ ] Sign up with duplicate email/username
- [ ] Sign in with wrong password
- [ ] Access dashboard without signing in (should redirect)
- [ ] Edit preferences with no categories selected

### Browser Testing
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (mobile)

## Performance Optimization

### Database
- Add indexes on frequently filtered columns
- Use `.select()` to only fetch needed fields
- Use pagination for large result sets

### Frontend
- Use `next/Image` for image optimization
- Lazy load components with dynamic imports
- Memoize expensive computations

### API
- Cache responses when appropriate
- Use database indexes
- Batch operations when possible

## Security Best Practices

1. **Never commit secrets**: Keep `.env.local` in `.gitignore`
2. **Validate all input**: Use Zod on backend AND frontend
3. **Authenticate routes**: Protect API endpoints that need it
4. **Use HTTPS**: Always on production
5. **Update dependencies**: Run `pnpm upgrade` periodically
6. **Log carefully**: Never log sensitive data

## Deployment

### Vercel Deployment

1. Push code to GitHub:
```bash
git add .
git commit -m "Feature: Add new feature"
git push origin main
```

2. Vercel auto-deploys on push

3. Add environment variables in Vercel dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - JWT_SECRET
   - CRON_SECRET

4. Cron jobs automatically enabled (requires Pro plan)

### Database Backup

Supabase handles backups automatically. To manually backup:
1. Go to Supabase dashboard
2. Click Settings → Backups
3. Create manual backup

## Git Workflow

### Branch Naming
```
feature/feature-name      # New features
fix/bug-fix-name          # Bug fixes
docs/documentation        # Documentation
refactor/refactor-name    # Refactoring
```

### Commit Messages
```
Feature: Add new feature description
Fix: Fix bug description
Docs: Update documentation
Refactor: Improve code structure
```

### Pull Request Process
1. Create feature branch
2. Make commits
3. Push to GitHub
4. Create pull request
5. Review and merge
6. Delete feature branch

## Useful Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Format code (if prettier configured)
pnpm format

# Check TypeScript
pnpm type-check

# Run tests (if configured)
pnpm test
```

## Documentation

- **README.md** - Project overview and setup
- **QUICKSTART.md** - Quick start guide
- **API.md** - API endpoint documentation
- **STRUCTURE.md** - Project structure
- **DEVELOPMENT.md** - This file (development guide)

## Getting Help

1. Check if issue is in documentation
2. Review similar code in the codebase
3. Check Supabase docs: https://supabase.com/docs
4. Check Next.js docs: https://nextjs.org/docs
5. Check Tailwind docs: https://tailwindcss.com/docs

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Zod Docs](https://zod.dev)

### Libraries
- [shadcn/ui](https://ui.shadcn.com) - UI Components
- [lucide-react](https://lucide.dev) - Icons
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - Password hashing
- [jose](https://github.com/panva/jose) - JWT handling

## Contributing Guidelines

1. Follow code style (TypeScript, shadcn/ui patterns)
2. Write meaningful commit messages
3. Test changes before pushing
4. Update documentation if needed
5. Keep commits focused and logical

## License

MIT
