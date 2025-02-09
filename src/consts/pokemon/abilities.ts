import type { AbilityName } from '@smogon/calc/dist/data/interface';

/**
 * Abilities that can be toggled on/off.
 *
 * * Originally derived from `src/js/shared_controls.js` in `smogon/damage-calc`.
 *
 * @see https://github.com/smogon/damage-calc/blob/master/src/js/shared_controls.js#L215
 * @since 0.1.2
 */
export const PokemonToggleAbilities: AbilityName[] = [
  <AbilityName> 'Flash Fire',
  // <AbilityName> 'Intimidate', // applies the ATK reduction within `boosts`, so no need to "toggle" this
  <AbilityName> 'Minus',
  <AbilityName> 'Multiscale', // special case based off the HP, but specified here to allow toggling in the UI
  <AbilityName> 'Plus',
  <AbilityName> 'Shadow Shield', // basically another multiscale lmao
  <AbilityName> 'Slow Start',
  <AbilityName> 'Stakeout',
  <AbilityName> 'Unburden',
];
