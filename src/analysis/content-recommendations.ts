/**
 * Content Recommendations Engine.
 *
 * A meta-tool that cross-references quick wins, content gaps, and cannibalization
 * to generate prioritized optimization recommendations.
 */

import { queryAnalytics } from '../google/tools/analytics.js';
import { benchmarkCtr } from './ctr-benchmarks.js';

export interface Recommendation {
  priority: number;
  action: 'update' | 'create' | 'consolidate';
  targetPage?: string;
  targetKeyword?: string;
  secondaryPages?: string[];
  estimatedOpportunity: number;
  reasoning: string;
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  summary: {
    update: number;
    create: number;
    consolidate: number;
    totalOpportunity: number;
  };
}

interface QuickWinResult {
  query: string;
  position: number;
  impressions: number;
  ctr: number;
  opportunity: number;
}

interface CannibalizationResult {
  query: string;
  pages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
  totalImpressions: number;
}

async function findQuickWinsForRecs(siteUrl: string, days: number): Promise<QuickWinResult[]> {
  const now = new Date();
  now.setDate(now.getDate() - 3);
  const endDate = now.toISOString().split('T')[0];
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - days + 1);
  const startDate = startDateObj.toISOString().split('T')[0];

  const rows = await queryAnalytics({
    siteUrl,
    startDate,
    endDate,
    dimensions: ['query'],
    limit: 5000,
    dataState: 'all',
  });

  return rows
    .filter(r => {
      const pos = r.position ?? 0;
      const imp = r.impressions ?? 0;
      return pos >= 4 && pos <= 15 && imp >= 100;
    })
    .map(r => {
      const position = r.position ?? 10;
      const impressions = r.impressions ?? 0;
      const ctr = r.ctr ?? 0;
      const targetCtr = 0.110; // position 3 benchmark
      const opportunity = Math.round(impressions * Math.max(0, targetCtr - ctr));
      return {
        query: r.keys?.[0] ?? '',
        position,
        impressions,
        ctr,
        opportunity,
      };
    })
    .filter(w => w.opportunity > 0)
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, 50);
}

async function findContentGaps(siteUrl: string): Promise<Array<{ query: string; impressions: number; position: number }>> {
  const now = new Date();
  now.setDate(now.getDate() - 3);
  const endDate = now.toISOString().split('T')[0];
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - 89); // 90 days
  const startDate = startDateObj.toISOString().split('T')[0];

  const rows = await queryAnalytics({
    siteUrl,
    startDate,
    endDate,
    dimensions: ['query', 'page'],
    limit: 10000,
    dataState: 'all',
  });

  // Find queries where no single page dominates (impressions spread across many pages)
  const queryMap = new Map<string, { totalImpressions: number; pageCount: number; bestPosition: number }>();
  for (const r of rows) {
    const query = r.keys?.[0] ?? '';
    const existing = queryMap.get(query);
    if (existing) {
      existing.totalImpressions += r.impressions ?? 0;
      existing.pageCount++;
      existing.bestPosition = Math.min(existing.bestPosition, r.position ?? 100);
    } else {
      queryMap.set(query, {
        totalImpressions: r.impressions ?? 0,
        pageCount: 1,
        bestPosition: r.position ?? 100,
      });
    }
  }

  return Array.from(queryMap.entries())
    .filter(([_, v]) => v.totalImpressions >= 30 && v.bestPosition >= 10 && v.pageCount <= 3)
    .map(([query, v]) => ({ query, impressions: v.totalImpressions, position: v.bestPosition }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);
}

