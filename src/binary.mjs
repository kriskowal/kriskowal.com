import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOMParser, XMLSerializer } from 'xmldom';
const input = fs.readFileSync(fileURLToPath(new URL('binary.svg', import.meta.url)), 'utf-8');

for (const frame of Array.from({ length: 16 }, (_, n) => n)) {
  const dom = new DOMParser().parseFromString(input, 'image/svg+xml');
  const ids = {
    __proto__: null,
    bottom: true,
    top: true,
    next: true,
    prev: true,
    ...Object.fromEntries(
      Array.from({length: 16}, (_, n) => n).map(n => [n.toString(16), n === frame])),
    ...Object.fromEntries(
      Array.from({length: 4}, (_, n) => n).flatMap(n => {
        const bit = ((2 ** n) & frame) !== 0;
        return [
          [`bit${n + 1}-0`, !bit],
          [`bit${n + 1}-1`, bit],
          [`a-bit${n + 1}-0`, !bit],
          [`a-bit${n + 1}-1`, bit],
        ];
      })
    )
  };

  const elements = {};

  const exclude = new Set();

  const visit = parent => {
    for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 3) exclude.add(child);
      if (child.nodeType === 1 && child.hasAttribute('id')) {
        const id = child.getAttribute('id');
        if (Object.hasOwn(ids, id)) {
          elements[id] = child;
          if (!ids[id]) {
            exclude.add(child);
          }
        } else {
          child.removeAttribute('id');
        }
        visit(child);
      }
    }
  };

  visit(dom);

  for (const node of exclude) {
    node.parentNode.removeChild(node);
  }

  elements.next.setAttribute('xlink:href', `${((frame + 1) % 16).toString(16)}.html`);
  elements.prev.setAttribute('xlink:href', `${((frame + 15) % 16).toString(16)}.html`);

  for (const shift of Array.from({ length: 4 }, (_, n) => n)) {
    const toggled = `${(frame ^ (0b1 << shift)).toString(16)}.html`;
    elements[`a-bit${shift + 1}-0`].setAttribute('xlink:href', toggled); 
    elements[`a-bit${shift + 1}-1`].setAttribute('xlink:href', toggled); 
  }

  const output = new XMLSerializer().serializeToString(dom);
  fs.writeFileSync(fileURLToPath(new URL(`../public/bbbb/${frame.toString(16)}.html`, import.meta.url)), output, 'utf-8');
  fs.writeFileSync(fileURLToPath(new URL(`../public/bbbb/${frame.toString(16)}.html`, import.meta.url)), `\
<!doctype html>
<html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        height: 100svh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        margin: 0;
        padding: 0;
        height: min(100svh, 100vw);
        width: min(100svh, 100vw);
      }
    </style>
  </head>
<body>
${output}
</body>
</html>
`, 'utf-8');
}
