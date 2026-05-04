import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const groqModel = 'meta-llama/llama-4-scout-17b-16e-instruct';

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    website: {
      groqSummariesConfigured: Boolean(process.env.GROQ_API_KEY),
      groqModel,
      supabaseConfigured: isSupabaseConfigured,
      localAuthFallback: !isSupabaseConfigured,
      scraperRunEnabled: process.env.SCRAPER_RUN_ON_SYNC !== 'false',
      storyProcessorLinked: true,
      duplicateClusteringLinked: true,
      localSummaryFallback: true,
      notebookModelPath: 'word_embeding/model.ipynb'
    }
  });
}
