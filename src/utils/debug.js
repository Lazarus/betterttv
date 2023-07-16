const VERSION = process.env.EXT_VER;
const {console} = window;

function log(type, ...args) {
  if (!console) return;
  console[type].apply(console, ['BTTV:', ...args]);
}

export default {
  log: log.bind(this, 'log'),
  error: log.bind(this, 'error'),
  warn: log.bind(this, 'warn'),
  info: log.bind(this, 'info'),
  version: VERSION,
};
