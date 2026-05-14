import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { getUserPreferences, getUserHiddenSources } from '@/lib/auth';
import type { Article } from '@/lib/supabase';

export const runtime = 'nodejs';

function parseArticle(row: Article): Article {
  return {
    ...row,
    id: Number(row.id),
    category_id: Number(row.category_id),
    cluster_size: row.cluster_size != null ? Number(row.cluster_size) : undefined,
    source_count: row.source_count != null ? Number(row.source_count) : undefined,
  };
}

function filterHiddenSources(articles: Article[], hiddenSources: string[]): Article[] {
  if (!hiddenSources.length) return articles;
  const hidden = new Set(hiddenSources.map((s) => s.toLowerCase()));

  return articles.filter((article) => {
    if (!article.sources || article.sources.length === 0) {
      return !article.author || !hidden.has(article.author.toLowerCase());
    }
    const visibleSources = article.sources.filter(
      (s) => s.source && !hidden.has(s.source.toLowerCase()),
    );
    return visibleSources.length > 0;
  });
}

function parseRequestedLimit(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get('limit');
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 1000);
}

export async function GET(request: NextRequest) {
  const requestedLimit = parseRequestedLimit(request);
  const session = await getSession();

  try {
    let query: string;
    let params: unknown[];

    if (!session) {
      query = `SELECT * FROM articles ORDER BY published_at DESC${requestedLimit ? ` LIMIT ${requestedLimit}` : ''}`;
      params = [];
    } else {
      const categoryIds = await getUserPreferences(session.userId);
      const hiddenSources = await getUserHiddenSources(session.userId);

      const fetchLimit = requestedLimit
        ? hiddenSources.length > 0
          ? requestedLimit * 2
          : requestedLimit
        : null;

      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map((_, i) => `$${i + 1}`).join(', ');
        query = `SELECT * FROM articles WHERE category_id IN (${placeholders}) ORDER BY published_at DESC${fetchLimit ? ` LIMIT ${fetchLimit}` : ''}`;
        params = categoryIds;
      } else {
        query = `SELECT * FROM articles ORDER BY published_at DESC${fetchLimit ? ` LIMIT ${fetchLimit}` : ''}`;
        params = [];
      }

      const { rows } = await pool.query<Article>(query, params);
      let articles = filterHiddenSources(rows.map(parseArticle), hiddenSources);
      if (requestedLimit !== null) articles = articles.slice(0, requestedLimit);

      return NextResponse.json(
        { articles, allCategories: categoryIds.length === 0 },
        { status: 200 },
      );
    }

    const { rows } = await pool.query<Article>(query, params);
    return NextResponse.json({ articles: rows.map(parseArticle) }, { status: 200 });
  } catch (error) {
    console.error('Get articles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.category_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { rows } = await pool.query<Article>(
      `INSERT INTO articles
         (title, description, content, category_id, author, source_url, image_url, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        body.title,
        body.description ?? null,
        body.content ?? null,
        body.category_id,
        body.author ?? null,
        body.source_url ?? null,
        body.image_url ?? null,
        body.published_at || new Date().toISOString(),
      ],
    );

    return NextResponse.json({ article: parseArticle(rows[0]) }, { status: 201 });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
