import json1 from './json1.js';
import morphdom from './morphdom.js';
import {parseHtml, serializeHtml} from './html-utils.js';

const maxTextLength = 1024 * 1024;

const _getKeyPath = (parent, child) => {
  const result = [];
  for (; child; child = child.parentNode) {
    if (child === parent) {
      break;
    }
    result.push(_getNodeIndex(child), 'childNodes'); // reversed
  }
  return result.reverse();
};
const _resolveKeyPath = (node, keyPath) => {
  for (let i = 0; i < keyPath.length; i++) {
    node = node[keyPath[i]];
  }
  return node;
};
const _getNodeIndex = n => {
  const {parentNode} = n;
  // if (parentNode) {
    const childNodes = Array.from(parentNode.childNodes);
    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i] === n) {
        return i;
      }
    }
  // }
  return -1;
};
const _mutateHtml = (el, text) => {
  const ops = [];
  morphdom(el, `<div>${text}</div>`, {
    onNodeAdded: n => {
      const keyPath = _getKeyPath(el, n);
      const {nodeType} = n;
      if (nodeType === Node.ELEMENT_NODE) {
        const json = parseHtml(n.outerHTML).childNodes[0];
        json.childNodes = [];
        ops.push(json1.insertOp(keyPath, json));
      } else if (nodeType === Node.TEXT_NODE) {
        ops.push(json1.insertOp(keyPath, parseHtml(n.nodeValue).childNodes[0]));
      } else {
        console.warn('cannot serialize node', n);
      }
    },
    onBeforeNodeDiscarded: n => {
      const keyPath = _getKeyPath(el, n);
      ops.push(json1.removeOp(keyPath));
    },
    onBeforeNodeValueChange: (n, newValue) => {
      const keyPath = _getKeyPath(el, n);
      ops.push(json1.replaceOp(keyPath, parseHtml(n.nodeValue).childNodes[0], parseHtml(newValue).childNodes[0]));
    },
    onBeforeAddAttr: (n, name, value) => {
      const keyPath = _getKeyPath(el, n);
      const oldValue = n.getAttribute(name);
      if (oldValue === null) {
        keyPath.push('attrs', name);
        ops.push(json1.insertOp(keyPath, {name, value}));
      } else {
        keyPath.push('attrs', name);
        ops.push(json1.replaceOp(keyPath, {name, value: oldValue}, {name, value}));
      }
    },
    onBeforeRemoveAttr: (n, name) => {
      const keyPath = _getKeyPath(el, n);
      keyPath.push('attrs', name);
      const value = n.getAttribute(name);
      ops.push(json1.removeOp(keyPath, {name, value}));
    },
  });
  return ops;
};

class HTMLClient extends EventTarget {
  constructor(text = '') {
    super();

    const userCode = document.createElement('div');
    userCode.classList.add('user-code');
    document.body.appendChild(userCode);
    const parsedHtmlEl = document.createElement('div');
    parsedHtmlEl.innerHTML = text;
    userCode.appendChild(parsedHtmlEl);

    const parsedHtmlEl2 = document.createElement('div');

    const observer = new MutationObserver(() => {
      const newText = parsedHtmlEl.innerHTML;

      parsedHtmlEl2.innerHTML = serializeHtml(this.state.json);
      const ops = _mutateHtml(parsedHtmlEl2, newText);
      this.applyOps(ops);
      this.dispatchEvent(new CustomEvent('message', {
        detail: ops,
      }));
      this.dispatchEvent(new CustomEvent('localUpdate', {
        detail: newText,
      }));
    });
    observer.observe(parsedHtmlEl, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    parsedHtmlEl.observer = observer;

    this.state = {
      parsedHtmlEl,
      json: serializeHtml(text),
      baseIndex: 0,
      sync: true,
    };
  }
  write(entry) {
    const {type} = entry;
    if (type === 'init') {
      this.pullInit(entry.json, entry.baseIndex);
    } else if (type === 'ops') {
      if (this.state.sync) {
        this.pullOps(entry.ops, entry.baseIndex);
      }
    } else {
      console.warn(`unknown entry type: ${type}`);
    }
  }
  pullInit(json, baseIndex) {
    const text = serializeHtml(json);
    morphdom(this.state.parsedHtmlEl, `<div>${text}</div>`);
    this.state.parsedHtmlEl.observer.takeRecords();
    this.state.json = json;
    this.state.baseIndex = baseIndex;
    if (!this.state.sync) {
      console.log('resync');
    }
    this.state.sync = true;

    this.dispatchEvent(new CustomEvent('localUpdate', {
      detail: text,
    }));
  }
  pullOps(ops, baseIndex) {
    if (baseIndex === this.state.baseIndex) {
      this.applyOps(ops);

      const text = serializeHtml(this.state.json);
      morphdom(this.state.parsedHtmlEl, `<div>${text}</div>`);
      this.state.parsedHtmlEl.observer.takeRecords();

      this.dispatchEvent(new CustomEvent('localUpdate', {
        detail: text,
      }));
    } else {
      console.log('desync', ops, baseIndex, this.state.baseIndex);
      this.state.sync = false;
    }
  }
  /* pullTrim(baseIndex) {
    this.state.baseIndex = baseIndex;
  } */
  applyOps(ops) {
    for (let i = 0; i < ops.length; i++) {
      this.state.json = json1.type.apply(this.state.json, ops[i]);
    }
    this.state.baseIndex += ops.length;
  }
  pushUpdate(text) {
    if (text.length < maxTextLength) {
      text = serializeHtml(parseHtml(text));

      const ops = _mutateHtml(this.state.parsedHtmlEl, text);
      this.state.parsedHtmlEl.observer.takeRecords();
      console.log('ops', ops);
      this.applyOps(ops);
      this.dispatchEvent(new CustomEvent('message', {
        detail: ops,
      }));

      return text;
    } else {
      throw new Error(`text too large: ${text.length}/${maxTextLength}`);
    }
  }
}
export default HTMLClient;