import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { supabase } from '@/lib/supabase';

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

type PublicArticle = {
  id: number;
  category_id: number;
  category?: string;
  title: string;
  description?: string;
  content?: string;
  summary?: string;
  neutral_headline?: string;
  original_title?: string;
  author?: string;
  source_url?: string;
  image_url?: string;
  published_at?: string;
  cluster_id?: string;
  story_id?: string;
  cluster_type?: string;
  cluster_size?: number;
  source_count?: number;
  sources?: StorySource[];
  meta_story?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PublicCategory = {
  id: number;
  name: string;
  key: string;
  article_count: number;
  created_at: string;
};

export type ScraperSyncResult = {
  syncedCount: number;
  skippedCount: number;
  payloadCount: number;
  sourceCounts: Record<string, number>;
};

export type ScraperRefreshResult = {
  mode: 'local-json-refresh';
  payloadCount: number;
  storyCount: number;
  sourceCounts: Record<string, number>;
  errorsCount: number;
  scrapedAt: string | null;
  windowHours: number | null;
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
  'technology'
] as const;

const STANDARD_CATEGORY_LABELS: Record<string, string> = {
  culture: 'Culture',
  economy: 'Economy',
  health: 'Health',
  other: 'Others',
  politics: 'Politics',
  society: 'Society',
  sport: 'Sport',
  technology: 'Technology'
};

const STANDARD_TO_DB_CATEGORY_CANDIDATES: Record<string, string[]> = {
  culture: ['Culture', 'Entertainment'],
  economy: ['Economy'],
  health: ['Health', 'Environment'],
  other: ['Others', 'Other', 'World'],
  politics: ['Politics', 'World'],
  society: ['Society', 'World', 'Education'],
  sport: ['Sport', 'Sports'],
  technology: ['Technology', 'Science']
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
  'meta_story'
] as const;

function normalizeStandardCategoryKey(value: string | null | undefined): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return 'other';
  }

  const aliases: Record<string, string> = {
    sports: 'sport',
    politic: 'politics',
    political: 'politics',
    tech: 'technology',
    cultural: 'culture',
    social: 'society'
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  if ((STANDARD_CATEGORY_ORDER as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return 'other';
}

function getArticleCategoryKeys(article: ScrapedArticle): string[] {
  const values = Array.isArray(article.categories) && article.categories.length > 0
    ? article.categories
    : [article.category];

  const keys = values
    .map((value) => normalizeStandardCategoryKey(value))
    .filter(Boolean);
  const uniqueKeys = [...new Set(keys)];
  const meaningfulKeys = uniqueKeys.filter((key) => key !== 'other');

  return meaningfulKeys.length > 0 ? meaningfulKeys : ['other'];
}

function getPrimaryCategoryKey(article: ScrapedArticle): string {
  return getArticleCategoryKeys(article)[0] || 'other';
}

function getStandardCategoryId(categoryKey: string): number {
  const index = STANDARD_CATEGORY_ORDER.indexOf(categoryKey as (typeof STANDARD_CATEGORY_ORDER)[number]);
  if (index === -1) {
    return STANDARD_CATEGORY_ORDER.indexOf('other') + 1;
  }

  return index + 1;
}

function buildPublicCategoryCounts(rawArticles: ScrapedArticle[]): Record<number, number> {
  const counts: Record<number, number> = {};

  for (const article of rawArticles) {
    for (const categoryKey of getArticleCategoryKeys(article)) {
      const categoryId = getStandardCategoryId(categoryKey);
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    }
  }

  return counts;
}

export async function getPublicCategoriesFromScraper(): Promise<PublicCategory[]> {
  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];
  const countsById = buildPublicCategoryCounts(rawArticles);
  const now = new Date().toISOString();

  return STANDARD_CATEGORY_ORDER
    .map((categoryKey): PublicCategory | null => {
      const id = getStandardCategoryId(categoryKey);
      const articleCount = countsById[id] || 0;

      if (articleCount === 0) {
        return null;
      }

      return {
        id,
        name: STANDARD_CATEGORY_LABELS[categoryKey],
        key: categoryKey,
        article_count: articleCount,
        created_at: now
      } satisfies PublicCategory;
    })
    .filter((category): category is PublicCategory => Boolean(category));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function inferCategoryName(article: ScrapedArticle): string {
  const source = normalizeText(article.source);
  const category = normalizeText(article.category);
  const title = normalizeText(article.title);
  const description = normalizeText(article.description);
  const combined = `${category} ${title} ${description}`;

  if (SPORTS_SOURCES.has((article.source ?? '').toUpperCase())) {
    return 'Sports';
  }

  if ([
    'sport',
    'football',
    'soccer',
    'champions',
    'league',
    'رياضة',
    'كرة',
    'دوري',
    'بطولة',
    'مباراة'
  ].some((keyword) => combined.includes(keyword))) {
    return 'Sports';
  }

  if (['politic', 'policy', 'government', 'election', 'سياسة', 'حكومة', 'برلمان'].some((keyword) => combined.includes(keyword))) {
    return 'Politics';
  }

  if (['econom', 'business', 'market', 'finance', 'اقتصاد', 'مال', 'استثمار'].some((keyword) => combined.includes(keyword))) {
    return 'Economy';
  }

  if (['health', 'medical', 'hospital', 'covid', 'صحة', 'طبي', 'مستشفى'].some((keyword) => combined.includes(keyword))) {
    return 'Health';
  }

  if (['tech', 'technology', 'ai', 'software', 'تكنولوجيا', 'تقنية', 'ذكاء اصطناعي'].some((keyword) => combined.includes(keyword))) {
    return 'Technology';
  }

  if (['science', 'research', 'space', 'physics', 'علوم', 'بحث', 'فضاء'].some((keyword) => combined.includes(keyword))) {
    return 'Science';
  }

  if (['entertainment', 'movie', 'music', 'celebrity', 'فن', 'ترفيه', 'سينما'].some((keyword) => combined.includes(keyword))) {
    return 'Entertainment';
  }

  if (['education', 'school', 'university', 'learn', 'تعليم', 'مدرسة', 'جامعة'].some((keyword) => combined.includes(keyword))) {
    return 'Education';
  }

  if (['environment', 'climate', 'sustain', 'nature', 'بيئة', 'مناخ'].some((keyword) => combined.includes(keyword))) {
    return 'Environment';
  }

  return 'World';
}

function resolveCategoryIdForArticle(
  article: ScrapedArticle,
  categoryByName: Map<string, number>,
  fallbackCategoryId: number
): number {
  const standardCandidates = getArticleCategoryKeys(article).flatMap(
    (categoryKey) => STANDARD_TO_DB_CATEGORY_CANDIDATES[categoryKey] || []
  );
  const candidates = [...new Set([...standardCandidates, inferCategoryName(article), 'World'])];

  for (const candidate of candidates) {
    const categoryId = categoryByName.get(normalizeText(candidate));
    if (categoryId) {
      return categoryId;
    }
  }

  return fallbackCategoryId;
}

function resolvePathFromCwd(targetPath: string) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), targetPath);
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

  for (const relativePath of DEFAULT_SCRAPER_PROJECT_PATHS) {
    candidates.push(resolvePathFromCwd(relativePath));
  }

  return [...new Set(candidates)];
}

