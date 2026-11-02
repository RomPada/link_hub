import { publicLocales, publicLanguages, storedPublicLanguage } from './locales.js';
import { getAdminLanguage, translateAdmin, adminText } from './admin-uk.js';
/** LinkHub browser client — plain JavaScript, no framework or build step. */
const app = document.getElementById('app');
const adminMode = location.pathname.replace(/\/$/, '') === '/admn';
let deferredInstall = null;
if (typeof window !== 'undefined') {
  if (adminMode && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', {scope:'/'}).catch(console.warn);
  window.addEventListener('beforeinstallprompt', event => { if (!adminMode) return; event.preventDefault(); deferredInstall = event; document.getElementById('install-admin')?.removeAttribute('disabled'); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; if (state.tab==='notifications') renderAdmin(); });
}
const state = { notifications: null, pushDevice: null, adminLang: getAdminLanguage(), publicLang: storedPublicLanguage(), tab: 'overview', period: 'today', overview: null, profile: null, sources: [], buttons: [], busy: false, modal: null };

const palette = [
  ['#e9eefc', 'Icy blue'], ['#f9e8e7', 'Soft coral'], ['#f9edd7', 'Honey'],
  ['#e4f0e9', 'Sage'], ['#ede8f9', 'Lavender'], ['#e8f3f5', 'Misty teal'],
  ['#f2ece6', 'Oat'], ['#f5e9f1', 'Dusty rose']
];
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
function attr(value = '') { return escapeHTML(value); }
function qs(selector, parent = document) { return parent.querySelector(selector); }
function qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }
function formatCount(value) { return typeof value === 'string' && value.endsWith('%') ? value : Number(value || 0).toLocaleString('en-US'); }
function formatTime(value) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(Number(value)); }
function relativeDate(day) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)); }
function toast(message, type = 'ok') {
  let panel = qs('.toast-stack');
  if (!panel) { panel = document.createElement('div'); panel.className = 'toast-stack'; document.body.append(panel); }
  const item = document.createElement('div'); item.className = `toast toast-${type}`; item.textContent = adminMode && !qs('.login-shell') ? adminText(message, state.adminLang) : message;
  panel.append(item); window.setTimeout(() => item.remove(), 3700);
}
async function api(path, { method = 'GET', data } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: data !== undefined ? {'Content-Type':'application/json'} : {}, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}
function monogram(name) { return (name || 'LH').split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() || '').join(''); }
function socialIcon() { return '↗'; }
const globeSvg = `<svg class="globe-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9M12 3c3 3 4 6 4 9s-1 6-4 9"/></svg>`;
const chevronSvg = `<svg class="chevron-svg" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>`;
function countryName(value) {
  if (!value || value === 'Unknown') return 'Unknown';
  const code = String(value).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return value;
  try { const name = new Intl.DisplayNames([state.adminLang === 'uk' ? 'uk' : 'en'], { type: 'region' }).of(code); return `${name || code} (${code})`; }
  catch { return code; }
}

async function readIconFile(file) {
  if(file.size>61440)throw new Error('Icon must not exceed 60 KB');
  if(!/\.(png|webp|ico)$/i.test(file.name))throw new Error('Upload PNG, WebP or ICO');
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>{
      const data=String(reader.result);
      resolve(/\.ico$/i.test(file.name)?data.replace(/^data:[^;]+;/,'data:image/x-icon;'):data);
    };
    reader.onerror=()=>reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}
