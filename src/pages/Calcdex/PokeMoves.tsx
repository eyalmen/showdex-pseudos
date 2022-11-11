import * as React from 'react';
import cx from 'classnames';
import { Dropdown, PokeTypeField, ValueField } from '@showdex/components/form';
import { TableGrid, TableGridItem } from '@showdex/components/layout';
import {
  Badge,
  Button,
  ToggleButton,
  Tooltip,
} from '@showdex/components/ui';
import { useCalcdexSettings, useColorScheme } from '@showdex/redux/store';
import { buildMoveOptions, legalLockedFormat } from '@showdex/utils/battle';
import { formatDamageAmounts, getMoveOverrideDefaults, hasMoveOverrides } from '@showdex/utils/calc';
import { upsizeArray } from '@showdex/utils/core';
import type { GenerationNum } from '@smogon/calc';
import type { MoveName } from '@smogon/calc/dist/data/interface';
import type { BadgeInstance } from '@showdex/components/ui';
import type { CalcdexBattleRules, CalcdexMoveOverride, CalcdexPokemon } from '@showdex/redux/store';
import type { ElementSizeLabel } from '@showdex/utils/hooks';
import type { SmogonMatchupHookCalculator } from './useSmogonMatchup';
import { PokeMoveOptionTooltip } from './PokeMoveOptionTooltip';
import styles from './PokeMoves.module.scss';

export interface PokeMovesProps {
  className?: string;
  style?: React.CSSProperties;
  gen: GenerationNum;
  format?: string;
  rules?: CalcdexBattleRules;
  pokemon: CalcdexPokemon;
  movesCount?: number;
  containerSize?: ElementSizeLabel;
  calculateMatchup: SmogonMatchupHookCalculator;
  onPokemonChange?: (pokemon: DeepPartial<CalcdexPokemon>) => void;
}

