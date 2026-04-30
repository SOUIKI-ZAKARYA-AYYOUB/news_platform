const STANDARD_CATEGORIES = [
  "culture",
  "economy",
  "health",
  "other",
  "politics",
  "society",
  "sport",
  "technology"
];

const SPORTS_SOURCES = new Set(["WINWIN", "ELHEDDAF"]);

const CATEGORY_RULES = [
  {
    key: "sport",
    terms: [
      "sport",
      "sports",
      "football",
      "soccer",
      "basketball",
      "motorsport",
      "champions",
      "league",
      "match",
      "team",
      "\u0631\u064a\u0627\u0636\u0629",
      "\u0631\u064a\u0627\u0636\u064a",
      "\u0643\u0631\u0629",
      "\u0628\u0637\u0648\u0644\u0629",
      "\u0645\u0628\u0627\u0631\u0627\u0629"
    ]
  },
  {
    key: "politics",
    terms: [
      "politic",
      "politics",
      "politique",
      "government",
      "election",
      "presidence",
      "parliament",
      "diplomacy",
      "international",
      "monde",
      "\u0633\u064a\u0627\u0633\u0629",
      "\u062d\u0643\u0648\u0645\u0629",
      "\u0631\u0626\u0627\u0633\u0629",
      "\u0627\u0646\u062a\u062e\u0627\u0628"
    ]
  },
  {
    key: "economy",
    terms: [
      "economy",
      "economic",
      "economie",
      "commerce",
      "business",
      "market",
      "finance",
      "bank",
      "industry",
      "energy",
      "mines",
      "\u0627\u0642\u062a\u0635\u0627\u062f",
      "\u0645\u0627\u0644",
      "\u0628\u0646\u0643",
      "\u062a\u062c\u0627\u0631\u0629",
      "\u0635\u0646\u0627\u0639\u0629"
    ]
  },
  {
    key: "health",
    terms: [
      "health",
      "medical",
      "medicine",
      "hospital",
      "sante",
      "environnement",
      "environment",
      "climate",
      "\u0635\u062d\u0629",
      "\u0637\u0628",
      "\u0645\u0633\u062a\u0634\u0641\u0649",
      "\u0628\u064a\u0626\u0629"
    ]
  },
  {
    key: "technology",
    terms: [
      "technology",
      "technologie",
      "tech",
      "digital",
      "software",
      "internet",
      "cyber",
      "ai",
      "education technologie",
      "\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627",
      "\u062a\u0642\u0646\u064a\u0629",
      "\u0630\u0643\u0627\u0621"
    ]
  },
  {
    key: "culture",
    terms: [
      "culture",
      "arts",
      "art",
      "music",
      "cinema",
      "entertainment",
      "\u062b\u0642\u0627\u0641\u0629",
      "\u0641\u0646",
      "\u0633\u064a\u0646\u0645\u0627"
    ]
  },
  {
    key: "society",
    terms: [
      "society",
      "societe",
      "national",
      "actualite nationale",
      "algerie",
      "education",
      "development",
      "local",
      "\u0627\u0644\u0648\u0637\u0646\u064a",
      "\u0627\u0644\u062c\u0632\u0627\u0626\u0631",
      "\u0645\u062c\u062a\u0645\u0639",
      "\u062a\u0639\u0644\u064a\u0645",
      "\u062a\u0646\u0645\u064a\u0629"
    ]
  }
];

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "after",
  "about",
  "over",
  "under",
  "not",
  "new",
  "news",
  "le",
  "la",
  "les",
  "des",
  "du",
  "de",
  "dans",
  "sur",
  "avec",
  "pour",
  "par",
  "une",
  "un",
  "en",
  "et",
  "au",
  "aux",
  "\u0641\u064a",
  "\u0645\u0646",
  "\u0639\u0644\u0649",
  "\u0627\u0644\u0649",
  "\u0625\u0644\u0649",
  "\u0639\u0646",
  "\u0645\u0639",
  "\u0647\u0630\u0627",
  "\u0647\u0630\u0647",
  "\u0627\u0644\u062a\u064a",
  "\u0627\u0644\u0630\u064a",
  "\u0628\u0639\u062f",
  "\u0642\u0628\u0644"
]);

