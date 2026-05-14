import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

function isCronAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { rows: logRows } = await pool.query<{ id: number }>(
    `INSERT INTO scrape_logs (status) VALUES ('pending') RETURNING id`,
  );
  const logId = logRows[0]?.id;

  try {
    const syncResult = await syncArticlesFromScraper({ runScraper: true });

    if (logId) {
      await pool.query(
        `UPDATE scrape_logs
         SET status = 'completed', articles_count = $1, completed_at = NOW()
         WHERE id = $2`,
        [syncResult.syncedCount, logId],
      );
    }

    return NextResponse.json(
      { message: 'Scraping sync completed', ...syncResult, timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    console.error('Scraping job error:', error);

    if (logId) {
      await pool.query(
        `UPDATE scrape_logs
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [String(error), logId],
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