async function resolveScraperSystemPath() {
  for (const projectPath of getScraperProjectCandidates()) {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (await pathExists(packageJsonPath)) {
      return projectPath;
    }
  }

  return null;
}

async function resolveScraperOutputPath() {
  const configuredOutputPath = process.env.SCRAPER_OUTPUT_PATH;

  if (configuredOutputPath) {
    const resolved = resolvePathFromCwd(configuredOutputPath);

    if (!(await pathExists(resolved))) {
      throw new Error(`Configured SCRAPER_OUTPUT_PATH was not found: ${resolved}`);
    }

    return resolved;
  }

  const candidates: string[] = [];

  for (const projectPath of getScraperProjectCandidates()) {
    for (const relativePath of DEFAULT_SCRAPER_OUTPUT_PATHS) {
      candidates.push(path.join(projectPath, relativePath));
    }
  }

  for (const candidatePath of candidates) {
    if (await pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Scraper JSON file not found. Checked: ${candidates.join(', ')}`
  );
}

async function runScraperSystem() {
  const shouldRun = process.env.SCRAPER_RUN_ON_SYNC !== 'false';
  if (!shouldRun) {
    return;
  }

  const scraperSystemPath = await resolveScraperSystemPath();

  if (!scraperSystemPath) {
    return;
  }

  try {
    await execAsync('npm start', {
      cwd: scraperSystemPath,
      timeout: 5 * 60 * 1000
    });
  } catch (error) {
    console.error('Failed to run external scraper system:', error);
  }
}

async function loadScrapedPayload(): Promise<ScrapedPayload> {
  const scraperJsonUrl = process.env.SCRAPER_JSON_URL;

  if (scraperJsonUrl) {
    const response = await fetch(scraperJsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch scraper JSON from URL: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeScrapedPayload(payload);
  }

  const outputPath = await resolveScraperOutputPath();
  const fileContent = await fs.readFile(outputPath, 'utf8');
  return normalizeScrapedPayload(JSON.parse(fileContent));
}

function normalizeScrapedPayload(raw: unknown): ScrapedPayload {
  if (Array.isArray(raw)) {
    return { articles: raw as ScrapedArticle[] };
  }

  if (raw && typeof raw === 'object') {
    const candidate = raw as ScrapedPayload & { items?: ScrapedArticle[] };
    if (Array.isArray(candidate.articles)) {
      return {
        articles: candidate.articles,
        errors: candidate.errors,
        notes: candidate.notes,
        scraped_at: candidate.scraped_at,
        sources: candidate.sources,
        total_articles: candidate.total_articles,
        window_hours: candidate.window_hours
      };
    }

    if (Array.isArray(candidate.items)) {
      return {
        articles: candidate.items,
        errors: candidate.errors,
        notes: candidate.notes,
        scraped_at: candidate.scraped_at,
        sources: candidate.sources,
        total_articles: candidate.total_articles,
        window_hours: candidate.window_hours
      };
    }
  }

  return { articles: [] };
}

function countSourcesFromArticles(articles: ScrapedArticle[]): Record<string, number> {
  const sourceCounts: Record<string, number> = {};

  for (const article of articles) {
    const source = (article.source || 'UNKNOWN').toUpperCase();
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

  return sourceCounts;
}

export async function refreshScraperFeed(): Promise<ScraperRefreshResult> {
  await runScraperSystem();

  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];

  return {
    mode: 'local-json-refresh',
    payloadCount: rawArticles.length,
    storyCount: payload.total_articles || rawArticles.length,
    sourceCounts: payload.sources || countSourcesFromArticles(rawArticles),
    errorsCount: Array.isArray(payload.errors) ? payload.errors.length : 0,
    scrapedAt: payload.scraped_at || null,
    windowHours: typeof payload.window_hours === 'number' ? payload.window_hours : null
  };
}

async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  const existing = new Set<string>();

  for (let index = 0; index < urls.length; index += 100) {
    const chunk = urls.slice(index, index + 100);
    if (chunk.length === 0) {
      continue;
    }

    const { data, error } = await supabase
      .from('articles')
      .select('source_url')
      .in('source_url', chunk);

    if (error) {
      throw new Error(`Failed to query existing URLs: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.source_url) {
        existing.add(row.source_url);
      }
    }
  }

  return existing;
}

