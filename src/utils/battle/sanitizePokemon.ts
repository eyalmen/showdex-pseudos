import { PokemonNatures } from '@showdex/consts/pokemon';
import { calcPokemonCalcdexId } from '@showdex/utils/calc';
import { env } from '@showdex/utils/core';
import type { GenerationNum } from '@smogon/calc';
import type { AbilityName, ItemName, MoveName } from '@smogon/calc/dist/data/interface';
import type { CalcdexPokemon } from '@showdex/redux/store';
import { detectGenFromFormat } from './detectGenFromFormat';
import { detectLegacyGen } from './detectLegacyGen';
import { detectPokemonIdent } from './detectPokemonIdent';
import { detectSpeciesForme } from './detectSpeciesForme';
import { detectToggledAbility } from './detectToggledAbility';
import { flattenAlts } from './flattenAlts';
import { getDexForFormat } from './getDexForFormat';
import { sanitizeMoveTrack } from './sanitizeMoveTrack';
import { sanitizeVolatiles } from './sanitizeVolatiles';
import { toggleableAbility } from './toggleableAbility';

/**
 * Essentially converts a `Showdown.Pokemon` into our custom `CalcdexPokemon`.
 *
 * * Gets in *R E A L / D E E P*.
 *   - Sanitizes the living shit out of the `pokemon`.
 * * You can also pass in an incomplete `CalcdexPokemon`,
 *   which will fill in defaults for any missing properties.
 *   - Technically, nothing is required, so you can pass in no arguments and
 *     still get a partially filled-in `CalcdexPokemon`.
 *
 * @since 0.1.0
 */
