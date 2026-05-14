import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/session';
import { syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

async function isPipelineAuthorized(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;

  return Boolean(await getSession());
}

export async function POST(request: NextRequest) {
  if (!(await isPipelineAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncResult = await syncArticlesFromScraper({ runScraper: true });

    return NextResponse.json({
      mode: 'database-sync',
      message: 'Scraper and database sync completed.',
      ...syncResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline run failed' },
      { status: 500 },
    );
  }
}
