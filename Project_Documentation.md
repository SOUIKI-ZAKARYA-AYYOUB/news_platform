# Newsly Platform - Complete Technical Documentation

**An AI-Powered Personalized News Aggregation System**

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [System Architecture](#system-architecture)
4. [Data Collection Layer](#data-collection-layer)
5. [Data Preprocessing Pipeline](#data-preprocessing-pipeline)
6. [AI/ML Layer - Clustering & Intelligence](#aiml-layer)
7. [Website & Frontend](#website--frontend)
8. [Backend API & Database](#backend-api--database)
9. [Future Improvements](#future-improvements)

---

## EXECUTIVE SUMMARY

Newsly is a full-stack AI-powered news aggregation platform designed to deliver personalized, bias-reduced news to users based on their category preferences. The platform combines:

- **Multi-source scraping system** (7 Arabic news sources + generic fallback)
- **Intelligent article clustering** (using TF-IDF vectorization + cosine similarity)
- **Bias reduction algorithms** (deterministic headline/summary rewriting)
- **Personalized recommendation engine** (category-based filtering + user preferences)
- **Modern web interface** (Next.js 16 + React 19 + TypeScript)
- **Secure authentication** (JWT + bcrypt + Supabase)
- **Automated scheduling** (Vercel Cron every 2 hours)

**Technology Stack:**
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API routes, Node.js
- Database: Supabase (PostgreSQL) + local JSON fallback
- Authentication: JWT, bcryptjs (10 salt rounds)
- Deployment: Vercel

---

## PROBLEM STATEMENT

### The Challenge

In today's information-saturated world, users face several critical challenges:

1. **Information Overload**: Thousands of news articles published daily across multiple sources
2. **Bias and Sensationalism**: Media outlets use emotionally charged language ("shocking," "explosive," "outrage") to drive clicks
3. **Scattered Sources**: Users must manually visit multiple news websites to get comprehensive coverage
4. **Lack of Personalization**: Generic news feeds don't reflect individual user interests
5. **Duplicate Coverage**: Same event reported by multiple sources creates redundancy
6. **Source Trustworthiness**: Users struggle to identify reliable sources vs. clickbait
7. **Language Diversity**: Arabic, French, and English content needs unified processing

### The Solution: Newsly

Newsly solves these problems by:
- **Aggregating** news from 7 trusted Arabic sources
- **De-duplicating** articles about the same event through intelligent clustering
- **Reducing bias** through deterministic text transformations
- **Personalizing** feeds based on user category preferences
- **Normalizing** category taxonomy across heterogeneous sources
- **Providing metadata** about article clusters (sources, confidence, similarity)
- **Updating automatically** every 2 hours to keep content fresh

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEWSLY PLATFORM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │  DATA COLLECTION     │         │   WEBSITE & FRONTEND     │  │
│  │   (Scraping System)  │         │   (Next.js 16)           │  │
│  │                      │         │                          │  │
│  │  - 7 News Scrapers   │         │  - Landing Page          │  │
│  │  - Generic Fallback  │         │  - Signup/Signin         │  │
│  │  - RSS Parser        │         │  - Dashboard Feed        │  │
│  │  - HTTP Client       │         │  - Category Preferences  │  │
│  └──────────────────────┘         └──────────────────────────┘  │
│            │                                    │                 │
│            │                                    │                 │
│            ▼                                    │                 │
│  ┌──────────────────────┐                      │                 │
│  │ DATA PREPROCESSING   │                      │                 │
│  │                      │                      │                 │
│  │  - HTML Cleaning     │                      │                 │
│  │  - Category Mapping  │                      │                 │
│  │  - Text Tokenizing   │                      │                 │
│  │  - Bias Detection    │                      │                 │
│  │  - Text Repair      │                      │                 │
│  └──────────────────────┘                      │                 │
│            │                                    │                 │
│            ▼                                    │                 │
│  ┌──────────────────────┐                      │                 │
│  │   AI/ML LAYER        │                      │                 │
│  │                      │                      │                 │
│  │  - TF-IDF Vector.    │                      │                 │
│  │  - Cosine Similarity │                      │                 │
│  │  - Jaccard Sim.      │                      │                 │
│  │  - Union-Find        │                      │                 │
│  │  - Clustering        │                      │                 │
│  │  - Summarization     │                      │                 │
│  └──────────────────────┘                      │                 │
│            │                                    │                 │
│            ▼                                    ▼                 │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │  JSON DATA STORE     │         │   BACKEND API LAYER      │  │
│  │                      │         │                          │  │
│  │ latest-news.json     │         │  - Auth APIs             │  │
│  │ latest-news-raw.json │         │  - Article Endpoints     │  │
│  │                      │         │  - Category Endpoints    │  │
│  └──────────────────────┘         │  - Preference APIs       │  │
│            │                      │  - Cron Jobs             │  │
│            │                      └──────────────────────────┘  │
│            │                                    │                 │
│            └────────────────────┬───────────────┘                 │
│                                 │                                 │
│                                 ▼                                 │
│                      ┌──────────────────────┐                    │
│                      │   SUPABASE DB        │                    │
│                      │   (PostgreSQL)       │                    │
│                      │                      │                    │
│                      │  - users             │                    │
│                      │  - categories        │                    │
│                      │  - articles          │                    │
│                      │  - user_preferences  │                    │
│                      │  - scrape_logs       │                    │
│                      └──────────────────────┘                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## DATA COLLECTION LAYER

### Overview

The scraping system is built in **Node.js** and handles automated article collection from 7 diverse Arabic news sources plus a generic fallback scraper.

**Location**: `scraping_system/src/`

### Supported News Sources

| Source | Type | Scraper | Specialty |
|--------|------|---------|-----------|
| **APS** | National Agency | Feed-based | Official government news |
| **TSA** | Telecom News | RSS parser | Technology & business |
| **ENNAHAR** | National Daily | Custom parser | General news |
| **ELHAYAT** | Political Daily | Custom parser | Politics & society |
| **ALJAZEERA** | International | RSS parser | Global perspectives |
| **ELHEDDAF** | Sports Daily | Custom parser | Sports exclusively |
| **WINWIN** | Sports Weekly | Custom parser | Sports exclusively |

### Architecture

#### 1. **Main Entry Point** - `src/index.js`

```javascript
// Core flow:
// 1. Initialize all scrapers
// 2. Run them in parallel (Promise.all)
// 3. Deduplicate articles by URL/title
// 4. Sort by publication date
// 5. Process (optionally) and output JSON
```

**Key Functions:**
- `runScraper()`: Wraps scraper execution with error handling
- `dedupeArticles()`: Removes duplicate entries using URL/title as key
- `main()`: Orchestrates entire flow

**Output:**
- `news/latest-news.json` (processed, ready for website)
- `news/latest-news-raw.json` (unprocessed, debug purposes)

#### 2. **RSS Parser** - `src/lib/rss.js`

Handles RSS feed parsing using `fast-xml-parser` library:

```javascript
export async function fetchRssPage(feedUrl, pageNumber = 1) {
  // Fetch XML from URL with proper Accept headers
  // Parse with XMLParser
  // Extract items array
  // Handle pagination
}

export function parseRssItems(xml) {
  // Use XMLParser to convert XML to JS objects
  // Extract rss.channel.item array
  // Return normalized items
}
```

**Features:**
- Fast, efficient XML parsing
- Pagination support (`?paged=2`)
- Custom Accept headers for RSS compatibility
- Error handling for malformed feeds

#### 3. **HTTP Client** - `src/lib/http.js`

Generic HTTP fetch utility:

```javascript
export async function fetchText(url, options = {}) {
  // Wrapper around fetch()
  // Handles timeouts (default 30s)
  // Sets User-Agent
  // Returns text response
  // Throws on non-2xx status
}
```

#### 4. **Individual Source Scrapers**

Located in `src/scrapers/` directory:

**Scraper Structure** (e.g., `aps.js`):

```javascript
export async function scrapeAps({ hours = 24 }) {
  // 1. Fetch RSS feed(s)
  // 2. Parse items
  // 3. Extract article metadata
  // 4. Normalize to standard format
  // 5. Filter by time window
  // 6. Return { source, articles, errors, notes }
}
```

**Standard Article Format:**
```javascript
{
  source: "APS",                    // News source identifier
  url: "https://...",              // Original article URL
  title: "Article Title",          // Extracted headline
  description: "Summary...",       // Brief excerpt
  content: "Full text...",         // Article body (if available)
  image_url: "https://...",       // Featured image
  publication_date: "2024-01-15T10:30:00Z",  // ISO timestamp
  categories: ["politics", "economy"]  // Raw categories from source
}
```

#### 5. **Generic Fallback Scraper** - `src/scrapers/generic.js`

Universal scraper for arbitrary news websites:

```javascript
export async function scrapeGenericSite({ siteUrl, hours = 24 }) {
  // 1. Detect available RSS feeds via meta tags
  // 2. Fall back to sitemap.xml discovery
  // 3. As last resort, extract links from homepage
  // 4. Parse article metadata from pages
  // 5. Return normalized articles
}
```

**Discovery Methods** (in order):
1. `<link rel="alternate" type="application/rss+xml">` meta tags
2. Check `/sitemap.xml` for content URLs
3. Homepage card-detection (repeated content patterns)
4. Article metadata extraction from page HTML

**LLM-Free**: No external APIs needed, purely client-side parsing.

### Scraper Execution

**Command:**
```bash
cd scraping_system
npm run scrape
```

**Behind the scenes:**
```bash
node src/index.js --hours 24 --process
```

**Parameters:**
- `--hours 24`: Look for articles from last 24 hours
- `--process`: Run story processor (clustering, bias reduction)
- `--site-url <url>`: Add generic scraper for custom site
- `--no-process`: Skip processing, output raw articles

**Example for Custom Site:**
```bash
node src/index.js --site-url https://example-news.com --hours 24
```

### Error Handling

Each scraper is wrapped in try-catch:

```javascript
async function runScraper(scraper, hours) {
  try {
    return await scraper.run({ hours });
  } catch (error) {
    return {
      source: scraper.source,
      articles: [],
      errors: [createScrapeError(scraper.source, null, error)],
      notes: [`${scraper.source} scraper failed and was skipped.`]
    };
  }
}
```

**Result Structure:**
```javascript
{
  source: "APS",
  articles: [...],
  errors: [
    {
      source: "APS",
      url: null,
      message: "Connection timeout"
    }
  ],
  notes: ["APS scraper processed 15 articles"]
}
```

---

## DATA PREPROCESSING PIPELINE

### Overview

The preprocessing pipeline transforms raw scraped articles into clean, standardized, bias-reduced stories ready for the website.

**Location**: `scraping_system/src/lib/story-processor.js`

**Main Export**: `processNewsPayload(rawPayload)`

### Preprocessing Steps

#### Step 1: Article Cleaning & Normalization

**Function**: `prepareArticles(rawArticles)`

```
INPUT: Raw articles from various scrapers
│
├─ 1. HTML Decoding & Stripping
│  - Remove all HTML tags
│  - Convert HTML entities (&nbsp; → space, &amp; → &, etc.)
│  - Clean line breaks
│  - Normalize whitespace
│
├─ 2. Text Repair (Mojibake Detection)
│  - Detect encoding errors (UTF-8 decoded as Latin-1, etc.)
│  - Compare score before/after repair
│  - Use higher-scoring version
│
├─ 3. Feed Boilerplate Removal
│  - Strip "The post X appeared first on Y" patterns
│  - Remove Arabic equivalents
│
├─ 4. Text Normalization
│  - Trim whitespace
│  - Collapse multiple spaces
│  - Remove trailing punctuation errors
│
├─ 5. Validation
│  - Require title + description OR content
│  - Skip articles with empty critical fields
│
└─ OUTPUT: Cleaned articles with normalized fields
```

**Code Example:**
```javascript
function cleanText(value) {
  // 1. Repair mojibake
  const repaired = repairMojibake(String(value));
  
  // 2. Remove feed boilerplate
  // 3. Decode HTML entities
  // 4. Strip HTML tags
  // 5. Collapse whitespace
  // 6. Trim
  
  return cleaned || null;
}
```

**Text Scoring for Mojibake Repair:**
```
Score = (Arabic chars × 2) + (Latin Extended) - (Mojibake markers × 3)
```

Uses character range detection:
- Arabic: `\u0600-\u06ff`
- Latin Extended: `\u00c0-\u017f`
- Mojibake markers: `\u00c3`, `\u00c2`, `\u00d8`, `\u00d9`, `\ufffd`

#### Step 2: Category Classification

**Function**: `extractStandardCategories(article)`

Normalizes source-specific categories to 8 standard categories:

```
Standard Categories:
├─ politics
├─ economy
├─ health
├─ culture
├─ technology
├─ society
├─ sport
└─ other
```

**Classification Algorithm:**

```javascript
function classifyCategory(rawCategory, article) {
  // 1. Check if source is sports-only (WINWIN, ELHEDDAF)
  if (SPORTS_SOURCES.has(source)) return "sport";
  
  // 2. Build combined text from category + metadata
  const combined = normalizeForMatching([
    rawCategory,
    article.title,
    article.description,
    article.content,
    article.source
  ].join(" "));
  
  // 3. Score against CATEGORY_RULES
  let bestScore = 0;
  let bestCategory = "other";
  
  for (const rule of CATEGORY_RULES) {
    const score = matchRuleScore(combined, rule);
    if (score > bestScore) {
      bestCategory = rule.key;
      bestScore = score;
    }
  }
  
  return bestScore > 0 ? bestCategory : "other";
}
```

**Category Rules** (sample):

```javascript
{
  key: "politics",
  terms: [
    "politic", "politics", "politique",
    "government", "election", "parliament",
    "سياسة", "حكومة", "رئاسة", "انتخاب"
  ]
}

{
  key: "economy",
  terms: [
    "economy", "economic", "commerce", "business",
    "market", "finance", "bank", "industry",
    "اقتصاد", "مال", "بنك", "تجارة", "صناعة"
  ]
}

{
  key: "sport",
  terms: [
    "sport", "sports", "football", "soccer",
    "basketball", "match", "team", "league",
    "رياضة", "كرة", "مباراة", "بطولة"
  ]
}
```

**Multilingual Support**: Rules include English, French, and Arabic terms

**Multiple Categories**: If article matches multiple categories, keep all relevant ones

#### Step 3: Tokenization & Text Normalization

**Function**: `tokenize(value)`

```javascript
function tokenize(value) {
  // 1. Normalize text
  //    - Convert to lowercase
  //    - Remove diacritics (Arabic tashkeel)
  //    - Remove special characters
  
  // 2. Extract tokens
  //    - Use regex: /[\p{L}\p{N}]+/gu
  //    - Match Unicode letters and numbers
  
  // 3. Filter stopwords
  //    - Remove common words: "the", "a", "is", etc.
  //    - Support Arabic stopwords: "في", "من", "على"
  //    - Support French stopwords: "le", "la", "de"
  
  // 4. Filter short tokens (< 3 chars)
  
  return filteredTokens;
}
```

**Stopword Sets:**
- **English**: 33 words (the, and, or, at, in, for, etc.)
- **Arabic**: 14 words (في, من, على, إلى, عن, مع, هذا, etc.)
- **French**: 15 words (le, la, les, de, du, dans, sur, avec, etc.)

#### Step 4: Bias Reduction

**Function**: `reduceBias(value)`

Applies deterministic transformations to reduce sensationalism:

**Emotional Language Replacements:**
```javascript
const CHARGED_REPLACEMENTS = [
  [/\bslams?\b/gi, "criticizes"],
  [/\bslammed\b/gi, "criticized"],
  [/\bblasts?\b/gi, "criticizes"],
  [/\battacks?\b/gi, "criticizes"],
  [/\bclaims?\b/gi, "says"],
  [/\breveals?\b/gi, "reports"],
  [/\bexposes?\b/gi, "reports"],
  [/\badmits?\b/gi, "says"],
  [/\bvows?\b/gi, "says it plans"],
  [/\bsparks outrage\b/gi, "draws reactions"],
  [/\bscandal\b/gi, "controversy"],
  [/\bcatastrophe\b/gi, "serious incident"],
]
```

**Sensationalism Removal:**
```javascript
[/\bshocking\b/gi, ""],          // Remove completely
[/\bstunning\b/gi, ""],
[/\bexplosive\b/gi, ""],
[/\bunbelievable\b/gi, ""],
[/\bincredible\b/gi, ""],
[/\bdevastating\b/gi, ""],
[/\bhuge\b/gi, ""],
[/\bmassive\b/gi, ""],
[/\burgent\b/gi, ""],
[/\bbreaking\b/gi, ""],
[/\bexclusive\b/gi, ""],
```

**Arabic Equivalents:**
```javascript
[/\bعاجل[\u064b-\u0652]*\b/g, ""],         // urgent
[/\bصادم[\u0629ات]*/g, ""],               // shocking
[/\bفضيح[\u0629ات]*/g, "جدل"],           // scandal → debate
[/\bخطير[\u0629اتين]*/g, ""],            // dangerous
[/\bمدمر[\u0629اتين]*/g, ""],            // devastating
```

**Deterministic Rules** (no LLM needed):
- Punctuation normalization
- Extra spaces removal
- Case preservation (where applicable)

#### Step 5: Vector Building & Similarity Scoring

**Function**: `buildWeightedVectors(articles)`

Converts articles to TF-IDF vectors for similarity comparison:

**Algorithm:**
```
1. Tokenize each article's semantic text
   semantic_text = title + description + content
   
2. Build term frequency maps
   tf_map[token] = number of occurrences in article
   
3. Calculate document frequency
   df[token] = number of articles containing token
   
4. Apply IDF weighting
   idf[token] = log((1 + total_docs) / (1 + df[token])) + 1
   
5. Build TF-IDF vector
   vector[token] = tf[token] × idf[token]
```

**Why TF-IDF?**
- **TF (Term Frequency)**: Frequent terms in this article are important
- **IDF (Inverse Document Frequency)**: Terms appearing in few articles are more discriminative
- **Result**: Common words ("the", "is") get low weight; distinctive terms get high weight

**Example:**
```
Article 1: "Egypt announces new economic policy with interest rate cut"
Article 2: "Central bank cuts interest rate to boost economy"

Vectors:
Article 1: {egypt: 2.1, economic: 1.8, policy: 1.7, ...}
Article 2: {central: 1.9, cuts: 1.8, interest: 1.9, ...}

Similarity: High (both discuss interest rates + economy)
```

#### Step 6: Clustering Similar Articles

**Function**: `clusterArticles(articles, vectors)`

Groups articles about the same event using **Union-Find** data structure:

**Clustering Algorithm:**

```
1. Initialize Union-Find structure (each article = own cluster)

2. Exact Match Phase:
   - Same URL → merge clusters
   - Identical title (normalized) → merge clusters

3. Category-Based Similarity Phase:
   For articles in same category:
     - Calculate cosine similarity of TF-IDF vectors
     - Calculate Jaccard similarity of title tokens
     - Combined score = 0.75 × text_sim + 0.25 × title_sim
     
     Merge if:
     - Combined score ≥ 0.68  OR
     - Combined score ≥ 0.58 AND title_sim ≥ 0.45  OR
     - Text_sim ≥ 0.74 AND title_sim ≥ 0.25

4. Build clusters from Union-Find roots
```

**Similarity Metrics:**

**Cosine Similarity:**
```
similarity = (u · v) / (||u|| × ||v||)

where:
- u · v = dot product of vectors
- ||u|| = L2 norm of u
- Result: value between 0 and 1
  0 = completely different
  1 = identical
```

**Jaccard Similarity:**
```
similarity = |intersection| / |union|

where:
- intersection = tokens in both sets
- union = tokens in either set
- Result: value between 0 and 1
```

**Why Union-Find?**
- Efficiently merges clusters
- Path compression for fast lookups
- Supports transitive clustering (A≈B, B≈C → A in same cluster as C)

**Example Clustering:**
```
Raw Articles:
1. "Egypt announces interest rate cut"
2. "Central bank lowers interest rates"
3. "Football match ends in draw"

Similarity Scores:
1-2: text=0.82, title=0.40, combined=0.715 → MERGE
1-3: text=0.15, title=0.05, combined=0.12 → SEPARATE
2-3: text=0.18, title=0.08, combined=0.15 → SEPARATE

Result:
Cluster 1: [Article 1, Article 2]  (same story: interest rates)
Cluster 2: [Article 3]              (different story: sports)
```

---

## AI/ML LAYER

### Overview

The AI layer transforms clustered articles into curated stories with generated headlines, summaries, and metadata.

**Core Algorithms:**
1. **TF-IDF Vectorization** - Text representation
2. **Cosine & Jaccard Similarity** - Article comparison
3. **Union-Find Clustering** - Grouping similar articles
4. **Extractive Summarization** - Key sentence selection
5. **Headline Generation** - Neutral title synthesis

### 1. TF-IDF Vectorization (Detailed)

**Why TF-IDF?**

Raw word frequency is misleading:
- "the" appears 100 times in any article (not useful)
- "Egypt" appears 2 times in an Egypt article (very useful)

TF-IDF balances these:

**Term Frequency (TF):**
```
tf(term, doc) = count(term in doc) / total_terms_in_doc
```

**Inverse Document Frequency (IDF):**
```
idf(term, corpus) = log((total_docs) / (docs_containing_term)) + 1
```

**TF-IDF:**
```
tfidf(term, doc) = tf(term, doc) × idf(term, corpus)
```

**Practical Example:**
```
Corpus: 1000 articles

Term: "Egypt"
- Appears in 200 articles (df = 200)
- idf = log(1000/200) + 1 = 1.699 + 1 = 2.699
- In document, frequency = 0.01 (10 mentions / 1000 words)
- tfidf = 0.01 × 2.699 = 0.02699 ✓ (Good weight)

Term: "the"
- Appears in 999 articles (df = 999)
- idf = log(1000/999) + 1 = 0.001 + 1 = 1.001
- In document, frequency = 0.05 (50 mentions / 1000 words)
- tfidf = 0.05 × 1.001 = 0.05005 ✗ (Very low weight despite frequency)
```

**Implementation in Code:**
```javascript
function buildWeightedVectors(articles) {
  // 1. Get token counts for each article
  const rawCounts = articles.map(article => 
    tokenCounts(articleSemanticText(article))
  );
  
  // 2. Calculate document frequency
  const documentFrequency = new Map();
  for (const counts of rawCounts) {
    for (const token of counts.keys()) {
      documentFrequency.set(
        token, 
        (documentFrequency.get(token) ?? 0) + 1
      );
    }
  }
  
  // 3. Build TF-IDF vectors
  return rawCounts.map(counts => {
    const vector = new Map();
    for (const [token, count] of counts.entries()) {
      const df = documentFrequency.get(token) ?? 1;
      const idf = Math.log((1 + totalDocs) / (1 + df)) + 1;
      vector.set(token, count * idf);  // TF-IDF value
    }
    return vector;
  });
}
```

### 2. Cosine Similarity (Detailed)

Measures angle between vectors in high-dimensional space:

**Mathematical Definition:**
```
cos(θ) = (A · B) / (||A|| × ||B||)

where:
- A · B = dot product = Σ(a_i × b_i)
- ||A|| = magnitude = √(Σ(a_i²))
- ||B|| = magnitude = √(Σ(b_i²))
```

**Properties:**
- **Range**: 0 to 1 (for TF-IDF vectors)
- **0**: Completely different documents
- **1**: Identical documents
- **0.5**: Moderate overlap

**Optimization for Sparse Vectors:**

TF-IDF vectors are sparse (many zero values). Only iterate shared tokens:

```javascript
function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  // Calculate left norm
  for (const value of left.values()) {
    leftNorm += value * value;
  }

  // Calculate right norm
  for (const value of right.values()) {
    rightNorm += value * value;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;

  // Iterate smaller vector to find dot product
  const [small, large] = left.size < right.size 
    ? [left, right] 
    : [right, left];
  
  for (const [token, value] of small.entries()) {
    dot += value * (large.get(token) ?? 0);
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
```

**Time Complexity:**
- Naive: O(n) where n = vocabulary size
- Optimized: O(min(|A|, |B|)) where |A|, |B| = non-zero tokens

**Example:**
```
Vector A: {egypt: 2.1, economy: 1.8, policy: 1.7}
Vector B: {economy: 1.9, interest: 1.8, rate: 1.5}

Shared: {economy}

dot = 1.8 × 1.9 = 3.42

||A|| = √(2.1² + 1.8² + 1.7²) = √11.54 = 3.397
||B|| = √(1.9² + 1.8² + 1.5²) = √10.30 = 3.209

cos(θ) = 3.42 / (3.397 × 3.209) = 3.42 / 10.90 = 0.314

Interpretation: Articles have ~31% similarity
```

### 3. Jaccard Similarity (Title Matching)

Measures overlap between token sets:

**Definition:**
```
J(A, B) = |A ∩ B| / |A ∪ B|
```

Where:
- **Intersection**: Tokens in both titles
- **Union**: Tokens in either title

**Example:**
```
Title 1: "Egypt announces interest rate cut"
         Tokens: {egypt, announces, interest, rate, cut}

Title 2: "Central bank cuts interest rates"
         Tokens: {central, bank, cuts, interest, rates}

Intersection: {interest}  (size = 1)
Union: {egypt, announces, interest, rate, cut, central, bank, cuts, rates}  (size = 9)

Jaccard = 1 / 9 = 0.111
```

**Implementation:**
```javascript
function jaccardSimilarity(leftTokens, rightTokens) {
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  const [small, large] = leftTokens.size < rightTokens.size
    ? [leftTokens, rightTokens]
    : [rightTokens, leftTokens];

  // Count shared tokens
  for (const token of small) {
    if (large.has(token)) {
      intersection += 1;
    }
  }

  // Calculate union size
  const union = leftTokens.size + rightTokens.size - intersection;

  return intersection / union;
}
```

**Why Jaccard for Titles?**
- Robust to word order changes
- Penalizes missing keywords
- Better for matching headlines about same event

**Why Not Cosine for Titles?**
- Cosine doesn't account for relative frequencies in short text
- Jaccard's set-based approach better matches "2 out of 5 words"

### 4. Union-Find Data Structure (Clustering)

Efficiently tracks which articles should be grouped together:

**Operations:**
- `find(x)`: Which cluster does article x belong to?
- `union(x, y)`: Merge clusters containing x and y

**Path Compression Optimization:**
```javascript
function buildUnionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const rank = Array.from({ length: size }, () => 0);

  function find(value) {
    let current = value;
    while (parent[current] !== current) {
      // Path compression: skip intermediate nodes
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);

    if (leftRoot === rightRoot) return;  // Already in same set

    // Union by rank: attach smaller tree to larger
    if (rank[leftRoot] < rank[rightRoot]) {
      parent[leftRoot] = rightRoot;
    } else if (rank[leftRoot] > rank[rightRoot]) {
      parent[rightRoot] = leftRoot;
    } else {
      parent[rightRoot] = leftRoot;
      rank[leftRoot] += 1;
    }
  }

  return { find, union };
}
```

**Time Complexity:**
- `find()`: Nearly O(1) amortized with path compression
- `union()`: Nearly O(1) amortized
- Building clusters: O(n log n) for n articles

**Example Clustering Process:**
```
Step 1: Initialize
parent = [0, 1, 2, 3, 4]  // Each article is own cluster

Step 2: URL matching (Articles 0 & 1 have same URL)
union(0, 1)
parent = [1, 1, 2, 3, 4]  // 0's parent is now 1

Step 3: Title matching (Articles 1 & 2 have similar titles)
union(1, 2)
parent = [1, 2, 2, 3, 4]  // 1's parent is now 2

Step 4: Similarity matching (Articles 0 & 3 are similar)
union(0, 3)
  find(0) → find(1) → find(2) = 2
  find(3) = 3
  union(2, 3)
parent = [1, 2, 3, 3, 4]  // 2's parent is now 3

Step 5: Extract clusters
Article 0 → cluster 3
Article 1 → cluster 3
Article 2 → cluster 3
Article 3 → cluster 3
Article 4 → cluster 4

Result:
Cluster 3: [0, 1, 2, 3]  (same event from multiple sources)
Cluster 4: [4]           (different event)
```

### 5. Article Clustering Algorithm (Complete)

Combines all similarity metrics:

**Phase 1: Exact Matches**
```javascript
// URL-based deduplication
const urlToIndex = new Map();
for (let i = 0; i < articles.length; i++) {
  const urlKey = normalizeForMatching(articles[i].url);
  if (urlToIndex.has(urlKey)) {
    union(i, urlToIndex.get(urlKey));  // Merge
  } else {
    urlToIndex.set(urlKey, i);
  }
}

// Title-based deduplication
const titleToIndex = new Map();
for (let i = 0; i < articles.length; i++) {
  const titleKey = normalizeForMatching(articles[i].title);
  if (titleKey && titleToIndex.has(titleKey)) {
    union(i, titleToIndex.get(titleKey));  // Merge
  } else if (titleKey) {
    titleToIndex.set(titleKey, i);
  }
}
```

**Phase 2: Category-Based Similarity**
```javascript
// Group articles by category
const categoryGroups = new Map();
for (let i = 0; i < articles.length; i++) {
  for (const category of articles[i].categories) {
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category).push(i);
  }
}

// Compare articles within same category
for (const indices of categoryGroups.values()) {
  for (let left = 0; left < indices.length; left++) {
    for (let right = left + 1; right < indices.length; right++) {
      const leftIdx = indices[left];
      const rightIdx = indices[right];
      
      const textScore = cosineSimilarity(vectors[leftIdx], vectors[rightIdx]);
      const titleScore = jaccardSimilarity(titleTokens[leftIdx], titleTokens[rightIdx]);
      const combinedScore = textScore * 0.75 + titleScore * 0.25;

      // Merge if similarity exceeds threshold
      if (
        combinedScore >= 0.68 ||
        (combinedScore >= 0.58 && titleScore >= 0.45) ||
        (textScore >= 0.74 && titleScore >= 0.25)
      ) {
        union(leftIdx, rightIdx);
      }
    }
  }
}
```

**Phase 3: Extract Clusters**
```javascript
const clustersByRoot = new Map();
for (let i = 0; i < articles.length; i++) {
  const root = find(i);
  if (!clustersByRoot.has(root)) {
    clustersByRoot.set(root, []);
  }
  clustersByRoot.get(root).push(i);
}

return [...clustersByRoot.values()];  // Array of clusters
```

**Thresholds Explained:**

| Threshold | Meaning |
|-----------|---------|
| `combined >= 0.68` | High confidence: text + title match |
| `combined >= 0.58 && title >= 0.45` | Good title match compensates for moderate text sim |
| `text >= 0.74 && title >= 0.25` | Very high text similarity, minimal title match needed |

### 6. Headline Generation

**Function**: `rewriteHeadline(article, clusterArticles)`

Synthesizes neutral headline from cluster articles:

**Algorithm:**
```
1. Collect all titles in cluster
2. Tokenize each title
3. Calculate token frequencies across all titles
4. Apply bias reduction to common tokens
5. Order tokens by frequency
6. Combine into grammatical headline
```

**Process:**
```javascript
function rewriteHeadline(article, clusterArticlesForStory) {
  const titles = [
    article.title,
    ...clusterArticlesForStory.map(entry => entry.title)
  ];
  
  // Token frequency across cluster
  const tokenFreq = new Map();
  for (const title of titles) {
    for (const token of tokenize(title)) {
      tokenFreq.set(token, (tokenFreq.get(token) ?? 0) + 1);
    }
  }
  
  // Sort by frequency
  const frequent = [...tokenFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)  // Top 10 tokens
    .map(([token]) => token);
  
  // Combine into headline
  return capitalizeSentence(frequent.join(" "));
}
```

**Example:**
```
Cluster Articles:
1. "Egypt announces dramatic interest rate cut amid economic crisis"
2. "Central bank slashes interest rates in shocking move"
3. "Interest rates down as Egypt tackles economy"

Token Frequencies:
- interest: 3
- rates: 3
- egypt: 2
- economic: 1
- bank: 1
- cuts/cut/slashes: 1 (deduplicated)

Generated Headline:
"Interest Rates Egypt Economic Bank"

After Bias Reduction (remove "dramatic", "shocking"):
"Interest Rates Egypt Economic Bank"
```

### 7. Summary Generation

**Function**: `generateSummary(article, clusterArticles)`

Extracts key sentences from cluster:

**Algorithm:**
```
1. Split articles into sentences (min 30 chars)
2. Tokenize each sentence
3. Calculate sentence scores based on token importance
4. Select top 2-3 sentences
5. Return as summary
```

**Scoring:**
```javascript
function sentenceScore(sentence, tokenFreq) {
  let score = 0;
  for (const token of tokenize(sentence)) {
    score += tokenFreq.get(token) ?? 0;  // Higher if uses frequent tokens
  }
  return score / tokenize(sentence).length;  // Normalize by length
}
```

**Example:**
```
Cluster Sentences:
1. "Egypt's central bank has announced a significant interest rate reduction."
   Score: 4.2 (4 frequent tokens / 12 words)

2. "The move aims to stimulate economic growth amid inflationary pressures."
   Score: 3.1 (3 frequent tokens / 13 words)

3. "Analysts expect the rate cut will have positive impact on markets."
   Score: 2.8 (2 frequent tokens / 14 words)

Selected Summary:
"Egypt's central bank has announced a significant interest rate reduction. 
The move aims to stimulate economic growth amid inflationary pressures."
```

### 8. Story Metadata

**Function**: `buildMetaStory({ storyId, headline, summary, articles, sources })`

Constructs metadata about cluster:

```javascript
{
  id: "story_abc123",
  headline: "Egypt interest rates ...",
  summary: "Central bank announced ...",
  categories: ["economy", "politics"],
  cluster_type: "multi_source_cluster",  // or "single_source_story"
  confidence: 0.8734,                    // average similarity
  article_count: 3,
  source_count: 2,
  first_published: "2024-01-15T08:30:00Z",
  last_updated: "2024-01-15T12:15:00Z",
  sources: [
    {
      source: "APS",
      title: "Interest rates cut",
      url: "https://aps.dz/...",
      published_at: "2024-01-15T08:30:00Z",
      category: "economy"
    },
    {
      source: "TSA",
      title: "Central bank decision",
      url: "https://tsa.dz/...",
      published_at: "2024-01-15T09:15:00Z",
      category: "economy"
    }
  ]
}
```

**Cluster Type Classification:**
```javascript
confidence: articles.length > 1 
  ? "multi_source_cluster"      // Same event from multiple sources
  : "single_source_story";      // Single source article

average_similarity: clusterAverageSimilarity(indices, vectors)
```

**Average Similarity Calculation:**
```javascript
function clusterAverageSimilarity(indices, vectors) {
  let total = 0;
  let count = 0;
  
  // Compare all pairs in cluster
  for (let left = 0; left < indices.length - 1; left++) {
    for (let right = left + 1; right < indices.length; right++) {
      total += cosineSimilarity(
        vectors[indices[left]], 
        vectors[indices[right]]
      );
      count += 1;
    }
  }
  
  return count > 0 ? total / count : 1.0;
}
```

---

## WEBSITE & FRONTEND

### Overview

Modern, responsive Next.js web application with real-time article delivery and user personalization.

**Technology Stack:**
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Forms**: Zod validation + React Hook Form
- **Routing**: Next.js App Router
- **State Management**: React Context (Auth)
- **Internationalization**: Custom I18n context

**Location**: `website/`

### Key Pages

#### 1. Landing Page (`app/page.tsx`)

**Purpose**: Marketing & user onboarding

**Features:**
- Hero section with value proposition
- Sign up & Sign in CTA buttons
- Feature cards (Personalized, Real-time, Easy to manage)
- Responsive design (mobile-first)

**Content:**
```
┌─────────────────────────────────────────┐
│  Newsly - Personalized News            │
│  Get daily news based on your interests │
│  [Sign Up]  [Sign In]                   │
├─────────────────────────────────────────┤
│  ✓ Personalized Feed                    │
│  ✓ Real-time Updates                    │
│  ✓ Easy to Manage                       │
└─────────────────────────────────────────┘
```

#### 2. Sign Up Flow (`app/signup/page.tsx`)

**Multi-Step Form**: 4-step wizard

**Step 1: Email**
```
Input: Email address
Validation:
  - Valid email format (RFC 5322)
  - Unique (no duplicates in database)
  - Required
Action: Next → Step 2
```

**Step 2: Username**
```
Input: Username
Validation:
  - 3-100 characters
  - Alphanumeric + underscores/hyphens
  - Unique (no duplicates)
  - Real-time availability check
Action: Next → Step 3
```

**Step 3: Password**
```
Input: Password + Confirmation
Validation:
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 number (0-9)
  - Match confirmation
Requirements displayed to user:
  ✓ At least 8 characters
  ✓ Contains uppercase letter
  ✓ Contains number
  ✓ Passwords match
Action: Next → Step 4
```

**Step 4: Category Selection**
```
Display: Grid of 10 categories
  - Politics
  - Economy
  - Health
  - Sports
  - Technology
  - Culture
  - Society
  - Others

Validation:
  - At least 1 category required
  - Multiple selections allowed

Action: Create Account → Auto Sign In → Dashboard
```

**Implementation:**
```typescript
// Components
components/auth/SignupStep1.tsx    // Email
components/auth/SignupStep2.tsx    // Username
components/auth/SignupStep3.tsx    // Password
components/auth/SignupStep4.tsx    // Categories

// Each step manages its state + validation
// Shared context maintains form progression
```

#### 3. Sign In Page (`app/signin/page.tsx`)

**Simple Login Form**

```
Email: [_________________]
Password: [_________________]
           [Remember Me] [Forgot Password]
           [Sign In]
```

**Features:**
- Email/password authentication
- Remember me checkbox (localStorage)
- Auto-redirect to dashboard on success
- Error messages for invalid credentials
- Link to sign up page

#### 4. Dashboard (`app/dashboard/page.tsx`)

**Main Application**: Personalized news feed

**Key Features:**

**Auto-Scraping:**
- On page load, trigger background scrape if:
  - No scrape in last 2 hours, OR
  - User manually triggers refresh
- Shows "Scraping..." status while running
- Auto-loads new articles when done

**Article Display:**
- Load 15 articles initially (`ARTICLES_STEP`)
- Infinite scroll: load more on demand
- Each article shows:
  - Headline (neutral/original)
  - Description
  - Featured image
  - Category badge
  - Time since publication (e.g., "2h ago")
  - Source(s)
  - Link to original article

**Filtering:**
- Filter by selected category
- Reset to show all categories

**Summarization:**
- Click article to expand full summary
- Choose summary language (auto/Arabic/English/French)
- Uses API call to `/api/summarize`

**Category Digest:**
- Generate AI summary of selected category
- "Digest" button triggers batch summarization
- Shows combined insights across articles

**Refresh Controls:**
- Manual refresh button (30-minute cooldown)
- Shows cooldown remaining in minutes
- Auto-refresh every 2 hours (background)

**UI Components:**
```
┌──────────────────────────────────────┐
│  Dashboard                    [⚙️]   │
├──────────────────────────────────────┤
│                                      │
│  Filter: [All Categories ▼]         │
│           [Refresh]  Status: idle    │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ 📰 Article Title                 ││
│  │ Category: Politics    2 hours ago││
│  │ 📝 Brief description...          ││
│  │ [More Details] [Read on Source]  ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ 📰 Another Article               ││
│  │ ...                              ││
│  └──────────────────────────────────┘│
│                                      │
│  [Load More Articles]                │
│                                      │
└──────────────────────────────────────┘
```

**Fetch Logic:**
```typescript
const fetchData = async () => {
  // 1. Fetch all categories
  const categories = await fetch('/api/categories');
  
  // 2. Fetch articles (filtered by user preferences)
  const articles = await fetch('/api/articles');
  
  // 3. Populate category map for display
  // 4. Set articles, reset visible count to 15
}
```

#### 5. Preferences Page (`app/dashboard/preferences/page.tsx`)

**Category Management**

```
┌──────────────────────────────────────┐
│  My Preferences                      │
├──────────────────────────────────────┤
│                                      │
│  ☑ Politics      ☐ Technology        │
│  ☑ Economy       ☐ Health            │
│  ☑ Sports        ☑ Culture           │
│  ☐ Society       ☐ Others            │
│                                      │
│  [Save Changes]  [Cancel]            │
│  ✓ Preferences saved!                │
│                                      │
└──────────────────────────────────────┘
```

**Features:**
- Grid layout of 10 categories
- Checkboxes for multi-select
- Save/Cancel buttons
- Success/error feedback
- Protected route (login required)

**API Call:**
```typescript
POST /api/preferences
{
  category_ids: [1, 3, 5, 8]
}

Response:
{
  message: "Preferences updated",
  preferences: [...]
}
```

### Styling & Design

**UI Component Library**: shadcn/ui
- Pre-built, customizable components
- Built on Radix UI + Tailwind CSS
- Includes: Button, Input, Card, Badge, Dropdown, etc.

**Color Scheme:**
- Light mode: White background, dark text
- Dark mode: Dark background, light text
- Accent color: Blue (category badges, buttons)

**Responsive Design:**
- Mobile-first approach
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

**Accessibility:**
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast compliance

### State Management

**AuthContext** (`context/AuthContext.tsx`)

Global authentication state:
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUp: (email, username, password, categories) => Promise<void>;
  signIn: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (categoryIds) => Promise<void>;
}

// Usage:
const { user, isLoading, logout } = useAuth();
```

**I18nContext** (`context/I18nContext.tsx`)

Internationalization:
```typescript
interface I18nContextType {
  locale: 'en' | 'ar' | 'fr';
  t: (key: string) => string;
  setLocale: (locale: string) => void;
}

// Usage:
const { t, locale } = useTranslation();
```

### Custom Hooks

**useAuth()** - Authentication state

```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
```

**useTranslation()** - i18n

```typescript
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used inside I18nProvider');
  }
  return context;
}
```

---

## BACKEND API & DATABASE

### Overview

Next.js API Routes handle all backend logic. Supabase provides PostgreSQL database + authentication fallback. Local JSON fallback for development without database.

**Location**: `website/app/api/`

### Database Schema

**Supabase Tables:**

#### 1. `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `categories` Table
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-loaded categories:
-- 1: Politics
-- 2: Economy
-- 3: Health
-- 4: Sports
-- 5: Technology
-- 6: Culture
-- 7: Society
-- 8: Others
```

#### 3. `user_preferences` Table
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id)
);
```

#### 4. `articles` Table
```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT,
  summary TEXT,
  neutral_headline VARCHAR(500),
  original_title VARCHAR(500),
  author VARCHAR(255),
  source_url TEXT,
  image_url TEXT,
  published_at TIMESTAMP,
  
  -- Cluster metadata
  cluster_id VARCHAR(100),
  story_id VARCHAR(100),
  cluster_type VARCHAR(50),           -- "multi_source_cluster" or "single_source_story"
  cluster_size INTEGER DEFAULT 1,      -- Articles in this cluster
  source_count INTEGER DEFAULT 1,      -- Unique sources
  sources JSONB,                       -- Array of source objects
  meta_story JSONB,                    -- Full cluster metadata
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_cluster ON articles(cluster_id);
```

#### 5. `scrape_logs` Table
```sql
CREATE TABLE scrape_logs (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  status VARCHAR(50),                  -- "started", "completed", "failed"
  articles_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

### API Endpoints

#### Authentication Endpoints

**POST /api/auth/signup**

Create new user account

**Request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Validation:**
```typescript
const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3).max(100),
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[0-9]/, 'Needs number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

**Response** (201 Created):
```json
{
  "message": "User created successfully",
  "user": {
    "id": "abc123-def456",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

**Processing:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate input
  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { errors: validation.error.flatten() },
      { status: 400 }
    );
  }
  
  // Check email uniqueness
  const existing = await getUserByEmail(body.email);
  if (existing) {
    return NextResponse.json(
      { error: 'Email already registered' },
      { status: 409 }
    );
  }
  
  // Hash password (bcrypt, 10 rounds)
  const passwordHash = await hashPassword(body.password);
  
  // Create user
  const user = await createUser(
    body.email,
    body.username,
    passwordHash
  );
  
  // Set JWT cookie
  const token = createJwtToken(user.id);
  const response = NextResponse.json(
    { message: 'User created', user },
    { status: 201 }
  );
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60  // 7 days
  });
  
  return response;
}
```

**POST /api/auth/signin**

Authenticate user and create session

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):
```json
{
  "message": "Signed in successfully",
  "user": {
    "id": "abc123-def456",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

**Sets** HTTP-only cookie: `session=<JWT>`

**POST /api/auth/logout**

Clear session cookie

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Clears**: `session` cookie

---

#### Category Endpoints

**GET /api/categories**

Retrieve all available categories

**Query Parameters:**
- `usedOnly=1`: Only return categories with articles

**Response** (200 OK):
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Politics",
      "description": "Political news and updates",
      "article_count": 45,
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 5,
      "name": "Technology",
      "description": "Tech and innovation news",
      "article_count": 32,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  const usedOnly = request.nextUrl.searchParams.get('usedOnly') === '1';
  
  const categories = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (usedOnly) {
    // Filter to only categories with articles
    const categoriesWithArticles = new Set(
      articles.map(a => a.category_id)
    );
    return NextResponse.json({
      categories: categories.filter(c => categoriesWithArticles.has(c.id))
    });
  }
  
  return NextResponse.json({ categories });
}
```

---

#### Article Endpoints

**GET /api/articles**

Retrieve personalized article feed

**Query Parameters:**
- `limit=50`: Max articles to return (default: all)

**Authentication:**
- If logged in: Filter by user preferences
- If not logged in: Return public feed

**Response** (200 OK):
```json
{
  "articles": [
    {
      "id": 1,
      "title": "Egypt announces interest rate cut",
      "description": "Central bank reduces rates to boost economy",
      "summary": "The Central Bank of Egypt reduced...",
      "neutral_headline": "Egypt interest rates adjusted downward",
      "category_id": 2,
      "category": "Economy",
      "published_at": "2024-01-15T10:30:00Z",
      "image_url": "https://...",
      "source_url": "https://...",
      "author": "APS",
      
      "cluster_id": "cluster_001",
      "cluster_type": "multi_source_cluster",
      "cluster_size": 3,
      "source_count": 2,
      "sources": [
        {
          "source": "APS",
          "title": "Interest rate cut",
          "url": "https://aps.dz/...",
          "published_at": "2024-01-15T10:30:00Z"
        },
        {
          "source": "TSA",
          "title": "Central bank decision",
          "url": "https://tsa.dz/...",
          "published_at": "2024-01-15T09:15:00Z"
        }
      ],
      
      "meta_story": {
        "confidence": "multi_source_cluster",
        "average_similarity": 0.8234,
        "cluster_metadata": {...}
      }
    }
  ],
  "allCategories": false
}
```

**Implementation (Database Mode):**
```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  const requestedLimit = parseRequestedLimit(request);
  
  if (!session) {
    // Unauthenticated: public feed
    const articles = await supabase
      .from('articles')
      .select()
      .order('published_at', { ascending: false });
    
    if (requestedLimit) {
      articles = articles.limit(requestedLimit);
    }
    
    return NextResponse.json({ articles });
  }
  
  // Authenticated: filtered by preferences
  const categoryIds = await getUserPreferences(session.userId);
  
  let query = supabase
    .from('articles')
    .select()
    .order('published_at', { ascending: false });
  
  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds);
  }
  
  if (requestedLimit) {
    query = query.limit(requestedLimit);
  }
  
  const { data: articles } = await query;
  
  return NextResponse.json({
    articles,
    allCategories: categoryIds.length === 0
  });
}
```

**Implementation (JSON Fallback Mode):**
```typescript
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    // Load from JSON
    const articles = await getScrapedArticlesForPublicFeed(null);
    
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ articles });
    }
    
    // Filter by user preferences
    const categoryIds = await getUserPreferences(session.userId);
    const filtered = articles.filter(a => 
      categoryIds.length === 0 || categoryIds.includes(a.category_id)
    );
    
    return NextResponse.json({
      articles: filtered,
      allCategories: categoryIds.length === 0
    });
  }
}
```

**POST /api/articles**

Create new article (for testing)

**Request:**
```json
{
  "title": "Article Title",
  "description": "Summary",
  "content": "Full text",
  "category_id": 2,
  "author": "John Doe",
  "source_url": "https://...",
  "image_url": "https://...",
  "published_at": "2024-01-15T10:30:00Z"
}
```

**Response** (201 Created):
```json
{
  "article": {
    "id": 102,
    "title": "Article Title",
    ...
  }
}
```

---

#### Preference Endpoints

**GET /api/preferences**

Get user's category preferences

**Requires**: Authentication

**Response** (200 OK):
```json
{
  "preferences": [
    {
      "id": 1,
      "user_id": "abc123",
      "category_id": 1,
      "created_at": "2024-01-15T11:00:00Z"
    },
    {
      "id": 2,
      "user_id": "abc123",
      "category_id": 3,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**POST /api/preferences**

Update user's category preferences

**Requires**: Authentication

**Request:**
```json
{
  "category_ids": [1, 3, 5, 8]
}
```

**Process:**
```typescript
1. Get session
2. Validate category IDs exist
3. Delete all current preferences for user
4. Insert new preferences
5. Return success
```

**Response** (200 OK):
```json
{
  "message": "Preferences updated",
  "preferences": [...]
}
```

---

#### Cron Endpoints

**GET /api/cron/scrape-articles** (Vercel Cron)

Automatic scraping job (runs every 2 hours)

**Configured in**: `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/scrape-articles",
    "schedule": "0 */2 * * *"
  }]
}
```

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-vercel-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Execute scraper
  const result = await syncArticlesFromScraper();
  
  // Log result
  await logScrapeJob({
    status: 'completed',
    articles_count: result.syncedCount,
    completed_at: new Date()
  });
  
  return NextResponse.json({
    status: 'completed',
    articles_synced: result.syncedCount,
    timestamp: new Date().toISOString()
  });
}
```

