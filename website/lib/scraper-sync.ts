import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

import pool from '@/lib/db';

const execAsync = promisify(execCallback);

type ScrapedArticle = {
  source?: string;
  url?: string;
  title?: string;
  original_title?: string;
  description?: string;
  content?: string;
  summary?: string;
  bias_reduced_summary?: string;
  neutral_headline?: string;
  image_url?: string;
  publication_date?: string;
  category?: string;
  categories?: string[];
  cluster_id?: string;
  story_id?: string;
  cluster_type?: string;
  cluster_size?: number;
  source_count?: number;
  sources?: StorySource[];
  meta_story?: Record<string, unknown>;
};

type ScrapedPayload = {
  articles?: ScrapedArticle[];
  errors?: unknown[];
  notes?: string[];
  scraped_at?: string;
  sources?: Record<string, number>;
  total_articles?: number;
  window_hours?: number;
};

type StorySource = {
  source?: string;
  title?: string | null;
  url?: string | null;
  published_at?: string | null;
  category?: string | null;
};

export type ScraperSyncResult = {
  syncedCount: number;
  skippedCount: number;
  payloadCount: number;
  sourceCounts: Record<string, number>;
};

const SPORTS_SOURCES = new Set(['WINWIN', 'ELHEDDAF']);
const DEFAULT_SCRAPER_PROJECT_PATHS = ['../scraping_system', '../news_scraping_systems-main'];
const DEFAULT_SCRAPER_OUTPUT_PATHS = ['news/latest-news.json', 'data/news/latest-news.json'];

const STANDARD_CATEGORY_ORDER = [
  'culture',
  'economy',
  'health',
  'other',
  'politics',
  'society',
  'sport',
  'technology',
] as const;

const STANDARD_TO_DB_CATEGORY_CANDIDATES: Record<string, string[]> = {
  culture: ['Culture', 'Entertainment'],
  economy: ['Economy'],
  health: ['Health', 'Environment'],
  other: ['Others', 'Other', 'World'],
  politics: ['Politics', 'World'],
  society: ['Society', 'World', 'Education'],
  sport: ['Sport', 'Sports'],
  technology: ['Technology', 'Science'],
};

const STORY_COLUMN_KEYS = [
  'summary',
  'neutral_headline',
  'original_title',
  'cluster_id',
  'story_id',
  'cluster_type',
  'cluster_size',
  'source_count',
  'sources',
  'meta_story',
] as const;

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeStandardCategoryKey(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  if (!normalized) return 'other';

  const aliases: Record<string, string> = {
    sports: 'sport',
    politic: 'politics',
    political: 'politics',
    tech: 'technology',
    cultural: 'culture',
    social: 'society',
  };
  if (aliases[normalized]) return aliases[normalized];
  if ((STANDARD_CATEGORY_ORDER as readonly string[]).includes(normalized)) return normalized;
  return 'other';
}

function getArticleCategoryKeys(article: ScrapedArticle): string[] {
  const values =
    Array.isArray(article.categories) && article.categories.length > 0
      ? article.categories
      : [article.category];

  const keys = values.map((v) => normalizeStandardCategoryKey(v)).filter(Boolean);
  const unique = [...new Set(keys)];
  const meaningful = unique.filter((k) => k !== 'other');
  return meaningful.length > 0 ? meaningful : ['other'];
}

function inferCategoryName(article: ScrapedArticle): string {
  const category = normalizeText(article.category);
  const title = normalizeText(article.title);
  const description = normalizeText(article.description);
  const combined = `${category} ${title} ${description}`;

  if (SPORTS_SOURCES.has((article.source ?? '').toUpperCase())) return 'Sports';
  if (['sport', 'football', 'soccer', 'رياضة', 'كرة', 'دوري'].some((k) => combined.includes(k)))
    return 'Sports';
  if (['politic', 'policy', 'government', 'سياسة', 'حكومة'].some((k) => combined.includes(k)))
    return 'Politics';
  if (['econom', 'business', 'market', 'اقتصاد', 'مال'].some((k) => combined.includes(k)))
    return 'Economy';
  if (['health', 'medical', 'hospital', 'صحة', 'طبي'].some((k) => combined.includes(k)))
    return 'Health';
  if (['tech', 'technology', 'ai ', 'software', 'تكنولوجيا'].some((k) => combined.includes(k)))
    return 'Technology';
  if (['science', 'research', 'space', 'علوم', 'بحث'].some((k) => combined.includes(k)))
    return 'Science';
  if (['entertain', 'movie', 'music', 'celebrity', 'فن', 'ترفيه'].some((k) => combined.includes(k)))
    return 'Entertainment';
  if (['education', 'school', 'university', 'تعليم', 'جامعة'].some((k) => combined.includes(k)))
    return 'Education';
  if (['environment', 'climate', 'nature', 'بيئة', 'مناخ'].some((k) => combined.includes(k)))
    return 'Environment';
  return 'World';
}

