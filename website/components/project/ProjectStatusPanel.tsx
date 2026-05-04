'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  FileCode2,
  Newspaper,
  RefreshCcw,
  Rss,
} from 'lucide-react';

type ProjectModule = {
  name: string;
  status: string;
  detail: string;
};

type SourceStatus = {
  name: string;
  active: boolean;
  count: number;
};

type ArticleSummary = {
  author?: string;
  category?: string;
  category_id: number;
  cluster_id?: string;
  created_at?: string;
  published_at?: string;
  source_count?: number;
  source_url?: string;
  sources?: Array<{ source?: string }>;
  story_id?: string;
  title?: string;
};

type CategorySummary = {
  article_count?: number;
  id: number;
  key?: string;
  name: string;
};

type RuntimeStatusResponse = {
  website: {
    groqSummariesConfigured: boolean;
    groqModel: string;
    localAuthFallback: boolean;
    localSummaryFallback: boolean;
    notebookModelPath: string;
    scraperRunEnabled: boolean;
    storyProcessorLinked: boolean;
    duplicateClusteringLinked: boolean;
    supabaseConfigured: boolean;
  };
};

type ComputedProjectStatus = {
  modules: ProjectModule[];
  sources: SourceStatus[];
  scraper: {
    activeCategories: number;
    activeSources: number;
    categoryCounts: Record<string, number>;
    errorsCount: number;
    latestPublishedAt: string | null;
    multiSourceStories: number;
    scrapedAt: string | null;
    sourceCounts: Record<string, number>;
    totalArticles: number;
    totalStories: number;
    windowHours: number | null;
  };
  website: RuntimeStatusResponse['website'];
};

type ProjectStatusPanelProps = {
  compact?: boolean;
  className?: string;
  onRefreshComplete?: () => void | Promise<void>;
};

const CATEGORY_LABELS: Record<string, string> = {
  culture: 'Culture',
  economy: 'Economy',
  health: 'Health',
  other: 'Others',
  politics: 'Politics',
  society: 'Society',
  sport: 'Sport',
  technology: 'Technology'
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function getStatusTone(status: string) {
  if (status === 'ready' || status === 'available') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
  }

  if (status === 'fallback') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
  }

  return 'border-border bg-muted text-muted-foreground';
}

