'use client';

import { Article } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const DEFAULT_NEWS_IMAGE = '/news_default.jpg';

interface ArticleCardProps {
  article: Article;
  categoryName?: string;
}

export function ArticleCard({ article, categoryName }: ArticleCardProps) {
  const imageSrc = article.image_url || DEFAULT_NEWS_IMAGE;
  const title = article.neutral_headline || article.title;
  const summary = article.summary || article.description;
  const sourceCount = article.source_count || article.sources?.length || (article.author ? 1 : 0);
  const clusterSize = article.cluster_size || 1;
  const sourceNames = Array.from(
    new Set((article.sources || []).map((source) => source.source).filter(Boolean))
  );
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No date';

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="aspect-video bg-muted overflow-hidden">
        <img
          src={imageSrc}
          alt={article.title || 'News image'}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2">
            {title}
          </h3>
        </div>

        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {summary}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {categoryName && (
              <Badge variant="secondary">{categoryName}</Badge>
            )}
            {sourceCount > 0 && (
              <Badge variant="outline">
                {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
              </Badge>
            )}
            {clusterSize > 1 && (
              <Badge variant="outline">same event</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{publishedDate}</span>
        </div>

        {(sourceNames.length > 0 || article.author) && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
            {sourceNames.length > 0 ? sourceNames.join(', ') : article.author}
          </p>
        )}

        {article.source_url && (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
          >
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read full article
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}
