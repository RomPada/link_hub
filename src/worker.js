/** LinkHub v0.2.0 — one Cloudflare Worker + D1 + static assets.
 * Analytics counts page visits and outbound button clicks separately.
 * No raw IP addresses or HTTP referrers are stored.
 */

const SESSION_COOKIE = 'lh_session';
const VISITOR_COOKIE = 'lh_visitor';
const SOURCE_COOKIE = 'lh_source';
const WEEK_MS = 7 * 86400000;
const SESSION_TTL = WEEK_MS;
const RESERVED = new Set(['admin', 'api', 'out', 'login', 'demo', 'go', 'favicon', 'manifest', 'icon', 'robots', 'index', 'assets', 'site-icon']);
const NAV_BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|twitterbot|telegrambot|discordbot|whatsapp|linkedinbot|pinterest|headless|lighthouse|google-inspectiontool/i;
const VALID_SLUG = /^[a-z][a-z0-9_-]{0,39}$/;
const COLOR_CHOICES = new Set(['#e9eefc','#f9e8e7','#f9edd7','#e4f0e9','#ede8f9','#e8f3f5','#f2ece6','#f5e9f1']);

export function isValidSlug(slug) { return VALID_SLUG.test(slug) && !RESERVED.has(slug); }
export function validHttpUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
}
export function periodStart(period, now = Date.now()) {
  const date = new Date(now);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (period === 'today') return day;
  if (period === 'week') return day - 6 * 86400000;
  if (period === 'month') return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  return 0;
}
export function deviceType(ua = '') {
  if (/ipad|tablet/i.test(ua)) return 'Tablet';
  if (/iphone|ipod|mobile|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}
function noStore(response) { response.headers.set('Cache-Control', 'no-store, private'); return response; }
function json(data, status = 200) { return noStore(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } })); }
function fail(message, status = 400) { return json({ error: message }, status); }
function cookie(request, key) {
  return (request.headers.get('Cookie') || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${key}=`))?.slice(key.length + 1) || '';
}
function cookieHeader(name, value, request, { maxAge = 31536000, sameSite = 'Lax' } = {}) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
}
function validVisitorId(value) { return /^[a-f0-9]{8}-[a-f0-9-]{27,36}$/i.test(value); }
function visitorFrom(request) {
  const existing = cookie(request, VISITOR_COOKIE);
  return existing && validVisitorId(existing) ? { value: existing, created: false } : { value: crypto.randomUUID(), created: true };
}
function countryFrom(request) {
  const value = request.cf?.country;
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : null;
}
function shouldCount(request) {
  const ua = request.headers.get('User-Agent') || '';
  if (NAV_BOTS.test(ua)) return false;
  if (request.headers.get('Purpose')?.includes('prefetch') || request.headers.get('Sec-Purpose')?.includes('prefetch')) return false;
  if (request.headers.get('X-Moz') === 'prefetch') return false;
  return true;
}
function trackingCookies(response, request, visitor, sourceCookie = null) {
  if (visitor.created) response.headers.append('Set-Cookie', cookieHeader(VISITOR_COOKIE, visitor.value, request));
  if (sourceCookie !== null) response.headers.append('Set-Cookie', cookieHeader(SOURCE_COOKIE, sourceCookie, request));
}
function respondRedirect(url, status = 302) { return noStore(new Response(null, { status, headers: { Location: url } })); }
function apiOriginAllowed(request) {
  const origin = request.headers.get('Origin');
  return origin === new URL(request.url).origin;
}
async function bodyJson(request, maximum = 16384) {
  if ((Number(request.headers.get('Content-Length') || 0)) > maximum) throw new Error('Request is too large');
  const raw = await request.text();
  if (raw.length > maximum) throw new Error('Request is too large');
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON'); }
}
function text(value, max = 100) { return String(value ?? '').trim().slice(0, max); }
function safeColor(value) { return COLOR_CHOICES.has(value) ? value : '#e9eefc'; }
function bool(value) { return value === true || value === 'on' || value === 1 || value === '1' ? 1 : 0; }
function safeFavicon(value) {
  if (value === '') return '';
  if (typeof value !== 'string' || value.length > 85000) throw new Error('Favicon is too large (max 60 KB)');
  const match = /^data:image\/(png|webp|x-icon|vnd\.microsoft\.icon);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error('Use a PNG, WebP or ICO file for the favicon');
  let bytes;
  try { bytes = atob(match[2]); } catch { throw new Error('Invalid favicon image'); }
  if (bytes.length > 61440 || !bytes.length) throw new Error('Favicon is too large (max 60 KB)');
  const signature = [...bytes.slice(0, 12)].map(c => c.charCodeAt(0));
  const png = signature.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
  const ico = signature.slice(0,4).join(',') === '0,0,1,0';
  const webp = bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  if (!(png || ico || webp)) throw new Error('Invalid favicon file signature');
  return value;
}
async function siteIcon(request, env) {
  const row = await env.DB.prepare('SELECT favicon_data FROM settings WHERE id=1').first();
  if (!row?.favicon_data) return env.ASSETS.fetch(new Request(new URL(new URL(request.url).pathname === '/favicon.ico' ? '/favicon.ico' : '/icon.svg', request.url), request));
  const data = safeFavicon(row.favicon_data);
  const match = /^data:(image\/[^;]+);base64,(.*)$/.exec(data);
  const decoded = atob(match[2]);
  const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
  return new Response(request.method === 'HEAD' ? null : bytes, {
    headers: { 'Content-Type': match[1], 'Cache-Control': 'no-cache', 'X-Content-Type-Options':'nosniff' }
  });
}
function toHex(buffer) { return [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, '0')).join(''); }
async function sha256(value) { return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
function secureEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function isConfigured(env) { return Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET && env.ADMIN_PASSWORD.length >= 8 && env.SESSION_SECRET.length >= 32); }
async function isAuthenticated(request, env) {
  const token = cookie(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const hash = await sha256(token);
  const session = await env.DB.prepare('SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?').bind(hash, Date.now()).first();
  return Boolean(session);
}
async function login(request, env) {
  if (!isConfigured(env)) return fail('Admin secrets are not configured. See README.md.', 503);
  const data = await bodyJson(request);
  const provided = String(data.password ?? '');
  if (provided.length > 256) return fail('Invalid credentials', 401);
  // Store only a keyed digest, never the raw client IP address.
  const clientKey = await hmacHex(env.SESSION_SECRET, request.headers.get('CF-Connecting-IP') || 'local-dev');
  const now = Date.now();
  const attempts = await env.DB.prepare('SELECT failures, window_start FROM login_attempts WHERE key_hash = ?').bind(clientKey).first();
  if (attempts && attempts.window_start > now - 900000 && attempts.failures >= 8) return fail('Too many attempts. Try again in 15 minutes.', 429);
  const expected = await hmacHex(env.SESSION_SECRET, env.ADMIN_PASSWORD);
  const actual = await hmacHex(env.SESSION_SECRET, provided);
  if (!secureEqual(actual, expected)) {
    await env.DB.prepare(`INSERT INTO login_attempts(key_hash,failures,window_start) VALUES (?,1,?)
      ON CONFLICT(key_hash) DO UPDATE SET failures = CASE WHEN window_start < ? THEN 1 ELSE failures+1 END,
      window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END`)
      .bind(clientKey, now, now-900000, now-900000).run();
    return fail('Invalid credentials', 401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key_hash = ?').bind(clientKey).run();
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare('INSERT INTO admin_sessions(token_hash,expires_at) VALUES (?,?)').bind(await sha256(token), now + SESSION_TTL).run();
  const response = json({ ok: true });
  response.headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE, token, request, { maxAge: 604800, sameSite: 'Strict' }));
  return response;
}
async function logout(request, env) {
  const token = cookie(request, SESSION_COOKIE);
  if (/^[a-f0-9]{64}$/.test(token)) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  const response = json({ ok: true });
  response.headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE, '', request, { maxAge: 0, sameSite: 'Strict' }));
  return response;
}
async function recordEvent(env, event) {
  await env.DB.prepare(`INSERT INTO events(kind,source_id,source_name,button_id,button_name,visitor_id,country,device,occurred_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).bind(event.kind, event.sourceId, event.sourceName,
    event.buttonId, event.buttonName, event.visitorId, event.country, event.device, Date.now()).run();
}
function scheduleRecord(ctx, env, event) { ctx.waitUntil(recordEvent(env, event).catch((error) => console.error('Event insert failed', error))); }
async function landing(request, env, ctx, source = null, track = true) {
  const asset = await env.ASSETS.fetch(
    new Request(new URL("/", request.url), request),
  );
  if (!asset.ok) return new Response('index.html was not found', { status: 500 });
  const response = noStore(new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers: asset.headers }));
  if (request.method === 'GET') {
    const visitor = visitorFrom(request);
    if (track) trackingCookies(response, request, visitor, source ? String(source.id) : '');
    if (track && shouldCount(request)) scheduleRecord(ctx, env, {
      kind: 'view', sourceId: source?.id ?? null, sourceName: source?.name ?? 'Direct',
      buttonId: null, buttonName: null, visitorId: visitor.value,
      country: countryFrom(request), device: deviceType(request.headers.get('User-Agent') || '')
    });
  }
  return response;
}
async function goOutbound(request, env, ctx, identifier) {
  if (!/^\d+$/.test(identifier)) return fail('Link not found', 404);
  const button = await env.DB.prepare('SELECT id, title, url, active FROM buttons WHERE id = ?').bind(Number(identifier)).first();
  if (!button || !button.active || !validHttpUrl(button.url)) return fail('Link not found', 404);
  const response = respondRedirect(button.url);
  if (request.method === 'GET') {
    const visitor = visitorFrom(request);
    trackingCookies(response, request, visitor);
    if (shouldCount(request)) {
      const storedSource = cookie(request, SOURCE_COOKIE);
      const source = /^\d+$/.test(storedSource)
        ? await env.DB.prepare('SELECT id, name FROM sources WHERE id = ?').bind(Number(storedSource)).first()
        : null;
      scheduleRecord(ctx, env, {
        kind: 'outbound', sourceId: source?.id ?? null, sourceName: source?.name ?? 'Direct',
        buttonId: button.id, buttonName: button.title, visitorId: visitor.value,
        country: countryFrom(request), device: deviceType(request.headers.get('User-Agent') || '')
      });
    }
  }
  return response;
}
async function publicData(env) {
  const [profile, links] = await Promise.all([
    env.DB.prepare('SELECT display_name,headline,bio,avatar_url,accent_color,avatar_text,avatar_background,avatar_shape,show_top_brand,show_top_tagline,updated_at FROM settings WHERE id=1').first(),
    env.DB.prepare('SELECT id,title,subtitle,category,accent FROM buttons WHERE active=1 ORDER BY sort_order ASC,id ASC').all()
  ]);
  return json({ profile, links: links.results });
}
function verifyAdminPayload(path, method, data) {
  if (path === 'profile') {
    const display_name = text(data.display_name, 80);
    const headline = text(data.headline, 140);
    const bio = text(data.bio, 300);
    const avatar_url = text(data.avatar_url, 700);
    const avatar_text = text(data.avatar_text, 8);
    const avatar_background = /^#[a-fA-F0-9]{6}$/.test(data.avatar_background) ? data.avatar_background : '#142849';
    const avatar_shape = ['rounded','square','circle'].includes(data.avatar_shape) ? data.avatar_shape : 'rounded';
    const show_top_brand = bool(data.show_top_brand);
    const show_top_tagline = bool(data.show_top_tagline);
    const favicon_data = safeFavicon(data.favicon_data ?? '');
    const accent_color = /^#[a-fA-F0-9]{6}$/.test(data.accent_color) ? data.accent_color : '#4267e9';
    if (!display_name || (avatar_url && !validHttpUrl(avatar_url))) throw new Error('Please enter a valid name and avatar URL');
    return { display_name, headline, bio, avatar_url, accent_color, avatar_text, avatar_background, avatar_shape, show_top_brand, show_top_tagline, favicon_data };
  }
  if (path === 'sources') {
    const name = text(data.name, 60);
    const slug = text(data.slug, 40).toLowerCase();
    if (!name || !isValidSlug(slug)) throw new Error('Use a name and a URL slug (letters, numbers, _ or -)');
    return { name, slug, active: bool(data.active !== false) };
  }
  if (path === 'buttons') {
    const title = text(data.title, 70);
    const subtitle = text(data.subtitle, 120);
    const url = text(data.url, 1800);
    const category = text(data.category, 50) || 'Links';
    const accent = safeColor(data.accent);
    const active = bool(data.active);
    if (!title || !validHttpUrl(url)) throw new Error('Please enter a title and valid http(s) URL');
    return { title, subtitle, url, category, accent, active };
  }
  throw new Error(`Unknown resource: ${path} (${method})`);
}
function periodName(input) { return ['today', 'week', 'month', 'all'].includes(input) ? input : 'week'; }
async function analytics(env, period) {
  const start = periodStart(period);
  const last14 = periodStart('today') - 13 * 86400000;
  const [summary, sourceBreakdown, outboundBreakdown, countryBreakdown, chart, recent] = await Promise.all([
    env.DB.prepare(`SELECT kind,COUNT(*) AS total,COUNT(DISTINCT visitor_id) AS visitors FROM events WHERE occurred_at >= ? GROUP BY kind`).bind(start).all(),
    env.DB.prepare(`SELECT source_name AS name, COUNT(*) AS total, COUNT(DISTINCT visitor_id) AS visitors
       FROM events WHERE kind='view' AND occurred_at >= ? GROUP BY source_name ORDER BY total DESC LIMIT 30`).bind(start).all(),
    env.DB.prepare(`SELECT button_name AS name, COUNT(*) AS total, COUNT(DISTINCT visitor_id) AS visitors
       FROM events WHERE kind='outbound' AND occurred_at >= ? GROUP BY button_name ORDER BY total DESC LIMIT 30`).bind(start).all(),
    env.DB.prepare(`SELECT COALESCE(country,'Unknown') AS name,COUNT(*) AS total FROM events WHERE kind='view' AND occurred_at >= ? GROUP BY country ORDER BY total DESC LIMIT 12`).bind(start).all(),
    env.DB.prepare(`SELECT date(occurred_at / 1000,'unixepoch') AS day,
       SUM(CASE WHEN kind='view' THEN 1 ELSE 0 END) AS views,
       SUM(CASE WHEN kind='outbound' THEN 1 ELSE 0 END) AS outbound
       FROM events WHERE occurred_at >= ? GROUP BY day ORDER BY day DESC`).bind(last14).all(),
    env.DB.prepare(`SELECT id, kind, source_name, button_name, country, device, visitor_id, occurred_at
       FROM events WHERE occurred_at >= ? ORDER BY occurred_at DESC LIMIT 80`).bind(start).all()
  ]);
  const today = periodStart('today');
  const mapping = new Map(chart.results.map((row) => [row.day, row]));
  const filledChart = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(today - index * 86400000).toISOString().slice(0, 10);
    return { day, views: mapping.get(day)?.views ?? 0, outbound: mapping.get(day)?.outbound ?? 0 };
  });
  const kinds = Object.fromEntries(summary.results.map((row) => [row.kind, { total: row.total, unique: row.visitors }]));
  return json({ period, summary: { views: kinds.view || { total: 0, unique: 0 }, outbound: kinds.outbound || { total: 0, unique: 0 } },
    sources: sourceBreakdown.results, buttons: outboundBreakdown.results,
    countries: countryBreakdown.results, chart: filledChart, recent: recent.results });
}
async function adminApi(request, env, path, method) {
  if (path === 'session' && method === 'GET') return json({ authenticated: await isAuthenticated(request, env), configured: isConfigured(env) });
  if (method !== 'GET' && !apiOriginAllowed(request)) return fail('Invalid request origin', 403);
  if (path === 'login' && method === 'POST') return login(request, env);
  if (path === 'logout' && method === 'POST') return logout(request, env);
  if (!(await isAuthenticated(request, env))) return fail('Please sign in', 401);

  if (path === 'state' && method === 'GET') {
    const [profile, sources, buttons] = await Promise.all([
      env.DB.prepare('SELECT * FROM settings WHERE id=1').first(),
      env.DB.prepare('SELECT * FROM sources ORDER BY created_at ASC,id ASC').all(),
      env.DB.prepare('SELECT * FROM buttons ORDER BY sort_order ASC,id ASC').all(),
    ]);
    return json({ profile, sources: sources.results, buttons: buttons.results });
  }
  if (path === 'analytics' && method === 'GET') return analytics(env, periodName(new URL(request.url).searchParams.get('period')));
  if (path === 'profile' && method === 'PUT') {
    const data = verifyAdminPayload(path, method, await bodyJson(request, 128000));
    await env.DB.prepare(`UPDATE settings SET display_name=?,headline=?,bio=?,avatar_url=?,accent_color=?,avatar_text=?,avatar_background=?,avatar_shape=?,show_top_brand=?,show_top_tagline=?,favicon_data=?,updated_at=? WHERE id=1`)
      .bind(data.display_name,data.headline,data.bio,data.avatar_url,data.accent_color,data.avatar_text,data.avatar_background,data.avatar_shape,data.show_top_brand,data.show_top_tagline,data.favicon_data,Date.now()).run();
    return json({ ok: true });
  }
  const parts = path.split('/');
  const table = parts[0];
  if (!['sources','buttons'].includes(table)) return fail('Endpoint not found',404);
  const id = parts[1] && /^\d+$/.test(parts[1]) ? Number(parts[1]) : null;
  if (parts.length > 2 || (parts.length === 2 && !id)) return fail('Invalid item ID', 400);

  if (method === 'POST' && !id) {
    const data = verifyAdminPayload(table, method, await bodyJson(request));
    if (table === 'sources') {
      await env.DB.prepare('INSERT INTO sources(name,slug,active,created_at) VALUES(?,?,?,?)')
        .bind(data.name,data.slug,data.active,Date.now()).run();
    } else {
      const top = await env.DB.prepare('SELECT MIN(sort_order) AS first FROM buttons').first();
      await env.DB.prepare(`INSERT INTO buttons(title,subtitle,url,category,accent,active,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?)`)
        .bind(data.title,data.subtitle,data.url,data.category,data.accent,data.active,Number(top?.first ?? 1)-1,Date.now()).run();
    }
    return json({ ok: true },201);
  }
  if (method === 'PUT' && id) {
    const data = verifyAdminPayload(table, method, await bodyJson(request));
    const sql = table === 'sources' ? 'UPDATE sources SET name=?,slug=?,active=? WHERE id=?'
      : 'UPDATE buttons SET title=?,subtitle=?,url=?,category=?,accent=?,active=? WHERE id=?';
    const values = table === 'sources' ? [data.name,data.slug,data.active,id]
      : [data.title,data.subtitle,data.url,data.category,data.accent,data.active,id];
    const result = await env.DB.prepare(sql).bind(...values).run();
    if (!result.meta.changes) return fail('Item not found',404);
    return json({ ok: true });
  }
  if (method === 'DELETE' && id) {
    const result = await env.DB.prepare(table === 'sources' ? 'DELETE FROM sources WHERE id=?' : 'DELETE FROM buttons WHERE id=?').bind(id).run();
    if (!result.meta.changes) return fail('Item not found',404);
    return json({ ok: true });
  }
  if (method === 'PATCH' && table === 'buttons' && path === 'buttons/order') return fail('Use buttons/order endpoint',400);
  return fail('Method not allowed', 405);
}
async function reorderButtons(request, env) {
  const data = await bodyJson(request);
  const list = data.ids;
  if (!Array.isArray(list) || list.length > 200 || list.some((id) => !Number.isInteger(id) || id <= 0) || new Set(list).size !== list.length) return fail('Invalid button list');
  const existing = await env.DB.prepare('SELECT id FROM buttons').all();
  if (existing.results.length !== list.length || existing.results.some((row) => !list.includes(row.id))) return fail('Button list changed; refresh and try again',409);
  if (list.length) await env.DB.batch(list.map((id,index) => env.DB.prepare('UPDATE buttons SET sort_order=? WHERE id=?').bind(index,id)));
  return json({ ok:true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    try {
      if ((pathname === '/site-icon' || pathname === '/favicon.ico') && (method === 'GET' || method === 'HEAD')) return await siteIcon(request,env);
      if (pathname === '/api/public' && method === 'GET') return await publicData(env);
      if (pathname.startsWith('/api/admin/')) {
        if (!['GET','POST','PUT','PATCH','DELETE'].includes(method)) return fail('Method not allowed',405);
        const subpath = pathname.slice('/api/admin/'.length);
        if (subpath === 'buttons/order' && method === 'PATCH') {
          if (!apiOriginAllowed(request)) return fail('Invalid request origin',403);
          if (!(await isAuthenticated(request,env))) return fail('Please sign in',401);
          return await reorderButtons(request,env);
        }
        return await adminApi(request, env, subpath,method);
      }
      if (pathname.startsWith('/api/')) return fail('Endpoint not found',404);
      if (method !== 'GET' && method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
      if (pathname.startsWith('/out/')) return await goOutbound(request,env,ctx,pathname.slice('/out/'.length));
      if (pathname === '/admin' || pathname === '/admin/') return await landing(request,env,ctx,null,false);
      if (pathname === '/' || pathname === '' || pathname === '/index.html') return await landing(request,env,ctx,null);
      if (/^\/[a-z][a-z0-9_-]{0,39}\/?$/.test(pathname)) {
        const slug = pathname.replace(/^\/+|\/+$/g,'');
        const source = await env.DB.prepare('SELECT id,name,slug FROM sources WHERE slug = ? AND active=1').bind(slug).first();
        if (source) return await landing(request,env,ctx,source);
        return noStore(new Response('Page not found. Visit / for all links.', { status: 404, headers: {'Content-Type':'text/plain; charset=utf-8'} }));
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('LinkHub handler error:',error);
      if (error?.message === 'Invalid JSON' || error?.message === 'Request is too large' || error?.message?.startsWith('Please enter') || error?.message?.startsWith('Use a name') || error?.message?.startsWith('Favicon') || error?.message?.startsWith('Invalid favicon') || error?.message?.startsWith('Use a PNG')) return fail(error.message,400);
      if (/UNIQUE constraint failed/i.test(error?.message || '')) return fail('This URL slug is already in use',409);
      return fail('Server error. Check Worker logs and D1 migrations.',500);
    }
  }
};
