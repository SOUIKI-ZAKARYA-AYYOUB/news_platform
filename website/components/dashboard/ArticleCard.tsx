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
            {article.title}
          </h3>
        </div>

        {article.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {article.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {categoryName && (
              <Badge variant="secondary">{categoryName}</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{publishedDate}</span>
        </div>

        {article.author && (
          <p className="text-xs text-muted-foreground mt-2">By {article.author}</p>
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
