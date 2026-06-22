/**
 * Topic Cluster Performance.
 *
 * Aggregates performance for all pages matching a URL path pattern.
 * Useful for analyzing /blog/, /guides/, /products/ etc. as a group.
 */

import { queryAnalytics } from '../google/tools/analytics.js';

export interface ClusterPerformance {
  pathPattern: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  pageCount: number;
  topPages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
}

export async function topicClusterPerformance(
  siteUrl: string,
  pathPattern: string,
  options: { days?: number } = {}
): Promise<ClusterPerformance> {
  const { days = 28 } = options;

  const now = new Date();
  now.setDate(now.getDate() - 3);
  const endDate = now.toISOString().split('T')[0];
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - days + 1);
  const startDate = startDateObj.toISOString().split('T')[0];

  const [pageRows, queryRows] = await Promise.all([
    queryAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['page'],
      filters: [{ dimension: 'page', operator: 'contains', expression: pathPattern }],
      limit: 25000,
      dataState: 'all',
    }),
    queryAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['query'],
      filters: [{ dimension: 'page', operator: 'contains', expression: pathPattern }],
      limit: 25000,
      dataState: 'all',
    }),
  ]);

  let totalClicks = 0;
  let totalImpressions = 0;
  let positionSum = 0;

  for (const row of pageRows) {
    totalClicks += row.clicks ?? 0;
    totalImpressions += row.impressions ?? 0;
    positionSum += row.position ?? 0;
  }

  const topPages = pageRows
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)
    .map(r => ({
      page: r.keys?.[0] ?? '',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      position: Math.round((r.position ?? 0) * 10) / 10,
    }));

  const topQueries = queryRows
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)
    .map(r => ({
      query: r.keys?.[0] ?? '',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      position: Math.round((r.position ?? 0) * 10) / 10,
    }));

  return {
    pathPattern,
    totalClicks,
    totalImpressions,
    averageCtr: totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0,
    averagePosition: pageRows.length > 0
      ? Math.round((positionSum / pageRows.length) * 10) / 10
      : 0,
    pageCount: pageRows.length,
    topPages,
    topQueries,
  };
}
