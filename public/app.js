import { publicLocales, publicLanguages, storedPublicLanguage } from './locales.js';
import { getAdminLanguage, translateAdmin, adminText } from './admin-uk.js';
/** LinkHub browser client — plain JavaScript, no framework or build step. */
const app = document.getElementById('app');
const adminMode = location.pathname.replace(/\/$/, '') === '/admin';
const state = { adminLang: getAdminLanguage(), publicLang: storedPublicLanguage(), tab: 'overview', period: 'week', overview: null, profile: null, sources: [], buttons: [], busy: false, modal: null };

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
  const item = document.createElement('div'); item.className = `toast toast-${type}`; item.textContent = adminMode ? adminText(message, state.adminLang) : message;
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

function grouped(items, key) {
  return items.reduce((all, item) => { const name = item[key] || 'Links'; (all[name] ||= []).push(item); return all; }, Object.create(null));
}
function linkCard(button, locale) {
  return `<a class="public-link" href="/out/${button.id}" target="_blank" rel="noopener noreferrer" aria-label="${attr(locale.open)} ${attr(button.title)} ${attr(locale.newTab)}">
    ${iconTile(button)}
    <span class="public-link-text"><strong>${escapeHTML(button.title)}</strong><small>${escapeHTML(button.subtitle || locale.cardFallback)}</small></span>
    <span class="public-link-arrow" aria-hidden="true">↗</span>
  </a>`;
}
function sampleCategory(title, t) {
  return title === 'Resources' ? t.categoryResources : title === 'Channels' ? t.categoryChannels : title;
}
async function renderPublic() {
  const lang = state.publicLang;
  const t = publicLocales[lang];
  document.documentElement.lang = lang;
  try {
    const data = await api('/api/public');
    const profile = data.profile || {};
    const groups = grouped(data.links || [], 'category');
    const name = profile.display_name || 'Your Page';
    const avatarText = (profile.avatar_text || monogram(name)).slice(0,8);
    const shape = ['rounded','circle','square'].includes(profile.avatar_shape) ? profile.avatar_shape : 'rounded';
    const background = /^#[a-f0-9]{6}$/i.test(profile.avatar_background || '') ? profile.avatar_background : '#142849';
    document.title = name;
    document.querySelector('link[rel="icon"]')?.setAttribute('href', `/site-icon?v=${encodeURIComponent(profile.updated_at || 0)}`);
    const avatar = profile.avatar_url
      ? `<img class="public-avatar-img" src="${attr(profile.avatar_url)}" alt="${attr(name)}" />`
      : `<span>${escapeHTML(avatarText)}</span>`;
    const intro = profile.headline === 'Everything in one place.' ? t.defaultHeadline : (profile.headline || t.defaultHeadline);
    const bio = profile.bio === 'Follow, explore, and stay connected.' ? t.defaultBio : (profile.bio || '');
    app.innerHTML = `<div class="landing-shell" style="--hub-accent:${attr(profile.accent_color || '#4267e9')}">
      <div class="landing-halo landing-halo-a"></div><div class="landing-halo landing-halo-b"></div>
      <main class="public-container">
        <div class="public-topbar">
          ${publicLanguageMenu(lang,t)}
        </div>
        <header class="profile-head">
          <div class="public-avatar avatar-${shape}" style="--avatar-bg:${attr(background)}">${avatar}</div>
          <span class="profile-overline"><span class="online-dot"></span> ${escapeHTML(t.welcome)}</span>
          <h1>${escapeHTML(name)}</h1>
          <h2>${escapeHTML(intro)}</h2>
          <p>${escapeHTML(bio)}</p>
        </header>
        <div class="profile-divider"><span>${escapeHTML(t.explore)}</span><span class="divider-line"></span></div>
        <div class="public-groups">${Object.keys(groups).length ? Object.entries(groups).map(([title,links]) => `
          <section class="public-category"><div class="category-title"><span>${escapeHTML(sampleCategory(title,t))}</span></div>
          <div class="public-links">${links.map((button)=>linkCard(button,t)).join('')}</div></section>`).join('') : `
          <div class="public-empty"><span class="public-empty-icon">↗</span><h3>${escapeHTML(t.emptyTitle)}</h3><p>${escapeHTML(t.emptyBody)}</p></div>`}</div>
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

const tabs = [ ['overview', 'Overview', '▦'], ['links', 'My links', '↗'], ['sources', 'Traffic sources', '◉'], ['appearance', 'Appearance', '✳'] ];
function adminShell(content) {
  const selected = state.tab;
  return `<div class="dashboard-shell">
    <aside class="sidebar">
      <div class="sidebar-brand"><div class="sidebar-brand-icon">↗</div><div><strong>LinkHub</strong><span>PERSONAL CONTROL CENTER</span></div></div>
      <div class="sidebar-label">WORKSPACE</div>
      <nav aria-label="Dashboard navigation" class="sidebar-nav">${tabs.map(([id, title, icon]) => `<button class="nav-item${id === selected ? ' nav-active' : ''}" data-tab="${id}"><span class="nav-item-icon">${icon}</span>${title}</button>`).join('')}</nav>
      <div class="sidebar-spacer"></div>
      <a class="sidebar-visit" href="/" target="_blank" rel="noopener">View public page <span>↗</span></a>
      <button class="sidebar-logout" id="sign-out">Sign out <span>→</span></button>
      <div class="sidebar-version">LINKHUB · v0.3.1</div>
    </aside>
    <div class="dash-main">
      <header class="dash-topbar"><div class="dash-topbar-title">LINKHUB / <span>${escapeHTML(adminText(tabs.find((tab) => tab[0] === selected)[1],state.adminLang).toUpperCase())}</span></div><div class="dash-topbar-right"><div class="admin-language-menu language-menu"><button type="button" class="language-toggle" id="admin-language-toggle" aria-expanded="false" aria-haspopup="listbox" aria-label="Dashboard language"><span class="language-globe" aria-hidden="true">${globeSvg}</span><span>${state.adminLang==='uk'?'Українська':'English'}</span><span class="language-chevron" aria-hidden="true">${chevronSvg}</span></button><div class="language-options" id="admin-language-options" role="listbox" aria-label="Dashboard language" hidden>${[['en','English'],['uk','Українська']].map(([lang,label])=>`<button type="button" class="language-option${state.adminLang===lang?' selected':''}" role="option" aria-selected="${state.adminLang===lang}" data-admin-language="${lang}"><span>${label}</span>${state.adminLang===lang?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}</div></div><span class="pill-live"><i></i> LIVE</span></div></header>
      <div class="dashboard-content">${content}</div>
      <footer class="dash-footer">LinkHub v0.3.1 <span>·</span> Cloudflare Workers + D1 <span>·</span> Your data, your links.</footer>
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
  return `<div class="responsive-table"><table><thead><tr>${columns.map(([title]) => `<th>${title}</th>`).join('')}</tr></thead><tbody>${items.map((entry) => `<tr>${columns.map(([, template]) => `<td>${template(entry)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function periodPills() { return `<div class="period-pills" role="group" aria-label="Analytics period">${[['today','Today'],['week','7 days'],['month','This month'],['all','All time']].map(([key, label]) => `<button data-period="${key}" class="period-pill${state.period === key ? ' period-active' : ''}">${label}</button>`).join('')}</div>`; }
function chartMarkup(chart) {
  const max = Math.max(1, ...chart.map((row) => Number(row.views)), ...chart.map((row) => Number(row.outbound)));
  const bars = chart.map((row, index) => `<div class="chart-day" title="${row.day}: ${row.views} views, ${row.outbound} clicks"><div class="chart-bars"><div class="chart-bar chart-view" style="height:${row.views ? Math.max(5, row.views / max * 100) : 0}%"></div><div class="chart-bar chart-click" style="height:${row.outbound ? Math.max(5, row.outbound / max * 100) : 0}%"></div></div><span>${index === 0 ? 'Today' : index === 1 ? 'Yesterday' : relativeDate(row.day)}</span></div>`).join('');
  return `<div class="chart"><div class="chart-grid-lines"><i></i><i></i><i></i><i></i></div><div class="chart-days">${bars}</div></div>`;
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
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Recent activity</h2><p>Latest tracked views and outbound clicks</p></div><span class="panel-detail">${recent.length} RECORDS</span></div>${tableMarkup(recent,[['WHEN', (r) => `<span class="no-wrap">${escapeHTML(formatTime(r.occurred_at))}</span>`],['EVENT',(r)=> `<span class="event-pill ${r.kind === 'view' ? 'event-view':'event-outbound'}">${r.kind === 'view' ? 'Page view':'Outbound click'}</span>`],['ENTRY SOURCE',(r)=>escapeHTML(r.source_name)],['DESTINATION',(r)=>escapeHTML(r.button_name || '—')],['COUNTRY',(r)=>escapeHTML(countryName(r.country))],['VISITOR',(r)=>`<code>${escapeHTML(r.visitor_id.slice(0,8))}…</code>`]],'Your first visit will appear here.')}</section>`;
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
      ${tableMarkup(data.records,[['WHEN',(r)=>escapeHTML(formatTime(r.occurred_at))],['SOURCE',(r)=>escapeHTML(r.source_name||'Direct')],['DESTINATION',(r)=>escapeHTML(r.button_name||'—')],['COUNTRY',(r)=>escapeHTML(countryName(r.country))],['DEVICE',(r)=>escapeHTML(r.device||'Unknown')],['VISITOR',(r)=>`<code title="${attr(r.visitor_id)}">${escapeHTML(r.visitor_id.slice(0,12))}…</code>`],['ACTIONS',(r)=>`<button type="button" class="btn btn-danger-ghost event-delete-button" data-delete-event="${Number(r.id)}" aria-label="Delete event">Delete</button>`]],'No records for this period.')}`;
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
  return `<section class="page-heading"><div><div class="eyebrow">YOUR DESTINATIONS</div><h1>My links</h1><p>These are the buttons visitors see on your public page.</p></div><button class="btn btn-primary" data-add="buttons">+ Add a link</button></section>
    <div class="info-strip"><span>◎</span><div><strong>Two separate metrics.</strong> LinkHub tracks visits to your page and clicks on these buttons. Sample links are visible on the public page and lead to safe example.com addresses until replaced.</div></div>
    <div class="manage-grid">${state.buttons.length ? state.buttons.map((item,index) => `<article class="manage-card"><div class="manage-card-left"><span class="manage-icon" style="background:${attr(item.accent)}">${iconTile(item)}</span><div><div class="manage-title">${escapeHTML(item.title)} <span class="mini-status ${item.active ? 'mini-on':'mini-off'}">${item.active ? 'Live' : 'Hidden'}</span></div><p>${escapeHTML(item.subtitle || item.url)}</p><small>${escapeHTML(item.category)} <span>·</span> ${escapeHTML(item.url)}</small></div></div><div class="manage-card-actions"><div class="order-controls"><button data-move="${item.id}" data-direction="up" ${index===0?'disabled':''} title="Move up">↑</button><button data-move="${item.id}" data-direction="down" ${index===state.buttons.length-1?'disabled':''} title="Move down">↓</button></div>${copyButton(`${location.origin}/out/${item.id}`,'Copy link') }<button class="btn btn-outline" data-edit="buttons" data-id="${item.id}">Edit</button><button class="btn btn-danger-ghost" data-delete="buttons" data-id="${item.id}">Delete</button></div></article>`).join('') : `<div class="public-empty"><h3>Nothing here yet.</h3><p>Add your first destination link.</p></div>`}</div>
    <p class="helper-note">Visitors open a button through a tracked <code>/out/ID</code> URL. You can edit the real destination without changing the button's tracking address.</p>`;
}
function sourceTab() {
  return `<section class="page-heading"><div><div class="eyebrow">KNOW WHERE PEOPLE COME FROM</div><h1>Traffic sources</h1><p>Share a different entry URL on each platform; every URL opens the same LinkHub page.</p></div><button class="btn btn-primary" data-add="sources">+ Add a source</button></section>
    <div class="info-strip"><span>↗</span><div><strong>Source attribution, not automatic referrer detection.</strong> A visit to <code>/source-one</code> is attributed to Source One even if the URL is shared elsewhere. Direct visitors use the homepage.</div></div>
    <div class="source-grid">${state.sources.map((source) => `<article class="source-card"><div class="source-card-top"><div class="source-symbol">${escapeHTML(socialIcon(source.name))}</div><span class="mini-status ${source.active ? 'mini-on':'mini-off'}">${source.active?'Live':'Paused'}</span></div><h3>${escapeHTML(source.name)}</h3><p class="source-url">${escapeHTML(`${location.origin}/${source.slug}`)}</p><div class="source-card-bottom">${copyButton(`${location.origin}/${source.slug}`, 'Copy URL')}<button class="btn btn-outline" data-edit="sources" data-id="${source.id}">Edit</button><button class="btn btn-danger-ghost" data-delete="sources" data-id="${source.id}">Delete</button></div></article>`).join('')}</div>`;
}
function appearanceTab() {
  const item = state.profile || {};
  const favicon = item.favicon_data ? '<span class="setting-status status-added">Custom favicon saved</span>' : '<span class="setting-status">Using the default icon</span>';
  return `<section class="page-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Appearance</h1><p>Update the profile and choose which elements appear on your public page.</p></div><a class="btn btn-outline" href="/" target="_blank" rel="noopener">View public page ↗</a></section>
    <section class="dash-panel appearance-panel"><div class="panel-title-row"><div><h2>Profile details</h2><p>Changes appear on all entry URLs immediately.</p></div><span class="panel-detail">PUBLIC PROFILE</span></div>
      <form id="profile-form" class="field-form"><div class="form-row"><label>Display name<input name="display_name" maxlength="80" required value="${attr(item.display_name || '')}" placeholder="Your page" /></label><label>Headline<input name="headline" maxlength="140" value="${attr(item.headline || '')}" placeholder="Everything in one place" /></label></div>
      <label>Bio<textarea name="bio" rows="3" maxlength="300" placeholder="Introduce yourself or your project">${escapeHTML(item.bio || '')}</textarea></label>
      <section class="appearance-inner-panel"><h3>Profile avatar</h3><p>Use a hosted image, or a custom letter tile when no image is provided.</p>
        <label>Avatar image URL <span class="form-optional">optional · HTTPS</span><input name="avatar_url" type="url" value="${attr(item.avatar_url || '')}" placeholder="https://example.com/avatar.png" /></label>
        <div class="form-row"><label>Avatar text<input name="avatar_text" maxlength="8" value="${attr(item.avatar_text || '')}" placeholder="AB" /></label>
          <label>Avatar background<input name="avatar_background" type="color" value="${attr(item.avatar_background || '#142849')}" /></label></div>
        <label>Avatar shape<select name="avatar_shape"><option value="rounded" ${item.avatar_shape==='rounded'||!item.avatar_shape?'selected':''}>Rounded</option><option value="square" ${item.avatar_shape==='square'?'selected':''}>Square</option><option value="circle" ${item.avatar_shape==='circle'?'selected':''}>Circle</option></select></label>
        <div class="avatar-preview-row"><div class="public-avatar avatar-${attr(item.avatar_shape || 'rounded')} avatar-preview" style="--avatar-bg:${attr(item.avatar_background || '#142849')}">${item.avatar_url ? `<img src="${attr(item.avatar_url)}" alt="Avatar preview"/>` : escapeHTML(item.avatar_text || monogram(item.display_name || 'AB'))}</div><span>Avatar preview</span></div>
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
function renderAdmin() {
  const content = state.tab === 'overview' ? overview() : state.tab === 'links' ? linksTab() : state.tab === 'sources' ? sourceTab() : appearanceTab();
  app.innerHTML = adminShell(content);
  wireAdmin();
  translateAdmin(app, state.adminLang);
}
function loginView(configured) {
  document.title = 'Sign in · LinkHub';
  app.innerHTML = `<main class="login-shell"><div class="login-glow"></div><div class="login-card"><a href="/" class="login-back">← Back to my page</a><div class="login-logo">↗</div><div class="eyebrow">PRIVATE WORKSPACE</div><h1>Welcome back</h1><p>Sign in to manage your links and traffic analytics.</p><form id="login-form" class="login-form"><label>Password<div class="password-wrap"><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"/><button type="button" class="password-toggle" id="toggle-password" aria-label="Show password">Show</button></div></label><button type="submit" class="btn btn-primary btn-wide">Sign in <span>→</span></button></form>${configured ? '' : '<div class="login-warning">Admin secrets are missing. Follow README.md to set up ADMIN_PASSWORD and SESSION_SECRET.</div>'}<div class="login-footer">LINKHUB <span>·</span> SECURE ADMIN AREA</div></div></main>`;
  translateAdmin(app, state.adminLang);
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
function openEditor(type, existing = null) {
  const isSource=type==='sources', editing=Boolean(existing);
  let fields;
  if (isSource) fields=`<label>Source name<input name="name" value="${attr(existing?.name || '')}" placeholder="Source One" maxlength="60" required/></label>
    <label>Short URL slug<input name="slug" value="${attr(existing?.slug || '')}" placeholder="source-one" maxlength="40" pattern="[a-zA-Z][a-zA-Z0-9_-]*" required/><small>Example: ${escapeHTML(location.origin)}/source-one</small></label>
    <label class="check-row"><input type="checkbox" name="active" ${existing?.active === 0 ? '' : 'checked'}/> Active (accepts visits)</label>`;
  else fields=`<label>Button title<input name="title" value="${attr(existing?.title || '')}" placeholder="Example Resource" maxlength="70" required/></label>
    <label>Description<input name="subtitle" value="${attr(existing?.subtitle || '')}" placeholder="Describe this resource" maxlength="120" /></label>
    <label>Destination URL<input name="url" type="url" required value="${attr(existing?.url || '')}" placeholder="https://example.com/your-resource" /></label>
    <label>Section / category<input name="category" value="${attr(existing?.category || 'Resources')}" placeholder="Resources" maxlength="50"/></label>
    <div class="form-color-field"><span>Card color</span><div class="color-choices">${palette.map(([color, title])=> `<label title="${title}" class="color-choice"><input type="radio" name="accent" value="${color}" ${(!existing?.accent ? color===palette[0][0] : existing.accent===color) ? 'checked':''}/><span style="background:${color}"></span></label>`).join('')}</div></div>
    <section class="button-icon-settings"><h3>Button icon</h3><p>Automatic favicon from the destination, image URL, your own file, or the default arrow.</p>
      <label>Icon mode<select name="icon_mode" id="button-icon-mode">
        ${[['auto','Auto — destination favicon'],['url','Image URL'],['upload','Upload image'],['default','Default arrow']].map(([value,label])=>`<option value="${value}" ${value===(existing?.icon_mode||'auto')?'selected':''}>${label}</option>`).join('')}
      </select></label>
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
  modeField?.addEventListener('change',refreshIconSettings);
  refreshIconSettings();
  qs('#edit-item-form').onsubmit=async(event)=>{
    event.preventDefault();
    const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
    const data=isSource ? {name:values.name,slug:values.slug.toLowerCase(),active:form.querySelector('[name="active"]').checked}
      : {title:values.title,subtitle:values.subtitle,url:values.url,category:values.category,accent:values.accent,active:form.querySelector('[name="active"]').checked,
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
  const url=qs('[name="avatar_url"]')?.value || '';
  const shape=qs('[name="avatar_shape"]')?.value || 'rounded';
  const background=qs('[name="avatar_background"]')?.value || '#142849';
  display.className=`public-avatar avatar-preview avatar-${shape}`;
  display.style.setProperty('--avatar-bg',background);
  if(url && /^https?:\/\//.test(url)) display.innerHTML=`<img src="${attr(url)}" alt="Avatar preview"/>`;
  else display.textContent=qs('[name="avatar_text"]')?.value || monogram(name);
}
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
  for (const selector of ['[name="avatar_text"]','[name="avatar_background"]','[name="avatar_shape"]','[name="avatar_url"]','[name="display_name"]']) {
    qs(selector)?.addEventListener('input', updateAvatarPreview);
    qs(selector)?.addEventListener('change', updateAvatarPreview);
  }
  qsa('[data-tab]').forEach((el)=>el.onclick=()=>{state.tab=el.dataset.tab;renderAdmin();window.scrollTo(0,0);});
  qsa('[data-metric]').forEach((el)=>el.onclick=()=>void metricDetails(el.dataset.metric));
  qsa('[data-period]').forEach((el)=>el.onclick=async()=>{
    state.period=el.dataset.period;
    try{state.overview=await api(`/api/admin/analytics?period=${state.period}`);renderAdmin();}
    catch(error){toast(error.message,'error');}
  });
  qs('#sign-out')?.addEventListener('click',async()=>{try{await api('/api/admin/logout',{method:'POST'});loginView(true);}catch(error){toast(error.message,'error');}});
  qsa('[data-copy]').forEach((el)=>el.onclick=async()=>{try{await navigator.clipboard.writeText(el.dataset.copy);toast('Copied to clipboard');}catch{toast('Clipboard unavailable. Select the URL and copy it manually.','error');}});
  qsa('[data-add]').forEach((el)=>el.onclick=()=>openEditor(el.dataset.add));
  qsa('[data-edit]').forEach((el)=>el.onclick=()=>{const type=el.dataset.edit;openEditor(type,(type==='sources'?state.sources:state.buttons).find(x=>x.id===Number(el.dataset.id)));});
  qsa('[data-delete]').forEach((el)=>el.onclick=()=>askDelete(el.dataset.delete,Number(el.dataset.id)));
  qsa('[data-move]').forEach((el)=>el.onclick=async()=>{
    const ids=state.buttons.map((x)=>x.id),current=ids.indexOf(Number(el.dataset.move));const target=current+(el.dataset.direction==='up'?-1:1);
    if(target<0||target>=ids.length)return;
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
      const data={...values, show_top_brand:false, show_top_tagline:false, favicon_data:favicon};
      delete data.clear_favicon;
      await api('/api/admin/profile',{method:'PUT',data});await refreshAdmin({analytics:false});toast('Public page updated');
    } catch(error){toast(error.message,'error');button.disabled=false;}
  });
}

if (adminMode) loadAdmin(); else renderPublic();
