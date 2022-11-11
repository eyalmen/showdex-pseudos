import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { ErrorBoundary } from '@showdex/components/debug';
import { calcdexSlice, hellodexSlice } from '@showdex/redux/store';
import {
  createCalcdexRoom,
  // createSideRoom,
  // getActiveBattle,
  getAuthUsername,
  getBattleRoom,
  getCalcdexRoomId,
  // getCalcdexRoomId,
  // getSideRooms,
  hasSinglePanel,
} from '@showdex/utils/app';
import { detectAuthPlayerKeyFromBattle } from '@showdex/utils/battle';
import { calcBattleCalcdexNonce } from '@showdex/utils/calc';
import { logger } from '@showdex/utils/debug';
import type { ShowdexBootstrapper } from '@showdex/main';
import type {
  CalcdexPokemon,
  CalcdexSliceState,
  RootStore,
  ShowdexSliceState,
} from '@showdex/redux/store';
import { Calcdex } from './Calcdex';
import { CalcdexError } from './CalcdexError';
import styles from './Calcdex.module.scss';

/**
 * Object containing the function's `name` and its binded `native` function.
 *
 * * Probably could've been typed better, but not trying to wrangle TypeScript rn lol.
 *
 * @since 1.0.3
 */
export interface BattleRoomOverride<
  TFunc extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> {
  name: FunctionPropertyNames<Showdown.BattleRoom>;
  native: TFunc;
}

export const renderCalcdex = (
  dom: ReactDOM.Root,
  store: RootStore,
  battle?: Showdown.Battle | string,
  battleRoom?: Showdown.BattleRoom,
): void => dom.render((
  <ReduxProvider store={store}>
    <ErrorBoundary
      component={CalcdexError}
      battleId={typeof battle === 'string' ? battle : battle?.id}
    >
      <Calcdex
        battle={typeof battle === 'string' ? undefined : battle}
        battleId={typeof battle === 'string' ? battle : undefined}
        request={battleRoom?.request}
        onRequestOverlayClose={() => battleRoom?.toggleCalcdexOverlay?.()}
      />
    </ErrorBoundary>
  </ReduxProvider>
));

/**
 * Determines if the auth user has won/loss, then increments the win/loss counter.
 *
 * * Specify the `forceResult` argument when you know the `battle` object might not be available.
 *   - `battle` wouldn't be typically available in a `ForfeitPopup`, for instance.
 *
 * @since 1.0.6
 */
const updateBattleRecord = (
  store: RootStore,
  battle: Showdown.Battle,
  forceResult?: 'win' | 'loss',
): void => {
  const authUser = getAuthUsername();

  if (!authUser || (!battle?.id && !forceResult) || typeof store?.dispatch !== 'function') {
    return;
  }

  const playerNames = [
    battle?.p1?.name,
    battle?.p2?.name,
    battle?.p3?.name,
    battle?.p4?.name,
  ].filter(Boolean);

  const winStep = battle?.stepQueue?.find((s) => s?.startsWith('|win|'));
  const winUser = winStep?.replace?.('|win|', ''); // e.g., '|win|sumfuk' -> 'sumfuk'

  // don't update if we couldn't find the "win" step queue or a forced result wasn't provided
  if ((playerNames.length && !playerNames.includes(authUser)) || (!winUser && !forceResult)) {
    return;
  }

  const didWin = forceResult === 'win' || winUser === authUser;
  const reducerName = didWin ? 'recordWin' : 'recordLoss';

  store.dispatch(hellodexSlice.actions[reducerName]());
};

const l = logger('@showdex/pages/Calcdex/Calcdex.bootstrap');

