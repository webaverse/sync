import json1 from './json1.js';

const EventTarget = globalThis.EventTarget || class EventTargetShim {
  constructor() {
    this.listeners = {};
  }
  dispatchEvent(e) {
    const listeners = this.listeners[e.type];
    if (listeners) {
      for (let i = 0; i < listeners.length; i++) {
        listeners[i](e);
      }
    }
  }
  addEventListener(e, fn) {
    let listeners = this.listeners[e];
    if (!listeners) {
      listeners = [];
      this.listeners[e] = listeners;
    }
    listeners.push(fn);
  }
  removeEventListener(e, fn) {
    const listeners = this.listeners[e];
    if (listeners) {
      const index = listners.indexOf(fn);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
}
const MessageEvent = globalThis.MessageEvent || class MessageEventShim {
  constructor(type, options = {}) {
    this.type = type;
    this.data = options.data;
  }
}

class JSONServer extends EventTarget {
  constructor(j, options = {}) {
    super();

    // this.firstJson = j;
    this.lastJson = JSON.parse(JSON.stringify(j));
    this.baseIndex = 0;
    this.history = [];
    this.connections = [];
    if (typeof options.maxHistory !== 'number') {
      options.maxHistory = 1024;
    }
    this.options = options;
  }
  getJson() {
    return JSON.parse(JSON.stringify(this.lastJson));
  }
  connect(c) {
    this.dispatchEvent(new MessageEvent('send', {
      data: {
        connection: c,
        message: {
          method: 'init',
          json: JSON.parse(JSON.stringify(this.lastJson)),
          baseIndex: this.baseIndex + this.history.length,
        },
      },
    }));
    this.connections.push(c);
  }
  disconnect(c) {
    const index = this.connections.indexOf(c);
    if (index !== -1) {
      this.connections.splice(index);
    }
  }
  pushOps(ops, baseIndex, c) {
    const currentBaseIndex = this.baseIndex + this.history.length;
    if (currentBaseIndex !== baseIndex) {
      if (baseIndex >= this.baseIndex) {
        const delay = currentBaseIndex - baseIndex;
        if (delay > 0) {
          for (let i = 0; i < ops.length; i++) {
            for (let j = 0; j < delay; j++) {
              const result = json1.type.tryTransform(ops[i], this.history[this.history.length - delay + j], 'left');
              if (result.ok) {
                ops[i] = result.result;
              } else { // conflict
                ops[i] = null;
                break;
              }
            }
          }
          ops = ops.filter(op => op !== null);
        } else { // in the future
          ops.length = 0;
        }
      } else { // not enough history
        ops.length = 0;
      }
    }
    if (ops.length > 0) {
      for (let i = 0; i < this.connections.length; i++) {
        const c2 = this.connections[i];
        if (c2 !== c) {
          this.dispatchEvent(new MessageEvent('send', {
            data: {
              connection: c2,
              message: {
                method: 'ops',
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
      while (this.history.length >= this.options.maxHistory) {
        this.history.shift();
        this.baseIndex++;
      }
    }
    if (currentBaseIndex !== baseIndex) {
      this.dispatchEvent(new MessageEvent('send', {
        data: {
          connection: c,
          message: {
            method: 'init',
            json: JSON.parse(JSON.stringify(this.lastJson)),
            baseIndex: this.baseIndex + this.history.length,
          },
        },
      }));
    }
  }
}
export {
  EventTarget,
  MessageEvent,
  JSONServer,
};