function isMissingStoryColumnError(error: { message?: string }): boolean {
  const message = normalizeText(error.message);
  return STORY_COLUMN_KEYS.some((key) => message.includes(key)) ||
    (message.includes('column') && message.includes('schema cache'));
}

function stripStoryColumns<T extends Record<string, unknown>>(row: T) {
  const stripped = { ...row };

  for (const key of STORY_COLUMN_KEYS) {
    delete stripped[key];
  }

  return stripped;
}

async function insertArticleChunk(rows: Array<Record<string, unknown>>) {
  const { error } = await supabase.from('articles').insert(rows);

  if (!error) {
    return;
  }

  if (!isMissingStoryColumnError(error)) {
    throw new Error(`Failed to insert articles: ${error.message}`);
  }

  const fallbackRows = rows.map(stripStoryColumns);
  const { error: fallbackError } = await supabase.from('articles').insert(fallbackRows);

  if (fallbackError) {
    throw new Error(`Failed to insert articles: ${fallbackError.message}`);
  }
}

export async function syncArticlesFromScraper(options: { runScraper?: boolean } = {}): Promise<ScraperSyncResult> {
  if (options.runScraper !== false) {
    await runScraperSystem();
  }

  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name');

  if (categoriesError) {
    throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
  }

  const categoryByName = new Map<string, number>();
  for (const category of categories ?? []) {
    categoryByName.set(normalizeText(category.name), category.id);
  }

  const worldCategoryId =
    categoryByName.get('world') ||
    categoryByName.get('politics') ||
    (categories && categories[0]?.id) ||
    null;

  if (!worldCategoryId) {
    throw new Error('No categories found in database. Run the setup SQL first.');
  }

  const preparedRows = rawArticles
    .map((article) => {
      const categoryId = resolveCategoryIdForArticle(article, categoryByName, worldCategoryId);
      const sourceUrl = truncate(article.url ?? null, 500);
      const headline = article.neutral_headline || article.title;
      const summary = article.summary || article.bias_reduced_summary || article.description;

      if (!headline || !sourceUrl) {
        return null;
      }

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
        meta_story: article.meta_story || null
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.title && row?.source_url));

  const candidateUrls = preparedRows
    .map((row) => row.source_url)
    .filter((url): url is string => Boolean(url));

  const existingUrls = await getExistingUrls(candidateUrls);
  const rowsToInsert = preparedRows.filter((row) => !existingUrls.has(row.source_url));

  let insertedCount = 0;

  for (let index = 0; index < rowsToInsert.length; index += 100) {
    const chunk = rowsToInsert.slice(index, index + 100);
    if (chunk.length === 0) {
      continue;
    }

    await insertArticleChunk(chunk);
    insertedCount += chunk.length;
  }

  const sourceCounts = countSourcesFromArticles(rawArticles);

  return {
    syncedCount: insertedCount,
    skippedCount: preparedRows.length - insertedCount,
    payloadCount: rawArticles.length,
    sourceCounts
  };
}

