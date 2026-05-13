import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type ArticleSnippet = {
  title?: string;
  summary?: string;
  category?: string;
};

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
    return NextResponse.json({ digest: null }, { status: 200 });
  }

  let articles: ArticleSnippet[];
  let language: string | undefined;
  let categoryName: string | undefined;

  try {
    const body = await req.json();
    articles = Array.isArray(body.articles) ? body.articles : [];
    language = typeof body.language === 'string' ? body.language.trim() || undefined : undefined;
    categoryName = typeof body.category === 'string' ? body.category.trim() || undefined : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (articles.length === 0) {
    return NextResponse.json({ digest: null });
  }

  const articleList = articles
    .slice(0, 50)
    .map((a, i) => `${i + 1}. ${a.title || 'Untitled'}${a.summary ? ` — ${a.summary.slice(0, 200)}` : ''}`)
    .join('\n');

  const langInstruction = language
    ? `You MUST write your entire response in ${language}. `
    : 'Reply in the same language as the majority of the headlines. ';

  const categoryContext = categoryName
    ? `These are all from the "${categoryName}" category. `
    : '';

  const prompt =
    `You are a senior news editor. ${categoryContext}Given these ${articles.length} news stories, write a concise news digest (4-6 sentences) ` +
    `that captures the key themes, most important developments, and overall narrative. ` +
    `Highlight connections between stories where relevant. ` +
    langInstruction +
    `Be factual, neutral, and informative. Reply with ONLY the digest text.\n\n` +
    `STORIES:\n${articleList}`;

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
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Groq digest error:', response.status);
      return NextResponse.json({ digest: null });
    }

    const data = (await response.json()) as GroqResponse;
    const text = (data.choices?.[0]?.message?.content ?? '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();

    return NextResponse.json({
      digest: text || null,
      articleCount: articles.length,
      category: categoryName || 'All',
    });
  } catch (error) {
    console.error('Groq digest fetch error:', error);
    return NextResponse.json({ digest: null });
  }
}