**Response**:
```json
{
  "status": "completed",
  "articles_synced": 42,
  "timestamp": "2024-01-15T12:00:00Z"
}
```

---

### Authentication System

**JWT-Based Session Management**

**Token Creation:**
```typescript
function createJwtToken(userId: string): string {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)  // 7 days
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET!);
}
```

**Token Verification:**
```typescript
function verifyJwtToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
```

**Session Retrieval:**
```typescript
export async function getSession(): Promise<{ userId: string } | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie?.value) {
    return null;
  }
  
  return verifyJwtToken(sessionCookie.value);
}
```

**Password Hashing (bcryptjs):**
```typescript
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcryptjs.compare(plain, hashed);
}
```

**Salt Rounds Explanation:**
- 10 = moderate security (suitable for web apps)
- Hashing takes ~100ms per password
- Increases exponentially with rounds

**Security Features:**
- ✅ HTTP-only cookies (no XSS access)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=strict (CSRF protection)
- ✅ Bcrypt with 10 salt rounds
- ✅ Input validation with Zod
- ✅ SQL injection prevention (Supabase parameterized queries)

---

### Local JSON Fallback

**When to Use:**
- Database not configured
- Development without Supabase
- Testing without external dependencies

**Files:**
- `.data/local-auth.json` - Local user storage
- `news/latest-news.json` - Articles (from scraper)

