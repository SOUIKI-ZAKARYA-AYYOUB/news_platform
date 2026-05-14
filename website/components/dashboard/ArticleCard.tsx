'use client';

import { type KeyboardEvent, useEffect, useState, useMemo } from 'react';
import { Article } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ExternalLink,
  Layers,
  Lightbulb,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';

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

const CATEGORY_COLORS: Record<string, string> = {
  politics: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  sport: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  economy: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  health: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  technology: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  culture: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  society: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  other: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

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
  if (!text) return '';

  const sentences = text
    .split(/(?<=[.!?\u061F])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);

  if (sentences.length <= 1) return truncateWords(text, maxWords);

  const frequency: Record<string, number> = {};
  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      frequency[word] = (frequency[word] ?? 0) + 1;
    }
  }

  const scores = sentences.map((sentence) => {
    const words = tokenize(sentence);
    if (words.length === 0) return 0;
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
  if (!article.meta_story || typeof article.meta_story !== 'object') return {};
  return article.meta_story as StoryMeta;
}

function formatPercent(value?: number): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function getCategoryColorClass(categoryName?: string): string {
  const key = (categoryName ?? 'other').toLowerCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ArticleCardProps {
  article: Article;
  categoryName?: string;
  aiSummary?: string;
  onRequestSummary?: () => void;
  preferredLanguage?: string;
}

export function ArticleCard({ article, categoryName, aiSummary, onRequestSummary, preferredLanguage = 'auto' }: ArticleCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [whyItMatters, setWhyItMatters] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const imageSrc = article.image_url || DEFAULT_NEWS_IMAGE;
  const title = article.neutral_headline || article.title;
  const summarySource = article.description || article.content || article.summary || '';
  const summary = aiSummary ?? extractiveSummarize(summarySource);
  const isAI = Boolean(aiSummary);
  const storyMeta = getStoryMeta(article);
  const sourceCount = article.source_count || article.sources?.length || (article.author ? 1 : 0);
  const clusterSize = article.cluster_size || 1;
  const averageSimilarity = formatPercent(storyMeta.average_similarity);
  const sourceNames = Array.from(
    new Set(
      (article.sources ?? [])
        .map((s) => s.source)
        .filter((s): s is string => Boolean(s))
    )
  );
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No date';
  const publishedAgo = article.published_at ? timeAgo(article.published_at) : '';
  const fullDescription = article.description || article.content || '';

  // Detect article language from title text
  const articleLanguage = useMemo(() => {
    if (preferredLanguage !== 'auto') {
      return preferredLanguage;
    }
    const text = title || fullDescription;
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
    if (arabicChars > latinChars) return 'Arabic';
    const frenchIndicators = /[àâäéèêëïîôùûüÿçœæ]|(?:qu'|l'|d'|n'|c'|j'|s')/i;
    if (frenchIndicators.test(text)) return 'French';
    return 'English';
  }, [preferredLanguage, title, fullDescription]);

  // Fetch "Why It Matters" when dialog opens
  useEffect(() => {
    if (!dialogOpen || whyItMatters) return;

    const text = summary || fullDescription;
    if (!text) return;

    let cancelled = false;
    setLoadingAnalysis(true);

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        summary: text,
        category: categoryName || '',
        language: articleLanguage,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.analysis) {
          setWhyItMatters(data.analysis);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingAnalysis(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dialogOpen, whyItMatters, title, summary, fullDescription, categoryName, articleLanguage]);

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setDialogOpen(true);
    if (!aiSummary) onRequestSummary?.();
  }

  return (
    <>
      {/* ─── Card ─── */}
      <Card
        className="group relative overflow-hidden cursor-pointer flex flex-col gap-0 py-0
                   border-border/40 hover:border-primary/30
                   bg-card/60 backdrop-blur-sm
                   hover:shadow-xl hover:shadow-primary/5
                   hover:-translate-y-0.5
                   transition-all duration-300 ease-out"
        onClick={() => {
          setDialogOpen(true);
          if (!aiSummary) onRequestSummary?.();
        }}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="aspect-[16/10] bg-muted overflow-hidden relative">
          <img
            src={imageSrc}
            alt={article.title || 'News image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {categoryName && (
            <div className="absolute top-3 left-3">
              <Badge className={`text-[10px] font-semibold border ${getCategoryColorClass(categoryName)} backdrop-blur-md`}>
                {categoryName}
              </Badge>
            </div>
          )}

          {clusterSize > 1 && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-semibold border-0 backdrop-blur-md gap-1">
                <Layers className="size-3" />
                {clusterSize} sources
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2.5 text-[15px] leading-snug tracking-[-0.01em] group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>

          {summary && (
            <div className="flex items-start gap-2 mb-3">
              <Sparkles
                className={`size-3.5 mt-0.5 shrink-0 ${isAI ? 'text-primary' : 'text-muted-foreground/40'}`}
              />
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {sourceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {sourceCount}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {publishedDate}
              </span>
            </div>

            {(sourceNames.length > 0 || article.author) && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px] font-medium uppercase tracking-wider">
                {sourceNames.length > 0 ? sourceNames[0] : article.author}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Article Reader Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-[680px] max-h-[92vh] overflow-hidden p-0 border-border/30 bg-card gap-0 rounded-2xl"
          aria-describedby="article-detail-desc"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>

          <div className="overflow-y-auto max-h-[92vh] custom-scrollbar">
            {/* ─── Hero Image ─── */}
            <div className="relative aspect-[16/9] bg-muted shrink-0">
              <img
                src={imageSrc}
                alt={article.title || 'News image'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />

              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {categoryName && (
                    <Badge className={`text-[11px] font-semibold border ${getCategoryColorClass(categoryName)} backdrop-blur-md`}>
                      {categoryName}
                    </Badge>
                  )}
                  {publishedAgo && (
                    <span className="text-[11px] text-white/70 font-medium backdrop-blur-sm bg-black/25 rounded-full px-2.5 py-0.5">
                      {publishedAgo}
                    </span>
                  )}
                </div>
                {sourceNames.length > 0 && (
                  <span className="text-[11px] text-white/80 font-semibold uppercase tracking-wider backdrop-blur-sm bg-black/25 rounded-full px-2.5 py-0.5">
                    {sourceNames[0]}
                  </span>
                )}
              </div>
            </div>

            {/* ─── Content ─── */}
            <div className="px-6 pt-5 pb-7 space-y-5">
              {/* Headline */}
              <h2 className="text-xl sm:text-[22px] font-bold text-foreground leading-snug tracking-tight">
                {title}
              </h2>

              {/* Meta row */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {publishedDate}
                </span>
                {sourceCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
                  </span>
                )}
                {clusterSize > 1 && (
                  <span className="flex items-center gap-1.5 text-primary font-medium">
                    <Layers className="size-3.5" />
                    {clusterSize} articles merged
                  </span>
                )}
                {averageSimilarity && (
                  <span className="text-muted-foreground/60">{averageSimilarity} similar</span>
                )}
              </div>

              <div className="h-px bg-border/40" />

              {/* ─── AI Summary ─── */}
              {summary && (
                <div className="relative pl-4 border-l-2 border-primary/40">
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    {isAI ? 'AI Summary' : 'Summary'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">One-sentence takeaway generated by AI</p>
                  <p id="article-detail-desc" className="text-[13px] text-foreground/85 leading-relaxed">
                    {summary}
                  </p>
                </div>
              )}

              {/* ─── Why It Matters ─── */}
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Lightbulb className="size-3.5" />
                  Why It Matters
                </p>
                <p className="text-[10px] text-muted-foreground/50 mb-2">AI-generated analysis of real-world implications</p>
                {loadingAnalysis ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Analyzing implications...
                  </div>
                ) : whyItMatters ? (
                  <p className="text-[13px] text-foreground/85 leading-relaxed">
                    {whyItMatters}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Analysis unavailable for this story.
                  </p>
                )}
              </div>

              {/* ─── Original vs Neutral headline ─── */}
              {article.original_title && article.original_title !== title && (
                <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    Headline Rewrite
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">Clickbait removed — original vs neutral headline</p>
                  <div className="space-y-2">
                    <p className="text-[13px] text-muted-foreground/70 line-through leading-relaxed">
                      {article.original_title}
                    </p>
                    <p className="text-[13px] text-foreground/85 leading-relaxed font-medium">
                      → {title}
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Full Article Content ─── */}
              {fullDescription && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Full Article</p>
                  <p className="text-[10px] text-muted-foreground/50 mb-3">Original scraped content from the source</p>
                  <p className="text-sm text-muted-foreground leading-[1.8] whitespace-pre-line">
                    {fullDescription}
                  </p>
                </div>
              )}

              {/* ─── Sources ─── */}
              {article.sources && article.sources.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Sources ({article.sources.length})
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mb-3">News outlets that published this story</p>
                  <div className="space-y-1">
                    {article.sources.slice(0, 6).map((source, index) => (
                      <a
                        key={`${source.url || source.source}-${index}`}
                        href={source.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/src flex items-center justify-between gap-3 rounded-lg px-3 py-2.5
                                   hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate group-hover/src:text-primary transition-colors">
                            {source.source || 'Unknown'}
                          </p>
                          {source.title && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{source.title}</p>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/30 group-hover/src:text-primary shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Story Intelligence ─── */}
              {(article.story_id || article.cluster_id) && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Story Intelligence</p>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">Clustering metadata from the deduplication pipeline</p>
                  <div className="flex flex-wrap gap-1.5">
                    {article.story_id && (
                      <span className="text-[10px] bg-muted/40 text-muted-foreground/60 rounded-full px-2.5 py-1 font-medium">
                        {article.story_id}
                      </span>
                    )}
                    {storyMeta.confidence && (
                      <span className="text-[10px] bg-muted/40 text-muted-foreground/60 rounded-full px-2.5 py-1 font-medium">
                        {storyMeta.confidence.replace(/_/g, ' ')}
                      </span>
                    )}
                    {article.cluster_type && (
                      <span className="text-[10px] bg-muted/40 text-muted-foreground/60 rounded-full px-2.5 py-1 font-medium">
                        {article.cluster_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ─── CTA ─── */}
              {article.source_url && (
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/15 h-12 text-sm font-medium">
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                    Read full article
                    <ExternalLink className="size-4 ml-2" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
