import debug from './debug.js';

let currentScript;

export default {
  setCurrentScript(newCurrentScript) {
    currentScript = newCurrentScript;
  },
  url(path, breakCache = false) {
    const url = chrome.extension.getURL(path);
    // const url = new URL(path, currentScript.src);
    return `${url.toString()}${breakCache ? `?v=${debug.version}` : ''}`;
  },
};
