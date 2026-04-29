'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { ArticleCard } from '@/components/dashboard/ArticleCard';
import { Article, Category } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

const ARTICLES_STEP = 15;

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [visibleCount, setVisibleCount] = useState(ARTICLES_STEP);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const articleCountByCategory = useMemo(() => {
    const counts = new Map<number, number>();

    for (const article of articles) {
      counts.set(article.category_id, (counts.get(article.category_id) || 0) + 1);
    }

    return counts;
  }, [articles]);

  const categoriesInFeed = useMemo(() => {
    const categoriesFromApi = Array.from(categories.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (categoriesFromApi.length > 0) {
      return categoriesFromApi;
    }

    const uniqueIds = Array.from(new Set(articles.map((article) => article.category_id)));

    return uniqueIds
      .map((id) => ({
        id,
        name: categories.get(id) || `Category ${id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [articles, categories]);

  const filteredArticles = useMemo(() => {
    if (selectedCategoryId === null) {
      return articles;
    }

    return articles.filter((article) => article.category_id === selectedCategoryId);
  }, [articles, selectedCategoryId]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMoreArticles = visibleCount < filteredArticles.length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await apiFetch('/api/categories?usedOnly=1');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const categoryMap = new Map<number, string>();
          (categoriesData.categories || []).forEach((cat: Category) => {
            categoryMap.set(cat.id, cat.name);
          });
          setCategories(categoryMap);
        }

        // Fetch articles
        const articlesResponse = await apiFetch('/api/articles');
        const articlesData = await articlesResponse.json();
        if (articlesData.articles) {
          setArticles(articlesData.articles);
          setSelectedCategoryId(null);
          setVisibleCount(ARTICLES_STEP);
        } else {
          setError(articlesData.message || 'No articles found');
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
      return;
    }

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  useEffect(() => {
    setVisibleCount(ARTICLES_STEP);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!hasMoreArticles || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleCount((currentCount) => Math.min(currentCount + ARTICLES_STEP, filteredArticles.length));
      },
      {
        rootMargin: '300px 0px'
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [filteredArticles.length, hasMoreArticles]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header newsCount={filteredArticles.length} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading your news feed...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header newsCount={filteredArticles.length} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Your News Feed</h2>
              <p className="text-muted-foreground mt-2">
                Latest articles in your selected preferences and category filter
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {selectedCategoryId === null
                      ? 'Filter by category'
                      : `Category: ${categories.get(selectedCategoryId) || `Category ${selectedCategoryId}`}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedCategoryId(null)}>
                    All categories ({articles.length})
                  </DropdownMenuItem>
                  {categoriesInFeed.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      {category.name} ({articleCountByCategory.get(category.id) || 0})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {user ? (
                <Link href="/dashboard/preferences">
                  <Button variant="outline">Edit Preferences</Button>
                </Link>
              ) : (
                <Link href="/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/dashboard/preferences">
              <Button>Select Categories</Button>
            </Link>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {selectedCategoryId === null
                ? 'No articles found. Update your preferences to see more content.'
                : 'No articles found for this category filter.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {selectedCategoryId !== null && (
                <Button variant="outline" onClick={() => setSelectedCategoryId(null)}>
                  Clear Category Filter
                </Button>
              )}
              <Link href="/dashboard/preferences">
                <Button>Choose Your Interests</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categoryName={categories.get(article.category_id)}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="py-8 text-center">
              {hasMoreArticles ? (
                <p className="text-sm text-muted-foreground">Scroll to load 15 more articles</p>
              ) : (
                <p className="text-sm text-muted-foreground">No more articles to load</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
