import { env } from '@showdex/utils/core';
import type { GenerationNum } from '@smogon/calc';
import { detectGenFromFormat } from './detectGenFromFormat';

/**
 * Determines if the provided `gen` uses legacy DVs (Determinant Values) instead of
 * IVs (Individual Values).
 *
 * * Essentially gens 1 and 2 use legacy DVs.
 *
 * @since 1.0.2
 */
export const detectLegacyGen = (format: GenerationNum | string): boolean => {
  const gen = typeof format === 'string'
    ? detectGenFromFormat(format, env.int<GenerationNum>('calcdex-default-gen'))
    : format;

  return gen < 3;
};
