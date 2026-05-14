import { NextRequest, NextResponse } from 'next/server';
import { supabase, Article, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { getUserPreferences, getUserHiddenSources } from '@/lib/auth';
import { getScrapedArticlesForPublicFeed, syncArticlesFromScraper } from '@/lib/scraper-sync';

export const runtime = 'nodejs';

function filterHiddenSources(articles: Article[], hiddenSources: string[]): Article[] {
  if (!hiddenSources.length) return articles;
  const hiddenSet = new Set(hiddenSources.map(s => s.toLowerCase()));

  return articles.filter(article => {
    // If no sources list, check the main author/source
    if (!article.sources || article.sources.length === 0) {
      return !article.author || !hiddenSet.has(article.author.toLowerCase());
    }

    // Check if any source of the article is in the hidden list
    // We filter out the article if ALL of its sources are hidden
    const visibleSources = article.sources.filter(s => s.source && !hiddenSet.has(s.source.toLowerCase()));
    return visibleSources.length > 0;
  });
}

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
      // In local mode, read directly from scraped JSON
      const publicArticles = await getScrapedArticlesForPublicFeed(null);

      if (!session) {
        // Unauthenticated users: show all articles
        const limitedArticles =
          requestedLimit === null ? publicArticles : publicArticles.slice(0, requestedLimit);
        return NextResponse.json({ articles: limitedArticles }, { status: 200 });
      }

      // Authenticated users: filter by preferences
      const preferredCategoryIds = await getUserPreferences(session.userId);
      const hiddenSources = await getUserHiddenSources(session.userId);

      let filteredPublicArticles = publicArticles;

      if (preferredCategoryIds.length > 0) {
        filteredPublicArticles = filteredPublicArticles.filter((article) =>
          preferredCategoryIds.includes(article.category_id)
        );
      }

      // Filter out untrusted sources
      filteredPublicArticles = filterHiddenSources(filteredPublicArticles, hiddenSources);

      const limitedArticles =
        requestedLimit === null ? filteredPublicArticles : filteredPublicArticles.slice(0, requestedLimit);

      return NextResponse.json({
        articles: limitedArticles,
        allCategories: preferredCategoryIds.length === 0
      }, { status: 200 });
    }

    if (!session) {
      const publicArticles = await getScrapedArticlesForPublicFeed(requestedLimit);
      return NextResponse.json({ articles: publicArticles }, { status: 200 });
    }

    // Get user's preferences
    const categoryIds = await getUserPreferences(session.userId);
    const hiddenSources = await getUserHiddenSources(session.userId);

    // Fetch articles from Supabase
    let articlesQuery = supabase
      .from('articles')
      .select()
      .order('published_at', { ascending: false });

    if (categoryIds.length > 0) {
      articlesQuery = articlesQuery.in('category_id', categoryIds);
    }

    if (requestedLimit !== null) {
      // Fetch a bit more if we have hidden sources to filter, to maintain requested density
      const fetchLimit = hiddenSources.length > 0 ? requestedLimit * 2 : requestedLimit;
      articlesQuery = articlesQuery.limit(fetchLimit);
    }

    const { data, error } = await articlesQuery;

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    let articles = (data as Article[]) || [];

    // Apply filtering for hidden sources
    articles = filterHiddenSources(articles, hiddenSources);

    // Final limit
    if (requestedLimit !== null) {
      articles = articles.slice(0, requestedLimit);
    }

    return NextResponse.json({
      articles,
      allCategories: categoryIds.length === 0
    }, { status: 200 });
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