function resolveCategoryIdForArticle(
  article: ScrapedArticle,
  categoryByName: Map<string, number>,
  fallbackId: number,
): number {
  const standardCandidates = getArticleCategoryKeys(article).flatMap(
    (key) => STANDARD_TO_DB_CATEGORY_CANDIDATES[key] || [],
  );
  const candidates = [...new Set([...standardCandidates, inferCategoryName(article), 'World'])];
  for (const candidate of candidates) {
    const id = categoryByName.get(normalizeText(candidate));
    if (id) return id;
  }
  return fallbackId;
}

function resolvePathFromCwd(targetPath: string) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(process.cwd(), targetPath);
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getScraperProjectCandidates() {
  const candidates: string[] = [];
  if (process.env.SCRAPER_SYSTEM_PATH) {
    candidates.push(resolvePathFromCwd(process.env.SCRAPER_SYSTEM_PATH));
  }
  for (const rel of DEFAULT_SCRAPER_PROJECT_PATHS) {
    candidates.push(resolvePathFromCwd(rel));
  }
  return [...new Set(candidates)];
}

async function resolveScraperSystemPath() {
  for (const projectPath of getScraperProjectCandidates()) {
    if (await pathExists(path.join(projectPath, 'package.json'))) {
      return projectPath;
    }
  }
  return null;
}

async function resolveScraperOutputPath() {
  const configured = process.env.SCRAPER_OUTPUT_PATH;
  if (configured) {
    const resolved = resolvePathFromCwd(configured);
    if (!(await pathExists(resolved))) {
      throw new Error(`Configured SCRAPER_OUTPUT_PATH not found: ${resolved}`);
    }
    return resolved;
  }

  const candidates: string[] = [];
  for (const projectPath of getScraperProjectCandidates()) {
    for (const rel of DEFAULT_SCRAPER_OUTPUT_PATHS) {
      candidates.push(path.join(projectPath, rel));
    }
  }
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error(`Scraper JSON not found. Checked: ${candidates.join(', ')}`);
}

async function runScraperSystem() {
  if (process.env.SCRAPER_RUN_ON_SYNC === 'false') return;

  const scraperPath = await resolveScraperSystemPath();
  if (!scraperPath) return;

  try {
    await execAsync('npm start', { cwd: scraperPath, timeout: 5 * 60 * 1000 });
  } catch (error) {
    console.error('Failed to run scraper system:', error);
  }
}

async function loadScrapedPayload(): Promise<ScrapedPayload> {
  const scraperJsonUrl = process.env.SCRAPER_JSON_URL;
  if (scraperJsonUrl) {
    const response = await fetch(scraperJsonUrl);
    if (!response.ok) throw new Error(`Failed to fetch scraper JSON: ${response.status}`);
    return normalizeScrapedPayload(await response.json());
  }

  try {
    const outputPath = await resolveScraperOutputPath();
    return normalizeScrapedPayload(JSON.parse(await fs.readFile(outputPath, 'utf8')));
  } catch (error) {
    console.warn('Scraper JSON not found, returning empty payload.', error);
    return { articles: [] };
  }
}

function normalizeScrapedPayload(raw: unknown): ScrapedPayload {
  if (Array.isArray(raw)) return { articles: raw as ScrapedArticle[] };
  if (raw && typeof raw === 'object') {
    const c = raw as ScrapedPayload & { items?: ScrapedArticle[] };
    if (Array.isArray(c.articles)) return c;
    if (Array.isArray(c.items)) return { ...c, articles: c.items };
  }
  return { articles: [] };
}

function countSourcesFromArticles(articles: ScrapedArticle[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    const src = (a.source || 'UNKNOWN').toUpperCase();
    counts[src] = (counts[src] || 0) + 1;
  }
  return counts;
}

async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let i = 0; i < urls.length; i += 100) {
    const chunk = urls.slice(i, i + 100);
    if (!chunk.length) continue;
    const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');
    const { rows } = await pool.query<{ source_url: string }>(
      `SELECT source_url FROM articles WHERE source_url IN (${placeholders})`,
      chunk,
    );
    for (const row of rows) {
      if (row.source_url) existing.add(row.source_url);
    }
  }
  return existing;
}

