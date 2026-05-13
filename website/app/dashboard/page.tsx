'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { ArticleCard } from '@/components/dashboard/ArticleCard';
import { Article, Category } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { ProjectStatusPanel } from '@/components/project/ProjectStatusPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import {
  ChevronDown,
  Filter,
  Globe,
  Layers,
  Loader2,
  Newspaper,
  RefreshCcw,
  Settings,
  Zap,
} from 'lucide-react';

const ARTICLES_STEP = 15;

const CATEGORY_ICONS: Record<string, string> = {
  Politics: '',
  Sport: '',
  Economy: '',
  Health: '',
  Technology: '',
  Culture: '',
  Society: '',
  Others: '',
};

function getSummaryInput(article: Article): string {
  return article.description || article.content || article.summary || '';
}

function timeAgo(dateString: string | undefined): string {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [articles, setArticles] = useState<Article[]>([]);
  const [visibleCount, setVisibleCount] = useState(ARTICLES_STEP);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [summaryMap, setSummaryMap] = useState<Map<number, string>>(new Map());
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'done' | 'error'>('idle');
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const autoScrapeTriggered = useRef(false);

  // ─── Auto-scrape on dashboard load ───
  const triggerAutoScrape = useCallback(async () => {
    if (autoScrapeTriggered.current) return;
    autoScrapeTriggered.current = true;

    setScrapeStatus('scraping');
    try {
      const response = await fetch('/api/scrape', { method: 'POST' });
      const data = await response.json();

      if (data.status === 'completed') {
        setScrapeStatus('done');
        setLastScrapeTime(data.timestamp || new Date().toISOString());
        // Refresh articles after successful scrape
        await fetchData();
      } else if (data.status === 'skipped') {
        setScrapeStatus('done');
        setLastScrapeTime(data.lastScrapeAt || null);
      } else {
        setScrapeStatus('error');
      }
    } catch {
      setScrapeStatus('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    setError('');
    setIsLoading(true);

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
      if (articlesData.articles && articlesData.articles.length > 0) {
        setArticles(articlesData.articles);
        setSelectedCategoryId(null);
        setVisibleCount(ARTICLES_STEP);
        setSummaryMap(new Map());
      } else {
        setArticles([]);
        setError(articlesData.message || '');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    autoScrapeTriggered.current = false;
    setScrapeStatus('scraping');
    try {
      const response = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setScrapeStatus('done');
        setLastScrapeTime(new Date().toISOString());
        await fetchData();
      } else {
        setScrapeStatus('error');
        console.error('Manual refresh failed:', data);
      }
    } catch {
      setScrapeStatus('error');
    }
  }, [fetchData]);

  const articleCountByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    for (const article of articles) {
      counts.set(article.category_id, (counts.get(article.category_id) || 0) + 1);
    }
    return counts;
  }, [articles]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    for (const article of articles) {
      if (article.author) sources.add(article.author);
    }
    return sources;
  }, [articles]);

  const categoriesInFeed = useMemo(() => {
    const categoriesFromApi = Array.from(categories.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (categoriesFromApi.length > 0) return categoriesFromApi;

    const uniqueIds = Array.from(new Set(articles.map((article) => article.category_id)));
    return uniqueIds
      .map((id) => ({ id, name: categories.get(id) || `Category ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [articles, categories]);

  const filteredArticles = useMemo(() => {
    if (selectedCategoryId === null) return articles;
    return articles.filter((article) => article.category_id === selectedCategoryId);
  }, [articles, selectedCategoryId]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMoreArticles = visibleCount < filteredArticles.length;
  const visibleArticleIds = visibleArticles.map((article) => article.id).join(',');

  // Initial data load
  useEffect(() => {
    if (user) {
      fetchData().then(() => triggerAutoScrape());
      return;
    }
    if (!authLoading) {
      fetchData().then(() => triggerAutoScrape());
    }
  }, [user, authLoading, fetchData, triggerAutoScrape]);

  useEffect(() => {
    setVisibleCount(ARTICLES_STEP);
  }, [selectedCategoryId]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMoreArticles || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + ARTICLES_STEP, filteredArticles.length));
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredArticles.length, hasMoreArticles]);

  // AI Summaries
  useEffect(() => {
    const uncachedArticles = visibleArticles.filter(
      (article) => getSummaryInput(article) && !summaryMap.has(article.id)
    );

    if (uncachedArticles.length === 0) return;

    let cancelled = false;

    async function summarizeVisibleArticles() {
      for (let i = 0; i < uncachedArticles.length; i++) {
        if (cancelled) break;
        const article = uncachedArticles[i];
        const description = article ? getSummaryInput(article) : '';
        if (!article || !description) continue;

        // Detect language from title
        const titleText = article.neutral_headline || article.title || description;
        const arabicChars = (titleText.match(/[\u0600-\u06FF]/g) || []).length;
        const latinChars = (titleText.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
        let language = 'English';
        if (arabicChars > latinChars) language = 'Arabic';
        else if (/[àâäéèêëïîôùûüÿçœæ]|(?:qu'|l'|d'|n'|c'|j'|s')/i.test(titleText)) language = 'French';

        try {
          const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, language }),
          });
          const data = (await response.json()) as { summary?: string | null; summaries?: Array<string | null> };
          const summary = data.summary ?? data.summaries?.[0] ?? null;
          if (summary?.trim() && !cancelled) {
            setSummaryMap((cur) => new Map(cur).set(article.id, summary.trim()));
          }
        } catch { /* ArticleCard uses extractive fallback */ }

        if (i < uncachedArticles.length - 1 && !cancelled) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    summarizeVisibleArticles();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleArticleIds]);

  // ─── Loading state ───
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header newsCount={0} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="size-7 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Preparing your briefing</h3>
            <p className="text-sm text-muted-foreground">Scanning sources, removing duplicates, rewriting headlines...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header newsCount={filteredArticles.length} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Live scraper status bar ─── */}
        {scrapeStatus !== 'idle' && (
          <div className={`mb-6 rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300 ${scrapeStatus === 'scraping'
            ? 'border-primary/30 bg-primary/5'
            : scrapeStatus === 'done'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-destructive/30 bg-destructive/5'
            }`}>
            {scrapeStatus === 'scraping' ? (
              <>
                <Loader2 className="size-4 text-primary animate-spin shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Scraping pipeline active</p>
                  <p className="text-xs text-muted-foreground">Collecting articles from 7+ sources, clustering, summarizing...</p>
                </div>
              </>
            ) : scrapeStatus === 'done' ? (
              <>
                <Zap className="size-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Feed up to date</p>
                  <p className="text-xs text-muted-foreground">
                    {lastScrapeTime ? `Last scraped ${timeAgo(lastScrapeTime)}` : 'Using cached data'}
                    {' · '}{articles.length} stories from {uniqueSources.size} sources
                  </p>
                </div>
              </>
            ) : (
              <>
                <Globe className="size-4 text-destructive shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Using cached data</p>
                  <p className="text-xs text-muted-foreground">Scraper unavailable — showing previously cached articles</p>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0 gap-1.5"
              onClick={handleManualRefresh}
              disabled={scrapeStatus === 'scraping'}
            >
              <RefreshCcw className={`size-3.5 ${scrapeStatus === 'scraping' ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}

        {/* ─── Daily Briefing header ─── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Daily Briefing
              </h2>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{filteredArticles.length} curated stories from {uniqueSources.size} sources</span>
                {articles.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary/70">
                    <Layers className="size-3" />
                    duplicates removed
                  </span>
                )}
                {selectedCategoryId !== null && (
                  <> · <span className="text-foreground font-medium">{categories.get(selectedCategoryId)}</span></>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Category filter pills — desktop */}
              <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                    ${selectedCategoryId === null
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                      : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                >
                  All ({articles.length})
                </button>
                {categoriesInFeed.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5
                      ${selectedCategoryId === category.id
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                        : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                  >
                    <span>{CATEGORY_ICONS[category.name]}</span>
                    {category.name}
                    <span className="opacity-60">({articleCountByCategory.get(category.id) || 0})</span>
                  </button>
                ))}
              </div>

              {/* Mobile category dropdown */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-border/60">
                      <Filter className="size-3.5" />
                      {selectedCategoryId === null
                        ? 'All Categories'
                        : categories.get(selectedCategoryId) || 'Category'}
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setSelectedCategoryId(null)}>
                      All categories ({articles.length})
                    </DropdownMenuItem>
                    {categoriesInFeed.map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        {CATEGORY_ICONS[category.name] || '📰'} {category.name} ({articleCountByCategory.get(category.id) || 0})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {user ? (
                <Link href="/dashboard/preferences">
                  <Button variant="outline" size="sm" className="gap-1.5 border-border/60">
                    <Settings className="size-3.5" />
                    <span className="hidden sm:inline">Preferences</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/signin">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20">
                    Sign In to personalize
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ─── Project Status Panel ─── */}
        <ProjectStatusPanel compact className="mb-8" onRefreshComplete={fetchData} />

        {/* ─── Content ─── */}
        {error && articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="size-7 text-destructive" />
            </div>
            <p className="text-destructive font-medium mb-2">{error}</p>
            <p className="text-sm text-muted-foreground mb-6">Try refreshing or updating your preferences.</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleManualRefresh} className="gap-1.5">
                <RefreshCcw className="size-3.5" />
                Run Scraper
              </Button>
              <Link href="/dashboard/preferences">
                <Button className="bg-primary hover:bg-primary/90">Select Categories</Button>
              </Link>
            </div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {selectedCategoryId === null ? 'No articles yet' : 'No articles in this category'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {selectedCategoryId === null
                ? 'The scraper is collecting articles. Try refreshing or running the pipeline manually.'
                : 'Try a different category or clear the filter.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {selectedCategoryId !== null && (
                <Button variant="outline" onClick={() => setSelectedCategoryId(null)}>
                  Clear Filter
                </Button>
              )}
              <Button onClick={handleManualRefresh} className="bg-primary hover:bg-primary/90 gap-1.5">
                <RefreshCcw className="size-3.5" />
                Run Pipeline
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categoryName={categories.get(article.category_id)}
                  aiSummary={summaryMap.get(article.id)}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="py-10 text-center">
              {hasMoreArticles ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading more stories...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  You&apos;ve reached the end · {filteredArticles.length} stories total
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
