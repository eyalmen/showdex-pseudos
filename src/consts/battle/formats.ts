/**
 * Labels for rendering group labels in the Pokemon presets dropdown.
 *
 * * Used to be all abbreviations, but since v0.1.3, these are now spelled out
 *   for less-common formats, like `'AG'` (Anything Goes) and `'BH'` (Balanced Hackmons).
 *
 * @since 0.1.0
 */
export const FormatLabels: Record<string, string> = {
  '1v1': '1v1',
  '2v2doubles': '2v2 2X',
  almostanyability: 'Almost Any Ability',
  alternatium: 'Alternatium',
  anythinggoes: 'Anything Goes',
  balancedhackmons: 'Balanced Hackmons',
  battlefactory: 'Battle Factory',
  battlespotsingles: 'Battle Spot 1X',
  battlespotdoubles: 'Battle Spot 2X',
  battlestadiumsingles: 'Battle Stadium 1X',
  battlestadiumdoubles: 'Battle Stadium 2X',
  battlestadiumdoublesseries13: 'Battle Stadium 2X S13',
  bdsp3v3singles: '3v3 BDSP 1X',
  bdspbattlefestivaldoubles: 'Battle Fest BDSP 2X',
  bdspcap: 'CAP BDSP',
  bdspmonotype: 'Mono BDSP',
  bdspnu: 'NU BDSP',
  bdspou: 'OU BDSP', // BrilliantDiamondShiningPearl
  bdsppurehackmons: 'Pure Hackmons BDSP',
  bdsprandombattle: 'Randoms BDSP',
  bdspru: 'RU BDSP',
  bdspubers: 'Ubers BDSP',
  bdspuu: 'UU BDSP',
  bssfactory: 'BSS Factory',
  camomons: 'Camomons',
  cap: 'CAP', // CreateAPokemon (no cap, always factual)
  cap1v1: 'CAP 1v1',
  caplc: 'CAP LC',
  challengecup: 'Challenge Cup',
  challengecup1v1: 'Challenge Cup 1v1',
  challengecup2v2: 'Challenge Cup 2v2',
  crossevolution: 'Cross Evo',
  customgame: 'Customs',
  doublescustomgame: 'Customs 2X',
  doubleshackmonscup: 'Hackmons Cup 2X',
  doubleslc: 'LC 2X',
  doublesou: 'OU 2X',
  doublesubers: 'Ubers 2X',
  doublesuu: 'UU 2X',
  freeforall: 'FFA',
  freeforallrandombattle: 'Randoms FFA',
  gbusingles: 'GBU 1X',
  godlygift: 'Godly Gift',
  hackmonscup: 'Hackmons Cup',
  inheritance: 'Inheritance',
  japaneseou: 'OU Japanese',
  joltemonsrandombattle: 'Randoms JolteMons',
  lc: 'LC', // LittleCup
  lcuu: 'UU LC',
  letsgoou: 'OU LGPE', // LetsGoPikachuEevee
  letsgorandombattle: 'Randoms LGPE',
  linked: 'Linked',
  metronomebattle: 'Metronome',
  mixandmega: 'Mix & Mega',
  monotype: 'Mono',
  monotypebattlefactory: 'Battle Factory Mono',
  monotyperandombattle: 'Randoms Mono',
  multibility: 'Multibility',
  multirandombattle: 'Randoms Multibility',
  nationaldex: 'National Dex',
  nationaldexag: 'National Dex AG',
  nationaldexbh: 'National Dex B-Hackmons',
  nationaldexmonotype: 'National Dex Mono',
  nationaldexru: 'National Dex RU',
  nationaldexuu: 'National Dex UU',
  natureswap: 'Nature Swap',
  nextou: 'OU Next',
  nfe: 'NFE', // NotFullyEvolved
  nintendocup1997: 'Nintendo Cup 1997',
  nintendocup2000: 'Nintendo Cup 2000',
  nu: 'NU', // NeverUsed
  ou: 'OU', // OverUsed
  oublitz: 'OU Blitz', // went w/ BZ for Blitz cause BL = BanList! (like in PUBL, UUBL, etc.)
  partnersincrime: 'Partners-in-Crime',
  pickyourteamrandombattle: 'Randoms Pick-Your-Team',
  pokebilities: 'Pokebilities',
  pu: 'PU', // PU (as in, "P-U, smells like ass"... I think)
  purehackmons: 'Pure Hackmons',
  randombattle: 'Randoms',
  randombattleblitz: 'Randoms Blitz',
  randombattlemayhem: 'Randoms Mayhem',
  randombattlenodmax: 'Randoms No-Dmax',
  randomdex: 'Randoms Dex',
  randomdoublesbattle: 'Randoms 2X',
  revelationmons: 'Revelationmons',
  ru: 'RU', // RarelyUsed
  sharedpower: 'Shared Power',
  spikemuthcup: 'Spikemuth Cup',
  stabmons: 'Stabmons', // SameTypeAttackBonus
  stadiumou: 'OU Stadium',
  superstaffbros4: 'Super Staff Bros 4',
  thelosersgame: 'The Loser Game',
  tagteamsingles: 'Tag Team 1X',
  tradebacksou: 'OU Tradebacks',
  triplescustomgame: 'Customs 3X',
  ubers: 'Ubers',
  ultimatefinale: 'Ultimate Finale',
  unratedrandombattle: 'Randoms Unrated',
  uu: 'UU', // UnderUsed
  vgc2009: 'VGC 2009', // VideoGameChampionships
  vgc2010: 'VGC 2010',
  vgc2011: 'VGC 2011',
  vgc2012: 'VGC 2012',
  vgc2013: 'VGC 2013',
  vgc2014: 'VGC 2014',
  vgc2015: 'VGC 2015',
  vgc2016: 'VGC 2016',
  vgc2017: 'VGC 2017',
  vgc2018: 'VGC 2018',
  vgc2019: 'VGC 2019',
  vgc2020: 'VGC 2020',
  vgc2021: 'VGC 2021',
  vgc2022: 'VGC 2022',
  vgc2023: 'VGC 2023',
  zu: 'ZU', // ZeroUsed
};

