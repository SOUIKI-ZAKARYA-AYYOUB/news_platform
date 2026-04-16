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
  description?: string;
  image_url?: string;
  publication_date?: string;
  category?: string;
};

type ScrapedPayload = {
  articles?: ScrapedArticle[];
  scraped_at?: string;
};

type PublicArticle = {
  id: number;
  category_id: number;
  category?: string;
  title: string;
  description?: string;
  content?: string;
  author?: string;
  source_url?: string;
  image_url?: string;
  published_at?: string;
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
    const categoryKey = normalizeStandardCategoryKey(article.category);
    const categoryId = getStandardCategoryId(categoryKey);
    counts[categoryId] = (counts[categoryId] || 0) + 1;
  }

  return counts;
}

export async function getPublicCategoriesFromScraper(): Promise<PublicCategory[]> {
  const payload = await loadScrapedPayload();
  const rawArticles = Array.isArray(payload.articles) ? payload.articles : [];
  const countsById = buildPublicCategoryCounts(rawArticles);
  const now = new Date().toISOString();

  return STANDARD_CATEGORY_ORDER
    .map((categoryKey) => {
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

function resolvePathFromCwd(targetPath: string) {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
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

    return (await response.json()) as ScrapedPayload;
  }

  const outputPath = await resolveScraperOutputPath();
  const fileContent = await fs.readFile(outputPath, 'utf8');
  return JSON.parse(fileContent) as ScrapedPayload;
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
      const categoryName = inferCategoryName(article);
      const categoryId = categoryByName.get(normalizeText(categoryName)) || worldCategoryId;
      const sourceUrl = truncate(article.url ?? null, 500);

      if (!article.title || !sourceUrl) {
        return null;
      }

      return {
        category_id: categoryId,
        title: truncate(article.title, 500),
        description: truncate(article.description, 5000),
        content: truncate(article.description, 15000),
        author: truncate(article.source ?? 'External Scraper', 255),
        source_url: sourceUrl,
        image_url: truncate(article.image_url, 500),
        published_at: article.publication_date || payload.scraped_at || new Date().toISOString()
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

    const { error } = await supabase.from('articles').insert(chunk);
    if (error) {
      throw new Error(`Failed to insert articles: ${error.message}`);
    }

    insertedCount += chunk.length;
  }

  const sourceCounts: Record<string, number> = {};
  for (const article of rawArticles) {
    const source = (article.source || 'UNKNOWN').toUpperCase();
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

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

  return selectedArticles.map((article, index) => ({
    id: -(index + 1),
    category_id: getStandardCategoryId(normalizeStandardCategoryKey(article.category)),
    category: normalizeStandardCategoryKey(article.category),
    title: article.title || 'Untitled Article',
    description: article.description || undefined,
    content: article.description || undefined,
    author: article.source || 'External Scraper',
    source_url: article.url || undefined,
    image_url: article.image_url || undefined,
    published_at: article.publication_date || payload.scraped_at || now,
    created_at: now,
    updated_at: now
  }));
}