export const sanitizePokemon = (
  pokemon: DeepPartial<Showdown.Pokemon> | DeepPartial<CalcdexPokemon> = {},
  format?: GenerationNum | string,
  showAllFormes?: boolean,
): CalcdexPokemon => {
  const dex = getDexForFormat(format);
  const legacy = detectLegacyGen(format);

  const gen = typeof format === 'string'
    ? detectGenFromFormat(format, env.int<GenerationNum>('calcdex-default-gen'))
    : format;

  const typeChanged = !!pokemon.volatiles?.typechange?.[1];
  const transformed = !!pokemon.volatiles?.transform?.[1];

  const sanitizedPokemon: CalcdexPokemon = {
    calcdexId: ('calcdexId' in pokemon && pokemon.calcdexId) || null,
    // calcdexNonce: ('calcdexNonce' in pokemon && pokemon.calcdexNonce) || null,

    slot: pokemon?.slot ?? null, // could be 0, so don't use logical OR here
    ident: detectPokemonIdent(pokemon),
    name: pokemon?.name,
    details: pokemon?.details,
    searchid: pokemon?.searchid,

    speciesForme: detectSpeciesForme(pokemon)?.replace('-*', ''),
    dmaxable: ('dmaxable' in pokemon && pokemon.dmaxable) || false,
    gmaxable: ('gmaxable' in pokemon && pokemon.gmaxable) || false,
    altFormes: ('altFormes' in pokemon && !!pokemon.altFormes?.length && pokemon.altFormes) || [],

    transformedForme: transformed
      ? typeof pokemon.volatiles.transform[1] === 'object'
        ? (<Showdown.Pokemon> <unknown> pokemon.volatiles.transform[1])?.speciesForme || null
        : pokemon.volatiles.transform[1] || null
      : null,

    level: pokemon?.level || 0,
    gender: pokemon?.gender || 'N',
    shiny: pokemon?.shiny,

    types: typeChanged
      ? <Showdown.TypeName[]> pokemon.volatiles.typechange[1].split('/') || []
      : ('types' in pokemon && pokemon.types) || [],

    hp: pokemon?.hp || 0,
    maxhp: pokemon?.maxhp || 1,
    fainted: pokemon?.fainted ?? !pokemon?.hp,

    status: pokemon?.fainted || !pokemon?.hp ? null : pokemon?.status,
    turnstatuses: pokemon?.turnstatuses,
    toxicCounter: pokemon?.statusData?.toxicTurns,

    statusData: {
      sleepTurns: pokemon?.statusData?.sleepTurns || 0,
      toxicTurns: pokemon?.statusData?.toxicTurns || 0,
    },

    ability: (!legacy && <AbilityName> pokemon?.ability) || null,
    dirtyAbility: ('dirtyAbility' in pokemon && pokemon.dirtyAbility) || null,
    // abilityToggled: 'abilityToggled' in pokemon ? pokemon.abilityToggled : detectToggledAbility(pokemon),
    baseAbility: <AbilityName> pokemon?.baseAbility?.replace(/no\s?ability/i, ''),
    abilities: (!legacy && 'abilities' in pokemon && pokemon.abilities) || [],
    altAbilities: (!legacy && 'altAbilities' in pokemon && pokemon.altAbilities) || [],
    transformedAbilities: (!legacy && 'transformedAbilities' in pokemon && pokemon.transformedAbilities) || [],

    item: gen > 1 && pokemon?.item && pokemon.item !== '(exists)'
      ? <ItemName> dex.items.get(pokemon.item)?.name
      : null,

    dirtyItem: ('dirtyItem' in pokemon && pokemon.dirtyItem) || null,
    altItems: (gen > 1 && 'altItems' in pokemon && pokemon.altItems) || [],
    itemEffect: pokemon?.itemEffect,
    prevItem: <ItemName> pokemon?.prevItem,
    prevItemEffect: pokemon?.prevItemEffect,

    nature: !legacy
      ? ('nature' in pokemon && pokemon.nature) || PokemonNatures[0]
      : null,

    ivs: {
      hp: ('ivs' in pokemon && pokemon.ivs?.hp) || 31,
      atk: ('ivs' in pokemon && pokemon.ivs?.atk) || 31,
      def: ('ivs' in pokemon && pokemon.ivs?.def) || 31,
      spa: ('ivs' in pokemon && pokemon.ivs?.spa) || 31,
      spd: ('ivs' in pokemon && pokemon.ivs?.spd) || 31,
      spe: ('ivs' in pokemon && pokemon.ivs?.spe) || 31,
    },

    evs: !legacy ? {
      hp: ('evs' in pokemon && pokemon.evs?.hp) || 0,
      atk: ('evs' in pokemon && pokemon.evs?.atk) || 0,
      def: ('evs' in pokemon && pokemon.evs?.def) || 0,
      spa: ('evs' in pokemon && pokemon.evs?.spa) || 0,
      spd: ('evs' in pokemon && pokemon.evs?.spd) || 0,
      spe: ('evs' in pokemon && pokemon.evs?.spe) || 0,
    } : {},

    showGenetics: ('showGenetics' in pokemon && pokemon.showGenetics) || true,

    boosts: {
      atk: typeof pokemon?.boosts?.atk === 'number' ? pokemon.boosts.atk : 0,
      def: typeof pokemon?.boosts?.def === 'number' ? pokemon.boosts.def : 0,
      spa: 'spc' in (pokemon?.boosts || {}) && typeof (<Showdown.Pokemon> pokemon).boosts.spc === 'number'
        ? (<Showdown.Pokemon> pokemon).boosts.spc
        : typeof pokemon?.boosts?.spa === 'number' ? pokemon.boosts.spa : 0,
      spd: typeof pokemon?.boosts?.spd === 'number' ? pokemon.boosts.spd : 0,
      spe: typeof pokemon?.boosts?.spe === 'number' ? pokemon.boosts.spe : 0,
    },

    /** @todo clean this up lol */
    dirtyBoosts: {
      atk: ('dirtyBoosts' in pokemon && pokemon.dirtyBoosts?.atk) || null,
      def: ('dirtyBoosts' in pokemon && pokemon.dirtyBoosts?.def) || null,
      spa: ('dirtyBoosts' in pokemon && pokemon.dirtyBoosts?.spa) || null,
      spd: ('dirtyBoosts' in pokemon && pokemon.dirtyBoosts?.spd) || null,
      spe: ('dirtyBoosts' in pokemon && pokemon.dirtyBoosts?.spe) || null,
    },

    dirtyBaseStats: {
      atk: ('dirtyBaseStats' in pokemon && pokemon.dirtyBaseStats?.atk) || null,
      def: ('dirtyBaseStats' in pokemon && pokemon.dirtyBaseStats?.def) || null,
      spa: ('dirtyBaseStats' in pokemon && pokemon.dirtyBaseStats?.spa) || null,
      spd: ('dirtyBaseStats' in pokemon && pokemon.dirtyBaseStats?.spd) || null,
      spe: ('dirtyBaseStats' in pokemon && pokemon.dirtyBaseStats?.spe) || null,
    },

    useZ: (!legacy && 'useZ' in pokemon && pokemon.useZ) || false,
    useMax: (!legacy && 'useMax' in pokemon && pokemon.useMax) || false,
    moves: <MoveName[]> pokemon?.moves || [],
    serverMoves: ('serverMoves' in pokemon && pokemon.serverMoves) || [],
    transformedMoves: ('transformedMoves' in pokemon && pokemon.transformedMoves) || [],
    altMoves: ('altMoves' in pokemon && pokemon.altMoves) || [],
    lastMove: <MoveName> pokemon?.lastMove || null,

    // returns moveTrack and revealedMoves (guaranteed to be empty arrays, at the very least)
    ...sanitizeMoveTrack(pokemon, format),

    showMoveOverrides: ('showMoveOverrides' in pokemon && pokemon.showMoveOverrides) || false,
    moveOverrides: {
      ...('moveOverrides' in pokemon && pokemon.moveOverrides),
    },

    criticalHit: ('criticalHit' in pokemon && pokemon.criticalHit) || false,

    preset: ('preset' in pokemon && pokemon.preset) || null,
    presets: ('presets' in pokemon && pokemon.presets) || [],
    autoPreset: 'autoPreset' in pokemon ? pokemon.autoPreset : true,

    // only deep-copy non-object volatiles
    // (particularly Ditto's 'transform' volatile, which references an existing Pokemon object as its value)
    volatiles: sanitizeVolatiles(pokemon),
  };

  // fill in additional info if the Dex global is available (should be)
  // gen is important here; e.g., Crustle, who has 95 base ATK in Gen 5, but 105 in Gen 8
  /** @todo remove `dex` check here since we already check for `Dex` in `main` */
  if (dex) {
    const species = dex.species.get(sanitizedPokemon.speciesForme);

    // don't really care if species is falsy here
    sanitizedPokemon.baseStats = { ...species?.baseStats };
    sanitizedPokemon.dmaxable = !species?.cannotDynamax;

    // grab the base species forme to obtain its other formes
    // (since sanitizedPokemon.speciesForme could be one of those other formes)
    const baseSpeciesForme = species?.baseSpecies;
    const baseSpecies = baseSpeciesForme ? dex.species.get(baseSpeciesForme) : null;

    // grab the baseStats of the transformed Pokemon, if applicable
    const transformedSpecies = sanitizedPokemon.transformedForme
      ? dex.species.get(sanitizedPokemon.transformedForme)
      : null;

    const transformedBaseSpeciesForme = transformedSpecies?.baseSpecies;
    const transformedBaseSpecies = transformedBaseSpeciesForme
      ? dex.species.get(transformedBaseSpeciesForme)
      : null;

    // check if this Pokemon can Dynamax
    sanitizedPokemon.dmaxable = !species.cannotDynamax;

    /** @todo read from `BattleRoom.requests` */
    // sanitizedPokemon.gmaxable = 'read from BattleRoom.requests';

    // attempt to populate all other formes based on the base forme
    // (or determined base forme from the curren other forme if showAllFormes is true)
    sanitizedPokemon.altFormes = transformedBaseSpecies?.otherFormes?.length
        && (
          (showAllFormes && transformedBaseSpecies.otherFormes.includes(sanitizedPokemon.transformedForme))
            || transformedBaseSpeciesForme === sanitizedPokemon.transformedForme
        )
      ? [
        transformedBaseSpeciesForme,
        ...(<string[]> transformedBaseSpecies.otherFormes),
      ]
      : baseSpecies?.otherFormes?.length
          && (
            (showAllFormes && baseSpecies.otherFormes.includes(sanitizedPokemon.speciesForme))
              || baseSpeciesForme === sanitizedPokemon.speciesForme
          )
        ? [
          baseSpeciesForme,
          ...(<string[]> baseSpecies.otherFormes),
        ]
        : [];

    // make sure we don't got any bunk formes like Hisuian formes
    sanitizedPokemon.altFormes = sanitizedPokemon.altFormes
      .filter((f) => !!f && !f.includes('-Hisui'));

    // if this Pokemon can G-max, add the appropriate formes
    if (sanitizedPokemon.dmaxable && species.canGigantamax) {
      sanitizedPokemon.altFormes = sanitizedPokemon.altFormes.length
        // reason for the flatMap is to achieve:
        // ['Urshifu', 'Urshifu-Rapid-Strike']
        // -> ['Urshifu', 'Urshifu-Gmax', 'Urshifu-Rapid-Strike', 'Urshifu-Rapid-Strike-Gmax']
        ? sanitizedPokemon.altFormes.flatMap((forme) => {
          const output: string[] = [forme];

          // don't do another lookup if the current forme is what we've already looked up
          const currentSpecies = forme === species.name
            ? species
            : dex.species.get(forme);

          if (currentSpecies?.canGigantamax) {
            output.push(`${currentSpecies.name}-Gmax`);
          }

          return output;
        })
        : [
          sanitizedPokemon.speciesForme,
          `${sanitizedPokemon.speciesForme}-Gmax`,
        ];
    }

    if (transformedSpecies?.baseStats) {
      sanitizedPokemon.transformedBaseStats = { ...transformedSpecies.baseStats };

      // Transform ability doesn't copy the base HP stat
      // (uses the original Pokemon's base HP stat)
      if ('hp' in sanitizedPokemon.transformedBaseStats) {
        delete (<Showdown.StatsTable> sanitizedPokemon.transformedBaseStats).hp;
      }
    }

    // only update the types if the dex returned types
    // (checking against typeChanged since if true, should've been already updated above)
    if (!typeChanged && (transformedSpecies || species)?.types?.length) {
      sanitizedPokemon.types = [
        ...(<Showdown.TypeName[]> (transformedSpecies || species).types),
      ];
    }

    // only update the abilities if the dex returned abilities (of the original, non-transformed Pokemon)
    // (using Set makes sure there aren't any duplicate abilities in the array)
    sanitizedPokemon.abilities = Array.from(new Set([
      ...(sanitizedPokemon.abilities || []),
      ...(<AbilityName[]> Object.values(species?.abilities || {})),
    ].filter(Boolean)));

    // if transformed, update the legal abilities of the transformed Pokemon
    sanitizedPokemon.transformedAbilities = [
      ...(<AbilityName[]> Object.values(transformedSpecies?.abilities || {})),
    ].filter(Boolean);

    // check if we should auto-set the ability
    const abilitiesSource = sanitizedPokemon.transformedAbilities.length
      ? sanitizedPokemon.transformedAbilities
      : [...flattenAlts(sanitizedPokemon.altAbilities), ...sanitizedPokemon.abilities];

    if (!sanitizedPokemon.ability || (sanitizedPokemon.dirtyAbility && !abilitiesSource.includes(sanitizedPokemon.dirtyAbility))) {
      [sanitizedPokemon.dirtyAbility] = abilitiesSource;
    }
  }

  // abilityToggleable is mainly used for UI, hence why there are two of
  // what seems to be essentially the same thing
  // (but note that abilityToggled stores the current toggle state)
  sanitizedPokemon.abilityToggleable = toggleableAbility(sanitizedPokemon);
  sanitizedPokemon.abilityToggled = detectToggledAbility(sanitizedPokemon);

  if (!sanitizedPokemon?.calcdexId) {
    sanitizedPokemon.calcdexId = calcPokemonCalcdexId(sanitizedPokemon);
  }

  // sanitizedPokemon.calcdexNonce = calcPokemonCalcdexNonce(sanitizedPokemon);

  return sanitizedPokemon;
};
