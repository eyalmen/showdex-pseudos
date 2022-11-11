import { getMaxMove, getZMove } from '@showdex/utils/battle';
import type { GenerationNum } from '@smogon/calc';
import type { MoveName } from '@smogon/calc/dist/data/interface';
import type { CalcdexPokemon } from '@showdex/redux/store';
import { alwaysCriticalHits } from './alwaysCriticalHits';

/**
 * Determines whether the passed-in `moveName` should be a critical hit.
 *
 * * Meant to be passed to the `isCrit` property of `SmogonMove` in `createSmogonMove()`.
 * * Purposefully does not take into account any user-defined `moveOverrides` in the passed-in `pokemon`.
 *
 * @since 1.0.6
 */
export const determineCriticalHit = (
  pokemon: CalcdexPokemon,
  moveName: MoveName,
  format?: string | GenerationNum,
): boolean => {
  if (!pokemon?.speciesForme) {
    return;
  }

  const ability = pokemon.dirtyAbility ?? pokemon.ability;
  const item = pokemon.dirtyItem ?? pokemon.item;

  return (
    alwaysCriticalHits(moveName, format)
      && (!pokemon.useZ || !getZMove(moveName, item))
      && (!pokemon.useMax || !getMaxMove(moveName, ability, pokemon.speciesForme))
  ) || pokemon.criticalHit;
};
