/**
 * Verify Claim — Anti-hallucination mechanism.
 *
 * Re-queries GSC to verify a specific numeric claim before presenting it.
 * Tolerance: position ±0.5, other metrics ±5%.
 */

import { queryAnalytics } from '../google/tools/analytics.js';

export interface VerificationResult {
  claim: string;
  metric: string;
  url?: string;
  query?: string;
  expectedValue: number;
  actualValue: number | null;
  period: { startDate: string; endDate: string };
  verified: boolean;
  discrepancy: string | null;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function verifyClaim(
  claim: string,
  metric: 'clicks' | 'impressions' | 'ctr' | 'position',
  expectedValue: number,
  siteUrl: string,
  options: { url?: string; query?: string; days?: number } = {}
): Promise<VerificationResult> {
  const { url, query, days = 28 } = options;

  const now = new Date();
  now.setDate(now.getDate() - 3);
  const endDate = formatDate(now);
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - days + 1);
  const startDate = formatDate(startDateObj);

  const dimensions: string[] = [];
  const filters: Array<{ dimension: string; operator: string; expression: string }> = [];

  if (url && query) {
    dimensions.push('page', 'query');
    filters.push({ dimension: 'page', operator: 'equals', expression: url });
    filters.push({ dimension: 'query', operator: 'equals', expression: query });
  } else if (url) {
    dimensions.push('page');
    filters.push({ dimension: 'page', operator: 'equals', expression: url });
  } else if (query) {
    dimensions.push('query');
    filters.push({ dimension: 'query', operator: 'equals', expression: query });
  }

  const rows = await queryAnalytics({
    siteUrl,
    startDate,
    endDate,
    dimensions: dimensions.length > 0 ? dimensions : ['date'],
    filters: filters.length > 0 ? filters : undefined,
    limit: 25000,
    dataState: 'all',
  });

  let actualValue: number | null = null;

  if (rows.length > 0) {
    if (metric === 'clicks') {
      actualValue = rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
    } else if (metric === 'impressions') {
      actualValue = rows.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
    } else if (metric === 'ctr') {
      const totalClicks = rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
      const totalImpressions = rows.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
      actualValue = totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : 0;
    } else if (metric === 'position') {
      actualValue = Math.round(
        (rows.reduce((sum, r) => sum + (r.position ?? 0), 0) / rows.length) * 10
      ) / 10;
    }
  }

  const tolerance = metric === 'position' ? 0.5 : expectedValue * 0.05;
  const verified = actualValue !== null && Math.abs(actualValue - expectedValue) <= tolerance;

  let discrepancy: string | null = null;
  if (actualValue === null) {
    discrepancy = 'No data found for the specified filters.';
  } else if (!verified) {
    discrepancy = `Expected ${expectedValue}, actual ${actualValue} (difference: ${Math.abs(actualValue - expectedValue).toFixed(2)}).`;
  }

  return {
    claim,
    metric,
    url,
    query,
    expectedValue,
    actualValue,
    period: { startDate, endDate },
    verified,
    discrepancy,
  };
}
