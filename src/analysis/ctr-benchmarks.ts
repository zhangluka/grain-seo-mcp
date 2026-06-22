/**
 * Industry CTR benchmarks by SERP position.
 * Source: Suganthans-GSC-MCP (industry-derived averages).
 */

export const BENCHMARK_CTR = [
  0.285, 0.157, 0.110, 0.080, 0.072,
  0.051, 0.040, 0.032, 0.028, 0.025
];

export function benchmarkCtr(position: number): number {
  if (position <= 0) return 0.285;
  if (position <= 10) return BENCHMARK_CTR[Math.floor(position) - 1];
  return Math.max(0.005, 0.025 - (position - 10) * 0.002);
}

export function ctrVerdict(actualCtr: number, position: number): string {
  const benchmark = benchmarkCtr(position);
  const gap = actualCtr - benchmark;

  if (gap >= 0.02) return "Above benchmark";
  if (gap >= -0.02) return "At benchmark";
  if (gap >= -0.05) return "Below benchmark — review title and meta description";
  return "Significantly below benchmark — likely needs title/description rewrite or rich snippet work";
}
