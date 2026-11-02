// Optional checks: node tests/tests.js. The calculator itself needs no Node.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const webDirectory = path.join(__dirname, '..', 'web');

// A small DOM/canvas substitute lets us check interactions without a browser.
const elements = {};
const canvas = new Proxy({ measureText: text => ({width: text.length * 6}) },
  { get: (target, key) => target[key] || (() => {}) });
function element(id) {
  if (!elements[id]) elements[id] = {
    value: '', textContent: '', style: {}, children: [], handlers: {},
    classList: { add() {}, remove() {} },
    selectedOptions: [{ text: 'Test shape' }],
    addEventListener(event, handler) { this.handlers[event] = handler; },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    getContext() { return canvas; },
    getBoundingClientRect() { return { width: 640 }; },
    set innerHTML(value) { this.html = value; this.children = []; },
    get innerHTML() { return this.html || ''; }
  };
  return elements[id];
}
for (const [id, value] of Object.entries({shape:'cone', method:'s13', n:'6', hVal:'1', yValues:'0, 1, 2'}))
  element(id).value = value;
const context = vm.createContext({
  document: {
    getElementById: element, createElement: () => element('created' + Math.random()),
    documentElement: { setAttribute() {}, removeAttribute() {}, getAttribute() { return ''; } }
  },
  window: { devicePixelRatio: 1, addEventListener() {} },
  // Test the local-file fallback as well.
  localStorage: { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } }
});
vm.runInContext(fs.readFileSync(path.join(webDirectory, 'script.js'), 'utf8'), context);
const evaluate = code => vm.runInContext(code, context);
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`); }

// Known integrals: x, x², and x³ on [0, 1], six equal intervals.
for (const method of ['trap', 's13', 's38']) {
  close(evaluate(`integrateValues([0,1,2,3,4,5,6].map(x => x/6), 1/6, '${method}')`), 0.5);
}
close(evaluate("integrateValues([0,1,2,3,4,5,6].map(x => (x/6)**2), 1/6, 'trap')"), 73/216);
close(evaluate("integrateValues([0,1,2,3,4,5,6].map(x => (x/6)**3), 1/6, 'trap')"), 37/144);
for (const method of ['s13', 's38']) {
  close(evaluate(`integrateValues([0,1,2,3,4,5,6].map(x => (x/6)**2), 1/6, '${method}')`), 1/3);
  close(evaluate(`integrateValues([0,1,2,3,4,5,6].map(x => (x/6)**3), 1/6, '${method}')`), 1/4);
}
for (const text of ['2abc', '', 'Infinity', 'NaN', '0x10']) assert.ok(Number.isNaN(evaluate(`readNumber('${text}')`)));
close(evaluate("readNumber('-1.25e2')"), -125);
for (const code of ["checkRule('s13',3)", "checkRule('s38',4)", "checkRule('bad',6)",
  "checkRule('trap',6.5)", "parseMeasurements('1, 2abc, 3')", "checkDomain('circle',-2,1)",
  "checkDomain('ellipse',-3,1)", "checkDomain('hyperbola',-1,2)",
  "checkDomain('log',0,2)", "checkDomain('sqrt',-1,2)"])
  assert.throws(() => evaluate(code));

// Switching methods updates the selected row, result, and steps together.
element('shape').value = 'parabola'; element('a').value = '0'; element('b').value = '1';
element('method').value = 'trap'; element('method').handlers.change();
assert.equal(element('result').textContent, '0.3380 square units');
assert.equal(element('rows').children[0].className, 'sel');
element('method').value = 's13'; element('method').handlers.change();
assert.equal(element('result').textContent, '0.3333 square units');
assert.equal(element('rows').children[1].className, 'sel');
element('n').value = '3'; element('n').handlers.input();
assert.equal(element('result').textContent, '—');
assert.equal(element('rows').children.length, 0);
element('calc').handlers.click();
assert.match(element('err').textContent, /even/);
assert.equal(element('note').textContent, '');
element('n').value = '6.5'; element('calc').handlers.click();
assert.match(element('err').textContent, /integer/);

// Given radii 0,1,2 with h=1: Simpson 1/3 gives cone volume 8*pi/3.
element('inModeValues').handlers.click();
element('modeVol').handlers.click();
assert.equal(element('result').textContent, '8.3776 cubic units');
assert.match(element('note').textContent, /r²/);
assert.match(element('thDiff').textContent, /unavailable/);
element('refVal').value = '8'; element('calc').handlers.click();
assert.match(element('meta').textContent, /Difference = 0.3776/);
element('refVal').value = 'bad'; element('calc').handlers.click();
assert.equal(element('result').textContent, '—');
assert.equal(element('stepsBody').innerHTML, '');
element('refVal').value = ''; element('yValues').value = '-1, 1, 2'; element('calc').handlers.click();
assert.match(element('err').textContent, /nonnegative/);
const bounds = evaluate("interpolationBounds([0,1,2], [0,1,1], 's13')");
assert.ok(bounds.high > 1, 'Graph bounds include interpolation overshoot');

// All existing shapes still calculate in area and volume modes.
evaluate("inputMode = 'func'");
element('n').value = '6'; element('method').value = 's13';
for (const shape of evaluate('Object.keys(SHAPES)')) {
  element('shape').value = shape;
  evaluate('applyDefaults()');
  for (const target of ['area', 'volume']) {
    evaluate(`calcTarget = '${target}'; run()`);
    assert.equal(element('err').textContent, '', `${shape} ${target}`);
    assert.notEqual(element('result').textContent, '—');
  }
}
close(evaluate('SHAPES.circle.F(1) - SHAPES.circle.F(-1)'), Math.PI / 2);
close(evaluate('SHAPES.ellipse.F(2) - SHAPES.ellipse.F(-2)'), Math.PI);
close(evaluate('Math.PI * (SHAPES.cone.G(2) - SHAPES.cone.G(0))'), 8 * Math.PI / 3);

const html = fs.readFileSync(path.join(webDirectory, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs are unique');
assert.match(html, /href="style.css"/);
assert.match(html, /src="script.js"/);
assert.doesNotMatch(html, /https?:\/\//, 'Direct-file calculator has no network dependencies');
console.log('All numerical, validation, and interaction checks passed.');