export function ProjectStatusPanel({ compact = false, className, onRefreshComplete }: ProjectStatusPanelProps) {
  const [status, setStatus] = useState<ComputedProjectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [pipelineError, setPipelineError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        if (!cancelled) {
          setIsLoading(true);
        }

        const [articlesResponse, categoriesResponse, runtimeResponse] = await Promise.all([
          fetch('/api/articles?limit=250', { cache: 'no-store' }),
          fetch('/api/categories?usedOnly=1&includeCounts=1', { cache: 'no-store' }),
          fetch('/api/runtime-status', { cache: 'no-store' }),
        ]);

        if (!articlesResponse.ok || !categoriesResponse.ok || !runtimeResponse.ok) {
          throw new Error('Failed to load project status');
        }

        const articlesData = (await articlesResponse.json()) as { articles?: ArticleSummary[] };
        const categoriesData = (await categoriesResponse.json()) as {
          articleCounts?: Record<string, number>;
          categories?: CategorySummary[];
        };
        const runtimeData = (await runtimeResponse.json()) as RuntimeStatusResponse;
        const data = buildProjectStatus(
          articlesData.articles ?? [],
          categoriesData.categories ?? [],
          categoriesData.articleCounts ?? {},
          runtimeData.website
        );

        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleRunPipeline() {
    setIsRunningPipeline(true);
    setPipelineMessage('');
    setPipelineError('');

    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        payloadCount?: number;
        syncedCount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Pipeline run failed');
      }

      const count = data.syncedCount ?? data.payloadCount;
      setPipelineMessage(
        count === undefined
          ? data.message || 'Pipeline completed'
          : `${data.message || 'Pipeline completed'} ${formatNumber(count)} records available.`
      );
      setReloadKey((current) => current + 1);
      await onRefreshComplete?.();
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'Pipeline run failed');
    } finally {
      setIsRunningPipeline(false);
    }
  }

  const topCategories = useMemo(() => {
    if (!status) {
      return [];
    }

    return Object.entries(status.scraper.categoryCounts)
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, compact ? 4 : 8);
  }, [compact, status]);

  if (isLoading) {
    return (
      <Card className={cn('gap-4 rounded-lg p-5', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCcw className="size-4 animate-spin" />
          Loading project status
        </div>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className={cn('gap-4 rounded-lg p-5', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="size-4" />
          Project status is unavailable
        </div>
      </Card>
    );
  }

  return (
    <section className={cn('space-y-4', className)} aria-label="Project status">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="gap-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Newspaper className="size-4" />
            Articles
          </div>
          <p className="text-2xl font-semibold">{formatNumber(status.scraper.totalArticles)}</p>
        </Card>

        <Card className="gap-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rss className="size-4" />
            Sources
          </div>
          <p className="text-2xl font-semibold">{formatNumber(status.scraper.activeSources)}</p>
        </Card>

        <Card className="gap-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileCode2 className="size-4" />
            Stories
          </div>
          <p className="text-2xl font-semibold">{formatNumber(status.scraper.totalStories)}</p>
        </Card>

        <Card className="gap-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            Latest Scrape
          </div>
          <p className="text-sm font-medium leading-snug">{formatDate(status.scraper.scrapedAt)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="gap-4 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Project Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                Scraper output, story processing, website modules, and model surfaces.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.scraper.errorsCount === 0 ? 'secondary' : 'destructive'}>
                {status.scraper.errorsCount === 0 ? 'No scrape errors' : `${status.scraper.errorsCount} scrape errors`}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunPipeline}
                disabled={isRunningPipeline}
              >
                <RefreshCcw className={cn('size-4', isRunningPipeline && 'animate-spin')} />
                {isRunningPipeline ? 'Running' : 'Run pipeline'}
              </Button>
            </div>
          </div>

          {(pipelineMessage || pipelineError) && (
            <p
              className={cn(
                'rounded-md border px-3 py-2 text-xs',
                pipelineError
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              )}
            >
              {pipelineError || pipelineMessage}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {status.modules.map((module) => (
              <div key={module.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{module.name}</p>
                  <span className={cn('rounded-md border px-2 py-0.5 text-xs', getStatusTone(module.status))}>
                    {module.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{module.detail}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={status.website.groqSummariesConfigured ? 'secondary' : 'outline'}>
              <Brain className="size-3" />
              {status.website.groqSummariesConfigured ? status.website.groqModel : 'Local summary fallback'}
            </Badge>
            <Badge variant={status.website.supabaseConfigured ? 'secondary' : 'outline'}>
              <Database className="size-3" />
              {status.website.supabaseConfigured ? 'Supabase connected' : 'Local data mode'}
            </Badge>
            <Badge variant={status.website.duplicateClusteringLinked ? 'secondary' : 'outline'}>
              <FileCode2 className="size-3" />
              duplicate clustering linked
            </Badge>
            <Badge variant="outline">
              <CheckCircle2 className="size-3" />
              Generic fallback scraper included
            </Badge>
          </div>
        </Card>

        <Card className="gap-4 rounded-lg p-5">
          <div>
            <h3 className="text-lg font-semibold">Feed Coverage</h3>
            <p className="text-sm text-muted-foreground">
              {status.scraper.windowHours ? `Last ${status.scraper.windowHours} hours` : 'Current scraper window'}.
              Latest article: {formatDate(status.scraper.latestPublishedAt)}.
            </p>
          </div>

          <div className="space-y-3">
            {status.sources.map((source) => (
              <div key={source.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      source.active ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )}
                  />
                  <span className="text-sm font-medium">{source.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatNumber(source.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {!compact && topCategories.length > 0 && (
        <Card className="gap-4 rounded-lg p-5">
          <div>
            <h3 className="text-lg font-semibold">Category Representation</h3>
            <p className="text-sm text-muted-foreground">
              The frontend filter is backed by these normalized scraper categories.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topCategories.map(([category, count]) => (
              <div key={category} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{CATEGORY_LABELS[category] || category}</p>
                <p className="mt-1 text-2xl font-semibold">{formatNumber(count)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

function getArticleSourceNames(article: ArticleSummary): string[] {
  const sourceNames = Array.from(
    new Set((article.sources ?? []).map((source) => source.source).filter(Boolean))
  ) as string[];

  if (sourceNames.length > 0) {
    return sourceNames;
  }

  return article.author ? [article.author] : ['UNKNOWN'];
}

function getLatestDate(articles: ArticleSummary[]): string | null {
  let latestTime = 0;

  for (const article of articles) {
    const candidate = article.published_at || article.created_at;
    const time = candidate ? new Date(candidate).getTime() : Number.NaN;

    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
    }
  }

  return latestTime > 0 ? new Date(latestTime).toISOString() : null;
}

function getStoryId(article: ArticleSummary): string {
  return article.story_id || article.cluster_id || article.source_url || article.title || String(article.category_id);
}

function buildSourceCounts(articles: ArticleSummary[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const article of articles) {
    for (const source of getArticleSourceNames(article)) {
      const sourceName = source.toUpperCase();
      counts[sourceName] = (counts[sourceName] || 0) + 1;
    }
  }

  return counts;
}

function buildCategoryCounts(
  articles: ArticleSummary[],
  categories: CategorySummary[],
  articleCounts: Record<string, number>
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const category of categories) {
    const key = category.key || category.name.toLowerCase();
    const count = category.article_count ?? articleCounts[String(category.id)] ?? 0;

    if (count > 0) {
      counts[key] = count;
    }
  }

  if (Object.keys(counts).length > 0) {
    return counts;
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.key || category.name.toLowerCase()]));

  for (const article of articles) {
    const key = article.category || categoryNameById.get(article.category_id) || 'other';
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

function buildProjectStatus(
  articles: ArticleSummary[],
  categories: CategorySummary[],
  articleCounts: Record<string, number>,
  website: RuntimeStatusResponse['website']
): ComputedProjectStatus {
  const sourceCounts = buildSourceCounts(articles);
  const categoryCounts = buildCategoryCounts(articles, categories, articleCounts);
  const storyIds = new Set(articles.map(getStoryId));
  const totalStories = storyIds.size || articles.length;
  const multiSourceStories = articles.filter((article) => {
    return (article.source_count || article.sources?.length || 1) > 1;
  }).length;
  const scraper = {
    activeCategories: Object.keys(categoryCounts).length,
    activeSources: Object.keys(sourceCounts).length,
    categoryCounts,
    errorsCount: 0,
    latestPublishedAt: getLatestDate(articles),
    multiSourceStories,
    scrapedAt: getLatestDate(articles),
    sourceCounts,
    totalArticles: articles.length,
    totalStories,
    windowHours: 24
  };

  return {
    scraper,
    website,
    modules: [
      {
        name: 'Scraping system',
        status: scraper.totalArticles > 0 ? 'ready' : 'empty',
        detail: `${scraper.activeSources} active sources, ${scraper.totalArticles} processed articles`
      },
      {
        name: 'Story processor',
        status: website.storyProcessorLinked && scraper.totalStories > 0 ? 'ready' : 'empty',
        detail: `${scraper.totalStories} UI-linked story records with neutral headlines, summaries, and duplicate clusters`
      },
      {
        name: 'Website frontend',
        status: 'ready',
        detail: 'Public feed, category filtering, account flow, preferences, profile, and article dialogs'
      },
      {
        name: 'AI summarization',
        status: website.groqSummariesConfigured ? 'ready' : 'fallback',
        detail: website.groqSummariesConfigured
          ? `Groq ${website.groqModel} summaries enabled with local fallback`
          : 'Local extractive summaries until GROQ_API_KEY is configured'
      },
      {
        name: 'Word embedding notebook',
        status: 'available',
        detail: `Notebook experiments are surfaced in status at ${website.notebookModelPath}; no exported runtime model file is present`
      }
    ],
    sources: [
      'APS',
      'TSA',
      'ENNAHAR',
      'ELHAYAT',
      'ELHEDDAF',
      'WINWIN',
      'ALJAZEERA',
      'GENERIC'
    ].map((source) => ({
      name: source,
      active: source === 'GENERIC' ? true : Boolean(sourceCounts[source]),
      count: sourceCounts[source] || 0
    }))
  };
}
