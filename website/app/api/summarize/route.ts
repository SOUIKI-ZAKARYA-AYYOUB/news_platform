import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const cache = new Map<string, string>();

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type SummarizeBody = {
  description?: unknown;
  descriptions?: unknown;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function normalizeSummary(value: string): string {
  return value
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function summarizeOne(description: string, apiKey: string): Promise<string | null> {
  const prompt =
    'Write ONE summary sentence of MAXIMUM 12 words for this news article. ' +
    'Reply with ONLY the sentence, no extra text:\n\n' +
    description.slice(0, 800);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Groq summarize error:', JSON.stringify(error).slice(0, 200));
      return null;
    }

    const data = (await response.json()) as GroqResponse;
    const text = normalizeSummary(data.choices?.[0]?.message?.content ?? '');

    return text.length > 0 ? text : null;
  } catch (error) {
    console.error('Groq summarize fetch error:', error);
    return null;
  }
}

function getDescriptions(body: SummarizeBody): string[] | null {
  if (Array.isArray(body.descriptions)) {
    return body.descriptions
      .map((description) => String(description).trim())
      .filter(Boolean);
  }

  if (typeof body.description === 'string' && body.description.trim()) {
    return [body.description.trim()];
  }

  return null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ summaries: [], summary: null }, { status: 200 });
  }

  let descriptions: string[] | null;

  try {
    const body = (await req.json()) as SummarizeBody;
    descriptions = getDescriptions(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!descriptions || descriptions.length === 0) {
    return NextResponse.json({ summaries: [], summary: null });
  }

  const results: Array<string | null> = [];
  let madeLiveRequest = false;

  for (const description of descriptions) {
    const cached = cache.get(description);

    if (cached) {
      results.push(cached);
      continue;
    }

    if (madeLiveRequest) {
      await delay(700);
    }

    const summary = await summarizeOne(description, apiKey);
    madeLiveRequest = true;

    if (summary) {
      cache.set(description, summary);
    }

    results.push(summary);
  }

  const summary = results.length === 1 ? results[0] ?? null : null;

  return NextResponse.json({ summaries: results, summary });
}
