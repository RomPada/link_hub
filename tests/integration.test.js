import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';

const ORIGIN = 'https://linkhub.example';
function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  function bindStatement(query, params) {
    const statement = sqlite.prepare(query);
    const values = params.map((value) => value === undefined ? null : value);
    return { run: async () => { const result = statement.run(...values); return { meta: { changes: Number(result.changes) } }; },
      first: async () => statement.get(...values) ?? null,
      all: async () => ({ results: statement.all(...values) }) };
  }
  const DB = { prepare(query) { return { bind(...args) { return bindStatement(query,args); },
    first() { return bindStatement(query,[]).first(); }, all() { return bindStatement(query,[]).all(); }, run(){return bindStatement(query,[]).run();} } },
    async batch(queries) { sqlite.exec('BEGIN'); try { const results=[]; for(const query of queries) results.push(await query.run()); sqlite.exec('COMMIT'); return results; } catch(err) { sqlite.exec('ROLLBACK'); throw err; } }
  };
  return { sqlite, DB };
}
function setup() {
  const { sqlite, DB }=makeD1();
  const env={ DB, ADMIN_PASSWORD:'a_long_test_password_123', SESSION_SECRET:'a-v3ry-long-unique-session-secret-that-is-at-least-32-chars',
    ASSETS:{fetch:async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}})} };
  function ctx() { const pending=[]; return { waitUntil(promise){ pending.push(promise); }, settled:async()=>Promise.all(pending) }; }
  function req(path,{method='GET',body,cookie='',userAgent='Mozilla/5.0 Chrome'}={}) {
    return new Request(`${ORIGIN}${path}`,{method,headers:{ 'User-Agent':userAgent, ...(cookie?{Cookie:cookie}:{}), ...(method==='GET'?{}:{ Origin:ORIGIN,'Content-Type':'application/json' })}, body:body===undefined?undefined:JSON.stringify(body) });
  }
  return {sqlite,env,ctx,req};
}

test('D1 migrations work in SQLite and include disabled example buttons',()=>{
  const {sqlite}=setup();
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sources').get().n,5);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM buttons').get().n,4);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM buttons WHERE active=1').get().n,0);
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
});

test('admin login, session, state and profile editing work against a real SQLite database',async()=>{
  const {sqlite,env,ctx,req}=setup();
  const invalid=await worker.fetch(req('/api/admin/login',{method:'POST',body:{password:'bad'}}),env,ctx());
  assert.equal(invalid.status,401);
  const login=await worker.fetch(req('/api/admin/login',{method:'POST',body:{password:env.ADMIN_PASSWORD}}),env,ctx());
  assert.equal(login.status,200,await login.text());
  const sessionCookie=login.headers.get('set-cookie').split(';')[0];
  const session=await worker.fetch(req('/api/admin/session',{cookie:sessionCookie}),env,ctx());
  assert.equal((await session.json()).authenticated,true);
  const state=await worker.fetch(req('/api/admin/state',{cookie:sessionCookie}),env,ctx());
  assert.equal((await state.json()).sources.length,5);
  const updated=await worker.fetch(req('/api/admin/profile',{method:'PUT',cookie:sessionCookie,body:{display_name:'Creator Lab',headline:'All my links',bio:'Follow me',avatar_url:'',accent_color:'#123abc'}}),env,ctx());
  assert.equal(updated.status,200);
  assert.equal(sqlite.prepare('SELECT display_name FROM settings').get().display_name,'Creator Lab');
  const logout=await worker.fetch(req('/api/admin/logout',{method:'POST',cookie:sessionCookie}),env,ctx());
  assert.equal(logout.status,200);
  const after=await worker.fetch(req('/api/admin/session',{cookie:sessionCookie}),env,ctx());
  assert.equal((await after.json()).authenticated,false);
});

test('entry source and outbound button click count separately and preserve source',async()=>{
  const {sqlite,env,ctx,req}=setup();
  sqlite.exec("UPDATE buttons SET active=1 WHERE id=1");
  const firstCtx=ctx(); const visit=await worker.fetch(req('/ig'),env,firstCtx);await firstCtx.settled();
  assert.equal(visit.status,200);
  const rawCookie=visit.headers.get('set-cookie');
  const visitor=rawCookie.match(/lh_visitor=([^;]+)/)?.[1];
  const clickCtx=ctx();
  const click=await worker.fetch(req('/out/1',{cookie:`lh_source=1; lh_visitor=${visitor}`}),env,clickCtx);await clickCtx.settled();
  assert.equal(click.status,302);
  assert.equal(click.headers.get('location'),'https://www.patreon.com/');
  const events=sqlite.prepare('SELECT kind,source_name,button_name,visitor_id FROM events ORDER BY id').all();
  assert.deepEqual(events.map((e)=>e.kind),['view','outbound']);
  assert.equal(events[0].source_name,'Instagram');
  assert.equal(events[1].source_name,'Instagram');
  assert.equal(events[1].button_name,'Patreon');
  assert.equal(events[0].visitor_id,events[1].visitor_id);
  const overview=await worker.fetch(req('/api/admin/analytics?period=week',{cookie:'missing'}),env,ctx());
  assert.equal(overview.status,401);
});

test('bot previews do not affect event totals even on source and outbound routes',async()=>{
  const {sqlite,env,ctx,req}=setup();sqlite.exec('UPDATE buttons SET active=1 WHERE id=1');
  const userAgent='TelegramBot (like TwitterBot)';
  for(const path of ['/ig','/out/1']) {const task=ctx();await worker.fetch(req(path,{userAgent}),env,task);await task.settled();}
  assert.equal(sqlite.prepare('SELECT COUNT(*) as n FROM events').get().n,0);
});

test('browser-origin check prevents cross-site administration',async()=>{
  const {env,ctx}=setup();
  const evil=new Request('https://linkhub.example/api/admin/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})});
  const response=await worker.fetch(evil,env,ctx());
  assert.equal(response.status,403);
});
