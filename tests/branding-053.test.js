import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import worker from '../src/worker.js';

const publicHTML = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const publicJS = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const adminManifest = JSON.parse(readFileSync(new URL('../public/admin.webmanifest', import.meta.url), 'utf8'));
const publicManifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));

test('public favicon stays configurable, admin uses dedicated fixed favicon', async () => {
  assert.match(publicHTML, /href="\/site-icon"/);
  assert.match(publicJS, /`\/site-icon\?v=\$\{encodeURIComponent\(profile\.updated_at \|\| 0\)\}`/);
  const env = {
    ASSETS: { fetch: async () => new Response(publicHTML, { headers: {'content-type':'text/html'} }) }
  };
  const ctx = { waitUntil() { throw new Error('Admin page should never register a visit'); } };
  const response = await worker.fetch(new Request('https://linkhub.example/admn'),env,ctx);
  const html = await response.text();
  assert.equal(response.status,200);
  assert.match(html, /href="\/admin.webmanifest\?icon=clear-bg"/);
  assert.match(html, /href="\/icons\/admin-favicon\.ico\?icon=clear-bg"/);
  assert.doesNotMatch(html, /href="\/site-icon"/);
});

test('admin PWA is branded without overriding the public PWA configuration', () => {
  assert.equal(adminManifest.start_url,'/admn');
  assert.equal(adminManifest.scope,'/admn');
  assert.equal(adminManifest.icons[0].src,'/icons/admin-192.png?icon=clear-bg');
  assert.equal(adminManifest.icons[1].src,'/icons/admin-512.png?icon=clear-bg');
  assert.equal(publicManifest.icons[0].src,'/icons/icon-192.png');
  for(const filename of ['admin-48.png','admin-96.png','admin-192.png','admin-512.png','admin-favicon.ico']) {
    assert.ok(statSync(new URL(`../public/icons/${filename}`,import.meta.url)).size>1000,filename);
  }
});

test('brand icon appears in both dashboard menu and public footer', () => {
  assert.match(publicJS, /class="sidebar-brand-icon"><img src="\/icons\/admin-96\.png\?icon=clear-bg"/);
  assert.match(publicJS, /class="public-footer-brand" href="\/"/);
  assert.match(publicJS, /src="\/icons\/admin-48\.png\?icon=clear-bg"/);
  assert.match(publicJS, /class="login-logo"><img src="\/icons\/admin-96\.png\?icon=clear-bg"/);
});
