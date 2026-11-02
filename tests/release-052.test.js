import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('analytics defaults to Today without resetting selected periods after navigation', () => {
  assert.match(js, /tab: 'overview', period: 'today'/);
  assert.match(js, /state\.period=el\.dataset\.period/);
  assert.match(js, /api\(`\/api\/admin\/analytics\?period=\$\{state\.period\}`\)/);
});
test('mobile menu has browser opening and signout controls, desktop retains original actions', () => {
  assert.match(js, /class="mobile-nav-actions"/);
  assert.match(js, /href="\/" target="_blank" rel="noopener noreferrer" aria-label="Open public site in browser"/);
  assert.match(js, /data-sign-out/);
  assert.match(js, /qsa\('\[data-sign-out\]'\)/);
  assert.match(css, /@media\(max-width:840px\)\s*\{\s*\.mobile-nav-actions\{display:grid/);
});
test('mobile chart dates are legible and keyboard-scrollable', () => {
  assert.match(js, /role="region" aria-label="Traffic activity chart; swipe horizontally/);
  assert.match(css, /\.chart-days\{min-width:690px/);
  assert.match(css, /transform:rotate\(-43deg\)/);
});
test('notification selectors are custom dropdowns preserving underlying select values', () => {
  assert.match(js, /function enhanceNotificationSelects\(\)/);
  assert.match(js, /select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
  assert.match(js, /notificationDropdownController\.abort\(\)/);
  for (const id of ['push-device','push-source','push-cooldown']) assert.match(js,new RegExp(`id="${id}"`));
  assert.match(css, /\.notification-select-option\.selected/);
  assert.match(css, /\.notification-select-options\[hidden\]/);
});
test('recent activity includes the device field like the details table', () => {
  const start=js.indexOf('function overview()');
  const end=js.indexOf('async function metricDetails',start);
  assert.ok(start>=0 && end>start);
  assert.match(js.slice(start,end), /\['DEVICE',\(r\)=>escapeHTML\(r\.device \|\| 'Unknown'\)\]/);
});
test('frontend assets are cache-busted to release version', () => {
  assert.match(page, /styles\.css\?v=0\.5\.2/);
  assert.match(page, /app\.js\?v=0\.5\.2/);
});