async function findCannibalization(siteUrl: string, days: number): Promise<CannibalizationResult[]> {
  const now = new Date();
  now.setDate(now.getDate() - 3);
  const endDate = now.toISOString().split('T')[0];
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - days + 1);
  const startDate = startDateObj.toISOString().split('T')[0];

  const rows = await queryAnalytics({
    siteUrl,
    startDate,
    endDate,
    dimensions: ['query', 'page'],
    limit: 10000,
    dataState: 'all',
  });

  const queryMap = new Map<string, Array<{ page: string; clicks: number; impressions: number; position: number }>>();
  for (const r of rows) {
    const query = r.keys?.[0] ?? '';
    const impressions = r.impressions ?? 0;
    if (impressions < 30 || (r.position ?? 100) > 20) continue;

    if (!queryMap.has(query)) queryMap.set(query, []);
    queryMap.get(query)!.push({
      page: r.keys?.[1] ?? '',
      clicks: r.clicks ?? 0,
      impressions,
      position: r.position ?? 0,
    });
  }

  const results: CannibalizationResult[] = [];
  for (const [query, pages] of queryMap) {
    if (pages.length < 2) continue;
    pages.sort((a, b) => a.position - b.position);
    results.push({
      query,
      pages,
      totalImpressions: pages.reduce((sum, p) => sum + p.impressions, 0),
    });
  }

  return results
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, 30);
}

export async function generateContentRecommendations(
  siteUrl: string,
  options: { days?: number; maxRecommendations?: number } = {}
): Promise<RecommendationResult> {
  const { days = 28, maxRecommendations = 10 } = options;

  const [wins, gaps, cannibalization] = await Promise.all([
    findQuickWinsForRecs(siteUrl, days),
    findContentGaps(siteUrl),
    findCannibalization(siteUrl, days),
  ]);

  const recs: Recommendation[] = [];

  // Update existing pages (quick wins)
  for (const win of wins.slice(0, 20)) {
    recs.push({
      priority: 0,
      action: 'update',
      targetKeyword: win.query,
      estimatedOpportunity: win.opportunity,
      reasoning: `Ranking at position ${win.position} with ${win.impressions} impressions. ` +
        `Moving to position 3 could gain ~${win.opportunity} extra clicks. ` +
        `Current CTR: ${(win.ctr * 100).toFixed(1)}%. Optimise content, internal links, and on-page SEO.`,
    });
  }

  // Create new content (content gaps)
  for (const gap of gaps.slice(0, 20)) {
    const estimatedCtr = benchmarkCtr(5); // position 5 benchmark
    const estimatedClicks = Math.round(gap.impressions * estimatedCtr);

    recs.push({
      priority: 0,
      action: 'create',
      targetKeyword: gap.query,
      estimatedOpportunity: estimatedClicks,
      reasoning: `${gap.impressions} impressions but ranking at position ${gap.position}. ` +
        `No page properly targets this query. Creating dedicated content could capture ` +
        `~${estimatedClicks} clicks/month.`,
    });
  }

  // Consolidate cannibalizing pages
  for (const issue of cannibalization.slice(0, 20)) {
    const bestPage = issue.pages[0];
    const otherPages = issue.pages.slice(1);
    const estimatedGain = Math.round(issue.totalImpressions * 0.05);

    recs.push({
      priority: 0,
      action: 'consolidate',
      targetPage: bestPage.page,
      targetKeyword: issue.query,
      secondaryPages: otherPages.map(p => p.page),
      estimatedOpportunity: estimatedGain,
      reasoning: `${issue.pages.length} pages compete for "${issue.query}" (${issue.totalImpressions} impressions). ` +
        `Best page ranks at ${bestPage.position}. Consolidating to one authoritative page and ` +
        `redirecting others could improve ranking and capture ~${estimatedGain} additional clicks.`,
    });
  }

  // Sort by opportunity and assign priorities
  recs.sort((a, b) => b.estimatedOpportunity - a.estimatedOpportunity);
  const final = recs.slice(0, maxRecommendations).map((rec, i) => ({
    ...rec,
    priority: i + 1,
  }));

  const summary = {
    update: final.filter(r => r.action === 'update').length,
    create: final.filter(r => r.action === 'create').length,
    consolidate: final.filter(r => r.action === 'consolidate').length,
    totalOpportunity: final.reduce((sum, r) => sum + r.estimatedOpportunity, 0),
  };

  return { recommendations: final, summary };
}