**Structure**:
```json
{
  "users": [
    {
      "id": "uuid-123",
      "email": "user@example.com",
      "username": "john_doe",
      "password_hash": "$2a$10$...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "preferences": [
    {
      "user_id": "uuid-123",
      "category_id": 1,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "hidden_sources": [
    {
      "user_id": "uuid-123",
      "source_name": "TablooidNews",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

---

## FUTURE IMPROVEMENTS

### Phase 1: Enhanced AI (Months 1-3)

#### 1. **Advanced Summarization**
**Current State**: Extractive (selects existing sentences)
**Improvement**: Abstractive (generates new sentences)

**Implementation Options:**
```
A. Hugging Face Transformers (local)
   - facebook/bart-large-cnn (English)
   - AutoModel with Arabic BERT
   - Hosted on separate worker thread
   - Pro: No API calls, privacy, fast
   - Con: Large model (~500MB), memory intensive

B. OpenAI API (cloud)
   - GPT-4 or GPT-3.5
   - Pro: Best quality, multilingual
   - Con: API costs, rate limits, privacy concerns

C. Open-source local models
   - Llama 2 (via Ollama)
   - Mistral 7B
   - Fine-tuned on news domain
```

**Estimated Implementation:**
```typescript
import { pipeline } from '@xenova/transformers';

