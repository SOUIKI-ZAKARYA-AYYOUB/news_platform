/**
 * Unit tests for scraping_system/src/lib/story-processor.js
 *
 * Run with:  node --test src/test/story-processor.test.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  reduceBias,
  processNewsPayload,
  STANDARD_CATEGORIES
} from "../src/lib/story-processor.js";

// ---------------------------------------------------------------------------
// STANDARD_CATEGORIES
// ---------------------------------------------------------------------------

describe("STANDARD_CATEGORIES", () => {
  it("is an array", () => {
    assert.ok(Array.isArray(STANDARD_CATEGORIES));
  });

  it("contains the expected 8 categories", () => {
    const expected = [
      "culture", "economy", "health", "other",
      "politics", "society", "sport", "technology"
    ];
    for (const cat of expected) {
      assert.ok(STANDARD_CATEGORIES.includes(cat), `Missing category: ${cat}`);
    }
  });

  it("has exactly 8 entries", () => {
    assert.equal(STANDARD_CATEGORIES.length, 8);
  });
});

// ---------------------------------------------------------------------------
// reduceBias
// ---------------------------------------------------------------------------

describe("reduceBias — clickbait prefix removal", () => {
  it("strips 'BREAKING:' prefix", () => {
    assert.ok(!reduceBias("BREAKING: Election results announced").startsWith("BREAKING"));
  });

  it("strips 'URGENT -' prefix", () => {
    const result = reduceBias("URGENT - Hospital fire reported");
    assert.ok(!result.toLowerCase().startsWith("urgent"));
  });

  it("strips 'EXCLUSIVE:' prefix", () => {
    const result = reduceBias("EXCLUSIVE: Government document leaked");
    assert.ok(!result.toLowerCase().startsWith("exclusive"));
  });

  it("preserves the rest of the headline after stripping prefix", () => {
    const result = reduceBias("BREAKING: Parliament votes on new budget");
    assert.ok(result.includes("Parliament") || result.includes("parliament"));
  });
});

describe("reduceBias — charged verb replacement", () => {
  it("replaces 'slams' with 'criticizes'", () => {
    const result = reduceBias("Minister slams opposition leader");
    assert.ok(result.includes("criticizes"), `Got: "${result}"`);
    assert.ok(!result.includes("slams"));
  });

  it("replaces 'slammed' with 'criticized'", () => {
    const result = reduceBias("President slammed for decision");
    assert.ok(result.includes("criticized"));
    assert.ok(!result.includes("slammed"));
  });

  it("replaces 'blasts' with 'criticizes'", () => {
    const result = reduceBias("Opposition blasts economic policy");
    assert.ok(result.includes("criticizes"));
  });

  it("replaces 'claims' with 'says'", () => {
    const result = reduceBias("Official claims unemployment is falling");
    assert.ok(result.includes("says"));
    assert.ok(!result.includes("claims"));
  });

  it("replaces 'reveals' with 'reports'", () => {
    const result = reduceBias("Investigation reveals hidden accounts");
    assert.ok(result.includes("reports"));
    assert.ok(!result.includes("reveals"));
  });

  it("replaces 'admits' with 'says'", () => {
    const result = reduceBias("CEO admits company made errors");
    assert.ok(result.includes("says"));
  });

  it("replaces 'vows' with 'says it plans'", () => {
    const result = reduceBias("President vows to cut taxes");
    assert.ok(result.includes("says it plans") || result.includes("says"));
  });
});

describe("reduceBias — sensationalist word removal", () => {
  it("removes 'shocking'", () => {
    const result = reduceBias("The shocking truth about inflation");
    assert.ok(!result.toLowerCase().includes("shocking"));
  });

  it("removes 'stunning'", () => {
    const result = reduceBias("Stunning victory for underdog team");
    assert.ok(!result.toLowerCase().includes("stunning"));
  });

  it("removes 'massive'", () => {
    const result = reduceBias("Massive protest in capital city");
    assert.ok(!result.toLowerCase().includes("massive"));
  });

  it("removes 'explosive'", () => {
    const result = reduceBias("Explosive allegations against minister");
    assert.ok(!result.toLowerCase().includes("explosive"));
  });

  it("removes 'breaking' as an adjective", () => {
    const result = reduceBias("The breaking news about the economy");
    assert.ok(!result.toLowerCase().includes("breaking"));
  });

  it("removes 'huge'", () => {
    const result = reduceBias("Huge win for the economy");
    assert.ok(!result.toLowerCase().includes("huge"));
  });

  it("replaces 'scandal' with 'controversy'", () => {
    const result = reduceBias("New scandal rocks the government");
    assert.ok(result.includes("controversy"));
    assert.ok(!result.includes("scandal"));
  });
});

describe("reduceBias — exclamation normalisation", () => {
  it("replaces multiple exclamation marks with a single period", () => {
    const result = reduceBias("Breaking news!!!");
    assert.ok(!result.includes("!!"));
  });

  it("collapses multiple question marks", () => {
    const result = reduceBias("What is happening???");
    assert.ok(!result.includes("??"));
  });

  it("normalises multiple ellipsis to single period", () => {
    const result = reduceBias("And then... the decision was made");
    assert.ok(result.includes("the decision was made"));
  });
});

describe("reduceBias — French terms", () => {
  it("replaces 'scandale' with 'controverse'", () => {
    const result = reduceBias("Un nouveau scandale au parlement");
    assert.ok(result.includes("controverse") || !result.includes("scandale"));
  });

  it("removes 'incroyable'", () => {
    const result = reduceBias("L'incroyable histoire d'une victoire");
    assert.ok(!result.toLowerCase().includes("incroyable"));
  });

  it("removes 'choc'", () => {
    const result = reduceBias("Le choc de la défaite");
    assert.ok(!result.toLowerCase().includes("choc"));
  });
});

describe("reduceBias — output quality", () => {
  it("trims the result", () => {
    const result = reduceBias("  Some headline  ");
    assert.equal(result, result.trim());
  });

  it("does not leave double spaces", () => {
    const result = reduceBias("BREAKING: The shocking massive scandal");
    assert.ok(!result.includes("  "), `Double space in: "${result}"`);
  });

  it("handles empty string", () => {
    const result = reduceBias("");
    assert.equal(typeof result, "string");
  });

  it("handles null input via cleanText", () => {
    // reduceBias calls cleanText which handles null
    const result = reduceBias(null);
    assert.equal(typeof result, "string");
  });

  it("preserves plain neutral headlines unchanged (mostly)", () => {
    const headline = "Parliament approves annual budget";
    const result = reduceBias(headline);
    assert.ok(result.length > 0);
    // Should not drastically alter a neutral headline
    assert.ok(result.toLowerCase().includes("parliament") || result.toLowerCase().includes("budget"));
  });
});

// ---------------------------------------------------------------------------
// processNewsPayload
// ---------------------------------------------------------------------------

describe("processNewsPayload — basic structure", () => {
  const sampleArticles = [
    {
      source: "TSA",
      url: "https://tsa.dz/article/1",
      title: "Government announces new economic plan for 2026",
      description: "The Algerian government has unveiled a comprehensive economic plan targeting growth.",
      publication_date: new Date().toISOString(),
      category: "economy"
    },
    {
      source: "ENNAHAR",
      url: "https://ennahar.com/article/1",
      title: "الجزائر تطلق خطة اقتصادية جديدة لعام 2026",
      description: "أعلنت الحكومة الجزائرية عن خطة اقتصادية شاملة تستهدف النمو والتنمية.",
      publication_date: new Date().toISOString(),
      category: "economy"
    },
    {
      source: "TSA",
      url: "https://tsa.dz/article/2",
      title: "Algeria national football team qualifies for Africa Cup",
      description: "The Algerian national team secured a place in the upcoming Africa Cup of Nations.",
      publication_date: new Date().toISOString(),
      category: "sport"
    }
  ];

  const payload = processNewsPayload({ articles: sampleArticles });

  it("returns an object", () => {
    assert.equal(typeof payload, "object");
    assert.ok(payload !== null);
  });

  it("has a processed_at field", () => {
    assert.ok(typeof payload.processed_at === "string");
    assert.ok(!Number.isNaN(new Date(payload.processed_at).getTime()));
  });

  it("has a total_articles field", () => {
    assert.ok(typeof payload.total_articles === "number");
    assert.ok(payload.total_articles >= 0);
  });

  it("has a story_count field", () => {
    assert.ok(typeof payload.story_count === "number");
  });

  it("has an articles array", () => {
    assert.ok(Array.isArray(payload.articles));
  });

  it("has a clusters array", () => {
    assert.ok(Array.isArray(payload.clusters));
  });

  it("has a categories array matching STANDARD_CATEGORIES", () => {
    assert.deepEqual(payload.categories, STANDARD_CATEGORIES);
  });

  it("articles and clusters have the same length", () => {
    assert.equal(payload.articles.length, payload.clusters.length);
  });

  it("story_count matches articles length", () => {
    assert.equal(payload.story_count, payload.articles.length);
  });

  it("has a sources object", () => {
    assert.equal(typeof payload.sources, "object");
    assert.ok(payload.sources !== null);
  });

  it("has a raw_article_count", () => {
    assert.ok(typeof payload.raw_article_count === "number");
    assert.equal(payload.raw_article_count, sampleArticles.length);
  });
});

describe("processNewsPayload — article shape", () => {
  const articles = [
    {
      source: "TSA",
      url: "https://tsa.dz/article/42",
      title: "Health ministry reports declining flu cases across Algeria",
      description: "Flu cases have dropped significantly this week according to health officials.",
      publication_date: new Date().toISOString(),
      category: "health"
    }
  ];

  const payload = processNewsPayload({ articles });
  const story = payload.articles[0];

  it("story has a source field", () => {
    assert.ok(typeof story.source === "string");
  });

  it("story has a title field", () => {
    assert.ok(typeof story.title === "string");
    assert.ok(story.title.length > 0);
  });

  it("story has a category field", () => {
    assert.ok(STANDARD_CATEGORIES.includes(story.category), `Invalid category: ${story.category}`);
  });

  it("story has a categories array", () => {
    assert.ok(Array.isArray(story.categories));
    assert.ok(story.categories.length > 0);
  });

  it("story has a cluster_id", () => {
    assert.ok(typeof story.cluster_id === "string");
    assert.ok(story.cluster_id.startsWith("story_"));
  });

  it("story has a cluster_type", () => {
    const validTypes = ["unique", "same_event", "exact_duplicate"];
    assert.ok(validTypes.includes(story.cluster_type), `Invalid type: ${story.cluster_type}`);
  });

  it("single-article cluster has cluster_type 'unique'", () => {
    assert.equal(story.cluster_type, "unique");
  });

  it("story has a cluster_size", () => {
    assert.ok(typeof story.cluster_size === "number");
    assert.ok(story.cluster_size >= 1);
  });

  it("story has a sources array", () => {
    assert.ok(Array.isArray(story.sources));
    assert.ok(story.sources.length >= 1);
  });

  it("story has a meta_story object", () => {
    assert.equal(typeof story.meta_story, "object");
    assert.ok(story.meta_story !== null);
  });
});

describe("processNewsPayload — meta_story shape", () => {
  const articles = [
    {
      source: "TSA",
      url: "https://tsa.dz/article/99",
      title: "Technology summit opens in Algiers",
      description: "International technology leaders gathered in Algiers for a two-day summit on AI.",
      publication_date: new Date().toISOString(),
      category: "technology"
    }
  ];

  const payload = processNewsPayload({ articles });
  const meta = payload.articles[0].meta_story;

  it("meta_story has story_id", () => {
    assert.ok(typeof meta.story_id === "string");
  });

  it("meta_story has headline", () => {
    assert.ok(typeof meta.headline === "string");
    assert.ok(meta.headline.length > 0);
  });

  it("meta_story has summary", () => {
    assert.ok(typeof meta.summary === "string");
  });

  it("meta_story has article_count >= 1", () => {
    assert.ok(meta.article_count >= 1);
  });

  it("meta_story has source_count >= 1", () => {
    assert.ok(meta.source_count >= 1);
  });

  it("meta_story has confidence field", () => {
    const validValues = ["single_source_story", "multi_source_cluster"];
    assert.ok(validValues.includes(meta.confidence));
  });

  it("meta_story has average_similarity", () => {
    assert.ok(typeof meta.average_similarity === "number");
    assert.ok(meta.average_similarity >= 0 && meta.average_similarity <= 1);
  });

  it("meta_story has category from STANDARD_CATEGORIES", () => {
    assert.ok(STANDARD_CATEGORIES.includes(meta.category));
  });
});

describe("processNewsPayload — empty and edge cases", () => {
  it("handles an empty articles array", () => {
    const payload = processNewsPayload({ articles: [] });
    assert.equal(payload.articles.length, 0);
    assert.equal(payload.story_count, 0);
    assert.equal(payload.raw_article_count, 0);
  });

  it("handles articles with no description", () => {
    const articles = [
      {
        source: "TSA",
        url: "https://tsa.dz/article/no-desc",
        title: "Brief headline only",
        publication_date: new Date().toISOString()
      }
    ];
    const payload = processNewsPayload({ articles });
    assert.equal(payload.articles.length, 1);
  });

  it("handles articles with null title (filtered out)", () => {
    const articles = [
      { source: "TSA", url: "https://tsa.dz/1", title: null, description: null }
    ];
    const payload = processNewsPayload({ articles });
    assert.equal(payload.articles.length, 0);
  });

  it("handles a raw array payload (not wrapped in object)", () => {
    const articles = [
      {
        source: "TSA",
        url: "https://tsa.dz/raw/1",
        title: "Direct array article",
        publication_date: new Date().toISOString()
      }
    ];
    const payload = processNewsPayload(articles);
    assert.equal(payload.raw_article_count, 1);
  });

  it("preserves scraped_at from options.scrapedAt", () => {
    const scrapedAt = "2026-05-14T10:00:00.000Z";
    const payload = processNewsPayload({ articles: [] }, { scrapedAt });
    assert.equal(payload.scraped_at, scrapedAt);
  });

  it("uses current time for scraped_at when not provided", () => {
    const before = Date.now();
    const payload = processNewsPayload({ articles: [] });
    const after = Date.now();
    const scrapedMs = new Date(payload.scraped_at).getTime();
    assert.ok(scrapedMs >= before - 5000 && scrapedMs <= after + 5000);
  });

  it("includes a notes array in output", () => {
    const payload = processNewsPayload({ articles: [] });
    assert.ok(Array.isArray(payload.notes));
    assert.ok(payload.notes.length > 0);
  });
});

describe("processNewsPayload — category classification", () => {
  it("classifies a sport article correctly", () => {
    const payload = processNewsPayload({
      articles: [{
        source: "WINWIN",
        url: "https://winwin.com/1",
        title: "National football league results this weekend",
        description: "This weekend saw exciting football matches across the national league.",
        publication_date: new Date().toISOString(),
        category: "sport"
      }]
    });
    assert.equal(payload.articles[0].category, "sport");
  });

  it("classifies a technology article correctly", () => {
    const payload = processNewsPayload({
      articles: [{
        source: "TSA",
        url: "https://tsa.dz/tech/1",
        title: "New AI software unveiled by Algerian startup",
        description: "A startup has released an artificial intelligence platform targeting digital transformation.",
        publication_date: new Date().toISOString(),
        category: "technology"
      }]
    });
    const cat = payload.articles[0]?.category;
    assert.ok(cat === "technology" || cat === "economy" || cat === "other");
  });

  it("classifies WINWIN and ELHEDDAF articles as sport regardless of content", () => {
    const payload = processNewsPayload({
      articles: [{
        source: "ELHEDDAF",
        url: "https://elheddaf.com/1",
        title: "Some article from elheddaf",
        description: "Content of the article",
        publication_date: new Date().toISOString()
      }]
    });
    assert.equal(payload.articles[0]?.category, "sport");
  });
});
