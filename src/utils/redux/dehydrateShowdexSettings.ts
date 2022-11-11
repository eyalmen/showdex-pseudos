import { env } from '@showdex/utils/core';
import type {
  ShowdexCalcdexSettings,
  ShowdexHellodexSettings,
  ShowdexSettings,
} from '@showdex/redux/store';
import {
  dehydrateArray,
  dehydrateBoolean,
  dehydratePerSide,
  dehydrateValue,
} from './dehydrators';

/**
 * Opcode mappings for the dehydrated root `ShowdexSettings`.
 *
 * @since 1.0.3
 */
export const DehydratedShowdexSettingsMap: Record<'packageVersion' | keyof ShowdexSettings, string> = {
  packageVersion: 'v',
  // buildDate: 'b',
  colorScheme: 'cs',
  forcedColorScheme: 'fc',
  developerMode: 'dm',
  hellodex: 'hd',
  calcdex: 'cd',
};

/**
 * Opcode mappings for the dehydrated `ShowdexHellodexSettings`.
 *
 * @since 1.0.3
 */
export const DehydratedHellodexSettingsMap: Record<keyof ShowdexHellodexSettings, string> = {
  openOnStart: 'oos',
  focusRoomsRoom: 'frr',
  showBattleRecord: 'sbr',
};

/**
 * Opcode mappings for the dehydrated `ShowdexCalcdexSettings`.
 *
 * @since 1.0.3
 */
export const DehydratedCalcdexSettingsMap: Record<keyof ShowdexCalcdexSettings, string> = {
  openOnStart: 'oos',
  openAs: 'oas',
  // forcedOpenAs: 'foa',
  // closeOnEnd: 'coe',
  closeOn: 'con',
  destroyOnClose: 'doc',
  preserveRenderStates: 'prs',
  defaultAutoSelect: 'das',
  showPlayerRatings: 'spr',
  authPosition: 'aps',
  showNicknames: 'snn',
  reverseIconName: 'rin',
  openSmogonPage: 'osp',
  showAllFormes: 'saf',
  showAllOptions: 'sao',
  showNonDamageRanges: 'snd',
  downloadSmogonPresets: 'dsp',
  downloadRandomsPresets: 'drp',
  downloadUsageStats: 'dus',
  prioritizeUsageStats: 'pus',
  includeTeambuilder: 'itb',
  autoExportOpponent: 'aeo',
  defaultAutoMoves: 'dam',
  defaultShowGenetics: 'dsg',
  editPokemonTypes: 'ept',
  showMoveEditor: 'sme',
  showBaseStats: 'sbs',
  allowIllegalSpreads: 'ais',
  showUiTooltips: 'sut',
  showAbilityTooltip: 'sat',
  showItemTooltip: 'sit',
  showMoveTooltip: 'smv',
  showMatchupTooltip: 'smu',
  prettifyMatchupDescription: 'pmd',
  showMatchupDamageAmounts: 'sda',
  formatMatchupDamageAmounts: 'fda',
  copyMatchupDescription: 'cmd',
  showFieldTooltips: 'sft',
  nhkoColors: 'ncl',
  nhkoLabels: 'nlb',
};