const summarizer = await pipeline('summarization', 'Xenova/bart-large-cnn');

const summary = await summarizer(articleText, {
  max_length: 150,
  min_length: 30
});
```

---

#### 2. **Entity Recognition (NER)**
Automatically identify key entities (people, places, organizations)

**Current State**: None

**Improvement**: Extract entities for better contextualization

**Tools:**
- spaCy (Python)
- Hugging Face Transformers (JavaScript/Python)
- NER for Arabic: AraBERT, ARBERT

**Use Cases:**
- Link articles to entity profiles (Egypt, AI Minister, etc.)
- Create entity timelines ("Egypt news in 2024")
- Recommendation: "Other news about Egypt"
- Relationship graphs: "Who's who"

**Example Output:**
```json
{
  "article_id": 1,
  "entities": [
    {
      "text": "Egypt",
      "label": "LOCATION",
      "confidence": 0.95,
      "link": "/entity/egypt"
    },
    {
      "text": "Central Bank",
      "label": "ORGANIZATION",
      "confidence": 0.92,
      "link": "/entity/cbe"
    },
    {
      "text": "Mohamed El-Arian",
      "label": "PERSON",
      "confidence": 0.88,
      "link": "/entity/mohamed-el-arian"
    }
  ]
}
```

---

#### 3. **Sentiment Analysis**
Determine article tone (positive, negative, neutral)

**Current State**: None

**Improvement**: Classify sentiment for ranking + user insights

**Models:**
- Hugging Face distilbert-base-uncased-finetuned-sst-2-english
- AraBERT (Arabic)
- Multilingual BERT

**Use Cases:**
- Show "mixed sentiment" badge for controversial topics
- Option to filter: "Only positive news"
- User mood insights: "Your news is 60% positive today"
- Fact-check: "Articles about this topic are mixed"

**Example:**
```json
{
  "article_id": 1,
  "sentiment": {
    "label": "POSITIVE",
    "score": 0.87
  }
}
```

---

#### 4. **Topic Modeling**
Identify latent topics across articles

**Current State**: Categories (manual, 8 types)

**Improvement**: Auto-discover topics using LDA or neural models

**Tools:**
- Latent Dirichlet Allocation (LDA) - traditional
- BERTopic - modern, embedding-based
- Top2Vec - combined embeddings

**Use Cases:**
- Find sub-topics: "Economy → Interest Rates, Inflation, Trade"
- Trending topics: "AI mentioned in 45 articles this week"
- Topic evolution: Show how topics emerge/decline
- Auto-tagging: "This article is about interest rates + inflation"

**Implementation (BERTopic):**
```python
from bertopic import BERTopic