const CHARGED_REPLACEMENTS = [
  [/\bslams?\b/gi, "criticizes"],
  [/\bslammed\b/gi, "criticized"],
  [/\bblasts?\b/gi, "criticizes"],
  [/\bblasted\b/gi, "criticized"],
  [/\battacks?\b/gi, "criticizes"],
  [/\battacked\b/gi, "criticized"],
  [/\bclaims?\b/gi, "says"],
  [/\bclaimed\b/gi, "said"],
  [/\breveals?\b/gi, "reports"],
  [/\brevealed\b/gi, "reported"],
  [/\bexposes?\b/gi, "reports"],
  [/\bexposed\b/gi, "reported"],
  [/\badmits?\b/gi, "says"],
  [/\badmitted\b/gi, "said"],
  [/\bvows?\b/gi, "says it plans"],
  [/\bsparks outrage\b/gi, "draws reactions"],
  [/\boutrage\b/gi, "reactions"],
  [/\bshocking\b/gi, ""],
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
  [/\bscandal\b/gi, "controversy"],
  [/\bcatastrophe\b/gi, "serious incident"],
  [/\bincroyable\b/gi, ""],
  [/\bscandale\b/gi, "controverse"],
  [/\bpolemique\b/gi, "debat"],
  [/\bchoc\b/gi, ""],
  [/\balerte\b/gi, ""],
  [/\burgent\b/gi, ""],
  [new RegExp("\\u0639\\u0627\\u062c\\u0644", "g"), ""],
  [new RegExp("\\u0635\\u0627\\u062f\\u0645", "g"), ""],
  [new RegExp("\\u0641\\u0636\\u064a\\u062d\\u0629", "g"), "\u062c\u062f\u0644"],
  [new RegExp("\\u0643\\u0627\\u0631\\u062b\\u0629", "g"), "\u062d\u0627\u062f\u062b"]
];

function stripHtml(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    );
}

function removeFeedBoilerplate(value) {
  return String(value)
    .replace(/\s*The post\s+.+?\s+appeared first on\s+.+?\.?\s*$/i, "")
    .replace(/\s*The post\s+.+?\s+appeared first on\s+[^.]+\.?/gi, " ")
    .replace(
      new RegExp(
        "\\s*\\u0638\\u0647\\u0631\\u062a\\s+\\u0627\\u0644\\u0645\\u0642\\u0627\\u0644\\u0629\\s+.+?\\s+\\u0623\\u0648\\u0644\\u0627\\s+\\u0639\\u0644\\u0649\\s+.+?\\.?\\s*$",
        "u"
      ),
      ""
    )
    .replace(
      new RegExp(
        "\\s*\\u0638\\u0647\\u0631\\u062a\\s+\\u0627\\u0644\\u0645\\u0642\\u0627\\u0644\\u0629\\s+.+?\\s+\\u0623\\u0648\\u0644\\S*\\s+\\u0639\\u0644\\u0649\\s+[^.]+\\.?",
        "gu"
      ),
      " "
    );
}

function textScore(value) {
  const text = String(value);
  const mojibakeMarkers = (text.match(/[\u00c3\u00c2\u00d8\u00d9\ufffd]/g) ?? []).length;
  const arabicLetters = (text.match(/[\u0600-\u06ff]/g) ?? []).length;
  const latinExtended = (text.match(/[\u00c0-\u017f]/g) ?? []).length;

  return arabicLetters * 2 + latinExtended - mojibakeMarkers * 3;
}