/**
 * Formats where abilities and moves should be locked to legal values.
 *
 * * Make sure to remove the gen before searching through this array.
 *   - e.g., `'gen8ou'` -> `'ou'`
 * * Formats not in this array should allow any illegal abilities and moves to be selected.
 *   - However, if no Pokemon legal abilities and/or moves are available,
 *     all abilities and/or moves will be shown, including illegal ones.
 *   - This case would most likely be caused by Pokemon not being present in the `dex`'s generation.
 *   - See `buildAbilityOptions()` and `buildMoveOptions()` for implementation details.
 * * Note that this list is not final and is subject to change in subsequent versions.
 *
 * @since 1.0.1
 */
export const LegalLockedFormats: string[] = [
  '1v1',
  '2v2doubles',
  'battlefactory',
  'battlestadiumdoublesseries13',
  'battlestadiumsingles',
  'bdspbattlefestivaldoubles',
  'bdspdoublesou',
  'bdsplc',
  'bdspmonotype',
  'bdspnu',
  'bdspou',
  'bdsprandombattle',
  'bdspru',
  'bdspubers',
  'bdspuu',
  'bssfactory',
  'doubleslc',
  'doublesou',
  'doublesubers',
  'doublesuu',
  'freeforallrandombattle',
  'lc',
  'lcuu',
  'letsgorandombattle',
  'monotype',
  'multirandombattle',
  'nationaldex',
  'nationaldexmonotype',
  'nationaldexru',
  'nationaldexuu',
  'nu',
  'ou',
  'oublitz',
  'pu',
  'randombattle',
  'randombattleblitz',
  'randomdoublesbattle',
  'ru',
  'ubers',
  'unratedrandombattle',
  'uu',
  'zu',
];
