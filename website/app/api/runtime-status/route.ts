import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    website: {
      databaseConfigured: true,
      groqSummariesConfigured: Boolean(process.env.GROQ_API_KEY),
      groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
      scraperRunEnabled: process.env.SCRAPER_RUN_ON_SYNC !== 'false',
      storyProcessorLinked: true,
      duplicateClusteringLinked: true,
    },
  });
}
