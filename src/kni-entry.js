
// @ts-check
import Engine from 'kni/engine.js';
import KniDocument from 'kni/document.js';
import story from 'virtual:story';

/** @import { Waypoint } from './types.d.ts' */

/** @type {import('./types.d.ts').HandlerInterface & { storageKey: string, shouldLog: boolean, log(...args: unknown[]): void }} */
const handler = {
  storageKey: 'kni',

  shouldLog: true,
  log(...args) {
    if (this.shouldLog) {
      console.log(...args);
    }
  },

  load() {
    if (window.location.hash.length > 1) {
      const json = atob(window.location.hash.slice(1));
      return JSON.parse(json);
    }
    const json = window.localStorage.getItem(this.storageKey);
    if (json) {
      const state = JSON.parse(json);
      window.history.replaceState(state, '', `#${btoa(json)}`);
      return state;
    }
    return null;
  },
  /**
   * @param {Waypoint} waypoint
   */
  waypoint(waypoint) {
    const json = JSON.stringify(waypoint);
    window.history.pushState(waypoint, '', `#${btoa(json)}`);
    localStorage.setItem(this.storageKey, json);
  },
  /**
   * @param {string} label
   */
  goto(label) {
    this.log(label);
  },
  /**
   * @param {string} text
   */
  answer(text) {
    this.log('>', text);
  },

  ask() {
    doc.frame.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  },

  end() {
    doc.frame.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  },
};

const doc = new KniDocument(document.querySelector("#kni-body"));

const engine = new Engine({
  story: story,
  render: doc,
  dialog: /** @type {import('./types.d.ts').DialogInterface} */ (/** @type {unknown} */ (doc)),
  handler,
});

/**
 * @param {PopStateEvent} event
 */
window.onpopstate = event => {
  handler.log('>', 'back');
  engine.resume(event.state);
};

/**
 * @param {KeyboardEvent} event
 */
window.onkeypress = event => {
  const code = event.code;
  const match = /^Digit(\d+)$/.exec(code);
  if (match) {
    engine.answer(match[1]);
    doc.frame.scrollIntoView();
  } else if (code === 'KeyR') {
    console.warn('reset');
    doc.parent.innerHTML = '';
    engine.reset();
  }
};

const reset = document.querySelector('#kni-reset');
if (reset && reset instanceof HTMLElement) {
  reset.onclick = () => {
    console.warn('reset');
    doc.parent.innerHTML = '';
    engine.reset();
  };
}

doc.clear();

try {
  engine.resume(handler.load());
} catch (error) {
  console.error('unable to load prior state, restarting', error);
  engine.resume(null);
}