model = BERTopic(language="english", embedding_model="sentence-transformers/all-MiniLM-L6-v2")
topics, probs = model.fit_transform(documents)

# Result: [45, 32, 12, 45, ...]  (topic ID for each doc)
```

---

### Phase 2: Personalization (Months 4-6)

#### 1. **Collaborative Filtering**
Recommend articles based on similar users' preferences

**Current State**: Content-based (category preferences only)

**Improvement**: User-based or item-based collaborative filtering

**Algorithms:**
- User-user CF: Find similar users, recommend their articles
- Item-item CF: Find articles similar to user's reads
- Hybrid: Combine both

**Data Collection:**
```
Track:
- Articles user clicks
- Time spent on article
- Shares
- Bookmarks/saves
- Ratings (1-5 stars)

Never track:
- Without consent
- Without disclosure
```

**Implementation (Matrix Factorization):**
```python
from surprise import SVD
from surprise import Dataset

# Matrix: users × articles, values = ratings
# SVD decomposes into latent factors
# Predict missing ratings

model = SVD()
model.fit(trainset)
prediction = model.predict(user_id=123, item_id=456)
```

---

#### 2. **Reading Level Analysis**
Adapt content complexity to reader skill

**Current State**: None

**Improvement**: Measure readability, offer "Simple" vs "Detailed" versions

**Metrics:**
- Flesch-Kincaid Grade Level
- Automated Readability Index (ARI)
- SMOG index
- Gunning Fog Index

**Libraries:**
- readability-py
- textstat (Python)
- Natural (JavaScript)

**Use Cases:**
- "Simplify this article for me"
- Filter: "Show me simple explanations"
- Auto-adjust: Learn user preference over time
- Educational: "This article requires 10th grade English"

**Example:**
```
Original: "The Central Bank's quantitative easing policies necessitate...[difficult]"
Simplified: "The Central Bank is printing money to...[easy]"
```

---

#### 3. **Source Reputation Scoring**
Auto-rank sources by accuracy, bias, responsiveness

**Current State**: User-selected (preferences/hidden sources)

**Improvement**: Algorithmic scoring

**Scoring Factors:**
```
- Factuality: How often corrected/retracted?
- Bias: Political/editorial slant analysis
- Speed: Breaking news accuracy rate
- Comprehensiveness: Depth of coverage
- User ratings: 5-star system
- Fact-checker mentions: Verification sources
- Correction rate: How often updated/corrected
```

**Data Sources:**
- Fact-checking orgs (Snopes, PolitiFact, Africa Check)
- Corrections from official sources
- Academic studies on media bias
- User feedback system

**Display:**
```
Source Reputation:
[████████░░] 80/100 (Reliable)
- Factuality: 85%
- Bias: Slight center-right lean
- Speed: Good for breaking news
- Corrections: 2 retractions (2024)
- User Rating: 4.2/5 (250 votes)
```

---

### Phase 3: Advanced Features (Months 7-12)

#### 1. **Multi-language Summarization**
Summarize in language of user's choice

**Current State**: Language selection (UI only, no actual translation)

**Improvement**: Real-time translation + localization

**Tools:**
- Google Translate API
- DeepL (better quality)
- Hugging Face M2M-100 (open-source)
- mBERT for multilingual embeddings

**Implementation:**
```typescript
async function summarizeInLanguage(article: Article, language: string) {
  // 1. Generate summary in original language
  const summary = await generateSummary(article);
  
  // 2. Translate to target language
  const translated = await translate(summary, language);
  
  // 3. Cache result
  cache.set(`summary_${article.id}_${language}`, translated);
  
  return translated;
}
```

---

#### 2. **Real-time Notifications**
Alert users to breaking news

**Current State**: 2-hour refresh cycle

**Improvement**: Real-time push notifications for major stories

**Implementation:**
```
Subscribe to events:
user -> [Breaking News in Politics]

