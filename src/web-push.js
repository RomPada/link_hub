/** RFC 8291 / RFC 8188 / RFC 8292 Web Push sender, WebCrypto only.
 * No third-party push gateway is required. The browser chooses its own push service.
 */
const encoder = new TextEncoder();
const UTF8 = (value) => encoder.encode(value);
const joined = (...buffers) => {
  const output = new Uint8Array(buffers.reduce((size, part) => size + part.length, 0));
  let start = 0;
  for (const part of buffers) { output.set(part, start); start += part.length; }
  return output;
};
export function b64url(bytes) {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeB64url(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Invalid base64url value');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded + '='.repeat((4 - padded.length % 4) % 4)), char => char.charCodeAt(0));
}
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/i,
  /^updates\.push\.services\.mozilla\.com$/i,
  /^(?:[a-z0-9-]+\.)*notify\.windows\.com$/i,
  /^(?:[a-z0-9-]+\.)*push\.apple\.com$/i,
];
export function validPushSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return false;
  const { endpoint, keys } = subscription;
  if (typeof endpoint !== 'string' || endpoint.length > 2100 || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') return false;
  try {
    const address = new URL(endpoint);
    if (address.protocol !== 'https:' || address.port || address.username || address.password || !PUSH_HOSTS.some(re => re.test(address.hostname))) return false;
    const publicKey = decodeB64url(keys.p256dh);
    const auth = decodeB64url(keys.auth);
    return publicKey.length === 65 && publicKey[0] === 4 && auth.length === 16;
  } catch { return false; }
}
const derive = async (salt, ikm, info, len) => {
  const material = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, material, len * 8));
};
export async function encryptNotification(data, subscription) {
  if (!validPushSubscription(subscription)) throw new Error('Invalid push subscription');
  const message = UTF8(data);
  if (message.length > 3993) throw new Error('Push message exceeds 3993 bytes');
  const receiver = decodeB64url(subscription.keys.p256dh);
  const auth = decodeB64url(subscription.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const sender = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderBytes = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey));
  const receiverKey = await crypto.subtle.importKey('raw', receiver, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, sender.privateKey, 256));
  const intermediate = await derive(auth, shared, joined(UTF8('WebPush: info\0'), receiver, senderBytes), 32);
  const contentKey = await derive(salt, intermediate, UTF8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await derive(salt, intermediate, UTF8('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, joined(message, new Uint8Array([2]))));
  const header = new Uint8Array(86);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = senderBytes.length;
  header.set(senderBytes, 21);
  return joined(header, ciphertext);
}
export async function vapidToken(endpoint, config, now = Date.now()) {
  const publicBytes = decodeB64url(config.publicKey);
  const privateBytes = decodeB64url(config.privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) throw new Error('Invalid VAPID keys');
  if (!/^(mailto:|https:\/\/)/.test(config.subject || '')) throw new Error('Invalid VAPID contact');
  const signingKey = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: b64url(publicBytes.slice(1,33)), y: b64url(publicBytes.slice(33,65)), d: config.privateKey,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(UTF8(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
  const claims = b64url(UTF8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 43200, sub: config.subject })));
  const content = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, UTF8(content)));
  return `${content}.${b64url(signature)}`;
}
export async function sendWebPush(subscription, payload, config, fetchFn = fetch) {
  if (!validPushSubscription(subscription)) throw new Error('Unsafe push endpoint');
  const jwt = await vapidToken(subscription.endpoint, config);
  const encrypted = await encryptNotification(JSON.stringify(payload), subscription);
  return fetchFn(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${config.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body: encrypted,
    // Cloudflare Workers accepts only 'follow' and 'manual'. Do not follow
    // redirects to any other host: the VAPID JWT is scoped to this origin.
    redirect: 'manual',
  });
}
