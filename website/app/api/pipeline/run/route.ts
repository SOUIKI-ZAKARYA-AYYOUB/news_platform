import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';
import { refreshScraperFeed, syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

async function isPipelineAuthorized(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return Boolean(await getSession());
}

export async function POST(request: NextRequest) {
  if (!(await isPipelineAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (isSupabaseConfigured) {
      const syncResult = await syncArticlesFromScraper({ runScraper: true });

      return NextResponse.json({
        mode: 'database-sync',
        message: 'Scraper, story processing, duplicate clustering, and database sync completed.',
        ...syncResult,
        timestamp: new Date().toISOString()
      });
    }

    const refreshResult = await refreshScraperFeed();

    return NextResponse.json({
      message: 'Scraper, story processing, and local JSON refresh completed.',
      ...refreshResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pipeline run error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline run failed' },
      { status: 500 }
    );
  }
}
