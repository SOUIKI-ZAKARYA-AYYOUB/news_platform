import { NextRequest, NextResponse } from 'next/server';
import { supabase, Category, isSupabaseConfigured } from '@/lib/supabase';
import { getPublicCategoriesFromScraper } from '@/lib/scraper-sync';

const DEFAULT_CATEGORY_NAMES = [
  'Culture',
  'Economy',
  'Health',
  'Others',
  'Politics',
  'Society',
  'Sport',
  'Technology',
];

const STANDARD_OTHER_CATEGORY_ID = 4;

function hasOthersCategory(categories: Array<{ id: number; name: string }>): boolean {
  return categories.some((category) => {
    const normalizedName = category.name.trim().toLowerCase();
    return category.id === STANDARD_OTHER_CATEGORY_ID || normalizedName === 'other' || normalizedName === 'others';
  });
}

function withOthersCategory<T extends { id: number; name: string; created_at?: string }>(categories: T[]): T[] {
  if (hasOthersCategory(categories)) {
    return categories;
  }

  const now = new Date().toISOString();
  return [
    ...categories,
    {
      id: STANDARD_OTHER_CATEGORY_ID,
      name: 'Others',
      created_at: now
    } as T
  ];
}

function buildDefaultCategories(): Category[] {
  const now = new Date().toISOString();

  return DEFAULT_CATEGORY_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    created_at: now
  }));
}

function parseBooleanFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const usedOnly = parseBooleanFlag(request.nextUrl.searchParams.get('usedOnly'));
    const includeCounts = parseBooleanFlag(request.nextUrl.searchParams.get('includeCounts'));

    if (!isSupabaseConfigured) {
      try {
        const scrapedCategories = withOthersCategory(await getPublicCategoriesFromScraper());
        const articleCounts = Object.fromEntries(
          scrapedCategories.map((category) => [category.id, category.article_count])
        );

        if (articleCounts[STANDARD_OTHER_CATEGORY_ID] === undefined) {
          articleCounts[STANDARD_OTHER_CATEGORY_ID] = 0;
        }

        return NextResponse.json(
          {
            categories: scrapedCategories,
            fallback: true,
            usedOnly,
            articleCounts: includeCounts ? articleCounts : undefined,
            message: 'Using standardized categories from scraper JSON because Supabase is not configured.'
          },
          { status: 200 }
        );
      } catch (scraperError) {
        console.error('Get categories from scraper JSON error:', scraperError);
      }

      const fallbackCategories = buildDefaultCategories();

      return NextResponse.json(
        {
          categories: fallbackCategories,
          fallback: true,
          usedOnly,
          message: 'Using default categories because Supabase is not configured.'
        },
        { status: 200 }
      );
    }

    if (usedOnly) {
      const { data: usageRows, error: usageError } = await supabase
        .from('articles')
        .select('category_id');

      if (usageError) {
        console.error('Get category usage query error:', usageError);
        return NextResponse.json(
          {
            categories: buildDefaultCategories(),
            fallback: true,
            usedOnly,
            message: 'Using default categories because article usage data is unavailable.'
          },
          { status: 200 }
        );
      }

      const articleCounts: Record<number, number> = {};
      for (const row of usageRows ?? []) {
        const categoryId = row?.category_id;
        if (typeof categoryId !== 'number') {
          continue;
        }

        articleCounts[categoryId] = (articleCounts[categoryId] || 0) + 1;
      }

      const usedCategoryIds = Object.keys(articleCounts).map((id) => Number(id));

      if (usedCategoryIds.length === 0) {
        try {
          const scrapedCategories = await getPublicCategoriesFromScraper();
          const categoriesWithOthers = withOthersCategory(scrapedCategories);
          const scrapedCounts = Object.fromEntries(
            categoriesWithOthers.map((category) => [category.id, category.article_count])
          );

          if (scrapedCounts[STANDARD_OTHER_CATEGORY_ID] === undefined) {
            scrapedCounts[STANDARD_OTHER_CATEGORY_ID] = 0;
          }

          return NextResponse.json(
            {
              categories: categoriesWithOthers,
              fallback: true,
              usedOnly,
              articleCounts: includeCounts ? scrapedCounts : undefined,
              message: 'Using standardized categories from scraper JSON because no categorized DB usage rows were found.'
            },
            { status: 200 }
          );
        } catch (scraperError) {
          console.error('Get used categories from scraper JSON error:', scraperError);
        }

        return NextResponse.json(
          {
            categories: [],
            fallback: false,
            usedOnly,
            articleCounts: includeCounts ? articleCounts : undefined
          },
          { status: 200 }
        );
      }

      const { data: usedCategories, error: usedCategoriesError } = await supabase
        .from('categories')
        .select()
        .in('id', usedCategoryIds)
        .order('name', { ascending: true });

      if (usedCategoriesError || !usedCategories) {
        if (usedCategoriesError) {
          console.error('Get used categories query error:', usedCategoriesError);
        }

        return NextResponse.json(
          {
            categories: buildDefaultCategories(),
            fallback: true,
            usedOnly,
            message: 'Using default categories because used categories are unavailable.'
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          categories: usedCategories as Category[],
          fallback: false,
          usedOnly,
          articleCounts: includeCounts ? articleCounts : undefined
        },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .select()
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) {
        console.error('Get categories query error:', error);
      }

      return NextResponse.json(
        {
          categories: buildDefaultCategories(),
          fallback: true,
          message: 'Using default categories because database categories are unavailable.'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { categories: data as Category[], fallback: false, usedOnly: false },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      {
        categories: buildDefaultCategories(),
        fallback: true,
        message: 'Using default categories after unexpected server error.'
      },
      { status: 200 }
    );
  }
}
