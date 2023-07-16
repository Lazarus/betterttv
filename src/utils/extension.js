import debug from './debug.js';

export default {
  url(path, breakCache = false) {
    // eslint-disable-next-line no-undef
    const url = chrome.extension.getURL(path);
    return `${url.toString()}${breakCache ? `?v=${debug.version}` : ''}`;
  },
};
