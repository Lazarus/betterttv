import $ from 'jquery';
import watcher from '../../watcher.js';
import colors from '../../utils/colors.js';
import twitch from '../../utils/twitch.js';
import api from '../../utils/api.js';
import cdn from '../../utils/cdn.js';
import html from '../../utils/html.js';
import settings from '../../settings.js';
import emotes from '../emotes/index.js';
// import splitChat from '../split_chat/index.js';
import {SettingIds, UsernameFlags} from '../../constants.js';
import {hasFlag} from '../../utils/flags.js';
import {getCurrentChannel} from '../../utils/channel.js';

const EMOTE_STRIP_SYMBOLS_REGEX = /(^[~!@#$%^&*()]+|[~!@#$%^&*()]+$)/g;
const EMOTES_TO_CAP = ['567b5b520e984428652809b6'];
const MAX_EMOTES_WHEN_CAPPED = 10;

const badgeTemplate = (url, description) => `
  <div class="bttv-tooltip-wrapper bttv-chat-badge-container">
    <img alt="Moderator" class="chat-badge bttv-chat-badge" src="${url}" alt="" srcset="" data-a-target="chat-badge">
    <div class="bttv-tooltip bttv-tooltip--up" style="margin-bottom: 0.9rem;">${description}</div>
  </div>
`;

const staff = new Map();
const globalBots = ['nightbot', 'moobot'];
let channelBots = [];

function getMessagePartsFromMessageElement($message) {
  // return $message.find('span[data-a-target="chat-message-text"]');
  return $message.find('.messagesMessage span.message');
}

class ChatModule {
  constructor() {
    watcher.on('chat.message', ($element, message) => this.messageParser($element, message));
    watcher.on('channel.updated', ({bots}) => {
      channelBots = bots;
    });
    watcher.on('emotes.updated', (name) => {
      const messages = twitch.getChatMessages(name);

      for (const {element} of messages) {
        this.messageReplacer(getMessagePartsFromMessageElement($(element)), undefined);
      }
    });

    api.get('cached/badges').then((badges) => {
      badges.forEach(({name, badge}) => staff.set(name, badge));
    });
  }

  calculateColor(color) {
    if (!hasFlag(settings.get(SettingIds.USERNAMES), UsernameFlags.READABLE)) {
      return color;
    }

    return colors.calculateColor(color, settings.get(SettingIds.DARKENED_MODE));
  }

  customBadges($element, user) {
    if ((globalBots.includes(user.name) || channelBots.includes(user.name)) && user.mod) {
      $element.find('img.chat-badge[alt="Moderator"]').replaceWith(badgeTemplate(cdn.url('tags/bot.png'), 'Bot'));
    }

    let $badgesContainer = $element.find('.chat-badge').closest('span');
    if (!$badgesContainer.length) {
      $badgesContainer = $element.find('span.chat-line__username').prev('span');
    }

    const badge = staff.get(user.name);
    if (badge) {
      $badgesContainer.append(badgeTemplate(badge.svg, badge.description));
    }

    const currentChannel = getCurrentChannel();
    if (currentChannel && currentChannel.name === 'night') {
      $badgesContainer.append(badgeTemplate(cdn.url('tags/subscriber.png'), 'Subscriber'));
    }
  }

  messageReplacer($message, user) {
    const tokens = $message.contents();
    // console.log({$message, tokens});
    let cappedEmoteCount = 0;
    for (let i = 0; i < tokens.length; i++) {
      const node = tokens[i];

      let data;
      if (node.nodeType === window.Node.ELEMENT_NODE && node.nodeName === 'SPAN') {
        data = $(node).text();
      } else if (node.nodeType === window.Node.TEXT_NODE) {
        data = node.data;
      } else {
        continue;
      }

      const parts = data.split(' ');
      let modified = false;
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (!part || typeof part !== 'string') {
          continue;
        }

        // const steamJoinLink = part.match(STEAM_LOBBY_JOIN_REGEX);
        // if (steamJoinLink) {
        //   parts[j] = steamLobbyJoinTemplate(steamJoinLink[0]);
        //   modified = true;
        //   continue;
        // }
        const emote =
          emotes.getEligibleEmote(part, user) ||
          emotes.getEligibleEmote(part.replace(EMOTE_STRIP_SYMBOLS_REGEX, ''), user);
        if (emote) {
          parts[j] =
            EMOTES_TO_CAP.includes(emote.id) && ++cappedEmoteCount > MAX_EMOTES_WHEN_CAPPED ? '' : emote.toHTML();
          modified = true;
          continue;
        }

        // escape all non-emotes since html strings would be rendered as html
        parts[j] = html.escape(parts[j]);
      }

      if (modified) {
        // TODO: find a better way to do this (this seems most performant tho, only a single mutation vs multiple)
        const span = document.createElement('span');
        span.className = 'bttv-message-container';
        span.innerHTML = parts.join(' ');
        node.replaceWith(span);
      }
    }
  }

  messageParser($element, messageObj) {
    if ($element[0].__bttvParsed) return;
    if (messageObj.tagName !== 'LI') return;

    // splitChat.render($element);

    /*
    const color = this.calculateColor(user.color);
    const $from = $element.find('.chat-author__display-name,.chat-author__intl-login');
    $from.css('color', color);

    if (legacySubscribers.hasGlow(user.name) && settings.get(SettingIds.DARKENED_MODE) === true) {
      const rgbColor = colors.getRgb(color);
      $from.css('text-shadow', `0 0 20px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.8)`);
    }

    this.customBadges($element, user);

    const nickname = nicknames.get(user.name);
    if (nickname) {
      $from.text(nickname);
    }

    if ($element[0].style.color) {
      $element.css('color', color);
    }

    if (
      (modsOnly === true && !user.mod) ||
      (subsOnly === true && !user.subscriber) ||
      (asciiOnly === true && hasNonASCII(messageObj.message))
    ) {
      $element.hide();
    }

    const $modIcons = $element.find('.mod-icon');
    if ($modIcons.length) {
      const userIsOwner = twitch.getUserIsOwnerFromTagsBadges(user.badges);
      const userIsMod = twitch.getUserIsModeratorFromTagsBadges(user.badges);
      const currentUserIsOwner = twitch.getCurrentUserIsOwner();
      if ((userIsMod && !currentUserIsOwner) || userIsOwner) {
        $modIcons.remove();
      }
    }
    */

    this.messageReplacer(getMessagePartsFromMessageElement($element), undefined);

    $element[0].__bttvParsed = true;
  }
}

export default new ChatModule();
