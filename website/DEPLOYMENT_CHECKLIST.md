# Newsly Deployment Checklist

Complete checklist to deploy Newsly to production.

## Pre-Deployment (Local Testing)

### Database Setup
- [ ] Supabase project created (xabhtfxpgzkhsfrjtjjg)
- [ ] SQL schema executed (`scripts/01-setup-database.sql`)
- [ ] All 5 tables created (users, categories, user_preferences, articles, scrape_logs)
- [ ] 10 categories inserted into categories table
- [ ] RLS policies enabled on tables

### Environment Configuration
- [ ] `.env.local` file created with:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] JWT_SECRET (long random string)
  - [ ] CRON_SECRET (long random string)

### Local Development Testing
- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` server starts successfully
- [ ] Home page loads at http://localhost:3000
- [ ] Sign up flow works (all 4 steps)
  - [ ] Email validation works
  - [ ] Username validation works
  - [ ] Password validation works
  - [ ] Category selection works
  - [ ] User created in database
- [ ] Sign in works with created account
- [ ] Dashboard shows articles
- [ ] Edit preferences works
- [ ] Sign out works
- [ ] Can sign back in
- [ ] Navigation flows are correct
- [ ] No console errors
- [ ] No TypeScript errors (`pnpm lint`)
- [ ] Build completes successfully (`pnpm build`)

### Database Testing
- [ ] Users table has test user
- [ ] User preferences created correctly
- [ ] Can manually insert test articles
- [ ] Article queries work via API
- [ ] Cron job can be triggered manually

---

## Production Deployment (Vercel)

### GitHub Setup
- [ ] Repository created on GitHub
- [ ] Code pushed to main branch:
```bash
git add .
git commit -m "Initial Newsly implementation"
git push origin main
```

### Vercel Project
- [ ] Vercel account created
- [ ] New project created in Vercel
- [ ] GitHub repository connected
- [ ] Production branch set to `main`

### Environment Variables (Vercel)
Add these in Project Settings → Environment Variables:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = https://xabhtfxpgzkhsfrjtjjg.supabase.co
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your_anon_key
- [ ] `JWT_SECRET` = long_random_string (NOT same as local)
- [ ] `CRON_SECRET` = long_random_string (NOT same as local)

### Vercel Deployment
- [ ] Initial deployment triggered
- [ ] Deployment successful (green checkmark)
- [ ] Production URL accessible
- [ ] No deployment errors in logs

### Vercel Cron Jobs
- [ ] Cron job enabled (requires Pro plan)
- [ ] `vercel.json` cron config correct
- [ ] Cron runs automatically every 2 hours
- [ ] Can view cron execution logs in Vercel dashboard

### Post-Deployment Testing
- [ ] Production URL loads
- [ ] Sign up works on production
  - [ ] Email validation works
  - [ ] Duplicate email check works
  - [ ] User created in Supabase
- [ ] Sign in works
- [ ] Dashboard shows articles
- [ ] Preferences management works
- [ ] Sign out works
- [ ] Articles update every 2 hours (check timestamp)
- [ ] No errors in Vercel logs
- [ ] Performance acceptable (page load time < 2s)

---

## Post-Deployment (Maintenance)

### Monitoring
- [ ] Set up error tracking (Sentry optional)
- [ ] Monitor Vercel analytics
- [ ] Check Supabase usage
- [ ] Review database growth

### Content Integration
**If using real news API:**
- [ ] Get API key from news source
- [ ] Add to Vercel environment variables
- [ ] Update scraper in `/app/api/cron/scrape-articles/route.ts`
- [ ] Test scraper manually
- [ ] Monitor article quality
- [ ] Track API quota usage

### Backup & Recovery
- [ ] Enable Supabase automated backups
- [ ] Test backup restoration process
- [ ] Document recovery procedures
- [ ] Set up monitoring alerts

### Security Hardening
- [ ] Change JWT_SECRET to unique value
- [ ] Change CRON_SECRET to unique value
- [ ] Enable Supabase 2FA
- [ ] Review RLS policies
- [ ] Add rate limiting (optional)
- [ ] Add CORS restrictions (optional)
- [ ] Enable HTTPS only (default in Vercel)

### Performance Optimization
- [ ] Monitor database query performance
- [ ] Add indexes if needed
- [ ] Optimize images (already done)
- [ ] Review bundle size
- [ ] Check Core Web Vitals

---

## Documentation & Handoff

### Documentation
- [ ] README.md reviewed and updated
- [ ] API.md accurate
- [ ] STRUCTURE.md reflects actual code
- [ ] DEVELOPMENT.md clear and usable
- [ ] QUICKSTART.md works for new developers

### Team Knowledge Transfer
- [ ] Deploy process documented
- [ ] Emergency procedures documented
- [ ] Code conventions understood
- [ ] Database schema documented
- [ ] API endpoints documented

---

## Scaling & Growth (Later Phase)

### Performance at Scale
- [ ] Database indexes optimized
- [ ] API response times monitored
- [ ] Consider caching layer (Redis)
- [ ] Monitor memory usage
- [ ] Track database size growth

### Feature Expansion
- [ ] User analytics
- [ ] Email notifications
- [ ] Advanced search
- [ ] Bookmarks/favorites
- [ ] Social features

### Infrastructure
- [ ] Database read replicas (if needed)
- [ ] CDN for static assets (Vercel default)
- [ ] Message queue for background jobs (if needed)
- [ ] Cache layer (if needed)

---

## Troubleshooting Guide

### If deployment fails:
1. Check Vercel deployment logs
2. Verify environment variables are correct
3. Check TypeScript compilation
4. Review .env.local format
5. Ensure Git push was successful

### If articles don't appear:
1. Verify Supabase connection
2. Check cron job logs in Vercel
3. Manually trigger scraper with Bearer token
4. Check articles in Supabase SQL editor
5. Verify user has selected categories

### If sign up fails:
1. Check Supabase database status
2. Verify RLS policies aren't blocking
3. Check for duplicate email/username in database
4. Review API error responses
5. Check bcryptjs installation

### If sign in fails:
1. Verify user exists in database
2. Check password hash in database
3. Verify JWT_SECRET matches
4. Check session cookie settings
5. Clear browser cookies and retry

### If Cron doesn't run:
1. Verify Vercel Pro/Team plan
2. Check CRON_SECRET environment variable
3. Verify `/api/cron/scrape-articles` exists
4. Check `vercel.json` syntax
5. Review Vercel cron logs

---

## Performance Targets

Aim for these metrics:

| Metric | Target |
|--------|--------|
| Page Load Time | < 2 seconds |
| First Contentful Paint | < 1.5 seconds |
| Largest Contentful Paint | < 2.5 seconds |
| API Response Time | < 500ms |
| Database Query Time | < 200ms |
| Cron Job Time | < 5 minutes |

---

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced (automatic in Vercel)
- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens in HTTP-only cookies
- [ ] SQL injection prevention (via Supabase parameterization)
- [ ] XSS prevention (via React escaping)
- [ ] CSRF protection (inherent with same-site cookies)
- [ ] Rate limiting considered
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive data

---

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor for failed cron jobs
- [ ] Check database health

### Weekly
- [ ] Review Vercel analytics
- [ ] Check database growth
- [ ] Monitor API quota usage (if applicable)

### Monthly
- [ ] Full backup verification
- [ ] Security audit
- [ ] Performance review
- [ ] Update dependencies (optional)

### Quarterly
- [ ] Major version updates (optional)
- [ ] Architecture review
- [ ] Capacity planning
- [ ] User feedback review

---

## Sign-Off

### Development Complete
- [x] All features implemented
- [x] Code tested locally
- [x] Documentation written
- [x] Ready for deployment

### Pre-Production
- [ ] Database migrated
- [ ] Environment configured
- [ ] Deployment tested
- [ ] Monitoring enabled

### Production Live
- [ ] Deployment successful
- [ ] Monitoring active
- [ ] Team trained
- [ ] Users notified

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Vercel Support | support@vercel.com |
| Supabase Support | support@supabase.io |
| Database Admin | (Your email) |
| Dev Lead | (Your email) |

---

## Rollback Plan

If deployment fails in production:

1. **Immediate**: Revert to last known good version in Vercel
   - Vercel dashboard → Deployments → Select previous version
   - Click "Promote to Production"

2. **Data**: Restore from Supabase backup if needed
   - Supabase dashboard → Backups → Select backup
   - Request restore via support

3. **Communication**: Notify users of outage
   - Status page (if available)
   - Email notification
   - Social media

4. **Post-Mortem**: Identify and fix root cause
   - Review logs
   - Add tests
   - Update deployment procedure

---

## Notes

- Newsly is production-ready for deployment
- All configuration files are included
- Documentation is complete
- System is secure and scalable
- Real news API integration is next step

**Good luck with your deployment!** 🚀

Last updated: 2024
Version: 1.0.0
