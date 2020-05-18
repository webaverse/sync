import json1 from './json1.js';
// import morphdom from './morphdom.js';
// import {parseHtml, serializeHtml, reifyHtml} from './html-utils.js';

// const maxTextLength = 1024 * 1024;

/* const _getKeyPath = (parent, child) => {
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
const _mutateHtml = (el, el2) => {
  const ops = [];
  morphdom(el, el2, {
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
}; */

const _ref = (j, ks) => {
  for (let i = 0; i < ks.length; i++) {
    if (typeof j !== 'object' || j === null) {
      break;
    }
    const k = ks[i];
    j = j[k];
  }
  return j;
};
const _ref2 = (src, ks, dst) => {
  let leftKs = [];
  let rightKs = [];
  for (let i = 0; i < ks.length; i++) {
    if (typeof src === 'object' && src !== null) {
      const k = ks[i];
      src = src[k];
      leftKs.push(k);
    } else {
      rightKs = ks.slice(i);
      break;
    }
  }
  for (let i = rightKs.length - 1; i >= 0; i--) {
    const k = rightKs[i];
    dst = {
      [k]: dst,
    };
  }
  return [leftKs, dst];
};
class JSONClient extends EventTarget {
  constructor(j) {
    super();

    /* const userCode = document.createElement('div');
    userCode.classList.add('user-code');
    document.body.appendChild(userCode);
    const parsedHtmlEl = document.createElement('div');
    parsedHtmlEl.innerHTML = text;
    userCode.appendChild(parsedHtmlEl);

    const observer = new MutationObserver(() => {
      const parsedHtmlEl2 = reifyHtml(this.state.json);
      const ops = _mutateHtml(parsedHtmlEl2, parsedHtmlEl);
      const {baseIndex} = this.state;
      this.applyOps(ops);
      this.dispatchEvent(new CustomEvent('message', {
        detail: {
          ops,
          baseIndex,
        },
      }));
      this.dispatchEvent(new CustomEvent('localUpdate', {
        detail: serializeHtml(this.state.json),
      }));
    });
    observer.observe(parsedHtmlEl, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    parsedHtmlEl.observer = observer; */

    this.state = {
      // parsedHtmlEl,
      // json: parseHtml(text),
      json: j,
      baseIndex: 0,
      sync: true,
    };
  }
  write(entry) {
    const {method} = entry;
    switch (method) {
      case 'init': {
        this.pullInit(entry.json, entry.baseIndex);
        break;
      }
      case 'ops': {
        if (this.state.sync) {
          this.pullOps(entry.ops, entry.baseIndex);
        }
        break;
      }
      default: {
        console.warn(`unknown entry method: ${method}`);
        break;
      }
    }
  }
  pullInit(json, baseIndex) {
    // const text = serializeHtml(json);
    // morphdom(this.state.parsedHtmlEl, `<div>${text}</div>`);
    // this.state.parsedHtmlEl.observer.takeRecords();
    this.state.json = json;
    this.state.baseIndex = baseIndex;
    if (!this.state.sync) {
      console.log('resync');
    }
    this.state.sync = true;

    this.dispatchEvent(new MessageEvent('localUpdate', {
      data: json,
    }));
  }
  pullOps(ops, baseIndex) {
    if (baseIndex === this.state.baseIndex) {
      this.applyOps(ops);

      /* const text = serializeHtml(this.state.json);
      morphdom(this.state.parsedHtmlEl, `<div>${text}</div>`);
      this.state.parsedHtmlEl.observer.takeRecords(); */

      this.dispatchEvent(new MessageEvent('localUpdate', {
        data: this.state.json,
      }));
    } else {
      console.log('desync', ops, baseIndex, this.state.baseIndex);
      this.state.sync = false;
    }
  }
  applyOps(ops) {
    for (let i = 0; i < ops.length; i++) {
      this.state.json = json1.type.apply(this.state.json, ops[i]);
    }
    this.state.baseIndex += ops.length;
  }
  applyOpsLocal(ops) {
    const {baseIndex} = this.state;
    this.applyOps(ops);
    this.dispatchEvent(new MessageEvent('message', {
      data: {
        ops,
        baseIndex,
      },
    }));
  }
  getItem(k) {
    if (!Array.isArray(k)) {
      k = [k];
    }
    return _ref(this.state.json, k);
  }
  setItem(k, v) {
    if (!Array.isArray(k)) {
      k = [k];
    }
    const oldV = _ref(this.state.json, k);
    let ops;
    if (oldV === undefined) {
      const [newK, newV] = _ref2(this.state.json, k, v);
      ops = [
        json1.insertOp(newK, newV),
      ];
    } else {
      ops = [
        json1.replaceOp(k, oldV, v),
      ];
    }
    this.applyOpsLocal(ops);
  }
  removeItem(k) {
    if (!Array.isArray(k)) {
      k = [k];
    }
    const oldV = _ref(this.state.json, k);
    if (oldV !== undefined) {
      const ops = [
        json1.removeOp(k),
      ];
      this.applyOpsLocal(ops);
    }
  }
  /* pushUpdate(text) {
    if (text.length < maxTextLength) {
      text = serializeHtml(parseHtml(text));

      const parsedHtmlEl2 = document.createElement('div');
      parsedHtmlEl2.innerHTML = text;
      const ops = _mutateHtml(this.state.parsedHtmlEl, parsedHtmlEl2);
      this.state.parsedHtmlEl.observer.takeRecords();
      console.log('ops', ops);
      const {baseIndex} = this.state;
      this.applyOps(ops);
      this.dispatchEvent(new MessageEvent('message', {
        data: {
          ops,
          baseIndex,
        },
      }));

      return text;
    } else {
      throw new Error(`text too large: ${text.length}/${maxTextLength}`);
    }
  } */
}
export {JSONClient};