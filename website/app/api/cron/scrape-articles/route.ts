import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

/**
 * Background job that runs every 2 hours to sync external scraper output
 * into the Newsly articles table.
 */

function isCronAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        },
        { status: 500 }
      );
    }

    const { data: logData } = await supabase
      .from('scrape_logs')
      .insert({
        status: 'pending'
      })
      .select()
      .single();

    const logId = logData?.id;

    try {
      const syncResult = await syncArticlesFromScraper({ runScraper: true });

      if (logId) {
        await supabase
          .from('scrape_logs')
          .update({
            status: 'completed',
            articles_count: syncResult.syncedCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', logId);
      }

      return NextResponse.json(
        {
          message: 'Scraping sync completed',
          ...syncResult,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );
    } catch (syncError) {
      if (logId) {
        await supabase
          .from('scrape_logs')
          .update({
            status: 'failed',
            error_message: String(syncError),
            completed_at: new Date().toISOString()
          })
          .eq('id', logId);
      }

      throw syncError;
    }
  } catch (error) {
    console.error('Scraping job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
