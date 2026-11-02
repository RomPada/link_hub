import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { publicLocales } from '../public/locales.js';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('legacy group, navigation and profile selectors have no remaining CSS rules', () => {
  const css = read('public/styles.css');
  const legacy = [
    'public-category', 'category-title', 'manage-categories', 'manage-category',
    'manage-category-heading', 'manage-category-count', 'profile-head',
    'top-mark', 'top-view', 'language-picker', 'admin-lang-field',
    'mobile-menu-chevron', 'avatar-preview-row', 'heading-dot',
  ];
  for (const name of legacy) {
    assert.doesNotMatch(css, new RegExp(`\\.${name}(?![\\w-])`), name);
  }
  // This class is created dynamically by toast(message, 'error'); do not prune it.
  assert.match(css, /\.toast-error\b/);
});

test('public languages retain active UI strings without legacy group or header labels', () => {
  for (const locale of Object.values(publicLocales)) {
    for (const name of ['language', 'welcome', 'explore', 'footer', 'cardFallback', 'error', 'retry']) {
      assert.equal(typeof locale[name], 'string', name);
      assert.ok(locale[name].length > 0, name);
    }
    for (const name of ['tagline', 'categoryResources', 'categoryChannels']) {
      assert.equal(Object.hasOwn(locale, name), false, name);
    }
  }
});

test('installed PWAs and public fallback icon assets remain present and independently configured', () => {
  const root = new URL('../public/', import.meta.url);
  const adminManifest = JSON.parse(read('public/admin.webmanifest'));
  const publicManifest = JSON.parse(read('public/manifest.webmanifest'));
  for (const manifest of [adminManifest, publicManifest]) {
    for (const icon of manifest.icons) {
      const pathname = icon.src.split('?')[0].replace(/^\//, '');
      assert.ok(statSync(new URL(pathname, root)).size > 0, pathname);
    }
  }
  for (const pathname of ['icon.svg', 'favicon.ico', 'icons/admin-48.png', 'icons/admin-96.png', 'icons/admin-favicon.ico']) {
    assert.ok(statSync(new URL(pathname, root)).size > 0, pathname);
  }
  assert.match(read('public/index.html'), /href="\/site-icon"/);
  assert.match(read('src/worker.js'), /SELECT favicon_data FROM settings/);
  assert.match(read('public/sw.js'), /\/icons\/admin-192.png/);
});
