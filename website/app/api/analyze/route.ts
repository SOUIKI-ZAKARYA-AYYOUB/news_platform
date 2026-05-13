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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ analysis: null }, { status: 200 });
  }

  let title: string;
  let summary: string;
  let category: string;
  let language: string;

  try {
    const body = await req.json();
    title = String(body.title || '').trim();
    summary = String(body.summary || '').trim();
    category = String(body.category || '').trim();
    language = String(body.language || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!title && !summary) {
    return NextResponse.json({ analysis: null });
  }

  const cacheKey = `${title}::${summary}`.slice(0, 300);
  const cached = cache.get(cacheKey);

  if (cached) {
    return NextResponse.json({ analysis: cached });
  }

  const langInstruction = language
    ? `You MUST write your entire response in ${language}. `
    : 'Reply in the same language as the headline and summary. ';

  const prompt =
    `You are an expert news analyst. Given this news story, write a brief "Why It Matters" analysis in 2-3 sentences. ` +
    `Explain the real-world implications, who is affected, and what could happen next. ` +
    langInstruction +
    `Be factual and neutral. Do not repeat the headline. Reply with ONLY the analysis text.\n\n` +
    `Category: ${category || 'General'}\n` +
    `Headline: ${title}\n` +
    `Summary: ${summary.slice(0, 600)}`;

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
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Groq analysis error:', response.status);
      return NextResponse.json({ analysis: null });
    }

    const data = (await response.json()) as GroqResponse;
    const text = (data.choices?.[0]?.message?.content ?? '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();

    if (text) {
      cache.set(cacheKey, text);
    }

    return NextResponse.json({ analysis: text || null });
  } catch (error) {
    console.error('Groq analysis fetch error:', error);
    return NextResponse.json({ analysis: null });
  }
}
