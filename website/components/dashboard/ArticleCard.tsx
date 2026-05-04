'use client';

import { type KeyboardEvent, useState } from 'react';
import { Article } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Brain, ExternalLink, Sparkles } from 'lucide-react';

const DEFAULT_NEWS_IMAGE = '/news_default.jpg';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'of', 'to', 'and', 'or', 'for', 'on', 'at', 'is',
  'are', 'was', 'were', 'it', 'that', 'this', 'has', 'have', 'had', 'by',
  'with', 'from', 'be', 'as', 'not', 'but', 'his', 'her', 'its', 'they',
  'we', 'he', 'she', 'said',
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'au',
  'aux', 'par', 'pour', 'sur', 'que', 'qui', 'il', 'elle', 'ils', 'elles',
  'se', 'sa', 'son', 'ses', 'nous', 'vous', 'ces', 'ce', 'cette', 'mais',
  'est', 'sont', 'avec', 'dans', 'pas',
  '\u0641\u064a', '\u0645\u0646', '\u0639\u0644\u0649',
  '\u0625\u0644\u0649', '\u0639\u0646', '\u0645\u0639',
  '\u0647\u0630\u0627', '\u0647\u0630\u0647', '\u0630\u0644\u0643',
  '\u0627\u0644\u062a\u064a', '\u0627\u0644\u0630\u064a',
  '\u0627\u0644\u0630\u064a\u0646', '\u0643\u0627\u0646',
  '\u0623\u0646', '\u0644\u0623\u0646', '\u0644\u0627',
  '\u0645\u0627', '\u0648', '\u0623\u0648', '\u0639\u0646\u062f',
  '\u0628\u0639\u062f', '\u0642\u0628\u0644', '\u062d\u064a\u062b',
  '\u0643\u0645\u0627', '\u0625\u0630', '\u062d\u062a\u0649',
  '\u062b\u0645', '\u0644\u0643\u0646', '\u0628\u064a\u0646',
  '\u062e\u0644\u0627\u0644', '\u0625\u0646',
]);

