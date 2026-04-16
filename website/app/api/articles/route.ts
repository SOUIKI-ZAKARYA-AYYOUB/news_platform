import { NextRequest, NextResponse } from 'next/server';
import { supabase, Article, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { getUserPreferences } from '@/lib/auth';
import { getScrapedArticlesForPublicFeed, syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

function parseRequestedLimit(request: NextRequest): number | null {
  const rawLimit = request.nextUrl.searchParams.get('limit');

  if (!rawLimit) {
    return null;
  }

  const parsed = Number.parseInt(rawLimit, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, 1000);
}

export async function GET(request: NextRequest) {
  try {
    const requestedLimit = parseRequestedLimit(request);
    const session = await getSession();

    if (!isSupabaseConfigured) {
      if (!session) {
        const publicArticles = await getScrapedArticlesForPublicFeed(requestedLimit);
        return NextResponse.json({ articles: publicArticles }, { status: 200 });
      }

      const preferredCategoryIds = await getUserPreferences(session.userId);

      if (preferredCategoryIds.length === 0) {
        return NextResponse.json(
          { articles: [], message: 'No category preferences selected' },
          { status: 200 }
        );
      }

      const publicArticles = await getScrapedArticlesForPublicFeed(null);
      const filteredPublicArticles = publicArticles.filter((article) =>
        preferredCategoryIds.includes(article.category_id)
      );

      const limitedArticles =
        requestedLimit === null ? filteredPublicArticles : filteredPublicArticles.slice(0, requestedLimit);

      return NextResponse.json({ articles: limitedArticles }, { status: 200 });
    }

    if (!session) {
      const publicArticles = await getScrapedArticlesForPublicFeed(requestedLimit);
      return NextResponse.json({ articles: publicArticles }, { status: 200 });
    }

    // Get user's category preferences
    const categoryIds = await getUserPreferences(session.userId);

    if (categoryIds.length === 0) {
      return NextResponse.json(
        { articles: [], message: 'No category preferences selected' },
        { status: 200 }
      );
    }

    // Fetch articles for user's preferred categories
    let articlesQuery = supabase
      .from('articles')
      .select()
      .in('category_id', categoryIds)
      .order('published_at', { ascending: false });

    if (requestedLimit !== null) {
      articlesQuery = articlesQuery.limit(requestedLimit);
    }

    const { data, error } = await articlesQuery;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    let articles = (data as Article[]) || [];

    // If empty, run one lightweight sync from scraper output then query again.
    if (articles.length === 0) {
      try {
        await syncArticlesFromScraper({ runScraper: false });

        let refreshedQuery = supabase
          .from('articles')
          .select()
          .in('category_id', categoryIds)
          .order('published_at', { ascending: false });

        if (requestedLimit !== null) {
          refreshedQuery = refreshedQuery.limit(requestedLimit);
        }

        const { data: refreshedData, error: refreshedError } = await refreshedQuery;

        if (!refreshedError) {
          articles = (refreshedData as Article[]) || [];
        }
      } catch (syncError) {
        console.error('On-demand scraper sync failed:', syncError);
      }
    }

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    console.error('Get articles error:', error);
    try {
      const requestedLimit = parseRequestedLimit(request);
      const publicArticles = await getScrapedArticlesForPublicFeed(requestedLimit);
      return NextResponse.json({ articles: publicArticles }, { status: 200 });
    } catch {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint is for testing purposes - in production, use the scraping job
    const body = await request.json();
    
    if (!body.title || !body.category_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: body.title,
        description: body.description,
        content: body.content,
        category_id: body.category_id,
        author: body.author,
        source_url: body.source_url,
        image_url: body.image_url,
        published_at: body.published_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { article: data as Article },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
