import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';

const ORIGIN = 'https://linkhub.example';
function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../migrations/0002_public_identity.sql', import.meta.url), 'utf8'));
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

test('D1 migrations work in SQLite with visible neutral example buttons',()=>{
  const {sqlite}=setup();
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sources').get().n,4);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM buttons').get().n,4);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM buttons WHERE active=1').get().n,4);
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
  assert.equal((await state.json()).sources.length,4);
  const updated=await worker.fetch(req('/api/admin/profile',{method:'PUT',cookie:sessionCookie,body:{display_name:'Creator Lab',headline:'All my links',bio:'Follow me',avatar_url:'',accent_color:'#123abc',avatar_text:'CL',avatar_background:'#ff4466',avatar_shape:'circle',show_top_brand:false,show_top_tagline:true,favicon_data:''}}),env,ctx());
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
  const firstCtx=ctx(); const visit=await worker.fetch(req('/source-one'),env,firstCtx);await firstCtx.settled();
  assert.equal(visit.status,200);
  const rawCookie=visit.headers.get('set-cookie');
  const visitor=rawCookie.match(/lh_visitor=([^;]+)/)?.[1];
  const clickCtx=ctx();
  const click=await worker.fetch(req('/out/1',{cookie:`lh_source=1; lh_visitor=${visitor}`}),env,clickCtx);await clickCtx.settled();
  assert.equal(click.status,302);
  assert.equal(click.headers.get('location'),'https://example.com/resource-one');
  const events=sqlite.prepare('SELECT kind,source_name,button_name,visitor_id FROM events ORDER BY id').all();
  assert.deepEqual(events.map((e)=>e.kind),['view','outbound']);
  assert.equal(events[0].source_name,'Source One');
  assert.equal(events[1].source_name,'Source One');
  assert.equal(events[1].button_name,'Example Resource One');
  assert.equal(events[0].visitor_id,events[1].visitor_id);
  const overview=await worker.fetch(req('/api/admin/analytics?period=week',{cookie:'missing'}),env,ctx());
  assert.equal(overview.status,401);
});

test('bot previews do not affect event totals even on source and outbound routes',async()=>{
  const {sqlite,env,ctx,req}=setup();sqlite.exec('UPDATE buttons SET active=1 WHERE id=1');
  const userAgent='TelegramBot (like TwitterBot)';
  for(const path of ['/source-one','/out/1']) {const task=ctx();await worker.fetch(req(path,{userAgent}),env,task);await task.settled();}
  assert.equal(sqlite.prepare('SELECT COUNT(*) as n FROM events').get().n,0);
});

test('browser-origin check prevents cross-site administration',async()=>{
  const {env,ctx}=setup();
  const evil=new Request('https://linkhub.example/api/admin/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})});
  const response=await worker.fetch(evil,env,ctx());
  assert.equal(response.status,403);
});

test('public API exposes neutral, active example links and identity controls',async()=>{
  const {env,ctx,req}=setup();
  const response=await worker.fetch(req('/api/public'),env,ctx());
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.links.length,4);
  assert.equal(data.links[0].title,'Example Resource One');
  assert.equal(data.profile.avatar_shape,'rounded');
  assert.equal(data.profile.show_top_brand,1);
  assert.equal(data.profile.show_top_tagline,1);
});

test('admin can configure avatar, top bar and upload a favicon that is served publicly',async()=>{
  const {sqlite,env,ctx,req}=setup();
  const login=await worker.fetch(req('/api/admin/login',{method:'POST',body:{password:env.ADMIN_PASSWORD}}),env,ctx());
  const session=login.headers.get('set-cookie').split(';')[0];
  const favicon='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+lXcf7wAAAABJRU5ErkJggg==';
  const response=await worker.fetch(req('/api/admin/profile',{method:'PUT',cookie:session,body:{
    display_name:'Sample Project',headline:'Hello',bio:'Custom text',avatar_url:'',avatar_text:'SP',avatar_background:'#224466',avatar_shape:'circle',
    accent_color:'#4267e9',show_top_brand:false,show_top_tagline:false,favicon_data:favicon
  }}),env,ctx());
  assert.equal(response.status,200,await response.text());
  const saved=sqlite.prepare('SELECT * FROM settings WHERE id=1').get();
  assert.equal(saved.avatar_text,'SP');
  assert.equal(saved.avatar_background,'#224466');
  assert.equal(saved.avatar_shape,'circle');
  assert.equal(saved.show_top_brand,0);
  assert.equal(saved.show_top_tagline,0);
  assert.equal(saved.favicon_data,favicon);
  const publicState=await (await worker.fetch(req('/api/public'),env,ctx())).json();
  assert.equal(publicState.profile.avatar_text,'SP');
  assert.equal('favicon_data' in publicState.profile,false);
  const icon=await worker.fetch(req('/site-icon'),env,ctx());
  assert.equal(icon.status,200);
  assert.equal(icon.headers.get('content-type'),'image/png');
  assert.equal(new Uint8Array(await icon.arrayBuffer())[0],137);
  const rejected=await worker.fetch(req('/api/admin/profile',{method:'PUT',cookie:session,body:{
    display_name:'Sample Project',headline:'',bio:'',avatar_url:'',avatar_text:'',avatar_background:'#224466',avatar_shape:'rounded',
    accent_color:'#4267e9',show_top_brand:true,show_top_tagline:true,
    favicon_data:'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+'}}),env,ctx());
  assert.equal(rejected.status,400);
});

test('a v0.1.0 database upgrades untouched samples but retains custom destinations and history',async()=>{
  const {sqlite}=setup();
  // A retained v0.1.0 entry changed by an administrator must never be overwritten by the upgrade.
  sqlite.prepare('UPDATE buttons SET url=? WHERE id=1').run('https://example.net/custom');
  sqlite.prepare('INSERT INTO events(kind,source_name,visitor_id,occurred_at) VALUES(?,?,?,?)').run('view','Custom source','visitor-1',Date.now());
  // Ensure new D1 schema migration kept the required tables and columns.
  assert.equal(sqlite.prepare('SELECT url FROM buttons WHERE id=1').get().url,'https://example.net/custom');
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM events').get().n,1);
  assert.ok(sqlite.prepare('PRAGMA table_info(settings)').all().some((row)=>row.name==='favicon_data'));
});