export const calcdexBootstrapper: ShowdexBootstrapper = (
  store,
  _data,
  roomid,
) => {
  l.debug(
    'Calcdex bootstrapper was invoked;',
    'determining if there\'s anything to do...',
    '\n', 'roomid', roomid,
  );

  if (!roomid?.startsWith?.('battle-')) {
    l.debug(
      'Calcdex bootstrap request was ignored for roomid', roomid,
      'since it\'s not a BattleRoom',
    );

    return;
  }

  const battleRoom = getBattleRoom(roomid);

  const {
    $el,
    $chatFrame,
    $controls,
    $userList,
    battle,
    // tooltips,
  } = battleRoom;

  if (!battle?.id) {
    const state = store.getState()?.calcdex as CalcdexSliceState;

    // we'd typically reach this point when the user forfeits through the popup
    if (roomid in (state || {})) {
      const battleState = state[roomid];

      if (battleState?.active) {
        store.dispatch(calcdexSlice.actions.update({
          battleId: roomid,
          active: false,
        }));
      }

      const settings = (store.getState()?.showdex as ShowdexSliceState)?.settings?.calcdex;
      const calcdexRoomId = getCalcdexRoomId(roomid);

      l.debug(
        '\n', 'settings.closeOn', settings?.closeOn,
        '\n', 'battleState.renderMode', battleState.renderMode,
        '\n', 'calcdexRoomId', calcdexRoomId,
        '\n', 'calcdexRoomId in app.rooms?', calcdexRoomId in app.rooms,
      );

      // this would only apply in the tabbed panel mode, obviously
      if (battleState.renderMode === 'panel' && settings?.closeOn !== 'never' && calcdexRoomId in app.rooms) {
        l.debug(
          'Leaving calcdexRoom with destroyed battle due to user settings...',
          '\n', 'calcdexRoomId', calcdexRoomId,
        );

        // if (settings.destroyOnClose) {
        //   store.dispatch(calcdexSlice.actions.destroy(roomid));
        // }

        // this will destroy the Calcdex state if configured to, via calcdexRoom's requestLeave() handler
        app.leaveRoom(calcdexRoomId);
      }

      l.debug(
        'Calcdex for roomid', roomid, 'exists in state, but battle was forcibly ended, probably.',
        '\n', 'battleRoom', battleRoom,
        '\n', 'battleState', battleState,
      );
    } else {
      l.debug(
        'Calcdex bootstrap request was ignored for roomid', roomid,
        'since no proper battle object exists within the current BattleRoom',
      );
    }

    return;
  }

  if (typeof battle?.subscribe !== 'function') {
    l.warn(
      'Must have some jank battle object cause battle.subscribe() is apparently type',
      typeof battle?.subscribe,
    );

    return;
  }

  const {
    calcdexInit,
    // subscription,
    // prevSubscription,
    // subscriptionDirty,
  } = battle;

  // don't process this battle if we've already added (or forcibly prevented) the filth
  if (calcdexInit) {
    return;
  }

  // note: anything below here executes once per battle
  const calcdexSettings = (store.getState()?.showdex as ShowdexSliceState)?.settings?.calcdex;

  // determine if we should even init the Calcdex based on the openOnStart setting
  // (purposefully ignoring 'always', obviously)
  if (['playing', 'spectating', 'never'].includes(calcdexSettings?.openOnStart)) {
    const authPlayer = !!detectAuthPlayerKeyFromBattle(battle);

    // for 'playing', checking if there's no authPlayer cause the user would be a spectator;
    // likewise for 'spectating', checking if there is an authPlayer cause the user would be a player
    const preventInit = calcdexSettings.openOnStart === 'never'
      || (calcdexSettings.openOnStart === 'playing' && !authPlayer)
      || (calcdexSettings.openOnStart === 'spectating' && authPlayer);

    if (preventInit) {
      // const authName = getAuthUsername();

      // l.debug('Preventing Calcdex init due to openOnStart', calcdexSettings.openOnStart, 'with authName', authName);

      // prevent bootstrapping on subsequent bootstrapper calls
      // if (calcdexSettings.openOnStart !== 'playing' || authName) {
      //   battle.subscriptionDirty = true;
      //   battle.calcdexDestroyed = true; // just in case lol
      // }

      return;
    }
  }

  const openAsPanel = !calcdexSettings?.openAs
    || calcdexSettings.openAs === 'panel'
    || (calcdexSettings.openAs === 'showdown' && !hasSinglePanel());

  if (openAsPanel) {
    // create the calcdexRoom if it doesn't already exist (shouldn't tho)
    if (!battle.calcdexRoom) {
      battle.calcdexRoom = createCalcdexRoom(roomid, true, store);
    }

    // handle destroying the Calcdex when leaving the battleRoom
    const requestLeave = battleRoom.requestLeave.bind(battleRoom) as typeof battleRoom.requestLeave;

    battleRoom.requestLeave = (e) => {
      const shouldLeave = requestLeave(e);

      // ForfeitPopup probably appeared
      if (!shouldLeave) {
        // similar to the battle overlay, we'll override the submit() handler of the ForfeitPopup
        const forfeitPopup = app.popups.find((p) => (p as Showdown.ForfeitPopup).room === battleRoom);

        if (typeof forfeitPopup?.submit === 'function') {
          l.debug(
            'Overriding submit() of spawned ForfeitPopup in app.popups[]...',
            '\n', 'battleId', roomid,
          );

          const submitForfeit = forfeitPopup.submit.bind(forfeitPopup) as typeof forfeitPopup.submit;

          // unlike the battle overlay, we'll only close if configured to (and destroy if closing the room)
          forfeitPopup.submit = (data) => {
            const calcdexRoomId = getCalcdexRoomId(roomid);

            // grab the current settings
            const settings = (store.getState()?.showdex as ShowdexSliceState)?.settings?.calcdex;

            if (settings?.closeOn !== 'never' && calcdexRoomId && calcdexRoomId in (app.rooms || {})) {
              // this will trigger calcdexRoom's requestLeave() handler,
              // which may destroy the state depending on the user's settings
              app.leaveRoom(calcdexRoomId);
            }

            updateBattleRecord(store, battleRoom?.battle, 'loss');

            // call ForfeitPopup's original submit() handler
            submitForfeit(data);
          };
        }

        // don't actually leave the room, as requested by requestLeave()
        return false;
      }

      // actually leave the room
      return true;
    };

    battle.calcdexReactRoot = ReactDOM.createRoot(battle.calcdexRoom.el);
  } else { // must be opening as an overlay here
    // set the initial visibility of the overlay
    battle.calcdexOverlayVisible = false;

    // local helper function that will be called once the native BattleRoom controls
    // are rendered in the `overrides` below
    // (warning: most of this logic is from trial and error tbh -- may make very little sense LOL)
    const injectToggleButton = () => {
      // grab the updated controls HTML
      // const controlsHtml = $controls?.html?.();

      if (typeof $controls?.find !== 'function') {
        return;
      }

      // grab the latest calcdexOverlayVisible value
      const {
        calcdexOverlayVisible: visible,
      } = battleRoom?.battle || {};

      // remove the outlying <p> tags so we can inject our custom button in
      // const strippedControlsHtml = controlsHtml.replace(/^<p>(.+)<\/p>$/, '$1');

      const toggleButtonIcon = visible ? 'close' : 'calculator';
      const toggleButtonLabel = `${visible ? 'Close' : 'Open'} Calcdex`;

      const $existingToggleButton = $controls.find('button[name*="toggleCalcdexOverlay"]');
      const hasExistingToggleButton = !!$existingToggleButton.length;

      const $toggleButton = hasExistingToggleButton ? $existingToggleButton : $(`
        <button
          class="button"
          style="float: right;"
          type="button"
          name="toggleCalcdexOverlay"
        >
          <i class="fa fa-${toggleButtonIcon}"></i>
          <span>${toggleButtonLabel}</span>
        </button>
      `);

      // update the existing $toggleButton's children
      if (hasExistingToggleButton) {
        $toggleButton.children('i.fa').attr('class', `fa fa-${toggleButtonIcon}`);
        $toggleButton.children('span').text(toggleButtonLabel);
      }

      // $floatingContainer typically contains spectator & replay controls
      // (asterisk [*] in the CSS selector [style*="<value>"] checks if style includes the <value>)
      const $floatingContainer = $controls.find('div.controls span[style*="float:"]');

      if ($floatingContainer.length) {
        $floatingContainer.css('text-align', 'right');
        $toggleButton.css('float', ''); // since the container itself floats!
      }

      // $waitingContainer typically contains the "Waiting for opponent..." message
      const $waitingContainer = $controls.find('div.controls > p:first-of-type');

      // $whatDoContainer typically contains player controls (move/Pokemon selection)
      const $whatDoContainer = $controls.find('div.controls .whatdo'); // wat it dooo ??

      // doesn't matter if $whatDoContainer is empty since it'll be checked again when
      // for $controlsTarget below (by checking $controlsContainer's length)
      const $controlsContainer = $floatingContainer.length
        ? $floatingContainer
        : $waitingContainer.length
          ? $waitingContainer
          : $whatDoContainer;

      // add some spacing between a button or the control container's right side
      $toggleButton.css('margin-right', 7);

      // only add the $toggleButton if there wasn't one to begin with, obviously
      if (hasExistingToggleButton) {
        return;
      }

      // all this positioning work, which would likely break if they ever changed the HTML... LOL
      const $controlsTarget = $controlsContainer.length
        ? $controlsContainer
        : $controls;

      // button's name could be "startTimer" or "setTimer",
      // hence why we're only matching names containing (`name*=`) "Timer" lmao
      const $timerButton = $controlsTarget.find('button[name*="Timer"]');
      const hasTimerButton = !!$timerButton.length;

      if (hasTimerButton) {
        $toggleButton.insertAfter($timerButton);
      } else {
        // $controlsTarget.html(`<p>${toggleButtonHtml}${strippedControlsHtml}</p>`);
        $controlsTarget[hasTimerButton ? 'append' : 'prepend']($toggleButton);
      }
    };

    // there are lots of different functions for rendering the controls,
    // which all need to be individually overridden :o
    const overrides: BattleRoomOverride[] = ([
      'updateControls', // p, div.controls p
      'updateControlsForPlayer', // conditionally calls one of the update*Controls() below
      'updateMoveControls', // div.controls .whatdo
      'updateSwitchControls', // div.controls .whatdo
      'updateTeamControls', // div.controls .whatdo
      'updateWaitControls', // div.controls p
    ] as FunctionPropertyNames<Showdown.BattleRoom>[]).map((name) => ({
      name,
      native: typeof battleRoom[name] === 'function'
        ? battleRoom[name].bind(battleRoom) as typeof battleRoom[typeof name]
        : null,
    })).filter((o) => typeof o.native === 'function');

    // this could've been more disgusting by chaining it directly to the filter,
    // but I sense my future self will appreciate the slightly improved readability lmao
    overrides.forEach(({
      name,
      native,
    }) => {
      // sometimes you gotta do what you gotta do to get 'er done
      // (but this definitely hurts my soul lmfao)
      (battleRoom as unknown as Record<FunctionPropertyNames<Showdown.BattleRoom>, (...args: unknown[]) => void>)[name] = (
        ...args: unknown[]
      ) => {
        // run the native function first since it modifies $controls (from battleRoom)
        native(...args);
        injectToggleButton();
      };
    });

    // $rootContainer[0] references the underlying HTMLDivElement created below,
    // which will house the React DOM root
    const $rootContainer = $(`<div class="${styles.overlayContainer}"></div>`);

    // since the Calcdex overlay is initially hidden,
    // make sure we apply the display: none; so that the chat isn't blocked by an invisible div
    $rootContainer.css('display', 'none');

    // button handler (which is the value of its name prop)
    battleRoom.toggleCalcdexOverlay = () => {
      battle.calcdexOverlayVisible = !battle.calcdexOverlayVisible;

      const battleRoomStyles: React.CSSProperties = {
        display: battle.calcdexOverlayVisible ? 'block' : 'none',
        opacity: battle.calcdexOverlayVisible ? 0.3 : 1,
        visibility: battle.calcdexOverlayVisible ? 'hidden' : 'visible',
      };

      $rootContainer.css('display', battleRoomStyles.display);
      $chatFrame.css('opacity', battleRoomStyles.opacity);
      $el.find('.battle-log-add').css('opacity', battleRoomStyles.opacity);
      $userList.css('visibility', battleRoomStyles.visibility);

      // omfg didn't know $chatbox was constantly being focused, which was the source of my distress >:(
      // you won't believe how many hours I spent googling to find the source of this problem,
      // which was dropdowns would open, then immediately close. happened only when opening as a
      // Battle Overlay... and it was very inconsistent... LOL
      // (shoutout to SpiffyTheSpaceman for helping me debug this in < 5 minutes while blasted af)
      // also note that $chatbox comes and goes, so sometimes it's null, hence the check
      if (battleRoom.$chatbox?.length) {
        battleRoom.$chatbox.prop('disabled', battle.calcdexOverlayVisible);
      }

      // found another one lol (typically in spectator mode)
      if (battleRoom.$chatAdd?.length) {
        const $joinButton = battleRoom.$chatAdd.find('button');

        if ($joinButton.length) {
          $joinButton.prop('disabled', battle.calcdexOverlayVisible);
        }
      }

      // for mobile (no effect on desktops), prevent pinch zooming and zooming on input focus
      if (battle.calcdexOverlayVisible) {
        const $existingMeta = $('meta[data-calcdex*="no-mobile-zoom"]');

        if ($existingMeta.length) {
          $existingMeta.attr('content', 'width=device-width, initial-scale=1, maximum-scale=1');
        } else {
          $('head').append(`
            <meta
              data-calcdex="no-mobile-zoom"
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1"
            />
          `);
        }
      } else {
        // allow pinch zooming again once the Calcdex is closed
        // (warning: not enough to just remove the meta tag as the browser will continue to enforce the no pinch zoom!)
        $('meta[data-calcdex*="no-mobile-zoom"]').attr('content', 'width=device-width, user-scalable=yes');
      }

      // re-render the Calcdex React root only when opening
      if (battle.calcdexOverlayVisible) {
        battle.subscription('callback');
      }

      // most BattleRoom button callbacks seem to do this at the end lol
      battleRoom.updateControls();
    };

    // render the $rootContainer in the entire battleRoom itself
    // (couldn't get it to play nicely when injecting into $chatFrame sadge)
    // (also, $rootContainer's className is the .overlayContainer module to position it appropriately)
    $el.append($rootContainer);
    battle.calcdexReactRoot = ReactDOM.createRoot($rootContainer[0]);

    // handle destroying the Calcdex when leaving the battleRoom
    const requestLeave = battleRoom.requestLeave.bind(battleRoom) as typeof battleRoom.requestLeave;

    battleRoom.requestLeave = (e) => {
      const shouldLeave = requestLeave(e);

      // ForfeitPopup probably appeared
      if (!shouldLeave) {
        // attempt to find the ForfeitPopup to override its submit() callback to destroy the Calcdex
        // (otherwise, the state will remain in the Hellodex since the battleRoom's overrides didn't fire)
        const forfeitPopup = app.popups.find((p) => (p as Showdown.ForfeitPopup).room === battleRoom);

        if (typeof forfeitPopup?.submit === 'function') {
          l.debug(
            'Overriding submit() of spawned ForfeitPopup in app.popups[]...',
            '\n', 'battleId', roomid,
          );

          const submitForfeit = forfeitPopup.submit.bind(forfeitPopup) as typeof forfeitPopup.submit;

          forfeitPopup.submit = (data) => {
            store.dispatch(calcdexSlice.actions.destroy(roomid));
            updateBattleRecord(store, battleRoom?.battle, 'loss');
            submitForfeit(data);
          };
        }

        // don't actually leave the room, as requested by requestLeave()
        return false;
      }

      const battleId = battle?.id || roomid;

      if (battleId) {
        store.dispatch(calcdexSlice.actions.destroy(battleId));

        if (battle?.id) {
          battle.calcdexDestroyed = true;
        }
      }

      // actually leave the room
      return true;
    };
  }

  // override each player's addPokemon() method to assign a calcdexId lol
  (['p1', 'p2', 'p3', 'p4'] as Showdown.SideID[]).forEach((playerKey) => {
    if (!(playerKey in battle) || typeof battle[playerKey]?.addPokemon !== 'function') {
      return;
    }

    l.debug(
      'Overriding addPokemon() of player', playerKey,
      '\n', 'battleId', roomid,
    );

    const side = battle[playerKey];
    const addPokemon = side.addPokemon.bind(side) as Showdown.Side['addPokemon'];

    side.addPokemon = (name, ident, details, replaceSlot) => {
      // we'll collect potential candidates to assemble the final search list below
      const pokemonSearchCandidates: (Showdown.Pokemon | CalcdexPokemon)[] = [];

      // make sure this comes first before `pokemonState` in case `replaceSlot` is specified
      if (side.pokemon?.length) {
        pokemonSearchCandidates.push(...side.pokemon);
      }

      // retrieve any previously tagged Pokemon in the state if we don't have any candidates atm
      const battleState = (store.getState()?.calcdex as CalcdexSliceState)?.[battle.id];
      const pokemonState = battleState?.[playerKey]?.pokemon || [];

      if (pokemonState.length) {
        pokemonSearchCandidates.push(...pokemonState);
      }

      // don't filter this in case `replaceSlot` is specified
      const pokemonSearchList = pokemonSearchCandidates.map((p) => ({
        calcdexId: p.calcdexId,
        ident: p.ident,
        // name: p.name,
        speciesForme: p.speciesForme,
        details: p.details,
        searchid: p.searchid,
      }));

      // just js things uwu
      const prevPokemon = (replaceSlot > -1 && pokemonSearchList[replaceSlot])
        || pokemonSearchList.filter((p) => !!p.calcdexId).find((p) => (
          (!!ident && (
            (!!p?.ident && p.ident === ident)
              || (!!p?.searchid && p.searchid.includes(ident))
          ))
            || (!!details && (
              (!!p?.details && p.details === details)
                || (!!p?.searchid && p.searchid.includes(details))
                || (!!p?.speciesForme && !p.speciesForme.endsWith('-*') && details.includes(p.speciesForme))
            ))
        ));

      l.debug(
        'side.addPokemon()', 'w/ name', name, 'for player', side.sideid,
        '\n', 'ident', ident,
        '\n', 'details', details,
        '\n', 'replaceSlot', replaceSlot,
        '\n', 'prevPokemon', prevPokemon,
        '\n', 'pokemonSearchList', pokemonSearchList,
        // '\n', 'side', side,
        // '\n', 'battle', battle,
      );

      const newPokemon = addPokemon(name, ident, details, replaceSlot);

      if (prevPokemon?.calcdexId) {
        newPokemon.calcdexId = prevPokemon.calcdexId;

        l.debug(
          'Restored calcdexId', newPokemon.calcdexId,
          'from prevPokemon', prevPokemon.ident || prevPokemon.speciesForme,
          'to newPokemon', newPokemon.ident || newPokemon.speciesForme,
          'for player', side.sideid,
          '\n', 'prevPokemon', prevPokemon,
          '\n', 'newPokemon', newPokemon,
        );
      }

      return newPokemon;
    };
  });

  l.debug(
    'Overriding updateSide() of the current battleRoom',
    '\n', 'battleId', roomid,
  );

  const updateSide = battleRoom.updateSide.bind(battleRoom) as typeof battleRoom.updateSide;

  battleRoom.updateSide = () => {
    // grab a copy of myPokemon before updateSide() unleashes valhalla on it
    const myPokemon = [...(battleRoom.battle?.myPokemon || [])];

    // now run the original function, which will directly mutate myPokemon from
    // battleRoom.requests.side.pokemon
    updateSide();

    l.debug(
      'updateSide()',
      '\n', 'battleId', roomid,
      '\n', 'myPokemon', '(prev)', myPokemon, '(now)', battleRoom.battle.myPokemon,
    );

    let didUpdate = !myPokemon?.length
      && !!battleRoom.battle.myPokemon?.length;

    // with each updated myPokemon, see if we find a match to restore its calcdexId
    battleRoom.battle.myPokemon.forEach((pokemon) => {
      if (!pokemon?.ident || pokemon.calcdexId) {
        return;
      }

      const prevMyPokemon = myPokemon.find((p) => (
        p.ident === pokemon.ident
          || p.speciesForme === pokemon.speciesForme
          || p.details === pokemon.details
          || p.details.includes(pokemon.speciesForme)
      ));

      if (!prevMyPokemon?.calcdexId) {
        return;
      }

      pokemon.calcdexId = prevMyPokemon.calcdexId;
      didUpdate = true;
    });

    if (didUpdate && battleRoom.battle.calcdexInit) {
      const prevNonce = battleRoom.battle.nonce;

      battleRoom.battle.nonce = calcBattleCalcdexNonce(battleRoom.battle);

      l.debug(
        'Restored previous calcdexId\'s in battle.myPokemon[]',
        '\n', 'nonce', '(prev)', prevNonce, '(now)', battleRoom.battle.nonce,
        '\n', 'myPokemon', '(prev)', myPokemon, '(now)', battleRoom.battle.myPokemon,
      );

      // battleRoom.battle.subscription('callback');
    }
  };

  l.debug(
    'battle\'s subscription() isn\'t dirty yet!',
    'About to inject some real filth into battle.subscribe()...',
    '\n', 'battleId', roomid,
    '\n', 'typeof battle.subscription', typeof battle.subscription,
    '\n', 'battle', battle,
  );

  const prevSubscription = battle.subscription?.bind?.(battle) as typeof battle.subscription;

  // note: battle.subscribe() internally sets its `subscription` property to the `listener` arg
  // (in js/battle.js) battle.subscribe = function (listener) { this.subscription = listener; };
  battle.subscribe((state) => {
    l.debug(
      'subscribe()',
      '\n', 'state (argv[0])', state,
      '\n', 'typeof prevSubscription', typeof prevSubscription,
      '\n', 'battleId', battle?.id || roomid,
      '\n', 'battle', battle,
    );

    // call the original subscription() first, if any, so we don't break anything we don't mean to!
    prevSubscription?.(state);

    // update (2022/10/13): allowing paused battle states to trigger a re-render
    // if (state === 'paused') {
    //   l.debug(
    //     'Subscription ignored cause the battle is paused or, probs more likely, ended',
    //     '\n', 'battleId', roomid,
    //   );
    //
    //   return;
    // }

    // don't render if we've already destroyed the battleState
    // (via calcdexRoom's requestLeave() when leaving via app.leaveRoom())
    if (battle.calcdexDestroyed) {
      l.debug(
        'Calcdex battleState has been destroyed',
        '\n', 'battleId', roomid,
      );

      return;
    }

    if (!battle?.id) {
      l.debug(
        'No valid battle object was found',
        '\n', 'battleId', roomid,
      );

      return;
    }

    if (battle.id !== roomid) {
      l.debug(
        'Current battle update is not for this battleRoom',
        '\n', 'battleId', '(init)', roomid, '(recv)', battle.id,
      );

      return;
    }

    // since this is inside a function, we need to grab a fresher snapshot of the Redux state
    const currentState = store.getState();

    // don't use calcdexSettings here cause it may be stale
    const settings = (currentState.showdex as ShowdexSliceState)?.settings?.calcdex;
    const battleState = (currentState.calcdex as CalcdexSliceState)?.[battle.id];

    // make sure the battle was active on the previous sync, but now has ended
    const battleEnded = battle.ended
      || battleRoom.battleEnded
      || battleRoom.expired;

    if (battleState?.active && battleEnded) {
      const calcdexRoomId = battle.calcdexRoom?.id
        || getCalcdexRoomId(roomid);

      l.debug(
        'Battle ended; updating active state...',
        '\n', 'battleId', battle?.id || roomid,
        '\n', 'calcdexRoomId', calcdexRoomId,
        '\n', 'battle', battle,
      );

      store.dispatch(calcdexSlice.actions.update({
        battleId: battle.id,
        battleNonce: battle.nonce,
        active: false,
      }));

      updateBattleRecord(store, battle);

      // only close the calcdexRoom if configured to
      // (here, it's only on 'battle-end' since we're specifically handling that scenario rn)
      if (settings?.closeOn === 'battle-end' && calcdexRoomId && calcdexRoomId in (app.rooms || {})) {
        l.debug(
          'Leaving calcdexRoom due to user settings...',
          '\n', 'battleId', battle?.id || roomid,
          '\n', 'calcdexRoomId', calcdexRoomId,
          '\n', 'battle', battle,
        );

        // sets battle.calcdexDestroyed to true and
        // removes the calcdexRoom & calcdexReactRoot properties
        app.leaveRoom(calcdexRoomId);
      }

      return;
    }

    // note: since we're filtering the subscription callback to avoid UI spamming,
    // we get the value of battleRoom.request right before it updates on the next callback.
    // not a big deal tho, but it's usually first `null`, then becomes populated on the
    // next Calcdex render callback (i.e., here).
    battle.nonce = calcBattleCalcdexNonce(battle, battleRoom.request);

    if (!battle.calcdexReactRoot) {
      return;
    }

    l.debug(
      'Rendering Calcdex for battle', battle.id || roomid,
      '\n', 'nonce', battle.nonce,
      '\n', 'request', battleRoom.request,
      '\n', 'battle', battle,
    );

    renderCalcdex(
      battle.calcdexReactRoot,
      store,
      battle,
      battleRoom,
    );
  });

  battle.calcdexInit = true;
};