function cleanText(text: string): string {
  return text
    .replace(/\[\u2026\]/g, '')
    .replace(/\[&#8230;]/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(sentence: string): string[] {
  return sentence
    .split(/[\s\u060C,.:;!?\u061F"'()\[\]{}\u00AB\u00BB\-\u2013]+/)
    .map((word) => word.toLowerCase().replace(/[^\u0600-\u06FFa-z\u00e0-\u00f60-9]/g, ''))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(' ')}...`;
}

function extractiveSummarize(raw: string, maxWords = 20): string {
  const text = cleanText(raw);

  if (!text) {
    return '';
  }

  const sentences = text
    .split(/(?<=[.!?\u061F])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 4);

  if (sentences.length <= 1) {
    return truncateWords(text, maxWords);
  }

  const frequency: Record<string, number> = {};

  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      frequency[word] = (frequency[word] ?? 0) + 1;
    }
  }

  const scores = sentences.map((sentence) => {
    const words = tokenize(sentence);

    if (words.length === 0) {
      return 0;
    }

    return words.reduce((score, word) => score + (frequency[word] ?? 0), 0) / words.length;
  });

  const bestSentence = sentences[scores.indexOf(Math.max(...scores))] ?? text;

  return truncateWords(bestSentence, maxWords);
}

type StoryMeta = {
  article_count?: number;
  average_similarity?: number;
  confidence?: string;
  first_published_at?: string | null;
  latest_published_at?: string | null;
  source_count?: number;
};

function getStoryMeta(article: Article): StoryMeta {
  if (!article.meta_story || typeof article.meta_story !== 'object') {
    return {};
  }

  return article.meta_story as StoryMeta;
}

function formatClusterType(value?: string): string {
  if (!value) {
    return 'unique story';
  }

  return value.replace(/_/g, ' ');
}

function formatPercent(value?: number): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

interface ArticleCardProps {
  article: Article;
  categoryName?: string;
  aiSummary?: string;
}

export function ArticleCard({ article, categoryName, aiSummary }: ArticleCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const imageSrc = article.image_url || DEFAULT_NEWS_IMAGE;
  const title = article.neutral_headline || article.title;
  const summarySource = article.description || article.content || article.summary || '';
  const summary = aiSummary ?? extractiveSummarize(summarySource);
  const isAI = Boolean(aiSummary);
  const storyMeta = getStoryMeta(article);
  const sourceCount = article.source_count || article.sources?.length || (article.author ? 1 : 0);
  const clusterSize = article.cluster_size || 1;
  const clusterType = formatClusterType(article.cluster_type);
  const averageSimilarity = formatPercent(storyMeta.average_similarity);
  const firstPublishedAt = formatDateTime(storyMeta.first_published_at);
  const latestPublishedAt = formatDateTime(storyMeta.latest_published_at);
  const hasStoryDetails = Boolean(
    article.story_id ||
      article.cluster_id ||
      article.cluster_type ||
      article.original_title ||
      article.neutral_headline ||
      article.meta_story
  );
  const sourceNames = Array.from(
    new Set(
      (article.sources ?? [])
        .map((source) => source.source)
        .filter((source): source is string => Boolean(source))
    )
  );
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No date';

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    setDialogOpen(true);
  }

  return (
    <>
      <Card
        className="hover:shadow-xl transition-shadow overflow-hidden cursor-pointer group flex flex-col gap-0 py-0"
        onClick={() => setDialogOpen(true)}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={imageSrc}
            alt={article.title || 'News image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2 text-sm leading-snug">
            {title}
          </h3>

          {summary && (
            <div className="flex items-start gap-1.5 mb-3">
              <Sparkles
                className={`size-3 mt-0.5 shrink-0 ${
                  isAI ? 'text-violet-500' : 'text-muted-foreground/50'
                }`}
              />
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {categoryName && (
                <Badge variant="secondary" className="text-xs">
                  {categoryName}
                </Badge>
              )}
              {sourceCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
                </Badge>
              )}
              {clusterSize > 1 && (
                <Badge variant="outline" className="text-xs">
                  same event
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{publishedDate}</span>
          </div>

          {(sourceNames.length > 0 || article.author) && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {sourceNames.length > 0 ? sourceNames.join(', ') : `By ${article.author}`}
            </p>
          )}
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby={summary ? 'article-summary' : undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-xl leading-snug">{title}</DialogTitle>
          </DialogHeader>

          <div className="aspect-video bg-muted overflow-hidden rounded-md">
            <img
              src={imageSrc}
              alt={article.title || 'News image'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
            {sourceCount > 0 && (
              <Badge variant="outline">
                {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
              </Badge>
            )}
            {clusterSize > 1 && <Badge variant="outline">same event</Badge>}
            <span>{publishedDate}</span>
          </div>

          {(sourceNames.length > 0 || article.author) && (
            <p className="text-sm text-muted-foreground">
              {sourceNames.length > 0 ? sourceNames.join(', ') : `By ${article.author}`}
            </p>
          )}

          {summary && (
            <div className="rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3">
              <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="size-3" />
                {isAI ? 'AI Summary' : 'Key Insight'}
              </div>
              <p id="article-summary" className="text-sm text-violet-900 dark:text-violet-100">
                {summary}
              </p>
            </div>
          )}

          {hasStoryDetails && (
            <div className="rounded-md border p-3">
              <div className="mb-3 flex items-center gap-2">
                <Brain className="size-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Story Intelligence</h4>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailItem label="Cluster" value={clusterType} />
                <DetailItem label="Articles merged" value={clusterSize} />
                <DetailItem label="Sources" value={sourceCount || storyMeta.source_count} />
                <DetailItem label="Similarity" value={averageSimilarity} />
                <DetailItem label="Confidence" value={storyMeta.confidence?.replace(/_/g, ' ')} />
                <DetailItem label="Latest source" value={latestPublishedAt || publishedDate} />
                <DetailItem label="First source" value={firstPublishedAt} />
                <DetailItem label="Story ID" value={article.story_id || article.cluster_id} />
              </div>

              {article.original_title && article.original_title !== title && (
                <div className="mt-3 rounded-md bg-muted px-3 py-2">
                  <p className="text-[11px] uppercase tracking-normal text-muted-foreground">
                    Original headline
                  </p>
                  <p className="mt-1 text-sm text-foreground">{article.original_title}</p>
                </div>
              )}
            </div>
          )}

          {article.sources && article.sources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Source Articles</h4>
              <div className="space-y-2">
                {article.sources.slice(0, 8).map((source, index) => (
                  <div key={`${source.url || source.title || source.source}-${index}`} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {source.source || 'Unknown source'}
                        </p>
                        {source.title && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.title}</p>
                        )}
                      </div>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Open source article"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {article.description && (
            <div>
              <h4 className="text-sm font-semibold mb-1 text-foreground">Full Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {article.description}
              </p>
            </div>
          )}

          {article.content && article.content !== article.description && (
            <div>
              <h4 className="text-sm font-semibold mb-1 text-foreground">Article Content</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {article.content}
              </p>
            </div>
          )}

          {article.source_url && (
            <Button asChild className="w-full mt-2">
              <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                Read full article on source
                <ExternalLink className="size-4 ml-2" aria-hidden="true" />
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