function repairMojibake(value) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  if (!/[\u00c3\u00c2\u00d8\u00d9\ufffd]/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return textScore(repaired) > textScore(value) ? repaired : value;
  } catch {
    return value;
  }
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const repaired = repairMojibake(String(value));
  const cleaned = removeFeedBoilerplate(decodeHtmlEntities(stripHtml(repaired)))
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function normalizeForMatching(value) {
  return (cleanText(value) ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractRawCategories(article) {
  const values = [];

  for (const field of ["categories", "category", "raw_category"]) {
    const value = article[field];

    if (Array.isArray(value)) {
      values.push(...value);
      continue;
    }

    if (typeof value === "string") {
      values.push(
        ...value
          .replace(/[;|]/g, ",")
          .split(",")
          .map((part) => part.trim())
      );
    }
  }

  return unique(values.map(cleanText));
}

function matchRuleScore(text, rule) {
  let score = 0;

  for (const term of rule.terms) {
    const normalizedTerm = normalizeForMatching(term);
    if (!normalizedTerm) {
      continue;
    }

    if (text.includes(normalizedTerm)) {
      score += normalizedTerm.includes(" ") ? 2 : 1;
    }
  }

  return score;
}

function classifyCategory(rawCategory, article = {}) {
  const source = (article.source ?? "").toUpperCase();
  if (SPORTS_SOURCES.has(source)) {
    return "sport";
  }

  const combined = normalizeForMatching(
    [
      rawCategory,
      article.title,
      article.description,
      article.content,
      article.source
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!combined) {
    return "other";
  }

  let bestKey = "other";
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    const score = matchRuleScore(combined, rule);
    if (score > bestScore) {
      bestKey = rule.key;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestKey : "other";
}

function extractStandardCategories(article) {
  const rawCategories = extractRawCategories(article);
  const categories = rawCategories.map((category) => classifyCategory(category, article));

  if (categories.length === 0) {
    categories.push(classifyCategory(null, article));
  }

  const deduped = unique(categories);
  const meaningful = deduped.filter((category) => category !== "other");
  return meaningful.length > 0 ? meaningful : ["other"];
}

function articleDateValue(article) {
  const value = article.publication_date ?? article.published_at ?? article.date ?? null;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function choosePrimaryCategory(categories) {
  for (const category of STANDARD_CATEGORIES) {
    if (category !== "other" && categories.includes(category)) {
      return category;
    }
  }

  return categories[0] ?? "other";
}

function prepareArticles(rawArticles) {
  return rawArticles
    .map((article, index) => {
      if (!article || typeof article !== "object") {
        return null;
      }

      const cleaned = {
        ...article,
        source: cleanText(article.source) ?? "UNKNOWN",
        url: cleanText(article.url ?? article.source_url),
        title: cleanText(article.title),
        description: cleanText(article.description),
        content: cleanText(article.content),
        image_url: cleanText(article.image_url),
        publication_date: cleanText(article.publication_date ?? article.published_at),
        original_category: extractRawCategories(article)
      };

      if (!cleaned.title && !cleaned.description) {
        return null;
      }

      const categories = extractStandardCategories(cleaned);
      cleaned.categories = categories;
      cleaned.category = choosePrimaryCategory(categories);
      cleaned._original_index = index;
      cleaned._date_value = articleDateValue(cleaned);

      return cleaned;
    })
    .filter(Boolean);
}

function tokenize(value) {
  const normalized = normalizeForMatching(value);
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];

  return tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function tokenCounts(value) {
  const counts = new Map();

  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

function articleSemanticText(article) {
  return [article.title, article.description, article.content].filter(Boolean).join(" ");
}

function buildWeightedVectors(articles) {
  const rawCounts = articles.map((article) => tokenCounts(articleSemanticText(article)));
  const documentFrequency = new Map();

  for (const counts of rawCounts) {
    for (const token of counts.keys()) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const totalDocs = Math.max(articles.length, 1);

  return rawCounts.map((counts) => {
    const vector = new Map();

    for (const [token, count] of counts.entries()) {
      const df = documentFrequency.get(token) ?? 1;
      const idf = Math.log((1 + totalDocs) / (1 + df)) + 1;
      vector.set(token, count * idf);
    }

    return vector;
  });
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const value of left.values()) {
    leftNorm += value * value;
  }

  for (const value of right.values()) {
    rightNorm += value * value;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  const [small, large] = left.size < right.size ? [left, right] : [right, left];
  for (const [token, value] of small.entries()) {
    dot += value * (large.get(token) ?? 0);
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function jaccardSimilarity(leftTokens, rightTokens) {
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  const [small, large] = leftTokens.size < rightTokens.size
    ? [leftTokens, rightTokens]
    : [rightTokens, leftTokens];

  for (const token of small) {
    if (large.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

function buildUnionFind(size) {
  const parent = Array.from({ length: size }, (_, index) => index);
  const rank = Array.from({ length: size }, () => 0);

  function find(value) {
    let current = value;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);

    if (leftRoot === rightRoot) {
      return;
    }

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

function clusterArticles(articles, vectors) {
  const { find, union } = buildUnionFind(articles.length);
  const urlToIndex = new Map();
  const titleToIndex = new Map();
  const categoryGroups = new Map();
  const titleTokens = articles.map((article) => new Set(tokenize(article.title)));

  articles.forEach((article, index) => {
    if (article.url) {
      const urlKey = normalizeForMatching(article.url);
      if (urlToIndex.has(urlKey)) {
        union(index, urlToIndex.get(urlKey));
      } else {
        urlToIndex.set(urlKey, index);
      }
    }

    const titleKey = normalizeForMatching(article.title);
    if (titleKey) {
      if (titleToIndex.has(titleKey)) {
        union(index, titleToIndex.get(titleKey));
      } else {
        titleToIndex.set(titleKey, index);
      }
    }

    for (const category of article.categories) {
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category).push(index);
    }
  });

  for (const indices of categoryGroups.values()) {
    for (let left = 0; left < indices.length; left += 1) {
      for (let right = left + 1; right < indices.length; right += 1) {
        const leftIndex = indices[left];
        const rightIndex = indices[right];
        const textScore = cosineSimilarity(vectors[leftIndex], vectors[rightIndex]);
        const titleScore = jaccardSimilarity(titleTokens[leftIndex], titleTokens[rightIndex]);
        const combinedScore = textScore * 0.75 + titleScore * 0.25;

        if (
          combinedScore >= 0.68 ||
          (combinedScore >= 0.58 && titleScore >= 0.45) ||
          (textScore >= 0.74 && titleScore >= 0.25)
        ) {
          union(leftIndex, rightIndex);
        }
      }
    }
  }

  const clustersByRoot = new Map();
  articles.forEach((_, index) => {
    const root = find(index);
    if (!clustersByRoot.has(root)) {
      clustersByRoot.set(root, []);
    }
    clustersByRoot.get(root).push(index);
  });

  return [...clustersByRoot.values()];
}

function splitSentences(value) {
  const text = cleanText(value);
  if (!text) {
    return [];
  }

  return text
    .replace(/([.!?\u061f\u061b])\s+/gu, "$1\n")
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30);
}

export function reduceBias(value) {
  let text = cleanText(value) ?? "";

  text = text
    .replace(/^\s*(breaking|urgent|exclusive|live)\s*[:|-]\s*/gi, "")
    .replace(/\s*[!]+/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/\.\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of CHARGED_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function rewriteHeadline(article, clusterArticlesForStory) {
  const candidates = [
    article.title,
    ...clusterArticlesForStory.map((entry) => entry.title)
  ]
    .map(reduceBias)
    .filter(Boolean)
    .sort((left, right) => {
      const leftLength = left.length;
      const rightLength = right.length;
      const leftScore = leftLength >= 35 && leftLength <= 140 ? 1 : 0;
      const rightScore = rightLength >= 35 && rightLength <= 140 ? 1 : 0;
      return rightScore - leftScore || leftLength - rightLength;
    });

  let headline = candidates[0] ?? "News update";
  headline = headline.replace(/\s*[-|]\s*(watch|video|photos?)\s*$/gi, "").trim();

  if (headline.length > 160) {
    const shortened = headline.slice(0, 157).replace(/\s+\S*$/, "");
    headline = `${shortened}...`;
  }

  return headline;
}

function sentenceScore(sentence, frequency) {
  const tokens = tokenize(sentence);

  if (tokens.length === 0) {
    return 0;
  }

  const score = tokens.reduce((total, token) => total + (frequency.get(token) ?? 0), 0);
  return score / Math.sqrt(tokens.length + 4);
}

function buildFrequency(articles) {
  const frequency = new Map();

  for (const article of articles) {
    for (const token of tokenize(articleSemanticText(article))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  return frequency;
}

function generateSummary(articles, headline) {
  const frequency = buildFrequency(articles);
  const sentences = [];

  for (const article of articles) {
    sentences.push(...splitSentences(article.description));
    sentences.push(...splitSentences(article.content));
  }

  if (sentences.length === 0) {
    sentences.push(...articles.map((article) => article.title).filter(Boolean));
  }

  const seen = new Set();
  const ranked = sentences
    .map(reduceBias)
    .filter(Boolean)
    .filter((sentence) => {
      const key = normalizeForMatching(sentence);
      if (!key || key === normalizeForMatching(headline) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((sentence, order) => ({
      sentence,
      score: sentenceScore(sentence, frequency) - order * 0.01
    }))
    .sort((left, right) => right.score - left.score);

  const selected = [];
  let totalLength = 0;

  for (const candidate of ranked) {
    if (selected.length >= 3) {
      break;
    }

    const nextLength = totalLength + candidate.sentence.length;
    if (selected.length > 0 && nextLength > 720) {
      continue;
    }

    selected.push(candidate.sentence);
    totalLength = nextLength;
  }

  if (selected.length === 0) {
    selected.push(reduceBias(headline));
  }

  return selected
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function selectRepresentative(articles) {
  return [...articles].sort((left, right) => {
    const rightScore =
      (right.image_url ? 2 : 0) +
      (right.description ? 1 : 0) +
      Math.min((right.description ?? "").length / 500, 1) +
      right._date_value / 10_000_000_000_000;
    const leftScore =
      (left.image_url ? 2 : 0) +
      (left.description ? 1 : 0) +
      Math.min((left.description ?? "").length / 500, 1) +
      left._date_value / 10_000_000_000_000;

    return rightScore - leftScore;
  })[0];
}

function sourceRecords(articles) {
  const seen = new Set();
  const records = [];

  for (const article of [...articles].sort((left, right) => right._date_value - left._date_value)) {
    const key = article.url || `${article.source}:${article.title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    records.push({
      source: article.source ?? "UNKNOWN",
      title: article.title ?? null,
      url: article.url ?? null,
      published_at: article.publication_date ?? null,
      category: article.category
    });
  }

  return records;
}

function clusterAverageSimilarity(indices, vectors) {
  if (indices.length < 2) {
    return 1;
  }

  let total = 0;
  let pairs = 0;

  for (let left = 0; left < indices.length; left += 1) {
    for (let right = left + 1; right < indices.length; right += 1) {
      total += cosineSimilarity(vectors[indices[left]], vectors[indices[right]]);
      pairs += 1;
    }
  }

  return pairs > 0 ? total / pairs : 0;
}

function buildMetaStory({ storyId, headline, summary, categories, articles, sources, avgSimilarity }) {
  const dates = articles
    .map((article) => article.publication_date)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  const firstDate = dates[0] ?? null;
  const latestDate = dates[dates.length - 1] ?? null;

  return {
    story_id: storyId,
    headline,
    summary,
    category: choosePrimaryCategory(categories),
    categories,
    article_count: articles.length,
    source_count: unique(sources.map((source) => source.source)).length,
    sources: sources.map((source) => source.source),
    first_published_at: firstDate ? firstDate.toISOString() : null,
    latest_published_at: latestDate ? latestDate.toISOString() : null,
    confidence: articles.length > 1 ? "multi_source_cluster" : "single_source_story",
    average_similarity: Number(avgSimilarity.toFixed(4))
  };
}

function buildStory(cluster, articles, vectors, clusterIndex) {
  const clusterArticlesForStory = cluster
    .map((index) => articles[index])
    .sort((left, right) => right._date_value - left._date_value);
  const representative = selectRepresentative(clusterArticlesForStory);
  const categories = unique(clusterArticlesForStory.flatMap((article) => safeArray(article.categories)));
  const primaryCategory = choosePrimaryCategory(categories);
  const storyId = `story_${String(clusterIndex + 1).padStart(4, "0")}`;
  const avgSimilarity = clusterAverageSimilarity(cluster, vectors);
  const clusterType =
    cluster.length === 1
      ? "unique"
      : avgSimilarity >= 0.92
        ? "exact_duplicate"
        : "same_event";
  const sources = sourceRecords(clusterArticlesForStory);
  const neutralHeadline = rewriteHeadline(representative, clusterArticlesForStory);
  const summary = generateSummary(clusterArticlesForStory, neutralHeadline);
  const metaStory = buildMetaStory({
    storyId,
    headline: neutralHeadline,
    summary,
    categories,
    articles: clusterArticlesForStory,
    sources,
    avgSimilarity
  });

  return {
    source: representative.source,
    url: representative.url,
    title: neutralHeadline,
    original_title: representative.title,
    description: summary,
    content: summary,
    summary,
    bias_reduced_summary: summary,
    neutral_headline: neutralHeadline,
    image_url: representative.image_url ?? null,
    publication_date: metaStory.latest_published_at ?? representative.publication_date ?? null,
    category: primaryCategory,
    categories,
    original_categories: unique(clusterArticlesForStory.flatMap((article) => article.original_category ?? [])),
    cluster_id: storyId,
    story_id: storyId,
    cluster_type: clusterType,
    cluster_size: cluster.length,
    source_count: metaStory.source_count,
    sources,
    meta_story: metaStory,
    meta_story_text: `${neutralHeadline} - ${summary}`
  };
}

function extractArticlesFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    for (const key of ["articles", "news", "items", "data"]) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
  }

  return [];
}

function countBySource(articles) {
  return articles.reduce((counts, article) => {
    const source = (article.source ?? "UNKNOWN").toUpperCase();
    counts[source] = (counts[source] ?? 0) + 1;
    return counts;
  }, {});
}

export function processNewsPayload(payload, options = {}) {
  const rawArticles = extractArticlesFromPayload(payload);
  const preparedArticles = prepareArticles(rawArticles);
  const vectors = buildWeightedVectors(preparedArticles);
  const clusters = clusterArticles(preparedArticles, vectors);
  const stories = clusters
    .map((cluster, index) => buildStory(cluster, preparedArticles, vectors, index))
    .sort((left, right) => articleDateValue(right) - articleDateValue(left));

  const basePayload = payload && typeof payload === "object" && !Array.isArray(payload)
    ? { ...payload }
    : {};

  return {
    ...basePayload,
    scraped_at: basePayload.scraped_at ?? options.scrapedAt ?? new Date().toISOString(),
    processed_at: new Date().toISOString(),
    raw_article_count: rawArticles.length,
    total_articles: stories.length,
    story_count: stories.length,
    sources: countBySource(preparedArticles),
    categories: STANDARD_CATEGORIES,
    notes: [
      ...safeArray(basePayload.notes),
      "Story processor normalized categories, clustered same-event articles, generated neutral headlines, summaries, bias-reduced text, and meta stories."
    ],
    articles: stories,
    clusters: stories.map((story) => story.meta_story)
  };
}

export { STANDARD_CATEGORIES };
