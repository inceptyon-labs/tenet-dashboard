import type { Grade } from '../types.js';
import { getDimensionWeight } from './dimensions.js';

/**
 * Compute the composite score from an array of dimension results.
 * Only applicable dimensions with non-null scores contribute.
 * Weight overrides allow per-dimension weighting from settings.
 */
export function computeComposite(
  dimensions: Array<{ score: number | null; applicable: boolean; key: string }>,
  weightOverrides: Record<string, number>,
): number {
  const applicable = dimensions.filter((d) => d.applicable && d.score !== null);
  if (applicable.length === 0) return 0;

  let totalWeighted = 0;
  let totalWeight = 0;

  for (const d of applicable) {
    const weight = getDimensionWeight(d.key, weightOverrides);
    totalWeighted += d.score! * weight;
    totalWeight += weight;
  }

  return Math.round(totalWeighted / totalWeight);
}

/**
 * Compute the weighted contribution of a single dimension score.
 * Returns the score multiplied by its weight, divided by total weight.
 */
export function computeWeightedContribution(
  score: number,
  weight: number,
  totalWeight: number,
): number {
  if (totalWeight === 0) return 0;
  return (score * weight) / totalWeight;
}

/**
 * Convert a numeric score (0-100) to a letter grade.
 *  A: 80-100
 *  B: 60-79
 *  C: 40-59
 *  F: 0-39
 */
export function gradeFromScore(score: number): Grade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'F';
}
