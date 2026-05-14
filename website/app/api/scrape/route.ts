import { NextResponse } from 'next/server';
import { syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

let lastScrapeTimestamp = 0;
let isScraping = false;

const COOLDOWN_MS = 5 * 60 * 1000;

export async function POST() {
  const now = Date.now();

  if (now - lastScrapeTimestamp < COOLDOWN_MS) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'cooldown',
      lastScrapeAt: new Date(lastScrapeTimestamp).toISOString(),
      nextScrapeAvailable: new Date(lastScrapeTimestamp + COOLDOWN_MS).toISOString(),
    });
  }

  if (isScraping) {
    return NextResponse.json({ status: 'skipped', reason: 'already_running' });
  }

  try {
    isScraping = true;
    const result = await syncArticlesFromScraper({ runScraper: true });
    lastScrapeTimestamp = Date.now();

    return NextResponse.json({
      status: 'completed',
      mode: 'database-sync',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto-scrape error:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Scraper failed' },
      { status: 500 },
    );
  } finally {
    isScraping = false;
  }
}
