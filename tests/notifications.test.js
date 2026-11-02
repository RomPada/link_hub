import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createDecipheriv, hkdfSync, verify as verifySignature, createPublicKey, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';
import { b64url, decodeB64url, validPushSubscription, encryptNotification, vapidToken, sendWebPush } from '../src/web-push.js';

const enc = new TextEncoder();
const ORIGIN='https://linkhub.example';
async function keys() {
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  return {
    publicKey:b64url(new Uint8Array(await webcrypto.subtle.exportKey('raw',pair.publicKey))),
    privateKey:(await webcrypto.subtle.exportKey('jwk',pair.privateKey)).d,
    subject:'mailto:admin@example.test',
    verifyKey:pair.publicKey
  };
}
async function browserSubscription() {
  const keyPair=await webcrypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const receiverPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',keyPair.publicKey));
  return {
    endpoint:'https://fcm.googleapis.com/fcm/send/example-test-device',
    keys:{p256dh:b64url(receiverPublic),auth:b64url(webcrypto.getRandomValues(new Uint8Array(16)))},
    receiverPrivate:keyPair.privateKey
  };
}
function removePrivate(sub){return {endpoint:sub.endpoint,keys:sub.keys};}
function setupDatabase(){
  const db=new DatabaseSync(':memory:');
  for(const num of ['0001_init','0002_public_identity','0003_button_icons','0004_profile_header','0005_notifications'])
    db.exec(readFileSync(new URL(`../migrations/${num}.sql`,import.meta.url),'utf8'));
  function stmt(sql,parameters=[]){
    const query=db.prepare(sql);return {
      async first(){return query.get(...parameters) ?? null;},
      async all(){return {results:query.all(...parameters)};},
      async run(){const r=query.run(...parameters);return {meta:{changes:Number(r.changes)}};}
    };
  }
  return {db,DB:{prepare(sql){return {bind(...args){return stmt(sql,args);},...stmt(sql)}}},};
}
const ctx=()=>({pending:[],waitUntil(promise){this.pending.push(promise)},async settle(){await Promise.all(this.pending)}});
function req(path,method='GET',body=null,cookie=''){
  return new Request(`${ORIGIN}${path}`,{method,
    headers:{'User-Agent':'Mozilla/5.0 Chrome','Origin':ORIGIN, ...(cookie?{'Cookie':cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined});
}

// Independent decryption using Node's native crypto primitives, not the WebCrypto sender.
test('RFC 8291 aes128gcm payload decrypts with independent Node receiver',async()=>{
  const sub=await browserSubscription();
  const payload='{"title":"Test event","body":"Hello from LinkHub"}';
  const frame=await encryptNotification(payload,removePrivate(sub));
  assert.equal(frame.length,86+enc.encode(payload).length+1+16);
  const salt=frame.subarray(0,16),serverPublic=frame.subarray(21,86);
  assert.equal(new DataView(frame.buffer,frame.byteOffset+16,4).getUint32(0),4096);
  const receiverJwk=await webcrypto.subtle.exportKey('jwk',sub.receiverPrivate);
  const receive= createECDH('prime256v1');receive.setPrivateKey(Buffer.from(decodeB64url(receiverJwk.d)));
  const shared=receive.computeSecret(serverPublic);
  const info=Buffer.concat([Buffer.from('WebPush: info\0'),Buffer.from(decodeB64url(sub.keys.p256dh)),Buffer.from(serverPublic)]);
  const intermediate=hkdfSync('sha256',shared,Buffer.from(decodeB64url(sub.keys.auth)),info,32);
  const cek=hkdfSync('sha256',intermediate,Buffer.from(salt),Buffer.from('Content-Encoding: aes128gcm\0'),16);
  const nonce=hkdfSync('sha256',intermediate,Buffer.from(salt),Buffer.from('Content-Encoding: nonce\0'),12);
  const crypt=frame.subarray(86);const decipher=createDecipheriv('aes-128-gcm',Buffer.from(cek),Buffer.from(nonce));
  decipher.setAuthTag(Buffer.from(crypt.subarray(crypt.length-16)));
  const clear=Buffer.concat([decipher.update(crypt.subarray(0,crypt.length-16)),decipher.final()]);
  assert.equal(clear.at(-1),2);
  assert.equal(clear.subarray(0,-1).toString(),payload);
});
test('VAPID JWT cryptographically verifies and targets the push service origin',async()=>{
  const config=await keys(); const token=await vapidToken('https://fcm.googleapis.com/fcm/send/some-token',config);
  const [header,claims,signature]=token.split('.');
  assert.equal(JSON.parse(Buffer.from(header,'base64url')).alg,'ES256');
  const parsed=JSON.parse(Buffer.from(claims,'base64url'));
  assert.equal(parsed.aud,'https://fcm.googleapis.com');
  assert.equal(parsed.sub,config.subject);
  assert.ok(parsed.exp>Math.floor(Date.now()/1000));
  const publicJwk={kty:'EC',crv:'P-256',x:b64url(decodeB64url(config.publicKey).subarray(1,33)),y:b64url(decodeB64url(config.publicKey).subarray(33))};
  assert.equal(verifySignature('sha256',Buffer.from(`${header}.${claims}`),{key:createPublicKey({key:publicJwk,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')),true);
});
test('push endpoints reject SSRF targets and malformed encryption keys',async()=>{
  const sub=await browserSubscription();
  assert.equal(validPushSubscription(removePrivate(sub)),true);
  assert.equal(validPushSubscription({...removePrivate(sub),endpoint:'https://127.0.0.1/private'}),false);
  assert.equal(validPushSubscription({...removePrivate(sub),endpoint:'https://fcm.googleapis.com:8443/path'}),false);
  assert.equal(validPushSubscription({...removePrivate(sub),keys:{...sub.keys,p256dh:'abc'}}),false);
});
test('Web Push request uses encrypted body and authenticated VAPID header',async()=>{
  const config=await keys(),sub=removePrivate(await browserSubscription());
  const response=await sendWebPush(sub,{title:'Testing'},config,async(endpoint, options)=>{
    assert.equal(endpoint,sub.endpoint);assert.match(options.headers.Authorization,/^vapid t=/);
    assert.equal(options.headers['Content-Encoding'],'aes128gcm');assert.ok(options.body.byteLength>86);
    assert.equal(options.redirect,'manual','Workers must not use unsupported redirect:error, or follow push endpoint redirects');
    return new Response(null,{status:201});
  });
  assert.equal(response.status,201);
});
test('admin notifications require login and validate subscription, preferences and removal',async()=>{
  const {db,DB}=setupDatabase(),config=await keys();
  const env={DB,ADMIN_PASSWORD:'a_long_test_password_123',SESSION_SECRET:'a-v3ry-long-unique-session-secret-that-is-at-least-32-chars',VAPID_PUBLIC_KEY:config.publicKey,VAPID_PRIVATE_KEY:config.privateKey,VAPID_SUBJECT:config.subject,
    ASSETS:{fetch:async()=>new Response('<html><link href="/manifest.webmanifest"></html>',{headers:{'Content-Type':'text/html'}})}};
  const deny=await worker.fetch(req('/api/admin/notifications/status'),env,ctx());assert.equal(deny.status,401);
  const login=await worker.fetch(req('/api/admin/login','POST',{password:env.ADMIN_PASSWORD}),env,ctx());
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const status=await worker.fetch(req('/api/admin/notifications/status','GET',null,cookie),env,ctx());assert.equal((await status.json()).available,true);
  const bad=await worker.fetch(req('/api/admin/notifications/subscribe','POST',{endpoint:'https://localhost/private',keys:{p256dh:'broken',auth:'broken'}},cookie),env,ctx());assert.equal(bad.status,400);
  const sub=removePrivate(await browserSubscription());
  const added=await worker.fetch(req('/api/admin/notifications/subscribe','POST',sub,cookie),env,ctx());
  assert.equal(added.status,201); const {endpoint_hash}=await added.json();
  const prefs=await worker.fetch(req('/api/admin/notifications/preferences','PUT',{endpoint_hash,enabled:true,notify_views:false,notify_unique:true,notify_outbound:true,device_name:'Android',source_filter:'all',cooldown_seconds:60},cookie),env,ctx());assert.equal(prefs.status,200);
  const device=db.prepare('SELECT device_name,notify_outbound,notify_unique FROM push_subscriptions').get();
  assert.equal(device.device_name,'Android');assert.equal(device.notify_unique,1);
  const removed=await worker.fetch(req('/api/admin/notifications/device','DELETE',{endpoint_hash},cookie),env,ctx());assert.equal(removed.status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,0);
});
test('admin route gets its own installable manifest and no page-view event',async()=>{
  const {DB}=setupDatabase();
  const env={DB,ASSETS:{fetch:async()=>new Response('<link rel="manifest" href="/manifest.webmanifest" />',{headers:{'Content-Type':'text/html'}})}};
  const context=ctx();const resp=await worker.fetch(req('/admn'),env,context);
  assert.equal(resp.status,200);
  assert.match(await resp.text(),/href="\/admin.webmanifest"/);
  assert.equal(context.pending.length,0);
});

test('cross-origin requests cannot register devices or change notification preferences',async()=>{
  const {DB}=setupDatabase(),config=await keys();
  const env={DB,ADMIN_PASSWORD:'a_long_test_password_123',SESSION_SECRET:'a-v3ry-long-unique-session-secret-that-is-at-least-32-chars',VAPID_PUBLIC_KEY:config.publicKey,VAPID_PRIVATE_KEY:config.privateKey,VAPID_SUBJECT:config.subject};
  const login=await worker.fetch(req('/api/admin/login','POST',{password:env.ADMIN_PASSWORD}),env,ctx());
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const unsafe=new Request(`${ORIGIN}/api/admin/notifications/subscribe`,{method:'POST',headers:{Origin:'https://attacker.example',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(removePrivate(await browserSubscription()))});
  const result=await worker.fetch(unsafe,env,ctx());assert.equal(result.status,403);
});

test('new visitor push is delivered without changing page view counts, and repeat visit stays silent',async()=>{
  const {db,DB}=setupDatabase(),config=await keys();
  const env={DB,ADMIN_PASSWORD:'a_long_test_password_123',SESSION_SECRET:'a-v3ry-long-unique-session-secret-that-is-at-least-32-chars',VAPID_PUBLIC_KEY:config.publicKey,VAPID_PRIVATE_KEY:config.privateKey,VAPID_SUBJECT:config.subject,
  ASSETS:{fetch:async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}})}};
  const sub=removePrivate(await browserSubscription());
  db.prepare(`INSERT INTO push_subscriptions(endpoint_hash,endpoint,p256dh,auth,device_name,created_at,updated_at)
    VALUES('test-hash',?,?,?,?,1,1)`).run(sub.endpoint,sub.keys.p256dh,sub.keys.auth,'Android');
  const baseFetch=globalThis.fetch; const sends=[];
  globalThis.fetch=async(url,options)=>{sends.push({url,options});return new Response(null,{status:201})};
  try {
    const visitContext=ctx();const first=await worker.fetch(req('/source-one'),env,visitContext);
    await visitContext.settle();assert.equal(first.status,200);assert.equal(sends.length,1);
    const visitor=(first.headers.get('set-cookie')||'').match(/lh_visitor=([^;]+)/)?.[1];
    const againContext=ctx();
    const repeat=await worker.fetch(req('/source-one','GET',null,`lh_visitor=${visitor}`),env,againContext);
    await againContext.settle();assert.equal(repeat.status,200);assert.equal(sends.length,1);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM events WHERE kind='view'`).get().n,2);
  } finally {globalThis.fetch=baseFetch;}
});

test('failed browser push test shows HTTP status and allows immediate retry',async()=>{
  const {db,DB}=setupDatabase(),config=await keys();
  const env={DB,ADMIN_PASSWORD:'a_long_test_password_123',SESSION_SECRET:'a-v3ry-long-unique-session-secret-that-is-at-least-32-chars',
    VAPID_PUBLIC_KEY:config.publicKey,VAPID_PRIVATE_KEY:config.privateKey,VAPID_SUBJECT:config.subject};
  const login=await worker.fetch(req('/api/admin/login','POST',{password:env.ADMIN_PASSWORD}),env,ctx());
  const sessionCookie=login.headers.get('set-cookie').split(';')[0];
  const sub=removePrivate(await browserSubscription());
  const register=await worker.fetch(req('/api/admin/notifications/subscribe','POST',sub,sessionCookie),env,ctx());
  const hash=(await register.json()).endpoint_hash;
  const previous=globalThis.fetch;
  let attempts=0;
  globalThis.fetch=async(_endpoint,options)=>{
    assert.equal(options.redirect,'manual');
    attempts++;
    return new Response(null,{status:attempts===1?403:201});
  };
  try {
    const failed=await worker.fetch(req('/api/admin/notifications/test','POST',{endpoint_hash:hash},sessionCookie),env,ctx());
    assert.equal(failed.status,502);
    assert.match((await failed.json()).error,/authentication \(403\)/i);
    assert.equal(db.prepare('SELECT last_test_at FROM push_subscriptions WHERE endpoint_hash=?').get(hash).last_test_at,0);
    const passed=await worker.fetch(req('/api/admin/notifications/test','POST',{endpoint_hash:hash},sessionCookie),env,ctx());
    assert.equal(passed.status,200);
    assert.equal((await passed.json()).accepted,true);
    assert.equal(attempts,2);
  } finally {globalThis.fetch=previous;}
});