/**
 * Dehydrates (serializes) the passed-in `settings`, typically for storing in `LocalStorage`.
 *
 * Follows a similar pattern to `dehydrateCalcdex()`, with each "root" property of the `settings` given its own "opcode":
 *
 * * `fc` refers to the `forcedColorScheme`.
 * * `dm` refers to the `developerMode`.
 * * `hd` refers to the `hellodex` settings.
 * * `cd` refers to the `calcdex` settings.
 *
 * * Note that the `colorScheme` setting is not dehydrated as it pertains to the current value at runtime, subject to change.
 *
 * With additional properties that may be useful for versioning for settings imports:
 *
 * * `v` refers to the package version (`process.env.PACKAGE_VERSION`).
 * * `b` refers to the build date (`process.env.BUILD_DATE`).
 *
 * Dehydrated `settings`, whose properties are deliminated by a semi-colon (`';'`), is in the following format:
 *
 * ```
 * v:{package_version};
 * fc:{forcedColorScheme};
 * dm:{developerMode};
 * hd:{hellodexSettings};
 * cd:{calcdexSettings}
 * ```
 *
 * * Note that the output string contains no newlines (`\n`) despite being depicted in the formatting above,
 *   which is only done for readabililty purposes.
 *
 * where `{hellodexSettings}`, whose properties are deliminated by a pipe (`'|'`), is in the following format:
 *
 * ```
 * OOS~{openOnStart}
 * FRR~{focusRoomsRoom}
 * ```
 *
 * and `{calcdexSettings}`, whose properties are deliminated by a pipe (`'|'`), is in the following format:
 *
 * ```
 * OOS~{openOnStart}|
 * OAS~{openAs}|
 * CON~{closeOn}|
 * DOC~{destroyOnClose}|
 * PRS~{preserveRenderStates}|
 * DAS~{defaultAutoSelect}|
 * APS~{authPosition}|
 * SNN~{showNicknames}|
 * RIN~{reverseIconName}|
 * OSP~{openSmogonPage}|
 * SAO~{showAllOptions}|
 * SND~{showNonDamageRanges}|
 * DSP~{downloadSmogonPresets}|
 * DUS~{downloadUsageStats}|
 * PUS~{prioritizeUsageStats}|
 * ITB~{includeTeambuilder}|
 * AEO~{autoExportOpponent}|
 * DAM~{defaultAutoMoves}|
 * DSG~{defaultShowGenetics}|
 * SME~{showMoveEditor}|
 * SAT~{showAbilityTooltip}|
 * SIT~{showItemTooltip}|
 * SMV~{showMoveTooltip}|
 * SMU~{showMatchupTooltip}|
 * PMD~{prettifyMatchupDescription}|
 * SDA~{showMatchupDamageAmounts}|
 * CMD~{copyMatchupDescription}|
 * SFT~{showFieldTooltips}|
 * NCL~{nhkoColors}|
 * NLB~{nhkoLabels}
 * ```
 *
 * @since 1.0.3
 */
export const dehydrateShowdexSettings = (settings: ShowdexSettings): string => {
  if (!Object.keys(settings || {}).length) {
    return null;
  }

  const {
    forcedColorScheme,
    developerMode,
    hellodex,
    calcdex,
  } = settings;

  const output: string[] = [
    `${DehydratedShowdexSettingsMap.packageVersion}:${env('package-version', '?')}`,
    // `${DehydratedShowdexSettingsMap.buildDate}:${env('build-date', '?')}`,
    `${DehydratedShowdexSettingsMap.forcedColorScheme}:${dehydrateValue(forcedColorScheme)}`,
    `${DehydratedShowdexSettingsMap.developerMode}:${dehydrateBoolean(developerMode)}`,
  ];

  const hellodexOutput: string[] = Object.entries(hellodex || {}).map((
    [key, value]: [
      keyof ShowdexHellodexSettings,
      ShowdexHellodexSettings[keyof ShowdexHellodexSettings],
    ],
  ) => {
    const dehydratedKey = DehydratedHellodexSettingsMap[key];

    if (!dehydratedKey) {
      return null;
    }

    const dehydratedValue = dehydrateValue(value);

    return `${dehydratedKey.toUpperCase()}~${dehydratedValue}`;
  }).filter(Boolean);

  output.push(`${DehydratedShowdexSettingsMap.hellodex}:${hellodexOutput.join('|')}`);

  const calcdexOutput: string[] = Object.entries(calcdex || {}).map((
    [key, value]: [
      keyof ShowdexCalcdexSettings,
      ShowdexCalcdexSettings[keyof ShowdexCalcdexSettings],
    ],
  ) => {
    const dehydratedKey = DehydratedCalcdexSettingsMap[key];

    if (!dehydratedKey) {
      return null;
    }

    const dehydratedValue = Array.isArray(value)
      ? dehydrateArray(value)
      : typeof value === 'object' && 'p1' in (value || {})
        ? dehydratePerSide(value)
        : dehydrateValue(value);

    return `${dehydratedKey.toUpperCase()}~${dehydratedValue}`;
  }).filter(Boolean);

  output.push(`${DehydratedShowdexSettingsMap.calcdex}:${calcdexOutput.join('|')}`);

  return output.filter(Boolean).join(';');
};
