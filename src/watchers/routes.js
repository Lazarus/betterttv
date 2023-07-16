import $ from 'jquery';
import twitch from '../utils/twitch.js';
import debug from '../utils/debug.js';
import domObserver from '../observers/dom.js';
import historyObserver from '../observers/history.js';

let watcher;
let currentPath = '';

const loadPredicates = {
  following: () => !!$('ul[role="tablist"] div[data-test-selector="ACTIVE_TAB_INDICATOR"]').length,
  channel: () => {
    const href =
      $('.channel-header__user-avatar img').attr('src') ||
      $('h3[data-test-selector="side-nav-channel-info__name_link"] a').attr('href') ||
      $('.channel-info-content a figure img').attr('src');
    return !!href && !!twitch.updateCurrentChannel();
  },
  chat: () => {
    // if (!twitch.updateCurrentChannel()) return false;

    // if (!$('section[data-test-selector="chat-room-component-layout"]').length) return false;

    if (!$('#messages').length) return false;

    // const lastReference = currentChatReference;
    // const currentChat = twitch.getCurrentChat();
    // if (!currentChat) return false;

    // let checkReferences = true;
    // if (context && context.forceReload) {
    //   if (context.checkReferences === undefined) {
    //     context.checkReferences = true;
    //   }
    //   checkReferences = context.checkReferences;
    //   context.checkReferences = false;
    // }

    // if (checkReferences) {
    //   if (currentChat === lastReference) return false;
    //   if (currentChat.props.channelID === currentChatChannelId) return false;
    // }
    // currentChatReference = currentChat;
    // currentChatChannelId = '57292293';

    return true;
  },
  player: () => !!twitch.getCurrentPlayer(),
  vod: () => !!twitch.updateCurrentChannel(),
  homepage: () => !!$('.front-page-carousel .video-player__container').length,
};

const routes = {
  HOMEPAGE: 'HOMEPAGE',
  DIRECTORY_FOLLOWING_LIVE: 'DIRECTORY_FOLLOWING_LIVE',
  DIRECTORY_FOLLOWING: 'DIRECTORY_FOLLOWING',
  DIRECTORY: 'DIRECTORY',
  CHAT: 'CHAT',
  CHANNEL: 'CHANNEL',
  CHANNEL_SQUAD: 'CHANNEL_SQUAD',
  DASHBOARD: 'DASHBOARD',
  VOD: 'VOD',
};

function waitForLoad(type, context = null) {
  let timeout;
  let interval;
  const startTime = Date.now();
  return Promise.race([
    new Promise((resolve) => {
      timeout = setTimeout(resolve, 10000);
    }),
    new Promise((resolve) => {
      const loaded = loadPredicates[type];
      if (loaded(context)) {
        resolve();
        return;
      }
      interval = setInterval(() => loaded(context) && resolve(), 100);
    }),
  ])
    .then(() => {
      debug.log(`waited for ${type} load: ${Date.now() - startTime}ms`);
      clearTimeout(timeout);
      clearInterval(interval);
    })
    .then(() => watcher.emit('load'));
}

function getRouteFromPath() {
  return routes.CHAT;
}

function onRouteChange(location) {
  const lastPath = currentPath;
  const path = location.pathname;
  const route = getRouteFromPath();

  debug.log(`New route: ${location.pathname} as ${route}`);

  // trigger on all loads (like resize functions)
  watcher.emit('load');

  currentPath = path;
  if (currentPath === lastPath) return;

  waitForLoad('chat').then(() => watcher.emit('load.chat'));
}

export default function routesWatcher(watcher_) {
  watcher = watcher_;

  historyObserver.on('pushState', (location) => onRouteChange(location));
  historyObserver.on('replaceState', (location) => onRouteChange(location));
  historyObserver.on('popState', (location) => onRouteChange(location));
  onRouteChange(window.location);

  // force reload chat when the input gets recreated (popout open/close)
  domObserver.on('#textEntryEditable', (node, isConnected) => {
    if (!isConnected) return;

    twitch.updateCurrentChannel();
    watcher.emit('load.chat');
  });

  // force reload player when the player gets recreated
  domObserver.on('.persistent-player', (node, isConnected) => {
    if (!isConnected) return;
    waitForLoad('player').then(() => watcher.emit('load.player'));
  });
}