type ArticleRow = Record<string, unknown>;

function stripStoryColumns(row: ArticleRow): ArticleRow {
  const stripped = { ...row };
  for (const key of STORY_COLUMN_KEYS) delete stripped[key];
  return stripped;
}

async function insertArticleChunk(rows: ArticleRow[]) {
  if (!rows.length) return;

  const columns = [
    'category_id', 'title', 'description', 'content', 'summary',
    'neutral_headline', 'original_title', 'author', 'source_url',
    'image_url', 'published_at', 'cluster_id', 'story_id',
    'cluster_type', 'cluster_size', 'source_count', 'sources', 'meta_story',
  ];

  const values: unknown[] = [];
  const rowPlaceholders: string[] = [];
  let paramIndex = 1;

  for (const row of rows) {
    const placeholders = columns.map(() => `$${paramIndex++}`);
    rowPlaceholders.push(`(${placeholders.join(', ')})`);
    for (const col of columns) {
      const val = row[col];
      values.push(
        col === 'sources' || col === 'meta_story'
          ? val != null ? JSON.stringify(val) : null
          : val ?? null,
      );
    }
  }

  const sql = `
    INSERT INTO articles (${columns.join(', ')})
    VALUES ${rowPlaceholders.join(', ')}
    ON CONFLICT DO NOTHING
  `;

  try {
    await pool.query(sql, values);
  } catch (error: unknown) {
    const msg = (error as { message?: string }).message ?? '';
    const isStoryColError = STORY_COLUMN_KEYS.some((k) => msg.includes(k));
    if (!isStoryColError) throw error;

    // Retry without story columns
    const fallbackRows = rows.map(stripStoryColumns);
    await insertArticleChunk(fallbackRows);
  }
}

export async function syncArticlesFromScraper(
  options: { runScraper?: boolean } = {},
): Promise<ScraperSyncResult> {
  if (options.runScraper !== false) await runScraperSystem();

  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];

  const { rows: categoryRows } = await pool.query<{ id: number; name: string }>(
    'SELECT id, name FROM categories',
  );

  const categoryByName = new Map<string, number>();
  for (const cat of categoryRows) {
    categoryByName.set(normalizeText(cat.name), cat.id);
  }

  const fallbackId =
    categoryByName.get('world') ??
    categoryByName.get('politics') ??
    categoryRows[0]?.id;

  if (!fallbackId) {
    throw new Error('No categories found in database. Run 01-setup-database.sql first.');
  }

  const preparedRows = rawArticles
    .map((article) => {
      const categoryId = resolveCategoryIdForArticle(article, categoryByName, fallbackId);
      const sourceUrl = truncate(article.url ?? null, 500);
      const headline = article.neutral_headline || article.title;
      const summary = article.summary || article.bias_reduced_summary || article.description;

      if (!headline || !sourceUrl) return null;

      return {
        category_id: categoryId,
        title: truncate(headline, 500),
        description: truncate(summary, 5000),
        content: truncate(article.content || summary, 15000),
        summary: truncate(summary, 5000),
        neutral_headline: truncate(article.neutral_headline || headline, 500),
        original_title: truncate(article.original_title || article.title, 500),
        author: truncate(article.source ?? 'External Scraper', 255),
        source_url: sourceUrl,
        image_url: truncate(article.image_url, 500),
        published_at: article.publication_date || payload.scraped_at || new Date().toISOString(),
        cluster_id: truncate(article.cluster_id || article.story_id, 255),
        story_id: truncate(article.story_id || article.cluster_id, 255),
        cluster_type: truncate(article.cluster_type, 100),
        cluster_size: article.cluster_size || 1,
        source_count: article.source_count || article.sources?.length || 1,
        sources: article.sources || [],
        meta_story: article.meta_story || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.title && row?.source_url));

  const candidateUrls = preparedRows
    .map((r) => r.source_url)
    .filter((u): u is string => Boolean(u));

  const existingUrls = await getExistingUrls(candidateUrls);
  const rowsToInsert = preparedRows.filter((r) => !existingUrls.has(r.source_url));

  for (let i = 0; i < rowsToInsert.length; i += 100) {
    const chunk = rowsToInsert.slice(i, i + 100);
    if (chunk.length) await insertArticleChunk(chunk);
  }

  return {
    syncedCount: rowsToInsert.length,
    skippedCount: preparedRows.length - rowsToInsert.length,
    payloadCount: rawArticles.length,
    sourceCounts: payload.sources || countSourcesFromArticles(rawArticles),
  };
}