async function readProfileFile(file) {
  if(file.size > 262144)throw new Error('Profile image must not exceed 256 KB');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use a PNG, JPG or WebP image');
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error('Unable to read image'));reader.readAsDataURL(file);
  });
}
function iconSrc(button) {
  try {
    if (button.icon_mode === 'default') return '';
    if (button.icon_mode === 'upload' && Number.isInteger(Number(button.id))) return `/button-icon/${button.id}`;
    if (button.icon_mode === 'url' && /^https?:\/\//i.test(button.icon_url || '')) return button.icon_url;
    const dest = new URL(button.url || '');
    if (['https:', 'http:'].includes(dest.protocol)) return `${dest.origin}/favicon.ico`;
  } catch {}
  return '';
}
function iconTile(button) {
  const src=iconSrc(button);
  return `<span class="public-link-icon" style="--tile:${attr(button.accent)}">${src ? `<img src="${attr(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.hidden=false" /><span class="icon-tile-fallback" hidden>↗</span>` : '↗'}</span>`;
}
function publicLanguageMenu(lang, t) {
  return `<div class="language-menu"><button type="button" id="language-toggle" class="language-toggle" aria-expanded="false" aria-haspopup="listbox" aria-label="${attr(t.language)}"><span class="language-globe" aria-hidden="true">${globeSvg}</span><span>${escapeHTML(publicLanguages.find(([code])=>code===lang)?.[1]||'English')}</span><span class="language-chevron" aria-hidden="true">${chevronSvg}</span></button>
  <div class="language-options" id="language-options" role="listbox" aria-label="${attr(t.language)}" hidden>${publicLanguages.map(([code,label])=>`<button type="button" role="option" aria-selected="${lang===code}" data-public-language="${code}" class="language-option${lang===code?' selected':''}"><span>${escapeHTML(label)}</span>${lang===code?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}</div></div>`;
}

function linkCard(button, locale) {
  return `<a class="public-link" href="/out/${button.id}" target="_blank" rel="noopener noreferrer" aria-label="${attr(locale.open)} ${attr(button.title)} ${attr(locale.newTab)}">
    ${iconTile(button)}
    <span class="public-link-text"><strong>${escapeHTML(button.title)}</strong><small>${escapeHTML(button.subtitle || locale.cardFallback)}</small></span>
    <span class="public-link-arrow" aria-hidden="true">↗</span>
  </a>`;
}
async function renderPublic() {
  const lang = state.publicLang;
  const t = publicLocales[lang];
  document.documentElement.lang = lang;
  try {
    const data = await api('/api/public');
    const profile = data.profile || {};
    const links = data.links || [];
    const name = profile.display_name || 'Your Page';
    const avatarText = (profile.avatar_text || monogram(name)).slice(0,8);
    const shape = ['rounded','circle','square'].includes(profile.avatar_shape) ? profile.avatar_shape : 'rounded';
    const background = /^#[a-f0-9]{6}$/i.test(profile.avatar_background || '') ? profile.avatar_background : '#142849';
    document.title = name;
    document.querySelector('link[rel="icon"]')?.setAttribute('href', `/site-icon?v=${encodeURIComponent(profile.updated_at || 0)}`);
    const avatarSrc = profile.avatar_data || profile.avatar_url;
    const avatar = avatarSrc
      ? `<img class="public-avatar-img" src="${attr(avatarSrc)}" alt="${attr(name)}" />`
      : `<span>${escapeHTML(avatarText)}</span>`;
    const coverSrc = profile.cover_image_data || profile.cover_image_url;
    const coverImage = coverSrc ? `<img class="cover-photo" src="${attr(coverSrc)}" alt="" />` : '';
    const intro = profile.headline === 'Everything in one place.' ? t.defaultHeadline : (profile.headline || t.defaultHeadline);
    const bio = profile.bio === 'Follow, explore, and stay connected.' ? t.defaultBio : (profile.bio || '');
    app.innerHTML = `<div class="landing-shell" style="--hub-accent:${attr(profile.accent_color || '#4267e9')}">
      <div class="landing-halo landing-halo-a"></div><div class="landing-halo landing-halo-b"></div>
      <main class="public-container">
        <div class="public-topbar">
          ${publicLanguageMenu(lang,t)}
        </div>
        <header class="social-profile">
          <div class="profile-cover">${coverImage}<span class="profile-cover-pattern" aria-hidden="true"></span></div>
          <div class="profile-identity">
            <div class="public-avatar avatar-${shape}" style="--avatar-bg:${attr(background)}">${avatar}</div>
            <div class="profile-info">
              <span class="profile-overline"><span class="online-dot"></span> ${escapeHTML(t.welcome)}</span>
              <h1>${escapeHTML(name)}</h1>
              <h2>${escapeHTML(intro)}</h2>
              ${bio ? `<p>${escapeHTML(bio)}</p>` : ''}
            </div>
          </div>
        </header>
        <div class="profile-divider"><span>${escapeHTML(t.explore)}</span><span class="divider-line"></span></div>
        <div class="public-groups"><div class="public-links">${links.length ? links.map((button)=>linkCard(button,t)).join('') : `
          <div class="public-empty"><span class="public-empty-icon">↗</span><h3>${escapeHTML(t.emptyTitle)}</h3><p>${escapeHTML(t.emptyBody)}</p></div>`}</div></div>
        <footer class="public-footer"><span>${escapeHTML(t.footer)}</span><a href="/" aria-label="LinkHub home">LINKHUB <span aria-hidden="true">↗</span></a></footer>
      </main></div>`;
    const toggle=qs('#language-toggle'),options=qs('#language-options');
    function closeLanguages() {options.hidden=true;toggle.setAttribute('aria-expanded','false');}
    toggle?.addEventListener('click',()=>{options.hidden=!options.hidden;toggle.setAttribute('aria-expanded',String(!options.hidden));});
    qsa('[data-public-language]').forEach((button)=>button.addEventListener('click',()=>{
      state.publicLang=button.dataset.publicLanguage;
      try {localStorage.setItem('linkhub_public_lang',state.publicLang);} catch {}
      void renderPublic();
    }));
    options?.addEventListener('keydown',(event)=>{
      const buttons=qsa('[data-public-language]',options);
      const current=buttons.indexOf(document.activeElement);
      if(['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault();buttons[(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus(); }
      if(event.key==='Escape'){closeLanguages();toggle.focus();}
    });
    toggle?.addEventListener('keydown',(event)=>{if(event.key==='ArrowDown'){event.preventDefault();options.hidden=false;toggle.setAttribute('aria-expanded','true');qsa('button',options)[0]?.focus();}});
    toggle?.addEventListener('blur',()=>setTimeout(()=>{if(!document.activeElement?.closest('.language-menu'))closeLanguages();},120));
    options?.addEventListener('focusout',()=>setTimeout(()=>{if(!document.activeElement?.closest('.language-menu'))closeLanguages();},120));
  } catch (error) {
    app.innerHTML = `<div class="public-error"><h1>${escapeHTML(t.error)}</h1><p>${escapeHTML(error.message)}</p><button type="button" class="btn btn-primary" id="retry-public">${escapeHTML(t.retry)}</button></div>`;
    qs('#retry-public')?.addEventListener('click',renderPublic);
  }
}

const tabs = [ ['overview', 'Overview', '▦'], ['links', 'My links', '↗'], ['sources', 'Traffic sources', '◉'], ['appearance', 'Appearance', '✳'], ['notifications', 'Notifications', '♧'] ];
function adminShell(content) {
  const selected = state.tab;
  return `<div class="dashboard-shell">
    <aside class="sidebar">
      <div class="sidebar-brand"><div class="sidebar-brand-icon">↗</div><div><strong>LinkHub</strong><span>PERSONAL CONTROL CENTER</span></div></div>
      <div class="sidebar-label">WORKSPACE</div>
      <button type="button" class="mobile-section-switch" id="mobile-nav-toggle" aria-expanded="false" aria-controls="dashboard-navigation" aria-label="Open navigation menu"><span class="mobile-burger-icon" aria-hidden="true"><i></i><i></i><i></i></span><span class="mobile-switch-text"><span class="mobile-switch-title">${state.adminLang==='uk'?'Меню':'Menu'}</span><span class="mobile-switch-current">${escapeHTML(adminText(tabs.find(([id])=>id===selected)[1],state.adminLang))}</span></span></button>
      <nav id="dashboard-navigation" aria-label="Dashboard navigation" class="sidebar-nav">${tabs.map(([id, title, icon]) => `<button class="nav-item${id === selected ? ' nav-active' : ''}" data-tab="${id}"><span class="nav-item-icon">${icon}</span>${title}</button>`).join('')}<div class="mobile-nav-actions"><a class="sidebar-visit" href="/" target="_blank" rel="noopener noreferrer" aria-label="Open public site in browser">View public page <span aria-hidden="true">↗</span></a><button type="button" class="sidebar-logout" data-sign-out>Sign out <span aria-hidden="true">→</span></button></div></nav>
      <div class="sidebar-spacer"></div>
      <a class="sidebar-visit" href="/" target="_blank" rel="noopener">View public page <span>↗</span></a>
      <button class="sidebar-logout" id="sign-out" data-sign-out>Sign out <span>→</span></button>
      <div class="sidebar-version">LINKHUB · v0.5.2</div>
    </aside>
    <div class="dash-main">
      <header class="dash-topbar"><div class="dash-topbar-title">LINKHUB / <span>${escapeHTML(adminText(tabs.find((tab) => tab[0] === selected)[1],state.adminLang).toUpperCase())}</span></div><div class="dash-topbar-right"><div class="admin-language-menu language-menu"><button type="button" class="language-toggle" id="admin-language-toggle" aria-expanded="false" aria-haspopup="listbox" aria-label="Dashboard language"><span class="language-globe" aria-hidden="true">${globeSvg}</span><span>${state.adminLang==='uk'?'Українська':'English'}</span><span class="language-chevron" aria-hidden="true">${chevronSvg}</span></button><div class="language-options" id="admin-language-options" role="listbox" aria-label="Dashboard language" hidden>${[['en','English'],['uk','Українська']].map(([lang,label])=>`<button type="button" class="language-option${state.adminLang===lang?' selected':''}" role="option" aria-selected="${state.adminLang===lang}" data-admin-language="${lang}"><span>${label}</span>${state.adminLang===lang?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}</div></div><span class="pill-live"><i></i> LIVE</span></div></header>
      <div class="dashboard-content">${content}</div>
      <footer class="dash-footer">LinkHub v0.5.2 <span>·</span> Cloudflare Workers + D1 <span>·</span> Your data, your links.</footer>
    </div>
  </div>`;
}
function metricCard(label, value, subtitle, icon, tone = '', metric = '') {
  const content = `<span class="metric-top"><span>${escapeHTML(label)}</span><span class="metric-icon">${icon}</span></span><strong>${formatCount(value)}</strong><span class="metric-bottom"><small>${escapeHTML(subtitle)}</small>${metric ? '<span class="metric-more">View details <span aria-hidden="true">→</span></span>' : ''}</span>`;
  return metric
    ? `<button type="button" class="metric-card ${tone} metric-action" data-metric="${metric}" aria-label="${attr(label)}">${content}</button>`
    : `<article class="metric-card metric-static ${tone}">${content}</article>`;
}
function tableMarkup(items, columns, empty) {
  if (!items?.length) return `<div class="table-empty">${escapeHTML(empty || 'Nothing to show yet.')}</div>`;
  return `<div class="responsive-table"><table><thead><tr>${columns.map(([title]) => `<th>${title}</th>`).join('')}</tr></thead><tbody>${items.map((entry, index) => `<tr>${columns.map(([, template]) => `<td>${template(entry,index)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function periodPills() { return `<div class="period-pills" role="group" aria-label="Analytics period">${[['today','Today'],['week','7 days'],['month','This month'],['all','All time']].map(([key, label]) => `<button data-period="${key}" class="period-pill${state.period === key ? ' period-active' : ''}">${label}</button>`).join('')}</div>`; }
function chartMarkup(chart) {
  const max = Math.max(1, ...chart.map((row) => Number(row.views)), ...chart.map((row) => Number(row.outbound)));
  const bars = chart.map((row, index) => `<div class="chart-day" title="${row.day}: ${row.views} views, ${row.outbound} clicks"><div class="chart-bars"><div class="chart-bar chart-view" style="height:${row.views ? Math.max(5, row.views / max * 100) : 0}%"></div><div class="chart-bar chart-click" style="height:${row.outbound ? Math.max(5, row.outbound / max * 100) : 0}%"></div></div><span>${index === 0 ? 'Today' : index === 1 ? 'Yesterday' : relativeDate(row.day)}</span></div>`).join('');
  return `<div class="chart" tabindex="0" role="region" aria-label="Traffic activity chart; swipe horizontally to see older days"><div class="chart-grid-lines"><i></i><i></i><i></i><i></i></div><div class="chart-days">${bars}</div></div>`;
}
function trendRows(items, total, prefix = '') {
  if (!items?.length) return '<div class="table-empty">No activity in this period yet.</div>';
  const max = Math.max(...items.map((row) => Number(row.total)), 1);
  return `<div class="rank-list">${items.slice(0, 8).map((item, i) => `<div class="rank-item"><span class="rank-index">${String(i+1).padStart(2,'0')}</span><div class="rank-info"><div><strong>${escapeHTML(item.name || 'Unknown')}</strong><span>${formatCount(item.total)} ${prefix || 'events'}</span></div><div class="rank-track"><span style="width:${Math.max(3, Number(item.total)/max*100)}%"></span></div></div><b>${total ? Math.round(Number(item.total)/total*100) : 0}%</b></div>`).join('')}</div>`;
}
function overview() {
  const data = state.overview;
  if (!data) return `<div class="loading-state"><span class="loading-ring"></span> Loading analytics…</div>`;
  const { summary, sources, buttons, countries, chart, recent } = data;
  const rate = summary.views.total ? (summary.outbound.total / summary.views.total * 100).toFixed(1) : '0.0';
  return `<section class="page-heading"><div><div class="eyebrow">A CLEARER PICTURE OF YOUR TRAFFIC</div><h1>Overview</h1><p>Know where visitors arrive and what they choose next.</p></div>${periodPills()}</section>
    <div class="metric-grid">${metricCard('Page views',summary.views.total,'Visits to your LinkHub','↗','metric-primary','views')}${metricCard('Unique visitors',summary.views.unique,'Distinct anonymous browser IDs','◎','','unique')}${metricCard('Outbound clicks',summary.outbound.total,'Clicks on your destination buttons','↗','','outbound')}${metricCard('Click-through rate',rate + '%','Outbound clicks ÷ page views','✧')}</div>
    <div class="dash-two-up"><section class="dash-panel chart-panel"><div class="panel-title-row"><div><h2>Traffic activity</h2><p>Last 14 days · Today first · UTC</p></div><div class="chart-legend"><span><i class="legend-views"></i>Views</span><span><i class="legend-clicks"></i>Clicks</span></div></div>${chartMarkup(chart)}</section>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Traffic sources</h2><p>Visits by entry link</p></div><span class="panel-detail">SOURCE MIX</span></div>${trendRows(sources,summary.views.total,'views')}</section></div>
    <div class="dash-two-up"><section class="dash-panel"><div class="panel-title-row"><div><h2>Destination clicks</h2><p>Which buttons people open</p></div><span class="panel-detail">BUTTONS</span></div>${trendRows(buttons,summary.outbound.total,'clicks')}</section>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Visitor countries</h2><p>Based on Cloudflare's approximate location</p></div><span class="panel-detail">WORLDWIDE</span></div>${trendRows(countries.map(row=>({...row,name:countryName(row.name)})),summary.views.total,'views')}</section></div>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Recent activity</h2><p>Latest tracked views and outbound clicks</p></div><span class="panel-detail">${recent.length} RECORDS</span></div>${tableMarkup(recent,[['#',(r,index)=>String(index+1)],['WHEN', (r) => `<span class="no-wrap">${escapeHTML(formatTime(r.occurred_at))}</span>`],['EVENT',(r)=> `<span class="event-pill ${r.kind === 'view' ? 'event-view':'event-outbound'}">${r.kind === 'view' ? 'Page view':'Outbound click'}</span>`],['ENTRY SOURCE',(r)=>escapeHTML(r.source_name)],['DESTINATION',(r)=>escapeHTML(r.button_name || '—')],['COUNTRY',(r)=>escapeHTML(countryName(r.country))],['DEVICE',(r)=>escapeHTML(r.device || 'Unknown')],['VISITOR',(r)=>`<code>${escapeHTML(r.visitor_id.slice(0,8))}…</code>`]],'Your first visit will appear here.')}</section>`;
}
async function metricDetails(metric) {
  const titles={views:'Page views',unique:'Unique visitors',outbound:'Outbound clicks'};
  const name=titles[metric]||'Details';
  modal(name,`<div class="metric-detail-loading">Loading events…</div>`);
  try {
    const data=await api(`/api/admin/analytics/details?metric=${encodeURIComponent(metric)}&period=${encodeURIComponent(state.period)}`);
    if(!state.modal)return;
    const box=qs('.modal-card',state.modal);
    box.classList.add('metric-detail-modal');
    const count=data.records.length;
    const period={today:'Today',week:'Last 7 days',month:'This month',all:'All time'}[state.period];
    const summary=metric==='unique'?'One row per anonymous browser in this period':'Event log for this metric';
    const display=`<div class="metric-detail-intro"><strong>${escapeHTML(period)}</strong><span>${escapeHTML(summary)}</span><small>Showing ${count} of at most 250 most relevant records</small></div>
      ${tableMarkup(data.records,[['#',(r,index)=>String(index+1)],['WHEN',(r)=>escapeHTML(formatTime(r.occurred_at))],['SOURCE',(r)=>escapeHTML(r.source_name||'Direct')],['DESTINATION',(r)=>escapeHTML(r.button_name||'—')],['COUNTRY',(r)=>escapeHTML(countryName(r.country))],['DEVICE',(r)=>escapeHTML(r.device||'Unknown')],['VISITOR',(r)=>`<code title="${attr(r.visitor_id)}">${escapeHTML(r.visitor_id.slice(0,12))}…</code>`],['ACTIONS',(r)=>`<button type="button" class="btn btn-danger-ghost event-delete-button" data-delete-event="${Number(r.id)}" aria-label="Delete event">Delete</button>`]],'No records for this period.')}`;
    qs('.metric-detail-loading',box).outerHTML=display;
    translateAdmin(box,state.adminLang);
    qsa('[data-delete-event]',box).forEach((button)=>button.addEventListener('click',()=>void confirmEventDeletion(Number(button.dataset.deleteEvent),metric)));
  }catch(error){const box=state.modal&&qs('.metric-detail-loading',state.modal);if(box)box.textContent=error.message;}
}
async function confirmEventDeletion(id, metric) {
  if (!Number.isSafeInteger(id) || id <= 0) return;
  modal('Delete analytics record?',`<p class="confirm-description">This event will be permanently deleted from analytics. All totals will be recalculated. This action cannot be undone.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="button" class="btn btn-danger" id="confirm-event-delete">Delete permanently</button></div>`);
  qs('#confirm-event-delete').addEventListener('click',async(event)=>{
    event.currentTarget.disabled=true;
    try {
      await api(`/api/admin/events/${id}`,{method:'DELETE'});
      state.overview=await api(`/api/admin/analytics?period=${state.period}`);
      renderAdmin();
      toast('Analytics record deleted');
      await metricDetails(metric);
    } catch(error){toast(error.message,'error');event.currentTarget.disabled=false;}
  });
}
function copyButton(text, label = 'Copy') { return `<button type="button" class="btn btn-subtle btn-copy" data-copy="${attr(text)}"><span>⧉</span> ${label}</button>`; }
function linksTab() {
  const rows=state.buttons.map((item,index)=>`
    <article class="manage-card">
      <div class="manage-card-left">
        <span class="manage-icon" style="background:${attr(item.accent)}">${iconTile(item)}</span>
        <div class="manage-card-copy"><div class="manage-title">${escapeHTML(item.title)} <span class="mini-status ${item.active ? 'mini-on':'mini-off'}">${item.active ? 'Live' : 'Hidden'}</span></div>
          <p>${escapeHTML(item.subtitle || item.url)}</p><small>${escapeHTML(item.url)}</small>
        </div>
      </div>
      <div class="manage-card-actions">
        <div class="order-controls">
          <button type="button" data-move="${item.id}" data-direction="up" ${index===0?'disabled':''} title="Move up" aria-label="Move up">↑</button>
          <button type="button" data-move="${item.id}" data-direction="down" ${index===state.buttons.length-1?'disabled':''} title="Move down" aria-label="Move down">↓</button>
        </div>
        ${copyButton(`${location.origin}/out/${item.id}`,'Copy link')}
        <button class="btn btn-outline" data-edit="buttons" data-id="${item.id}">Edit</button>
        <button class="btn btn-danger-ghost" data-delete="buttons" data-id="${item.id}">Delete</button>
      </div>
    </article>`).join('');
  return `<section class="page-heading"><div><div class="eyebrow">YOUR DESTINATIONS</div><h1>My links</h1><p>Manage all destination buttons in one ordered list.</p></div><button class="btn btn-primary" data-add="buttons">+ Add a link</button></section>
    <div class="info-strip"><span>◎</span><div><strong>Two separate metrics.</strong> LinkHub records page visits and tracked destination clicks independently.</div></div>
    <div class="manage-grid ungrouped-links">${rows || `<div class="public-empty"><h3>Nothing here yet.</h3><p>Add your first destination link.</p></div>`}</div>
    <p class="helper-note">Each button has a tracked <code>/out/ID</code> URL. Updating its destination does not change that tracking address.</p>`;
}
function sourceTab() {
  return `<section class="page-heading"><div><div class="eyebrow">KNOW WHERE PEOPLE COME FROM</div><h1>Traffic sources</h1><p>Share a different entry URL on each platform; every URL opens the same LinkHub page.</p></div><button class="btn btn-primary" data-add="sources">+ Add a source</button></section>
    <div class="info-strip"><span>↗</span><div><strong>Source attribution, not automatic referrer detection.</strong> A visit to <code>/source-one</code> is attributed to Source One even if the URL is shared elsewhere. Direct visitors use the homepage.</div></div>
    <div class="source-grid">${state.sources.map((source) => `<article class="source-card"><div class="source-card-top"><div class="source-symbol">${escapeHTML(socialIcon(source.name))}</div><span class="mini-status ${source.active ? 'mini-on':'mini-off'}">${source.active?'Live':'Paused'}</span></div><h3>${escapeHTML(source.name)}</h3><p class="source-url">${escapeHTML(`${location.origin}/${source.slug}`)}</p><div class="source-card-bottom">${copyButton(`${location.origin}/${source.slug}`, 'Copy URL')}<button class="btn btn-outline" data-edit="sources" data-id="${source.id}">Edit</button><button class="btn btn-danger-ghost" data-delete="sources" data-id="${source.id}">Delete</button></div></article>`).join('')}</div>`;
}
function appearanceTab() {
  const item = state.profile || {};
  const favicon = item.favicon_data ? '<span class="setting-status status-added">Custom favicon saved</span>' : '<span class="setting-status">Using the default icon</span>';
  return `<section class="page-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Appearance</h1><p>Update the profile and choose which elements appear on your public page.</p></div></section>
    <section class="dash-panel appearance-panel"><div class="panel-title-row"><div><h2>Profile details</h2><p>Changes appear on all entry URLs immediately.</p></div><span class="panel-detail">PUBLIC PROFILE</span></div>
      <form id="profile-form" class="field-form"><div class="form-row"><label>Display name<input name="display_name" maxlength="80" required value="${attr(item.display_name || '')}" placeholder="Your page" /></label><label>Headline<input name="headline" maxlength="140" value="${attr(item.headline || '')}" placeholder="Everything in one place" /></label></div>
      <label>Bio<textarea name="bio" rows="3" maxlength="300" placeholder="Introduce yourself or your project">${escapeHTML(item.bio || '')}</textarea></label>
      <section class="appearance-inner-panel profile-editor-panel"><h3>Profile header</h3><p>Customize the cover artwork, avatar and identity — just like a social profile.</p>
        <div class="social-profile-preview" aria-label="Profile preview"><div class="profile-cover profile-cover-preview">${item.cover_image_data || item.cover_image_url ? `<img class="cover-photo" src="${attr(item.cover_image_data || item.cover_image_url)}" alt="" />` : ''}<span class="profile-cover-pattern" aria-hidden="true"></span></div>
          <div class="profile-identity"><div class="public-avatar avatar-${attr(item.avatar_shape || 'rounded')} avatar-preview" style="--avatar-bg:${attr(item.avatar_background || '#142849')}">${item.avatar_data || item.avatar_url ? `<img src="${attr(item.avatar_data || item.avatar_url)}" alt="Avatar preview"/>` : escapeHTML(item.avatar_text || monogram(item.display_name || 'AB'))}</div><div><strong class="profile-name-preview">${escapeHTML(item.display_name || 'Your Page')}</strong><small>Public profile preview</small></div></div>
        </div>
        <div class="profile-editor-grid">
          <div class="profile-editor-field"><label>Cover image URL <span class="form-optional">optional · HTTPS</span><input name="cover_image_url" type="url" value="${attr(item.cover_image_url || '')}" placeholder="https://example.com/cover.jpg" /></label>
            <span class="file-field-title">Or upload a cover (PNG, JPG, WebP · up to 256 KB)</span><label class="file-picker" for="cover-upload"><span class="file-picker-icon" aria-hidden="true">↑</span><span class="file-picker-action">Choose cover</span><span class="file-picker-name" id="cover-file-label">No file selected</span></label><input id="cover-upload" class="visually-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" /><button type="button" class="btn btn-outline remove-profile-image" id="remove-cover">Remove cover</button></div>
          <div class="profile-editor-field"><label>Avatar image URL <span class="form-optional">optional · HTTPS</span><input name="avatar_url" type="url" value="${attr(item.avatar_url || '')}" placeholder="https://example.com/avatar.png" /></label>
            <span class="file-field-title">Or upload an avatar (PNG, JPG, WebP · up to 256 KB)</span><label class="file-picker" for="avatar-upload"><span class="file-picker-icon" aria-hidden="true">↑</span><span class="file-picker-action">Choose avatar</span><span class="file-picker-name" id="avatar-file-label">No file selected</span></label><input id="avatar-upload" class="visually-hidden-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" /><button type="button" class="btn btn-outline remove-profile-image" id="remove-avatar">Remove avatar image</button></div>
        </div>
        <div class="form-row"><label>Fallback avatar letters<input name="avatar_text" maxlength="8" value="${attr(item.avatar_text || '')}" placeholder="AB" /></label>
          <label>Fallback avatar background<input name="avatar_background" type="color" value="${attr(item.avatar_background || '#142849')}" /></label></div>
        <label>Avatar shape<select name="avatar_shape"><option value="rounded" ${item.avatar_shape==='rounded'||!item.avatar_shape?'selected':''}>Rounded</option><option value="square" ${item.avatar_shape==='square'?'selected':''}>Square</option><option value="circle" ${item.avatar_shape==='circle'?'selected':''}>Circle</option></select></label>
        <input type="hidden" name="clear_cover_image" value="0" /><input type="hidden" name="clear_avatar_image" value="0" />
      </section>
      <section class="appearance-inner-panel"><h3>Site favicon</h3><p>Upload a PNG, WebP or ICO file (up to 60 KB). The icon is shown in browser tabs.</p>
        <div class="favicon-controls"><img id="favicon-preview" src="/site-icon?v=${encodeURIComponent(item.updated_at||0)}" alt="Current favicon" />
          <div><span class="file-field-title">Upload favicon</span><label class="file-picker" for="favicon-upload"><span class="file-picker-icon" aria-hidden="true">↑</span><span class="file-picker-action">Choose file</span><span class="file-picker-name" id="favicon-file-label">No file selected</span></label><input id="favicon-upload" class="visually-hidden-input" type="file" accept=".png,.webp,.ico,image/png,image/webp,image/x-icon,image/vnd.microsoft.icon" />
          <div class="favicon-action-row">${favicon}<button type="button" class="btn btn-outline" id="clear-favicon">Remove custom favicon</button></div></div></div>
        <input type="hidden" name="clear_favicon" value="0" />
      </section>
      <div class="form-row"><label>Accent color<input name="accent_color" type="color" value="${attr(item.accent_color || '#4267e9')}" /></label><p class="appearance-tip">Used for highlights, link arrows, focus indicators and interactive details.</p></div>
      <div class="form-bottom"><button class="btn btn-primary" type="submit">Save appearance</button></div></form></section>`;
}
function deviceChoice() {
  return state.notifications?.devices?.find(device => device.endpoint_hash === state.pushDevice) || state.notifications?.devices?.[0] || null;
}
function notificationsTab() {
  const info=state.notifications;
  const connected=info?.devices || [];
  const current=deviceChoice();
  const installed=window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone);
  const supported=Boolean(window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  const options = state.sources.map(source=>`<option value="${source.id}" ${String(current?.source_filter)===String(source.id)?'selected':''}>${escapeHTML(source.name)}</option>`).join('');
  return `<section class="page-heading"><div><div class="eyebrow">YOUR LINKHUB ALERTS</div><h1>Notifications</h1><p>Install your dashboard and choose which visits or clicks reach your device.</p></div></section>
  <div class="notifications-layout">
    <section class="dash-panel notification-intro"><div class="panel-title-row"><div><h2>Install on your phone</h2><p>Open this page in Chrome on Android, then install the standalone admin app.</p></div><span class="notify-icon">↗</span></div>
      <div class="install-state"><span class="notify-status-indicator ${installed?'connected':''}"></span>${installed?'Admin app is installed / running standalone':'Browser mode · install the app for quick access'}</div>
      <div class="notification-actions"><button class="btn btn-primary" type="button" id="install-admin" ${installed?'disabled':''}>${installed?'App installed':'Install admin app'}</button></div>
      <p class="notification-hint">If the install prompt is unavailable: open the browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. Your app opens at <code>/admn</code>. No separate Android APK is needed.</p>
    </section>
    <section class="dash-panel notification-intro"><div class="panel-title-row"><div><h2>Push on this device</h2><p>Subscribe this browser to receive notifications, even when the page is closed.</p></div><span class="notify-icon">◎</span></div>
      <div class="install-state"><span class="notify-status-indicator ${typeof Notification !== 'undefined' && Notification.permission==='granted'?'connected':''}"></span>${supported ? `Permission: ${Notification.permission}`:'Web Push unavailable in this browser or insecure context'}</div>
      <div class="notification-actions"><button class="btn btn-primary" type="button" id="enable-push" ${!supported || !info?.available?'disabled':''}>Enable notifications</button><span class="notification-muted">${info?.available?'Your device controls when alerts arrive.':'Add VAPID keys to enable push delivery.'}</span></div>
      <p class="notification-hint">Only signed-in administrators can register devices. Visitors to your public page will never see a notification prompt.</p>
    </section>
  </div>
  <section class="dash-panel notification-settings"><div class="panel-title-row"><div><h2>Notification preferences</h2><p>Choose a registered device and what it should receive.</p></div><span class="panel-detail">${connected.length} / 8 DEVICES</span></div>
    ${current ? `<form id="notifications-form" class="notification-form">
      <div class="notification-field"><label for="push-device">Device</label><select id="push-device" aria-label="Registered device">${connected.map(row=>`<option value="${attr(row.endpoint_hash)}" ${row.endpoint_hash===current.endpoint_hash?'selected':''}>${escapeHTML(row.device_name)}</option>`).join('')}</select></div>
      <label class="notification-field">Device name <input id="push-device-name" maxlength="48" value="${attr(current.device_name)}" required /></label>
      <div class="notification-toggle-stack">
        <label class="notification-toggle"><input type="checkbox" id="push-enabled" ${current.enabled?'checked':''}/><span><strong>Enable alerts</strong><small>Temporarily mute or resume this device.</small></span></label>
        <label class="notification-toggle"><input type="checkbox" id="push-unique" ${current.notify_unique?'checked':''}/><span><strong>New unique visitors</strong><small>First recorded page visit by an anonymous visitor ID.</small></span></label>
        <label class="notification-toggle"><input type="checkbox" id="push-outbound" ${current.notify_outbound?'checked':''}/><span><strong>Outbound button clicks</strong><small>When someone opens one of your destination links.</small></span></label>
        <label class="notification-toggle"><input type="checkbox" id="push-views" ${current.notify_views?'checked':''}/><span><strong>All other page visits</strong><small>Including returning visitors; can generate many alerts.</small></span></label>
      </div>
      <div class="notification-grid">
        <div class="notification-field"><label for="push-source">Traffic source</label><select id="push-source"><option value="all">All sources</option>${options}</select></div>
        <div class="notification-field"><label for="push-cooldown">Minimum interval</label><select id="push-cooldown">${[[0,'Every eligible event'],[60,'1 minute'],[300,'5 minutes'],[900,'15 minutes']].map(([n,label])=>`<option value="${n}" ${Number(current.cooldown_seconds)===n?'selected':''}>${label}</option>`).join('')}</select></div>
      </div>
      <div class="notification-actions"><button type="submit" class="btn btn-primary">Save preferences</button><button type="button" id="test-push" class="btn btn-outline">Send test</button><button type="button" id="remove-push" class="btn btn-danger">Remove device</button></div>
    </form>` : `<div class="notification-empty">${info ? 'No devices subscribed yet. Tap Enable notifications on your Android phone.' : 'Loading notification settings…'}</div>`}
    <p class="notification-hint">Delivery depends on your browser, network and Android notification settings. The interval is a throttle, not a digest; skipped alerts are not queued. The public site and click tracking work normally when push is disabled.</p>
  </section>`;
}
async function loadNotificationState() {
  try {
    state.notifications = await api('/api/admin/notifications/status');
    if (!state.notifications.devices.find(d=>d.endpoint_hash===state.pushDevice)) state.pushDevice=state.notifications.devices[0]?.endpoint_hash || null;
    if (state.tab==='notifications') renderAdmin();
  } catch(error) { toast(error.message,'error'); }
}
function bytesFromBase64Url(value) {
  const normalized = value.replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(normalized+'='.repeat((4-normalized.length%4)%4)), c=>c.charCodeAt(0));
}
async function enableThisDevice() {
  if (!state.notifications?.available) throw new Error('VAPID keys are not configured on the Worker.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser does not support Web Push');
  const permission = await Notification.requestPermission();
  if (permission!=='granted') throw new Error('Notifications are blocked. Enable permission in Android app settings.');
  const registration = await navigator.serviceWorker.register('/sw.js',{scope:'/'});
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const currentKey=subscription.options.applicationServerKey;
    const expected=bytesFromBase64Url(state.notifications.publicKey);
    const actual=currentKey?new Uint8Array(currentKey):new Uint8Array();
    if (actual.length!==expected.length || actual.some((v,i)=>v!==expected[i])) { await subscription.unsubscribe(); subscription=null; }
  }
  if (!subscription) subscription = await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytesFromBase64Url(state.notifications.publicKey)});
  const response=await api('/api/admin/notifications/subscribe',{method:'POST',data:{...subscription.toJSON(),device_name:'My Android device'}});
  state.pushDevice=response.endpoint_hash;
  await loadNotificationState();
}
async function removeDevice(hash) {
  const reg = await navigator.serviceWorker?.getRegistration('/');
  const own = await reg?.pushManager?.getSubscription();
  // Remove the server record first. Other devices stay connected.
  await api('/api/admin/notifications/device',{method:'DELETE',data:{endpoint_hash:hash}});
  if (own) {
    const buffer = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(own.endpoint));
    const computed = [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (computed===hash) await own.unsubscribe();
  }
  state.pushDevice=null;
  await loadNotificationState();
}
function renderAdmin() {
  document.documentElement.lang=state.adminLang==='uk'?'uk':'en';
  const content = state.tab === 'overview' ? overview() : state.tab === 'links' ? linksTab() : state.tab === 'sources' ? sourceTab() : state.tab === 'appearance' ? appearanceTab() : notificationsTab();
  notificationDropdownController.abort();
  notificationDropdownController=new AbortController();
  app.innerHTML = adminShell(content);
  wireAdmin();
  translateAdmin(app, state.adminLang);
  if (state.tab==='notifications' && !state.notifications) void loadNotificationState();
}
function loginView(configured) {
  document.title = 'Sign in · LinkHub';
  app.innerHTML = `<main class="login-shell"><div class="login-glow"></div><div class="login-card"><a href="/" class="login-back">← Back to my page</a><div class="login-logo">↗</div><div class="eyebrow">PRIVATE WORKSPACE</div><h1>Welcome back</h1><p>Sign in to manage your links and traffic analytics.</p><form id="login-form" class="login-form"><label>Password<div class="password-wrap"><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"/><button type="button" class="password-toggle" id="toggle-password" aria-label="Show password">Show</button></div></label><button type="submit" class="btn btn-primary btn-wide">Sign in <span>→</span></button></form>${configured ? '' : '<div class="login-warning">Admin secrets are missing. Follow README.md to set up ADMIN_PASSWORD and SESSION_SECRET.</div>'}<div class="login-footer">LINKHUB <span>·</span> SECURE ADMIN AREA</div></div></main>`;
  document.documentElement.lang='en'; // Login is English even when the admin UI preference is Ukrainian.
  qs('#toggle-password').onclick = () => { const input=qs('#password'), visible = input.type === 'password'; input.type=visible?'text':'password';qs('#toggle-password').textContent=visible?'Hide':'Show';qs('#toggle-password').setAttribute('aria-label',visible?'Hide password':'Show password'); };
  qs('#login-form').onsubmit = async (event) => {
    event.preventDefault();const button=event.currentTarget.querySelector('[type="submit"]');button.disabled=true;
    try { await api('/api/admin/login',{method:'POST',data:{password:qs('#password').value}});await loadAdmin(); }
    catch(error){ toast(error.message,'error');button.disabled=false; }
  };
}
async function loadAdmin() {
  try {
    const session = await api('/api/admin/session');
    if (!session.authenticated) { loginView(session.configured); return; }
    const [data, analytics] = await Promise.all([api('/api/admin/state'),api(`/api/admin/analytics?period=${state.period}`)]);
    state.profile=data.profile; state.sources=data.sources; state.buttons=data.buttons;state.overview=analytics;
    document.title='Dashboard · LinkHub';renderAdmin();
  } catch(error) { toast(error.message,'error'); app.innerHTML=`<div class="public-error"><h1>Couldn't load dashboard.</h1><p>${escapeHTML(error.message)}</p><button class="btn btn-primary" id="dash-retry">Retry</button></div>`;qs('#dash-retry').onclick=loadAdmin; }
}
async function refreshAdmin({ analytics = true } = {}) {
  try {
    const data=await api('/api/admin/state');state.profile=data.profile;state.sources=data.sources;state.buttons=data.buttons;
    if (analytics) state.overview=await api(`/api/admin/analytics?period=${state.period}`);
    renderAdmin();
  } catch(error) {toast(error.message,'error');}
}
function iconModePicker(current = 'auto') {
  const choices = [
    ['auto','Auto — destination favicon'],
    ['url','Image URL'],
    ['upload','Upload image'],
    ['default','Default arrow']
  ];
  const selected = choices.find(([value]) => value === current) || choices[0];
  return `<div class="icon-mode-picker">
    <input type="hidden" id="button-icon-mode" name="icon_mode" value="${attr(selected[0])}" />
    <button type="button" class="icon-mode-trigger" id="icon-mode-trigger" aria-label="Icon mode" aria-expanded="false" aria-haspopup="listbox" aria-controls="icon-mode-options">
      <span class="icon-mode-label" id="icon-mode-label">${escapeHTML(selected[1])}</span>
      <span class="icon-mode-chevron" aria-hidden="true">${chevronSvg}</span>
    </button>
    <div class="icon-mode-options" id="icon-mode-options" role="listbox" aria-label="Icon mode" hidden>
      ${choices.map(([value,label])=>`<button type="button" role="option" aria-selected="${value===selected[0]}" class="icon-mode-option${value===selected[0]?' selected':''}" data-icon-mode-option="${value}"><span>${escapeHTML(label)}</span><span class="icon-mode-check" aria-hidden="true">✓</span></button>`).join('')}
    </div>
  </div>`;
}
function wireIconModePicker(onSelect) {
  const picker=qs('.icon-mode-picker');
  if(!picker)return;
  const trigger=qs('.icon-mode-trigger',picker);
  const menu=qs('.icon-mode-options',picker);
  const field=qs('#button-icon-mode',picker);
  const options=qsa('[data-icon-mode-option]',picker);
  const expanded=(value)=>{
    menu.hidden=!value;
    trigger.setAttribute('aria-expanded',String(value));
    if(value){
      const rect=trigger.getBoundingClientRect();
      const dialog=picker.closest('.modal-card');
      const bounds=dialog?.getBoundingClientRect();
      const bottomLimit=Math.min(window.innerHeight-12,bounds?.bottom ?? window.innerHeight);
      const topLimit=Math.max(12,bounds?.top ?? 0);
      const menuHeight=Math.min(menu.scrollHeight,270,window.innerHeight*0.45);
      const freeBelow=bottomLimit-rect.bottom-8;
      const freeAbove=rect.top-topLimit-8;
      picker.classList.toggle('open-up',freeBelow<menuHeight && freeAbove>freeBelow);
      options.find(option=>option.dataset.iconModeOption===field.value)?.focus();
    } else picker.classList.remove('open-up');
  };
  const choose=(option)=>{
    field.value=option.dataset.iconModeOption;
    qs('#icon-mode-label',picker).textContent=option.querySelector('span').textContent;
    options.forEach(el=>{
      const selected=el===option;
      el.classList.toggle('selected',selected);
      el.setAttribute('aria-selected',String(selected));
    });
    expanded(false);
    trigger.focus();
    onSelect();
  };
  trigger.addEventListener('click',()=>expanded(menu.hidden));
  trigger.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp') {
      event.preventDefault();expanded(true);
      (event.key==='ArrowUp'?options[options.length-1]:options[0])?.focus();
    }
  });
  options.forEach((option,index)=>{
    option.addEventListener('click',()=>choose(option));
    option.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'||event.key==='End'){
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
        options[next]?.focus();
      } else if(event.key==='Escape') {
        event.preventDefault();event.stopPropagation();expanded(false);trigger.focus();
      } else if(event.key==='Tab')expanded(false);
    });
  });
  picker.closest('.modal-card')?.addEventListener('pointerdown',event=>{
    if(!picker.contains(event.target))expanded(false);
  });
  picker.addEventListener('focusout',()=>{
    setTimeout(()=>{if(!picker.contains(document.activeElement))expanded(false);},0);
  });
}
function openEditor(type, existing = null) {
  const isSource=type==='sources', editing=Boolean(existing);
  let fields;
  if (isSource) fields=`<label>Source name<input name="name" value="${attr(existing?.name || '')}" placeholder="Source One" maxlength="60" required/></label>
    <label>Short URL slug<input name="slug" value="${attr(existing?.slug || '')}" placeholder="source-one" maxlength="40" pattern="[a-zA-Z][a-zA-Z0-9_-]*" required/><small>Example: ${escapeHTML(location.origin)}/source-one</small></label>
    <label class="check-row"><input type="checkbox" name="active" ${existing?.active === 0 ? '' : 'checked'}/> Active (accepts visits)</label>`;
  else fields=`<label>Button title<input name="title" value="${attr(existing?.title || '')}" placeholder="Example Resource" maxlength="70" required/></label>
    <label>Description<input name="subtitle" value="${attr(existing?.subtitle || '')}" placeholder="Describe this resource" maxlength="120" /></label>
    <label>Destination URL<input name="url" type="url" required value="${attr(existing?.url || '')}" placeholder="https://example.com/your-resource" /></label>
    <div class="form-color-field"><span>Card color</span><div class="color-choices">${palette.map(([color, title])=> `<label title="${title}" class="color-choice"><input type="radio" name="accent" value="${color}" ${(!existing?.accent ? color===palette[0][0] : existing.accent===color) ? 'checked':''}/><span style="background:${color}"></span></label>`).join('')}</div></div>
    <section class="button-icon-settings"><h3>Button icon</h3><p>Automatic favicon from the destination, image URL, your own file, or the default arrow.</p>
      <div class="icon-mode-field"><span class="icon-mode-field-label">Icon mode</span>${iconModePicker(existing?.icon_mode||'auto')}</div>
      <label class="icon-url-field">Image URL<input name="icon_url" type="url" placeholder="https://example.com/favicon.png" value="${attr(existing?.icon_url||'')}" /></label>
      <div class="icon-upload-field"><span class="file-field-title">Upload PNG, WebP or ICO (60 KB max)</span><label class="file-picker" for="button-icon-upload"><span class="file-picker-icon" aria-hidden="true">↑</span><span class="file-picker-action">Choose file</span><span class="file-picker-name" id="button-file-label">No file selected</span></label><input class="visually-hidden-input" id="button-icon-upload" type="file" accept=".png,.webp,.ico,image/png,image/webp,image/x-icon,image/vnd.microsoft.icon" /></div>
      <div class="button-icon-hint" id="button-icon-hint"></div>
    </section>
    <label class="check-row"><input type="checkbox" name="active" ${existing?.active === 1 ? 'checked' : ''}/> Visible on public page</label>`;
  modal(isSource ? (editing ? 'Edit source' : 'Add a traffic source') : (editing ? 'Edit button' : 'Add a destination'),
    `<form id="edit-item-form" class="field-form modal-form">${fields}<div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Create'}</button></div></form>`);
  const modeField=qs('#button-icon-mode');
  const refreshIconSettings=()=>{
    if(!modeField)return;
    qs('.icon-url-field')?.classList.toggle('is-hidden',modeField.value!=='url');
    qs('.icon-upload-field')?.classList.toggle('is-hidden',modeField.value!=='upload');
    const help={auto:'Uses /favicon.ico from the destination website. Some websites do not provide one; the arrow is used instead.',url:'Provide the direct URL of an image file.',upload:'File is stored in D1 and served by LinkHub.',default:'Use the standard arrow icon.'};
    qs('#button-icon-hint').textContent=help[modeField.value]||'';
  };
  qs('#button-icon-upload')?.addEventListener('change',event=>{const label=qs('#button-file-label');if(label)label.textContent=event.target.files?.[0]?.name||'No file selected';});
  wireIconModePicker(refreshIconSettings);
  refreshIconSettings();
  qs('#edit-item-form').onsubmit=async(event)=>{
    event.preventDefault();
    const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
    const data=isSource ? {name:values.name,slug:values.slug.toLowerCase(),active:form.querySelector('[name="active"]').checked}
      : {title:values.title,subtitle:values.subtitle,url:values.url,category:'Links',accent:values.accent,active:form.querySelector('[name="active"]').checked,
          icon_mode:values.icon_mode||'auto', icon_url:values.icon_url||'', icon_data:existing?.icon_data||''};
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;
    try {
      if(!isSource) {
        const file=qs('#button-icon-upload')?.files?.[0];
        if(file) data.icon_data=await readIconFile(file);
        if(data.icon_mode==='upload' && !data.icon_data) throw new Error('Upload a PNG, WebP or ICO icon first');
      }
      await api(`/api/admin/${type}${editing ? '/'+existing.id:''}`,{method:editing?'PUT':'POST',data});closeModal();await refreshAdmin();toast(editing?'Changes saved':'Item created');}
    catch(error){toast(error.message,'error');submit.disabled=false;}
  };
}
let modalPreviousFocus = null;
function modal(title, html) {
  if (!state.modal) modalPreviousFocus=document.activeElement;
  closeModal(false);
  const overlay=document.createElement('div'); overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal-card" role="dialog" aria-modal="true" aria-label="${attr(title)}" tabindex="-1"><div class="modal-heading"><h2>${escapeHTML(title)}</h2><button class="modal-x" data-close aria-label="Close dialog">×</button></div>${html}</div>`;
  document.body.append(overlay);state.modal=overlay;
  overlay.onclick=(event)=>{if(event.target===overlay || event.target.closest('[data-close]'))closeModal();};
  translateAdmin(overlay, state.adminLang);
  (qs('input:not([type="hidden"]),textarea',overlay) || qs('.modal-x',overlay))?.focus();
}
function closeModal(restoreFocus=true) {
  state.modal?.remove();state.modal=null;
  if (restoreFocus) {if(modalPreviousFocus?.isConnected) modalPreviousFocus.focus();modalPreviousFocus=null;}
}
document.addEventListener?.('keydown',event=>{
  if (event.key==='Escape' && state.modal) {event.preventDefault();event.stopPropagation();closeModal();}
});
function askDelete(type,id) {
  const item=(type==='sources'?state.sources:state.buttons).find((obj)=>obj.id===id);
  if (!item) return;
  const heading = type==='sources'?'Delete traffic source?':'Delete destination button?';
  modal(heading,`<p class="confirm-description"><strong>${escapeHTML(item.name || item.title)}</strong> will be removed. Historic analytics events retain a snapshot of its name. This can't be undone.</p><div class="modal-actions"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger" id="confirm-delete">Delete permanently</button></div>`);
  qs('#confirm-delete').onclick=async()=>{try{await api(`/api/admin/${type}/${id}`,{method:'DELETE'});closeModal();await refreshAdmin();toast('Item deleted');}catch(error){toast(error.message,'error');}};
}
function updateAvatarPreview() {
  const display=qs('.avatar-preview'); if(!display)return;
  const name=qs('[name="display_name"]')?.value || 'AB';
  const url=qs('#avatar-upload')?.dataset.previewUrl || qs('[name="avatar_url"]')?.value || (qs('[name="clear_avatar_image"]')?.value==='1' ? '' : (state.profile?.avatar_data || ''));
  const shape=qs('[name="avatar_shape"]')?.value || 'rounded';
  const background=qs('[name="avatar_background"]')?.value || '#142849';
  display.className=`public-avatar avatar-preview avatar-${shape}`;
  display.style.setProperty('--avatar-bg',background);
  if(url && /^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,|blob:)/.test(url)) display.innerHTML=`<img src="${attr(url)}" alt="Avatar preview"/>`;
  else display.textContent=qs('[name="avatar_text"]')?.value || monogram(name);
  const cover=qs('.profile-cover-preview');
  if(cover) {
    const coverFile=qs('#cover-upload')?.dataset.previewUrl;
    const coverUrl=coverFile || qs('[name="cover_image_url"]')?.value || (qs('[name="clear_cover_image"]')?.value==='1' ? '' : (state.profile?.cover_image_data || ''));
    let image=qs('.cover-photo',cover);
    if(coverUrl){if(!image){image=document.createElement('img');image.className='cover-photo';image.alt='';cover.prepend(image);}image.src=coverUrl;}
    else image?.remove();
  }
  const namePreview=qs('.profile-name-preview');if(namePreview)namePreview.textContent=name;
}
function wireNotifications() {
  const install=qs('#install-admin');
  install?.addEventListener('click',async()=>{
    if (deferredInstall) {
      const prompt=deferredInstall;deferredInstall=null;
      await prompt.prompt();
      const answer=await prompt.userChoice;
      if(answer?.outcome==='accepted')toast('App installation requested');
    } else toast('Open Chrome menu (⋮) → Install app / Add to Home screen.','error');
  });
  qs('#enable-push')?.addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try{await enableThisDevice();toast('Push notifications enabled on this device');}
    catch(error){toast(error.message,'error');event.currentTarget.disabled=false;}
  });
  qs('#push-device')?.addEventListener('change',event=>{state.pushDevice=event.target.value;renderAdmin();});
  qs('#notifications-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget;const save=form.querySelector('[type="submit"]');save.disabled=true;
    try {
      await api('/api/admin/notifications/preferences',{method:'PUT',data:{
        endpoint_hash:deviceChoice().endpoint_hash,
        device_name:qs('#push-device-name').value,
        enabled:qs('#push-enabled').checked,
        notify_unique:qs('#push-unique').checked,
        notify_outbound:qs('#push-outbound').checked,
        notify_views:qs('#push-views').checked,
        source_filter:qs('#push-source').value,
        cooldown_seconds:Number(qs('#push-cooldown').value),
      }});
      toast('Notification preferences saved');await loadNotificationState();
    }catch(error){toast(error.message,'error');save.disabled=false;}
  });
  qs('#test-push')?.addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try {await api('/api/admin/notifications/test',{method:'POST',data:{endpoint_hash:deviceChoice().endpoint_hash}});toast('Push accepted by browser service');}
    catch(error){toast(error.message,'error');}finally{if(event.currentTarget.isConnected)event.currentTarget.disabled=false;}
  });
  qs('#remove-push')?.addEventListener('click',async()=>{
    const selected=deviceChoice();if(!selected)return;
    if(!window.confirm(`Remove push notifications for ${selected.device_name}?`))return;
    try{await removeDevice(selected.endpoint_hash);toast('Device removed');}catch(error){toast(error.message,'error');}
  });
}

