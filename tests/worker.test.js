import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { isValidSlug, validHttpUrl, periodStart, deviceType } from '../src/worker.js';

const NOW = new Date('2026-10-30T10:15:00Z').getTime();

test('slug validation rejects routes reserved for the app', () => {
  assert.equal(isValidSlug('instagram'), true);
  assert.equal(isValidSlug('go'), false);
  assert.equal(isValidSlug('admin'), false);
  assert.equal(isValidSlug('my-campaign_1'), true);
  assert.equal(isValidSlug('javascript:alert(1)'), false);
});

test('external destinations permit only http(s) URLs without credentials', () => {
  assert.equal(validHttpUrl('https://www.patreon.com/creator'), true);
  assert.equal(validHttpUrl('javascript:alert(1)'), false);
  assert.equal(validHttpUrl('https://user:secret@example.com/'), false);
});

test('analytics periods use UTC calendar boundaries', () => {
  assert.equal(new Date(periodStart('today', NOW)).toISOString(), '2026-10-30T00:00:00.000Z');
  assert.equal(new Date(periodStart('week', NOW)).toISOString(), '2026-10-24T00:00:00.000Z');
  assert.equal(new Date(periodStart('month', NOW)).toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(periodStart('all', NOW), 0);
});

test('device classification does not store user agent strings', () => {
  assert.equal(deviceType('Mozilla/5.0 (iPhone) Mobile'), 'Mobile');
  assert.equal(deviceType('Mozilla/5.0 (iPad)'), 'Tablet');
  assert.equal(deviceType('Mozilla/5.0 (X11; Linux x86_64)'), 'Desktop');
});

function makeEnvironment(events) {
  const sources = [ { id: 1, name: 'Instagram', slug: 'ig' } ];
  const buttons = [ { id: 4, title: 'Patreon', url: 'https://patreon.com/example', active: 1 } ];
  const DB = {
    prepare(sql) {
      const context = { args: [], bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes('FROM sources') && sql.includes('slug')) return sources.find((s) => s.slug === this.args[0]) || null;
          if (sql.includes('FROM sources') && sql.includes('WHERE id')) return sources.find((s) => s.id === this.args[0]) || null;
          if (sql.includes('FROM buttons')) return buttons.find((b) => b.id === this.args[0]) || null;
          return null;
        },
        async run() { if (sql.startsWith('INSERT INTO events')) events.push(this.args); return { meta: { changes: 1 } }; },
        async all() { return { results: [] }; }
      };
      return context;
    }
  };
  return { DB, ASSETS: { fetch: async () => new Response('<html lang="en"></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) } };
}

function request(path, { method = 'GET', headers = {} } = {}) {
  return new Request(`https://linkhub.example${path}`, { method, headers: { 'User-Agent':'Mozilla/5.0 Chrome', ...headers } });
}
function waitContext() {
  const tasks = [];
  return { tasks, waitUntil(promise) { tasks.push(promise); } };
}

test('source URL renders the hub and records an attributed page view', async () => {
  const events = [], ctx = waitContext();
  const res = await worker.fetch(request('/ig'), makeEnvironment(events), ctx);
  await Promise.all(ctx.tasks);
  assert.equal(res.status, 200);
  assert.equal((await res.text()).includes('<html'), true);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'view');
  assert.equal(events[0][1], 1);
  assert.equal(events[0][2], 'Instagram');
  assert.match(res.headers.get('set-cookie'), /lh_visitor=/);
});

test('root visits are recorded as Direct; admin login page is not tracked', async () => {
  const events = [], ctx = waitContext(), env = makeEnvironment(events);
  await worker.fetch(request('/'), env, ctx);
  await worker.fetch(request('/admin'), env, ctx);
  await Promise.all(ctx.tasks);
  assert.equal(events.length, 1);
  assert.equal(events[0][2], 'Direct');
});

test('known preview bots do not count as real visits', async () => {
  const events = [], ctx = waitContext();
  await worker.fetch(request('/ig', { headers: { 'User-Agent': 'facebookexternalhit/1.1' } }), makeEnvironment(events), ctx);
  await Promise.all(ctx.tasks);
  assert.equal(events.length, 0);
});

test('clicks on destination buttons redirect and record an outbound event', async () => {
  const events = [], ctx = waitContext();
  const res = await worker.fetch(request('/out/4', { headers: { 'Cookie': 'lh_source=1' } }), makeEnvironment(events), ctx);
  await Promise.all(ctx.tasks);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://patreon.com/example');
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'outbound');
  assert.equal(events[0][2], 'Instagram');
  assert.equal(events[0][3], 4);
});

test('HEAD does not record a page view or outbound click', async () => {
  const events=[],ctx=waitContext(),env=makeEnvironment(events);
  const page=await worker.fetch(request('/ig',{method:'HEAD'}),env,ctx);
  const out=await worker.fetch(request('/out/4',{method:'HEAD'}),env,ctx);
  await Promise.all(ctx.tasks);
  assert.equal(page.status,200);
  assert.equal(out.status,302);
  assert.equal(events.length,0);
});

test('unknown source slug does not lead to the public page or record events', async () => {
  const events=[],ctx=waitContext();
  const res=await worker.fetch(request('/notconfigured'),makeEnvironment(events),ctx);
  assert.equal(res.status,404);
  assert.equal(events.length,0);
});