export async function getScrapedArticlesForPublicFeed(limit: number | null = null): Promise<PublicArticle[]> {
  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];
  const now = new Date().toISOString();
  const selectedArticles = limit === null ? rawArticles : rawArticles.slice(0, limit);

  return selectedArticles.map((article, index) => {
    const categoryKey = getPrimaryCategoryKey(article);

    return {
      id: -(index + 1),
      category_id: getStandardCategoryId(categoryKey),
      category: categoryKey,
      title: article.neutral_headline || article.title || 'Untitled Article',
      description: article.summary || article.description || undefined,
      content: article.content || article.summary || article.description || undefined,
      summary: article.summary || article.description || undefined,
      neutral_headline: article.neutral_headline || article.title || undefined,
      original_title: article.original_title || article.title || undefined,
      author: article.source || 'External Scraper',
      source_url: article.url || undefined,
      image_url: article.image_url || undefined,
      published_at: article.publication_date || payload.scraped_at || now,
      cluster_id: article.cluster_id || article.story_id,
      story_id: article.story_id || article.cluster_id,
      cluster_type: article.cluster_type,
      cluster_size: article.cluster_size || 1,
      source_count: article.source_count || article.sources?.length || 1,
      sources: article.sources || [],
      meta_story: article.meta_story,
      created_at: now,
      updated_at: now
    };
  });
}