function enhanceNotificationSelects() {
  const form=qs('#notifications-form');
  if (!form) return;
  qsa('select',form).forEach(select=>{
    const wrapper=document.createElement('div');
    wrapper.className='notification-select';
    select.parentNode.insertBefore(wrapper,select);
    wrapper.append(select);
    select.classList.add('notification-native-select');
    select.tabIndex=-1;
    select.setAttribute('aria-hidden','true');

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='notification-select-trigger';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    const label=qs(`label[for="${select.id}"]`);
    trigger.setAttribute('aria-label',label?.textContent?.trim() || select.getAttribute('aria-label') || 'Select option');
    const options=document.createElement('div');
    options.className='notification-select-options';
    options.id=`${select.id}-options`;
    options.setAttribute('role','listbox');
    options.setAttribute('aria-label',trigger.getAttribute('aria-label'));
    options.hidden=true;
    trigger.setAttribute('aria-controls',options.id);
    wrapper.append(trigger,options);

    function draw() {
      const chosen=select.selectedOptions[0];
      trigger.innerHTML=`<span class="notification-select-current">${escapeHTML(chosen?.textContent || '')}</span><span class="notification-select-chevron" aria-hidden="true">${chevronSvg}</span>`;
      options.innerHTML=[...select.options].map((opt,index)=>`<button type="button" role="option" class="notification-select-option${opt.selected?' selected':''}" aria-selected="${opt.selected}" data-option-index="${index}"><span>${escapeHTML(opt.textContent)}</span>${opt.selected?'<span class="notification-select-check" aria-hidden="true">✓</span>':''}</button>`).join('');
    }
    function close({restoreFocus=false}={}) {
      options.hidden=true;
      wrapper.classList.remove('is-open','opens-up');
      trigger.setAttribute('aria-expanded','false');
      if (restoreFocus) trigger.focus();
    }
    function open() {
      // Close any other notification picker before opening this one.
      form.querySelectorAll('.notification-select.is-open').forEach(other=>{
        if(other!==wrapper) other.querySelector('.notification-select-trigger')?.click();
      });
      draw();
      const remaining=window.innerHeight-trigger.getBoundingClientRect().bottom;
      const above=trigger.getBoundingClientRect().top;
      wrapper.classList.toggle('opens-up',remaining < 220 && above > remaining);
      options.hidden=false;
      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded','true');
    }
    function choose(index) {
      if (!Number.isInteger(index) || index<0 || index>=select.options.length) return;
      select.selectedIndex=index;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      if (!wrapper.isConnected) return; // Device change may re-render admin immediately.
      draw(); close({restoreFocus:true});
    }
    draw();
    trigger.addEventListener('click',()=>options.hidden?open():close());
    trigger.addEventListener('keydown',event=>{
      if(event.key==='Escape') {if(!options.hidden){event.preventDefault();close();}return;}
      if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)) {
        event.preventDefault();
        if(options.hidden) open();
        const active=select.selectedIndex;
        const first=['ArrowUp'].includes(event.key)?Math.max(0,active-1):event.key==='ArrowDown'?Math.min(select.options.length-1,active+1):active;
        options.querySelector(`[data-option-index="${first}"]`)?.focus();
      }
    });
    options.addEventListener('click',event=>{
      const item=event.target.closest('[data-option-index]');
      if(item)choose(Number(item.dataset.optionIndex));
    });
    options.addEventListener('keydown',event=>{
      const focused=event.target.closest('[data-option-index]');
      if(!focused)return;
      const index=Number(focused.dataset.optionIndex);
      if(event.key==='Escape'){event.preventDefault();close({restoreFocus:true});}
      else if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(index);}
      else if(event.key==='Home'||event.key==='End'||event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?select.options.length-1:Math.min(select.options.length-1,Math.max(0,index+(event.key==='ArrowDown'?1:-1)));
        options.querySelector(`[data-option-index="${next}"]`)?.focus();
      }
    });
    // A native select remains present so existing data persistence and device changes still work.
    document.addEventListener('pointerdown',event=>{
      if(wrapper.isConnected && !wrapper.contains(event.target))close();
    },{signal:notificationDropdownController.signal});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && wrapper.isConnected && !options.hidden)close({restoreFocus:true});
    },{signal:notificationDropdownController.signal});
  });
}
let notificationDropdownController=new AbortController();

