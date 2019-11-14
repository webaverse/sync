import json1 from './json1.js';
import {parseHtml, serializeHtml} from './html-utils.js';

class HTMLServer extends EventTarget {
  constructor(text) {
    super();

    this.firstJson = parseHtml(text);
    this.lastJson = JSON.parse(JSON.stringify(this.firstJson));
    this.baseIndex = 0;
    this.history = [];
    this.connections = [];
  }
  connect(c) {
    this.dispatchEvent(new CustomEvent('send', {
      detail: {
        connection: c,
        message: {
          type: 'init',
          json: JSON.parse(JSON.stringify(this.lastJson)),
          baseIndex: this.baseIndex + this.history.length,
        },
      },
    }));
    this.connections.push(c);
  }
  pushOps(ops, baseIndex, c) {
    const currentBaseIndex = this.baseIndex + this.history.length;
    if (currentBaseIndex !== baseIndex) {
      const delay = currentBaseIndex - baseIndex;
      for (let i = 0; i < ops.length; i++) {
        for (let j = 0; j < delay; j++) {
          const result = json1.type.tryTransform(ops[i], this.history[this.history.length - delay + j], 'left');
          if (result.ok) {
            ops[i] = result.result;
          } else {
            ops[i] = null;
            break;
          }
        }
      }
      ops = ops.filter(op => op !== null);
    }
    if (ops.length > 0) {
      for (let i = 0; i < this.connections.length; i++) {
        const c2 = this.connections[i];
        if (c2 !== c) {
          this.dispatchEvent(new CustomEvent('send', {
            detail: {
              connection: c2,
              message: {
                type: 'ops',
                ops,
                baseIndex: this.baseIndex + this.history.length,
              },
            },
          }));
        }
      }

      for (let i = 0; i < ops.length; i++) {
        this.lastJson = json1.type.apply(this.lastJson, ops[i]);
      }
      this.history.push.apply(this.history, ops);
    }
    if (currentBaseIndex !== baseIndex) {
      this.dispatchEvent(new CustomEvent('send', {
        detail: {
          connection: c,
          message: {
            type: 'init',
            json: JSON.parse(JSON.stringify(this.lastJson)),
            baseIndex: this.baseIndex + this.history.length,
          },
        },
      }));
    }
  }
}
export default HTMLServer;