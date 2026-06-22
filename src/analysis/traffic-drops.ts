/**
 * Traffic Drops Diagnosis — ported from Suganthans-GSC-MCP.
 *
 * Compares current vs prior period and diagnoses WHY traffic dropped:
 * - Ranking loss (position moved >2)
 * - CTR collapse (rankings stable but CTR dropped >30%)
 * - Impression decline (search demand dropped)
 * - Page disappeared (present in prior, absent in current)
 */

import { queryAnalytics } from '../google/tools/analytics.js';

export interface TrafficDrop {
  page: string;
  currentClicks: number;
  priorClicks: number;
  clickChange: number;
  currentPosition: number;
  priorPosition: number;
  positionChange: number;
  diagnosis: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function diagnoseTrafficDrops(
  siteUrl: string,
  options: { days?: number; limit?: number } = {}
): Promise<TrafficDrop[]> {
  const { days = 28, limit = 50 } = options;

  const now = new Date();
  now.setDate(now.getDate() - 3); // GSC data delay

  // Current period
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days + 1);

  // Prior period
  const priorEnd = new Date(currentStart);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - days + 1);

  const [currentRows, priorRows] = await Promise.all([
    queryAnalytics({
      siteUrl,
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd),
      dimensions: ['page'],
      limit: 25000,
      dataState: 'all',
    }),
    queryAnalytics({
      siteUrl,
      startDate: formatDate(priorStart),
      endDate: formatDate(priorEnd),
      dimensions: ['page'],
      limit: 25000,
      dataState: 'all',
    }),
  ]);

  const priorMap = new Map<string, { clicks: number; position: number; ctr: number }>();
  for (const row of priorRows) {
    priorMap.set(row.keys?.[0] ?? '', {
      clicks: row.clicks ?? 0,
      position: row.position ?? 0,
      ctr: row.ctr ?? 0,
    });
  }

  const drops: TrafficDrop[] = [];

  // Compare pages present in both periods
  for (const row of currentRows) {
    const page = row.keys?.[0] ?? '';
    const prior = priorMap.get(page);
    if (!prior) continue;

    const clickChange = (row.clicks ?? 0) - prior.clicks;
    if (clickChange >= 0) continue; // only care about drops

    const positionChange = (row.position ?? 0) - prior.position;

    let diagnosis: string;
    if (positionChange > 2) {
      diagnosis = "Ranking loss";
    } else if ((row.ctr ?? 0) < prior.ctr * 0.7) {
      diagnosis = "CTR collapse (rankings stable, fewer clicks)";
    } else {
      diagnosis = "Impression decline (possible search demand drop)";
    }

    drops.push({
      page,
      currentClicks: row.clicks ?? 0,
      priorClicks: prior.clicks,
      clickChange,
      currentPosition: Math.round((row.position ?? 0) * 10) / 10,
      priorPosition: Math.round(prior.position * 10) / 10,
      positionChange: Math.round(positionChange * 10) / 10,
      diagnosis,
    });
  }

  // Flag pages that disappeared
  const currentPageSet = new Set(currentRows.map(r => r.keys?.[0] ?? ''));
  for (const [page, prior] of priorMap) {
    if (!currentPageSet.has(page) && prior.clicks > 5) {
      drops.push({
        page,
        currentClicks: 0,
        priorClicks: prior.clicks,
        clickChange: -prior.clicks,
        currentPosition: 0,
        priorPosition: Math.round(prior.position * 10) / 10,
        positionChange: 0,
        diagnosis: "Page disappeared from search results",
      });
    }
  }

  drops.sort((a, b) => a.clickChange - b.clickChange);
  return drops.slice(0, limit);
}
