/**
 * CTR vs Industry Benchmark — ported from Suganthans-GSC-MCP.
 *
 * Compares actual CTR per page against industry benchmarks by position.
 * Classifies each page as Above/At/Below/Significantly below benchmark.
 */

import { queryAnalytics } from '../google/tools/analytics.js';
import { benchmarkCtr, ctrVerdict } from './ctr-benchmarks.js';

export interface CtrBenchmarkResult {
  page: string;
  clicks: number;
  impressions: number;
  actualCtr: number;
  position: number;
  benchmarkCtr: number;
  gap: number;
  verdict: string;
}

export async function ctrVsBenchmark(
  siteUrl: string,
  options: { days?: number; minImpressions?: number; limit?: number } = {}
): Promise<CtrBenchmarkResult[]> {
  const { days = 28, minImpressions = 200, limit = 50 } = options;

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
    dimensions: ['page'],
    limit: 25000,
    dataState: 'all',
  });

  const results: CtrBenchmarkResult[] = [];

  for (const row of rows) {
    const impressions = row.impressions ?? 0;
    const position = row.position ?? 0;
    if (impressions < minImpressions || position > 20) continue;

    const actualCtr = row.ctr ?? 0;
    const benchmark = benchmarkCtr(position);
    const gap = actualCtr - benchmark;
    const gapPercent = Math.round(gap * 10000) / 100;

    results.push({
      page: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions,
      actualCtr: Math.round(actualCtr * 10000) / 100,
      position: Math.round(position * 10) / 10,
      benchmarkCtr: Math.round(benchmark * 10000) / 100,
      gap: gapPercent,
      verdict: ctrVerdict(actualCtr, position),
    });
  }

  results.sort((a, b) => a.gap - b.gap);
  return results.slice(0, limit);
}