export const PokeMoves = ({
  className,
  style,
  gen,
  format,
  rules,
  pokemon,
  movesCount = 4,
  containerSize,
  calculateMatchup,
  onPokemonChange,
}: PokeMovesProps): JSX.Element => {
  const settings = useCalcdexSettings();
  const colorScheme = useColorScheme();

  // const dex = getDexForFormat(format);

  const copiedRefs = React.useRef<BadgeInstance[]>([]);

  const pokemonKey = pokemon?.calcdexId || pokemon?.name || '?';
  const friendlyPokemonName = pokemon?.speciesForme || pokemon?.name || pokemonKey;

  const moveOptions = React.useMemo(
    () => buildMoveOptions(format, pokemon, settings?.showAllOptions),
    [format, pokemon, settings],
  );

  const matchups = React.useMemo(() => upsizeArray(
    pokemon?.moves || [],
    movesCount,
    null,
    true,
  ).map((moveName) => calculateMatchup?.(moveName) || null), [
    calculateMatchup,
    movesCount,
    pokemon,
  ]);

  const showZToggle = format?.includes('nationaldex')
    || gen === 6
    || gen === 7;

  const showMaxToggle = !rules?.dynamax
    && (
      format?.includes('nationaldex')
        || (gen === 8 && !format?.includes('bdsp'))
    );

  const showEditButton = settings?.showMoveEditor === 'always'
    || (settings?.showMoveEditor === 'meta' && !legalLockedFormat(format));

  const handleMoveChange = (name: MoveName, index: number) => {
    const moves = [...(pokemon?.moves || [] as MoveName[])];

    if (!Array.isArray(moves) || (moves?.[index] && moves[index] === name)) {
      return;
    }

    // when move is cleared, `name` will be null/undefined, so coalesce into an empty string
    moves[index] = (name?.replace('*', '') ?? '') as MoveName;

    onPokemonChange?.({
      moves,
    });
  };

  // copies the matchup result description to the user's clipboard when the damage range is clicked
  const handleDamagePress = (index: number, description: string) => {
    if (typeof navigator === 'undefined' || typeof index !== 'number' || index < 0 || !description) {
      return;
    }

    // wrapped in an unawaited async in order to handle any thrown errors
    void (async () => {
      try {
        await navigator.clipboard.writeText(description);

        copiedRefs.current?.[index]?.show();
      } catch (error) {
        // no-op when an error is thrown while writing to the user's clipboard
        (() => {})();
      }
    })();
  };

  return (
    <TableGrid
      className={cx(
        styles.container,
        containerSize === 'xs' && styles.verySmol,
        // ['md', 'lg', 'xl'].includes(containerSize) && styles.veryThicc,
        !!colorScheme && styles[colorScheme],
        className,
      )}
      style={style}
    >
      {/* table headers */}
      <TableGridItem
        className={cx(styles.header, styles.movesHeader)}
        align="left"
        header
      >
        <div className={styles.headerTitle}>
          Moves
        </div>

        {
          showZToggle &&
          <ToggleButton
            className={cx(styles.toggleButton, styles.ultButton)}
            label="Z"
            tooltip={`${pokemon?.useZ ? 'Deactivate' : 'Activate'} Z-Moves`}
            tooltipDisabled={!settings?.showUiTooltips}
            primary
            active={pokemon?.useZ}
            disabled={!pokemon?.speciesForme}
            onPress={() => onPokemonChange?.({
              useZ: !pokemon?.useZ,
              useMax: false,
            })}
          />
        }

        {
          showMaxToggle &&
          <ToggleButton
            className={cx(
              styles.toggleButton,
              styles.ultButton,
              showZToggle && styles.lessSpacing,
            )}
            label="Max"
            tooltip={`${pokemon?.useMax ? 'Deactivate' : 'Activate'} Max Moves`}
            tooltipDisabled={!settings?.showUiTooltips}
            primary
            active={pokemon?.useMax}
            disabled={!pokemon?.speciesForme}
            onPress={() => onPokemonChange?.({
              useZ: false,
              useMax: !pokemon?.useMax,
            })}
          />
        }

        {
          showEditButton &&
          <ToggleButton
            className={cx(
              styles.toggleButton,
              styles.editButton,
              // pokemon?.showMoveOverrides && styles.hideButton,
            )}
            label={pokemon?.showMoveOverrides ? 'Hide' : 'Edit'}
            tooltip={`${pokemon?.showMoveOverrides ? 'Close' : 'Open'} Move Editor`}
            tooltipDisabled={!settings?.showUiTooltips}
            primary={pokemon?.showMoveOverrides}
            // active={pokemon?.showMoveOverrides}
            disabled={!pokemon?.speciesForme}
            onPress={() => onPokemonChange?.({
              showMoveOverrides: !pokemon?.showMoveOverrides,
            })}
          />
        }
      </TableGridItem>

      {pokemon?.showMoveOverrides ? (
        <TableGridItem
          className={cx(styles.header, styles.editorHeader)}
          header
        >
          {/* <div className={styles.headerTitle}>
            Properties
          </div> */}
        </TableGridItem>
      ) : (
        <>
          <TableGridItem
            className={cx(styles.header, styles.dmgHeader)}
            header
          >
            <div className={styles.headerTitle}>
              DMG
            </div>

            <ToggleButton
              className={styles.toggleButton}
              label="Crit"
              tooltip={`${pokemon?.criticalHit ? 'Hide' : 'Show'} Critical Hit Damages`}
              tooltipDisabled={!settings?.showUiTooltips}
              primary
              active={pokemon?.criticalHit}
              disabled={!pokemon?.speciesForme}
              onPress={() => onPokemonChange?.({
                criticalHit: !pokemon?.criticalHit,
              })}
            />
          </TableGridItem>

          <TableGridItem
            className={styles.header}
            header
          >
            <div className={styles.headerTitle}>
              KO %
            </div>
          </TableGridItem>
        </>
      )}

      {/* (actual) moves */}
      {Array(movesCount).fill(null).map((_, i) => {
        // const moveName = pokemon?.moves?.[i];
        // const move = moveName ? dex?.moves.get(moveName) : null;
        // const moveDescription = move?.shortDesc || move?.desc;

        // const maxPp = move?.noPPBoosts ? (move?.pp || 0) : Math.floor((move?.pp || 0) * (8 / 5));
        // const remainingPp = Math.max(maxPp - (ppUsed || maxPp), 0);

        const {
          defender,
          move: calcMove,
          description,
          damageRange,
          koChance,
          koColor,
        } = matchups[i] || {};

        // const moveName = calcMove?.name;
        const moveName = pokemon?.moves?.[i] || calcMove?.name;

        // getMoveOverrideDefaults() could return null, so spreading here to avoid a "Cannot read properties of null" error
        // (could make it not return null, but too lazy atm lol)
        const moveOverrideDefaults = {
          ...getMoveOverrideDefaults(pokemon, moveName, format),
        };

        const moveOverrides = {
          ...moveOverrideDefaults,
          ...pokemon?.moveOverrides?.[moveName],
        };

        const damagingMove = [
          'Physical',
          'Special',
        ].includes(moveOverrides.category);

        const hasOverrides = pokemon?.showMoveOverrides
          && hasMoveOverrides(pokemon, moveName, format);

        const basePowerKey: keyof CalcdexMoveOverride = pokemon?.useZ
          ? 'zBasePower'
          : pokemon?.useMax
            ? 'maxBasePower'
            : 'basePower';

        const fallbackBasePower = (
          pokemon?.useZ
            ? moveOverrideDefaults.zBasePower
            : pokemon?.useMax
              ? moveOverrideDefaults.maxBasePower
              : null
        ) || calcMove?.bp || 0;

        const showDamageAmounts = !pokemon?.showMoveOverrides
          && !!description?.damageAmounts
          && (
            settings?.showMatchupDamageAmounts === 'always'
              || (settings?.showMatchupDamageAmounts === 'nfe' && defender?.species.nfe)
          );

        const showMatchupTooltip = !pokemon?.showMoveOverrides
          && settings?.showMatchupTooltip
          && !!description?.raw;

        const matchupTooltip = showMatchupTooltip ? (
          <div className={styles.descTooltip}>
            <Badge
              ref={(ref) => { copiedRefs.current[i] = ref; }}
              className={styles.copiedBadge}
              label="Copied!"
              color="green"
            />

            {settings?.prettifyMatchupDescription ? (
              <>
                {description?.attacker}
                {
                  !!description?.defender &&
                  <>
                    {
                      !!description.attacker &&
                      <>
                        <br />
                        vs
                        <br />
                      </>
                    }
                    {description.defender}
                  </>
                }
                {(!!description?.damageRange || !!description?.koChance) && ':'}
                {
                  !!description?.damageRange &&
                  <>
                    <br />
                    {description.damageRange}
                  </>
                }
                {
                  !!description?.koChance &&
                  <>
                    <br />
                    {description.koChance}
                  </>
                }
              </>
            ) : description.raw}

            {
              showDamageAmounts &&
              <>
                <br />
                <br />
                {settings?.formatMatchupDamageAmounts ? (
                  <>({formatDamageAmounts(description.damageAmounts)})</>
                ) : (
                  <>({description.damageAmounts})</>
                )}
              </>
            }
          </div>
        ) : null;

        // checking if a damaging move has non-0 BP (would be 'N/A' for status moves)
        // e.g., move dex reports 0 BP for Mirror Coat, a Special move ('IMMUNE' wouldn't be correct here)
        const parsedDamageRange = moveName
          ? damageRange
            || (moveOverrides[basePowerKey] || fallbackBasePower ? 'IMMUNE' : '?')
          : null;

        const hasDamageRange = !!parsedDamageRange
          && !['IMMUNE', 'N/A', '?'].includes(parsedDamageRange);

        return (
          <React.Fragment
            key={`PokeMoves:Moves:${pokemonKey}:MoveRow:${i}`}
          >
            <TableGridItem align="left">
              <Dropdown
                aria-label={`Move Slot ${i + 1} for Pokemon ${friendlyPokemonName}`}
                hint="--"
                optionTooltip={PokeMoveOptionTooltip}
                optionTooltipProps={{
                  format,
                  pokemon,
                  hidden: !settings?.showMoveTooltip,
                }}
                input={{
                  name: `PokeMoves:Moves:${pokemonKey}:Dropdown:${i}`,
                  value: moveName,
                  onChange: (name: MoveName) => handleMoveChange(name, i),
                }}
                options={moveOptions}
                noOptionsMessage="No Moves Found"
                disabled={!pokemon?.speciesForme}
              />
            </TableGridItem>

            {pokemon?.showMoveOverrides ? (
              <TableGridItem className={styles.editorItem}>
                <div className={styles.editorLeft}>
                  <PokeTypeField
                    input={{
                      value: moveOverrides.type,
                      onChange: (value: Showdown.TypeName) => onPokemonChange?.({
                        moveOverrides: {
                          [moveName]: { type: value },
                        },
                      }),
                    }}
                  />

                  <ToggleButton
                    className={cx(
                      styles.editorButton,
                      styles.categoryButton,
                      moveOverrides.category === 'Status' && styles.readOnly,
                    )}
                    label={moveOverrides.category?.slice(0, 4)}
                    tooltip={(
                      <div className={styles.descTooltip}>
                        {
                          damagingMove &&
                          <>
                            Switch to{' '}
                            <em>{moveOverrides.category === 'Physical' ? 'Special' : 'Physical'}</em>
                            <br />
                          </>
                        }

                        <strong>{moveOverrides.category}</strong>
                      </div>
                    )}
                    tooltipDisabled={!settings?.showUiTooltips}
                    primary={damagingMove}
                    onPress={damagingMove ? () => onPokemonChange?.({
                      moveOverrides: {
                        [moveName]: {
                          category: moveOverrides.category === 'Physical'
                            ? 'Special'
                            : 'Physical',
                        },
                      },
                    }) : undefined}
                  />

                  {
                    damagingMove &&
                    <>
                      <div className={styles.moveProperty}>
                        <ValueField
                          className={styles.valueField}
                          label={`Base Power Override for ${moveName} of Pokemon ${friendlyPokemonName}`}
                          hideLabel
                          hint={moveOverrides[basePowerKey]?.toString() || 0}
                          fallbackValue={fallbackBasePower}
                          min={0}
                          max={999} // hmm...
                          step={1}
                          shiftStep={10}
                          clearOnFocus
                          absoluteHover
                          input={{
                            value: moveOverrides[basePowerKey],
                            onChange: (value: number) => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { [basePowerKey]: Math.max(value, 0) },
                              },
                            }),
                          }}
                        />

                        <div className={styles.propertyName}>
                          {pokemon?.useZ && !pokemon?.useMax && 'Z '}
                          {pokemon?.useMax && 'Max '}
                          BP
                        </div>
                      </div>

                      {
                        ['md', 'lg', 'xl'].includes(containerSize) &&
                        <div
                          className={styles.moveProperty}
                          style={{ marginLeft: '1em' }}
                        >
                          <ToggleButton
                            className={styles.editorButton}
                            style={{ marginRight: 3 }}
                            label="ATK"
                            tooltip={(
                              <div className={styles.descTooltip}>
                                Use this Pok&eacute;mon's ATK stat.
                              </div>
                            )}
                            tooltipDisabled={!settings?.showUiTooltips}
                            primary
                            active={moveOverrides.offensiveStat === 'atk'}
                            activeScale={moveOverrides.offensiveStat === 'atk' ? 0.98 : undefined}
                            onPress={() => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { offensiveStat: 'atk' },
                              },
                            })}
                          />
                          <ToggleButton
                            className={styles.editorButton}
                            style={{ marginRight: '0.8em' }}
                            label="SPA"
                            tooltip={(
                              <div className={styles.descTooltip}>
                                Use this Pok&eacute;mon's SPA stat.
                              </div>
                            )}
                            tooltipDisabled={!settings?.showUiTooltips}
                            primary
                            active={moveOverrides.offensiveStat === 'spa'}
                            activeScale={moveOverrides.offensiveStat === 'spa' ? 0.98 : undefined}
                            onPress={() => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { offensiveStat: 'spa' },
                              },
                            })}
                          />

                          <div
                            className={styles.propertyName}
                            style={{ opacity: 0.5 }}
                          >
                            vs
                          </div>

                          <ToggleButton
                            className={styles.editorButton}
                            style={{ marginRight: 3, marginLeft: '0.8em' }}
                            label="DEF"
                            tooltip={(
                              <div className={styles.descTooltip}>
                                Use the opposing Pok&eacute;mon's DEF stat.
                              </div>
                            )}
                            tooltipDisabled={!settings?.showUiTooltips}
                            primary
                            active={moveOverrides.defensiveStat === 'def'}
                            activeScale={moveOverrides.defensiveStat === 'def' ? 0.98 : undefined}
                            onPress={() => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { defensiveStat: 'def' },
                              },
                            })}
                          />
                          <ToggleButton
                            className={styles.editorButton}
                            // style={{ marginRight: 3 }}
                            label="SPD"
                            tooltip={(
                              <div className={styles.descTooltip}>
                                Use the opposing Pok&eacute;mon's SPD stat.
                              </div>
                            )}
                            tooltipDisabled={!settings?.showUiTooltips}
                            primary
                            active={moveOverrides.defensiveStat === 'spd'}
                            activeScale={moveOverrides.defensiveStat === 'spd' ? 0.98 : undefined}
                            onPress={() => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { defensiveStat: 'spd' },
                              },
                            })}
                          />
                          {/* update (2022/11/04): ignoreDefensive in createSmogonMove() doesn't seem to do anything */}
                          {/* <ToggleButton
                            className={styles.editorButton}
                            label="IGN"
                            tooltip={(
                              <div className={styles.descTooltip}>
                                Ignore/bypass the opposing Pok&eactue;mon's defensive stats.
                              </div>
                            )}
                            tooltipDisabled={!settings?.showUiTooltips}
                            primary
                            active={moveOverrides.defensiveStat === 'ignore'}
                            onPress={() => onPokemonChange?.({
                              moveOverrides: {
                                [moveName]: { defensiveStat: 'ignore' },
                              },
                            })}
                          /> */}
                        </div>
                      }
                    </>
                  }
                </div>

                <div className={styles.editorRight}>
                  <ToggleButton
                    className={styles.editorButton}
                    style={hasOverrides ? undefined : { opacity: 0 }}
                    label="Reset"
                    tooltip="Reset Move to Defaults"
                    tooltipDisabled={!settings?.showUiTooltips}
                    primary={hasOverrides}
                    disabled={!hasOverrides}
                    onPress={() => onPokemonChange?.({
                      moveOverrides: {
                        [moveName]: null,
                      },
                    })}
                  />
                </div>
              </TableGridItem>
            ) : (
              <>
                <TableGridItem>
                  {/* [XXX.X% &ndash;] XXX.X% */}
                  {/* (note: '0 - 0%' damageRange will be reported as 'N/A') */}
                  {(settings?.showNonDamageRanges || hasDamageRange) ? (
                    settings?.showMatchupTooltip && settings.copyMatchupDescription ? (
                      <Button
                        className={cx(
                          styles.damageButton,
                          !showMatchupTooltip && styles.disabled,
                        )}
                        labelClassName={cx(
                          styles.damageButtonLabel,
                          !hasDamageRange && styles.noDamage,
                        )}
                        tabIndex={-1} // not ADA compliant, obviously lol
                        label={parsedDamageRange}
                        tooltip={matchupTooltip}
                        tooltipTrigger="mouseenter"
                        tooltipTouch={['hold', 500]}
                        tooltipDisabled={!showMatchupTooltip}
                        hoverScale={1}
                        absoluteHover
                        disabled={!showMatchupTooltip}
                        onPress={() => handleDamagePress(i, [
                          description.raw,
                          showDamageAmounts && `(${description.damageAmounts})`,
                        ].filter(Boolean).join(' '))}
                      />
                    ) : (
                      <Tooltip
                        content={matchupTooltip}
                        offset={[0, 10]}
                        delay={[1000, 50]}
                        trigger="mouseenter"
                        touch={['hold', 500]}
                        disabled={!showMatchupTooltip}
                      >
                        <div
                          className={cx(
                            styles.damageButtonLabel,
                            styles.noCopy,
                            !hasDamageRange && styles.noDamage,
                          )}
                        >
                          {parsedDamageRange}
                        </div>
                      </Tooltip>
                    )
                  ) : null}
                </TableGridItem>

                <TableGridItem
                  style={{
                    ...(!koChance ? { opacity: 0.3 } : null),
                    ...(koColor ? { color: koColor } : null),
                  }}
                >
                  {/* XXX% XHKO */}
                  {koChance}
                </TableGridItem>
              </>
            )}
          </React.Fragment>
        );
      })}
    </TableGrid>
  );
};