function wireAdmin() {
  const adminToggle=qs('#admin-language-toggle'),adminOptions=qs('#admin-language-options');
  const closeAdminLanguage=()=>{if(!adminOptions)return;adminOptions.hidden=true;adminToggle?.setAttribute('aria-expanded','false');};
  adminToggle?.addEventListener('click',()=>{adminOptions.hidden=!adminOptions.hidden;adminToggle.setAttribute('aria-expanded',String(!adminOptions.hidden));});
  qsa('[data-admin-language]',adminOptions).forEach(button=>button.addEventListener('click',()=>{
    state.adminLang=button.dataset.adminLanguage;
    try {localStorage.setItem('linkhub_admin_lang',state.adminLang);} catch {}
    renderAdmin();
    qs('#admin-language-toggle')?.focus();
  }));
  adminToggle?.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();adminOptions.hidden=false;adminToggle.setAttribute('aria-expanded','true');qs('button',adminOptions)?.focus();}});
  adminOptions?.addEventListener('keydown',event=>{const list=qsa('button',adminOptions),index=list.indexOf(document.activeElement);if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();list[(index+(event.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus();}if(event.key==='Escape'){closeAdminLanguage();adminToggle.focus();}});
  adminOptions?.addEventListener('focusout',()=>setTimeout(()=>{if(!document.activeElement?.closest('.admin-language-menu'))closeAdminLanguage();},100));
  qs('#clear-favicon')?.addEventListener('click', () => {
    qs('[name="clear_favicon"]').value = '1';
    qs('#favicon-upload').value = '';
    if(qs('#favicon-file-label'))qs('#favicon-file-label').textContent='No file selected';
    qs('.favicon-action-row .setting-status').textContent='Default favicon will be restored on save';
  });
  qs('#favicon-upload')?.addEventListener('change', (event) => { qs('[name="clear_favicon"]').value='0'; const name=qs('#favicon-file-label');if(name)name.textContent=event.target.files?.[0]?.name||'No file selected'; });
  for(const [kind, inputId, labelId] of [['avatar','avatar-upload','avatar-file-label'],['cover','cover-upload','cover-file-label']]) {
    qs('#'+inputId)?.addEventListener('change', (event)=>{
      const file=event.target.files?.[0];
      const input=event.target;
      if(input.dataset.previewUrl)URL.revokeObjectURL(input.dataset.previewUrl);
      input.dataset.previewUrl=file ? URL.createObjectURL(file) : '';
      qs('#'+labelId).textContent=file?.name || 'No file selected';
      if(file)qs(`[name="clear_${kind}_image"]`).value='0';
      updateAvatarPreview();
    });
  }
  qs('#remove-cover')?.addEventListener('click',()=>{
    qs('[name="clear_cover_image"]').value='1'; qs('[name="cover_image_url"]').value='';
    const file=qs('#cover-upload');if(file.dataset.previewUrl)URL.revokeObjectURL(file.dataset.previewUrl);
    file.dataset.previewUrl='';file.value='';qs('#cover-file-label').textContent='No file selected';
    updateAvatarPreview();
  });
  qs('#remove-avatar')?.addEventListener('click',()=>{
    qs('[name="clear_avatar_image"]').value='1'; qs('[name="avatar_url"]').value='';
    const file=qs('#avatar-upload');if(file.dataset.previewUrl)URL.revokeObjectURL(file.dataset.previewUrl);
    file.dataset.previewUrl='';file.value='';qs('#avatar-file-label').textContent='No file selected';
    updateAvatarPreview();
  });
  // When a hosted image URL is entered, prefer it over any previously stored upload.
  for(const [kind, urlField, fileId, labelId] of [
    ['avatar','avatar_url','avatar-upload','avatar-file-label'],
    ['cover','cover_image_url','cover-upload','cover-file-label']
  ]) {
    qs(`[name="${urlField}"]`)?.addEventListener('input',event=>{
      if(!event.target.value.trim())return;
      qs(`[name="clear_${kind}_image"]`).value='1';
      const input=qs('#'+fileId);
      if(input.dataset.previewUrl)URL.revokeObjectURL(input.dataset.previewUrl);
      input.dataset.previewUrl='';input.value='';qs('#'+labelId).textContent='No file selected';
      updateAvatarPreview();
    });
  }
  for (const selector of ['[name="avatar_text"]','[name="avatar_background"]','[name="avatar_shape"]','[name="avatar_url"]','[name="cover_image_url"]','[name="display_name"]']) {
    qs(selector)?.addEventListener('input', updateAvatarPreview);
    qs(selector)?.addEventListener('change', updateAvatarPreview);
  }
  const mobileToggle=qs('#mobile-nav-toggle');
  mobileToggle?.addEventListener('click',()=>{
    const sidebar=mobileToggle.closest('.sidebar');
    const next=!sidebar.classList.contains('mobile-nav-open');
    sidebar.classList.toggle('mobile-nav-open',next);
    mobileToggle.setAttribute('aria-expanded',String(next));
    mobileToggle.setAttribute('aria-label',next?'Close navigation menu':'Open navigation menu');
  });
  qsa('[data-tab]').forEach((el)=>el.onclick=()=>{state.tab=el.dataset.tab;renderAdmin();window.scrollTo(0,0);});

  if(state.tab==='notifications') { wireNotifications(); enhanceNotificationSelects(); }
  qsa('[data-metric]').forEach((el)=>el.onclick=()=>void metricDetails(el.dataset.metric));
  qsa('[data-period]').forEach((el)=>el.onclick=async()=>{
    state.period=el.dataset.period;
    try{state.overview=await api(`/api/admin/analytics?period=${state.period}`);renderAdmin();}
    catch(error){toast(error.message,'error');}
  });
  qsa('[data-sign-out]').forEach(button=>button.addEventListener('click',async()=>{try{await api('/api/admin/logout',{method:'POST'});loginView(true);}catch(error){toast(error.message,'error');}}));
  qsa('[data-copy]').forEach((el)=>el.onclick=async()=>{try{await navigator.clipboard.writeText(el.dataset.copy);toast('Copied to clipboard');}catch{toast('Clipboard unavailable. Select the URL and copy it manually.','error');}});
  qsa('[data-add]').forEach((el)=>el.onclick=()=>openEditor(el.dataset.add));
  qsa('[data-edit]').forEach((el)=>el.onclick=()=>{const type=el.dataset.edit;openEditor(type,(type==='sources'?state.sources:state.buttons).find(x=>x.id===Number(el.dataset.id)));});
  qsa('[data-delete]').forEach((el)=>el.onclick=()=>askDelete(el.dataset.delete,Number(el.dataset.id)));
  qsa('[data-move]').forEach((el)=>el.onclick=async()=>{
    const button=state.buttons.find(item=>item.id===Number(el.dataset.move));
    if(!button)return;
    const index=state.buttons.findIndex(item=>item.id===button.id);
    const nextSibling=state.buttons[index+(el.dataset.direction==='up'?-1:1)];
    if(!nextSibling)return;
    const ids=state.buttons.map(item=>item.id);
    const current=ids.indexOf(button.id),target=ids.indexOf(nextSibling.id);
    [ids[current],ids[target]]=[ids[target],ids[current]];
    try{await api('/api/admin/buttons/order',{method:'PATCH',data:{ids}});await refreshAdmin({analytics:false});toast('Button order saved');}catch(error){toast(error.message,'error');}
  });
  qs('#profile-form')?.addEventListener('submit',async(event)=>{
    event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));const button=form.querySelector('[type="submit"]');button.disabled=true;
    try {
      const file=qs('#favicon-upload')?.files?.[0];
      let favicon=state.profile?.favicon_data || '';
      if(values.clear_favicon==='1') favicon='';
      if(file) {
        if(file.size > 61440) throw new Error('Favicon must be 60 KB or smaller');
        if(!['image/png','image/webp','image/x-icon','image/vnd.microsoft.icon','image/ico'].includes(file.type) && !/\.(png|webp|ico)$/i.test(file.name)) throw new Error('Upload a PNG, WebP or ICO file');
        favicon=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('Could not read favicon'));reader.readAsDataURL(file); });
        if(/\.ico$/i.test(file.name) && !/^data:image\/(?:x-icon|vnd\.microsoft\.icon);/.test(favicon)) favicon=favicon.replace(/^data:[^;]+;/,'data:image/x-icon;');
      }
      const data={...values, favicon_data:favicon,
        cover_image_data:values.clear_cover_image==='1' ? '' : (state.profile?.cover_image_data || ''),
        avatar_data:values.clear_avatar_image==='1' ? '' : (state.profile?.avatar_data || '')};
      if(qs('#cover-upload')?.files?.[0]) data.cover_image_data=await readProfileFile(qs('#cover-upload').files[0]);
      if(qs('#avatar-upload')?.files?.[0]) data.avatar_data=await readProfileFile(qs('#avatar-upload').files[0]);
      delete data.clear_favicon;delete data.clear_cover_image;delete data.clear_avatar_image;
      await api('/api/admin/profile',{method:'PUT',data});await refreshAdmin({analytics:false});toast('Public page updated');
    } catch(error){toast(error.message,'error');button.disabled=false;}
  });
}

function dismissMobileNavigation({restoreFocus=false}={}) {
  const navigation=qs('.sidebar');
  if (!navigation?.classList.contains('mobile-nav-open')) return;
  navigation.classList.remove('mobile-nav-open');
  const button=qs('#mobile-nav-toggle');
  button?.setAttribute('aria-expanded','false');
  button?.setAttribute('aria-label','Open navigation menu');
  if (restoreFocus) button?.focus();
}
if (adminMode) {
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape') dismissMobileNavigation({restoreFocus:true});
  });
  document.addEventListener('pointerdown',event=>{
    const sidebar=qs('.sidebar');
    if(sidebar && !sidebar.contains(event.target)) dismissMobileNavigation();
  });
}
if (adminMode) loadAdmin(); else renderPublic();
