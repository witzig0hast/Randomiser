/**
 * Minimaler DOM-Builder. Es wird ausschließlich über DOM-APIs gebaut
 * (nie über innerHTML), damit Benutzereingaben nicht als Markup interpretiert werden.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

function applyProps(el, props, isSvg) {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.setAttribute('class', value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v);
        else el.style[prop] = v;
      }
    } else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else if (!isSvg && key in el && key !== 'list' && key !== 'form') el[key] = value;
    else el.setAttribute(key, String(value));
  }
}

function appendChildren(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) appendChildren(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** HTML-Element erzeugen: h('button', { class: 'btn', onClick }, 'Text'). */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) applyProps(el, props, false);
  else if (props !== null && props !== undefined) children.unshift(props);
  appendChildren(el, children);
  return el;
}

/** SVG-Element erzeugen. */
export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) applyProps(el, props, true);
  else if (props !== null && props !== undefined) children.unshift(props);
  appendChildren(el, children);
  return el;
}

/** Inhalt eines Containers ersetzen. */
export function mount(container, ...nodes) {
  container.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false));
  return container;
}