Event stream:
Articles flow from scrapers continuously
Categories updated in real-time
Similarity threshold drops for breaking news

Push notification:
"Breaking: Egypt announces major policy change"
[Read Article]
```

**Tools:**
- Web Push API (browser)
- Firebase Cloud Messaging
- SendGrid/Twilio (SMS/Email fallback)

**Smart Delivery:**
```
- Aggregate similar stories (show 1 notification)
- Time-based quieting (mute 10 PM - 8 AM)
- Category priority (notify faster for user's top categories)
- Importance score (only notify if cluster > 3 sources)
```

---

#### 3. **Fact-Check Integration**
Show fact-checking results alongside articles

**Current State**: None

**Improvement**: Auto-link verified fact-checks

**Data Sources:**
- Snopes
- PolitiFact
- Africa Check (Arab countries)
- FactCheck.org
- APIs from fact-checking orgs

**Display:**
```
Article: "Egypt confirms new economic policy"

Fact Check Status:
🟡 Partially verified (3/5 claims checked)

Claim 1: "New rate cut announced" ✅ Verified
Claim 2: "50% reduction expected" ⚠️ Disputed
Claim 3: "Implementation in January" 📋 Under review

Source: Africa Check, PolitiFact
Links: [Full Report] [Original Sources]
```

---

#### 4. **Newsletter Subscription**
Email digest of personalized news

**Current State**: Web-only

**Improvement**: Automated email newsletters

**Features:**
```
Daily/Weekly/Monthly options
Format: Text + HTML
Content: Top 10 articles + summary
Personalization: Based on preferences
Unsubscribe: 1-click
```

**Implementation:**
```typescript
// Cron job (daily at 7 AM)
async function sendNewsletters() {
  const subscriptions = await getNewsletterSubscriptions();
  
  for (const sub of subscriptions) {
    const articles = await getUserArticles(sub.user_id);
    const topArticles = articles.slice(0, 10);
    const html = generateEmailTemplate(topArticles);
    
    await sendEmail({
      to: sub.user.email,
      subject: `Your Daily News Digest - ${today}`,
      html,
      unsubscribeLink: generateUnsubscribeLink(sub.id)
    });
  }
}
```

---

#### 5. **API for Third-party Integration**
Public API for other platforms to consume

**Current State**: Internal only

**Improvement**: RESTful API with auth

**Endpoints:**
```
GET /api/public/articles
  - Query: category, limit, offset, format
  - Auth: API key required
  - Response: JSON/XML/RSS

GET /api/public/topics
  - Returns trending topics
  - Auth: API key required

POST /api/webhooks
  - Notify external service on new articles
  - Custom filters (categories, keywords, sources)
```

**Rate Limiting:**
```
Free tier: 100 requests/day
Pro tier: 10,000 requests/day
Enterprise: Unlimited
```

---

#### 6. **Mobile Apps**
Native iOS/Android apps

**Current State**: Web only (responsive)

**Improvement**: Native apps with offline mode

**Stack:**
- React Native (code sharing)
- Or: Flutter (better performance)

**Features:**
- Native notifications
- Offline reading
- Offline sync
- Dark mode
- App search
- Share to social media

---

### Phase 4: Enterprise Features (Year 2+)

#### 1. **White-label Solution**
Newsly as a service for organizations

**Use Cases:**
- News portals for media companies
- Internal knowledge aggregation for corporations
- Niche news platforms (finance, tech, health)

**Customization:**
- Branding (logo, colors, fonts)
- Custom categories
- Domain-specific scrapers
- Analytics dashboard

---

#### 2. **Advanced Analytics Dashboard**
Detailed insights for news directors

**Metrics:**
- Article performance (clicks, time, shares)
- Source credibility trends
- Topic emergence patterns
- Reader demographic insights
- Content gap analysis

---

#### 3. **AI-Powered Editorial Assistant**
Help journalists write better articles

**Features:**
- Grammar check (multilingual)
- Bias detection
- Fact-suggestion system
- Readability feedback
- Plagiarism checking
- Image recommendation

---

### Technical Debt & Optimizations

#### 1. **Database Optimization**
```sql
-- Add materialized view for category statistics
CREATE MATERIALIZED VIEW article_stats_by_category AS
SELECT 
  category_id,
  COUNT(*) as total_articles,
  COUNT(DISTINCT cluster_id) as unique_stories,
  AVG(cluster_size) as avg_cluster_size,
  MAX(published_at) as latest_article
FROM articles
GROUP BY category_id;

-- Add full-text search index
CREATE INDEX idx_articles_search ON articles 
USING gin(to_tsvector('english', title || ' ' || description));
```

#### 2. **Caching Strategy**
```
Layer 1: Browser cache (articles, categories)
Layer 2: Redis cache (API responses, user preferences)
Layer 3: CDN cache (static content, images)
Layer 4: Database cache (materialized views)

TTL Strategy:
- Articles: 30 minutes
- Categories: 24 hours
- User preferences: 1 hour
- Rankings: 15 minutes
```

#### 3. **Image Optimization**
```
- Resize to 3 sizes: thumbnail (200px), card (400px), full (1200px)
- Format: WebP with JPEG fallback
- Lazy loading: Use Intersection Observer
- CDN: Cloudinary or similar
- Compression: ImageMagick automation
```

#### 4. **Load Testing**
```bash
# Test with k6
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['<0.1%'],
  },
};

export default function () {
  const res = http.get('https://newsly.app/api/articles');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

#### 5. **Error Tracking**
```
Tool: Sentry or similar
Track:
- API errors
- Scraper failures
- Database issues
- User errors
- Performance degradation

Alerts:
- Scraper down > 2 hours
- Error rate > 1%
- API response time > 1000ms
```

---

## CONCLUSION

Newsly is a sophisticated, production-ready AI news aggregation platform combining:

✅ **Robust Data Collection**: 7 scrapers + generic fallback  
✅ **Intelligent Preprocessing**: Bias reduction, deduplication, normalization  
✅ **Advanced ML**: TF-IDF, cosine similarity, Union-Find clustering  
✅ **Modern Web Stack**: Next.js 16, React 19, TypeScript  
✅ **Secure Backend**: JWT auth, bcrypt hashing, Supabase DB  
✅ **User Personalization**: Category preferences, source filtering  
✅ **Automated Updates**: Vercel Cron every 2 hours  

**Future roadmap** includes advanced summarization, entity recognition, sentiment analysis, collaborative filtering, and mobile apps—positioning Newsly as a comprehensive news intelligence platform.

---

**Document Generated**: January 2024  
**Version**: 1.0  
**Status**: Production Ready
