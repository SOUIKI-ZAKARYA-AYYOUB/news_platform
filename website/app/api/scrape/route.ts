import { NextResponse } from 'next/server';
import { refreshScraperFeed } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

// In-memory lock to prevent concurrent scraper runs
let lastScrapeTimestamp = 0;
let isScraping = false;

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between scraper runs

export async function POST() {
  const now = Date.now();

  // If we scraped recently, return a cached result
  if (now - lastScrapeTimestamp < COOLDOWN_MS) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'cooldown',
      lastScrapeAt: new Date(lastScrapeTimestamp).toISOString(),
      nextScrapeAvailable: new Date(lastScrapeTimestamp + COOLDOWN_MS).toISOString(),
    });
  }

  // If already scraping, don't double-run
  if (isScraping) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'already_running',
    });
  }

  try {
    isScraping = true;
    const result = await refreshScraperFeed();
    lastScrapeTimestamp = Date.now();

    return NextResponse.json({
      status: 'completed',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto-scrape error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Scraper failed',
      },
      { status: 500 }
    );
  } finally {
    isScraping = false;
  }
}
