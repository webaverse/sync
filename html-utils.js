import parse5 from './parse5.js';

function parseHtml(s) {
  const result = parse5.parseFragment(s);
  const _recurse = n => {
    if (n.parentNode) {
      delete n.parentNode;
    }
    if (n.attrs) {
      const attrs = {};
      for (let i = 0; i < n.attrs.length; i++) {
        attrs[n.attrs[i].name] = n.attrs[i];
      }
      n.attrs = attrs;
    }
    if (n.childNodes) {
      for (let i = 0; i < n.childNodes.length; i++) {
        _recurse(n.childNodes[i]);
      }
    }
  };
  _recurse(result);
  return result;
}
function serializeHtml(j) {
  j = JSON.parse(JSON.stringify(j));
  const _recurse = n => {
    if (n.attrs) {
      const attrs = [];
      for (const k in n.attrs) {
        attrs.push(n.attrs[k]);
      }
      n.attrs = attrs;
    }
    if (n.childNodes) {
      for (let i = 0; i < n.childNodes.length; i++) {
        _recurse(n.childNodes[i]);
      }
    }
  };
  _recurse(j);
  return parse5.serialize(j);
}
function reifyHtml(j) {
  const _recurse = n => {
    const {nodeName} = n;
    if (nodeName === '#document-fragment') {
      const div = document.createElement('div');
      for (let i = 0; i < n.childNodes.length; i++) {
        const c = _recurse(n.childNodes[i]);
        div.appendChild(c);
      }
      return div;
    } else if (nodeName === '#text') {
      return document.createTextNode(n.value);
    } else {
      const node = document.createElement(n.tagName);
      for (const k in n.attrs) {
        const {name, value} = n.attrs[k];
        node.setAttribute(name, value);
      }
      for (let i = 0; i < n.childNodes.length; i++) {
        node.appendChild(_recurse(n.childNodes[i]));
      }
      return node;
    }
  };
  return _recurse(j);
}
export {
  parseHtml,
  serializeHtml,
  reifyHtml,
};