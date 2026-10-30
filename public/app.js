/** LinkHub browser client — plain JavaScript, no framework or build step. */
const app = document.getElementById('app');
const adminMode = location.pathname.replace(/\/$/, '') === '/admin';
const state = { tab: 'overview', period: 'week', overview: null, profile: null, sources: [], buttons: [], busy: false, modal: null };

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
  const item = document.createElement('div'); item.className = `toast toast-${type}`; item.textContent = message;
  panel.append(item); window.setTimeout(() => item.remove(), 3700);
}
async function api(path, { method = 'GET', data } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: data !== undefined ? {'Content-Type':'application/json'} : {}, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}
function monogram(name) { return (name || 'LH').split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() || '').join(''); }
function socialIcon(name) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('patreon')) return '✦';
  if (nameLower.includes('subscribe')) return '★';
  if (nameLower.includes('youtube')) return '▶';
  if (nameLower === 'x' || nameLower.includes('twitter')) return '𝕏';
  if (nameLower.includes('github')) return '⌘';
  if (nameLower.includes('instagram')) return '◎';
  if (nameLower.includes('telegram')) return '➤';
  return '↗';
}
function grouped(items, key) {
  return items.reduce((all, item) => { const name = item[key] || 'Links'; (all[name] ||= []).push(item); return all; }, Object.create(null));
}
function linkCard(button) {
  return `<a class="public-link" href="/out/${button.id}" target="_blank" rel="noopener noreferrer" aria-label="Open ${attr(button.title)} in a new tab">
    <span class="public-link-icon" style="--tile:${attr(button.accent)}">${escapeHTML(socialIcon(button.title))}</span>
    <span class="public-link-text"><strong>${escapeHTML(button.title)}</strong><small>${escapeHTML(button.subtitle || 'Explore this link')}</small></span>
    <span class="public-link-arrow" aria-hidden="true">↗</span>
  </a>`;
}
async function renderPublic() {
  try {
    const data = await api('/api/public');
    const profile = data.profile || {};
    const groups = grouped(data.links || [], 'category');
    const name = profile.display_name || 'Your Brand';
    document.title = `${name} · Find me everywhere`;
    const avatar = profile.avatar_url
      ? `<img class="public-avatar-img" src="${attr(profile.avatar_url)}" alt="${attr(name)}" />`
      : `<span>${escapeHTML(monogram(name))}</span>`;
    app.innerHTML = `<div class="landing-shell" style="--hub-accent:${attr(profile.accent_color || '#4267e9')}">
      <div class="landing-halo landing-halo-a"></div><div class="landing-halo landing-halo-b"></div>
      <main class="public-container">
        <div class="top-mark"><span class="brand-icon-mini">↗</span> LINKHUB <span class="top-mark-dot"></span> ONE PLACE, EVERYWHERE</div>
        <header class="profile-head">
          <div class="public-avatar">${avatar}</div>
          <span class="profile-overline"><span class="online-dot"></span> WELCOME TO MY SPACE</span>
          <h1>${escapeHTML(name)}</h1>
          <h2>${escapeHTML(profile.headline || 'Everything in one place.')}</h2>
          <p>${escapeHTML(profile.bio || '')}</p>
        </header>
        <div class="profile-divider"><span>EXPLORE MY LINKS</span><span class="divider-line"></span><span class="divider-spark">✳</span></div>
        <div class="public-groups">${Object.keys(groups).length ? Object.entries(groups).map(([title, links]) => `
          <section class="public-category"><div class="category-title"><span>${escapeHTML(title)}</span><span>${String(links.length).padStart(2, '0')}</span></div>
          <div class="public-links">${links.map(linkCard).join('')}</div></section>`).join('') : `
          <div class="public-empty"><span class="public-empty-icon">↗</span><h3>Links are on their way.</h3><p>This page is ready. Add your real destinations in the admin panel to make them appear here.</p></div>`}</div>
        <footer class="public-footer"><span>Made to connect.</span><a href="/" aria-label="LinkHub home">LINKHUB <span aria-hidden="true">↗</span></a></footer>
      </main></div>`;
  } catch (error) {
    app.innerHTML = `<div class="public-error"><h1>Something went wrong.</h1><p>${escapeHTML(error.message)}</p><button type="button" class="btn btn-primary" id="retry-public">Try again</button></div>`;
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
      <div class="sidebar-version">LINKHUB · v0.1.0</div>
    </aside>
    <div class="dash-main">
      <header class="dash-topbar"><div class="dash-topbar-title">LINKHUB / <span>${tabs.find((tab) => tab[0] === selected)[1].toUpperCase()}</span></div><div class="dash-topbar-right"><span class="pill-live"><i></i> LIVE</span><a href="/" target="_blank" rel="noopener" class="top-view">Open page ↗</a></div></header>
      <div class="dashboard-content">${content}</div>
      <footer class="dash-footer">LinkHub v0.1.0 <span>·</span> Cloudflare Workers + D1 <span>·</span> Your data, your links.</footer>
    </div>
  </div>`;
}
function metricCard(label, value, subtitle, icon, tone = '') {
  return `<article class="metric-card ${tone}"><div class="metric-top"><span>${escapeHTML(label)}</span><span class="metric-icon">${icon}</span></div><strong>${formatCount(value)}</strong><small>${escapeHTML(subtitle)}</small></article>`;
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
  return `<section class="page-heading"><div><div class="eyebrow">A CLEARER PICTURE OF YOUR TRAFFIC</div><h1>Overview<span class="heading-dot">.</span></h1><p>Know where visitors arrive and what they choose next.</p></div>${periodPills()}</section>
    <div class="metric-grid">${metricCard('Page views',summary.views.total,'Visits to your LinkHub','↗','metric-primary')}${metricCard('Unique visitors',summary.views.unique,'Distinct anonymous browser IDs','◎')}${metricCard('Outbound clicks',summary.outbound.total,'Clicks on your destination buttons','↗')}${metricCard('Click-through rate',rate + '%','Outbound clicks ÷ page views','✧')}</div>
    <div class="dash-two-up"><section class="dash-panel chart-panel"><div class="panel-title-row"><div><h2>Traffic activity</h2><p>Last 14 days · Today first · UTC</p></div><div class="chart-legend"><span><i class="legend-views"></i>Views</span><span><i class="legend-clicks"></i>Clicks</span></div></div>${chartMarkup(chart)}</section>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Traffic sources</h2><p>Visits by entry link</p></div><span class="panel-detail">SOURCE MIX</span></div>${trendRows(sources,summary.views.total,'views')}</section></div>
    <div class="dash-two-up"><section class="dash-panel"><div class="panel-title-row"><div><h2>Destination clicks</h2><p>Which buttons people open</p></div><span class="panel-detail">BUTTONS</span></div>${trendRows(buttons,summary.outbound.total,'clicks')}</section>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Visitor countries</h2><p>Based on Cloudflare's approximate location</p></div><span class="panel-detail">WORLDWIDE</span></div>${trendRows(countries,summary.views.total,'views')}</section></div>
    <section class="dash-panel"><div class="panel-title-row"><div><h2>Recent activity</h2><p>Latest tracked views and outbound clicks</p></div><span class="panel-detail">${recent.length} RECORDS</span></div>${tableMarkup(recent,[['WHEN', (r) => `<span class="no-wrap">${escapeHTML(formatTime(r.occurred_at))}</span>`],['EVENT',(r)=> `<span class="event-pill ${r.kind === 'view' ? 'event-view':'event-outbound'}">${r.kind === 'view' ? 'Page view':'Outbound click'}</span>`],['ENTRY SOURCE',(r)=>escapeHTML(r.source_name)],['DESTINATION',(r)=>escapeHTML(r.button_name || '—')],['COUNTRY',(r)=>escapeHTML(r.country || 'Unknown')],['VISITOR',(r)=>`<code>${escapeHTML(r.visitor_id.slice(0,8))}…</code>`]],'Your first visit will appear here.')}</section>`;
}
function copyButton(text, label = 'Copy') { return `<button type="button" class="btn btn-subtle btn-copy" data-copy="${attr(text)}"><span>⧉</span> ${label}</button>`; }
function linksTab() {
  return `<section class="page-heading"><div><div class="eyebrow">YOUR DESTINATIONS</div><h1>My links<span class="heading-dot">.</span></h1><p>These are the buttons visitors see on your public page.</p></div><button class="btn btn-primary" data-add="buttons">+ Add a link</button></section>
    <div class="info-strip"><span>◎</span><div><strong>Two separate metrics.</strong> LinkHub tracks visits to your page and clicks on these buttons. Inactive links stay hidden until you replace the example addresses with your real profiles.</div></div>
    <div class="manage-grid">${state.buttons.length ? state.buttons.map((item,index) => `<article class="manage-card"><div class="manage-card-left"><span class="manage-icon" style="background:${attr(item.accent)}">${escapeHTML(socialIcon(item.title))}</span><div><div class="manage-title">${escapeHTML(item.title)} <span class="mini-status ${item.active ? 'mini-on':'mini-off'}">${item.active ? 'Live' : 'Hidden'}</span></div><p>${escapeHTML(item.subtitle || item.url)}</p><small>${escapeHTML(item.category)} <span>·</span> ${escapeHTML(item.url)}</small></div></div><div class="manage-card-actions"><div class="order-controls"><button data-move="${item.id}" data-direction="up" ${index===0?'disabled':''} title="Move up">↑</button><button data-move="${item.id}" data-direction="down" ${index===state.buttons.length-1?'disabled':''} title="Move down">↓</button></div>${copyButton(`${location.origin}/out/${item.id}`,'Copy link') }<button class="btn btn-outline" data-edit="buttons" data-id="${item.id}">Edit</button><button class="btn btn-danger-ghost" data-delete="buttons" data-id="${item.id}">Delete</button></div></article>`).join('') : `<div class="public-empty"><h3>Nothing here yet.</h3><p>Add your first destination link.</p></div>`}</div>
    <p class="helper-note">Visitors open a button through a tracked <code>/out/ID</code> URL. You can edit the real destination without changing the button's tracking address.</p>`;
}
function sourceTab() {
  return `<section class="page-heading"><div><div class="eyebrow">KNOW WHERE PEOPLE COME FROM</div><h1>Traffic sources<span class="heading-dot">.</span></h1><p>Share a different entry URL on each platform; every URL opens the same LinkHub page.</p></div><button class="btn btn-primary" data-add="sources">+ Add a source</button></section>
    <div class="info-strip"><span>↗</span><div><strong>Source attribution, not automatic referrer detection.</strong> A visit to <code>/ig</code> is attributed to your Instagram link — even if someone shares it elsewhere. Direct visitors use the homepage.</div></div>
    <div class="source-grid">${state.sources.map((source) => `<article class="source-card"><div class="source-card-top"><div class="source-symbol">${escapeHTML(socialIcon(source.name))}</div><span class="mini-status ${source.active ? 'mini-on':'mini-off'}">${source.active?'Live':'Paused'}</span></div><h3>${escapeHTML(source.name)}</h3><p class="source-url">${escapeHTML(`${location.origin}/${source.slug}`)}</p><div class="source-card-bottom">${copyButton(`${location.origin}/${source.slug}`, 'Copy URL')}<button class="btn btn-outline" data-edit="sources" data-id="${source.id}">Edit</button><button class="btn btn-danger-ghost" data-delete="sources" data-id="${source.id}">Delete</button></div></article>`).join('')}</div>`;
}
function appearanceTab() {
  const item = state.profile || {};
  return `<section class="page-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Appearance<span class="heading-dot">.</span></h1><p>Edit the name, message, and visual identity of your public page.</p></div><a class="btn btn-outline" href="/" target="_blank" rel="noopener">View public page ↗</a></section>
    <section class="dash-panel appearance-panel"><div class="panel-title-row"><div><h2>Profile details</h2><p>Changes appear on all entry URLs immediately.</p></div><span class="panel-detail">PUBLIC PROFILE</span></div>
      <form id="profile-form" class="field-form"><div class="form-row"><label>Display name<input name="display_name" maxlength="80" required value="${attr(item.display_name || '')}" placeholder="Your brand" /></label><label>Headline<input name="headline" maxlength="140" value="${attr(item.headline || '')}" placeholder="Everything in one place" /></label></div>
      <label>Bio<textarea name="bio" rows="3" maxlength="300" placeholder="Tell visitors a little about yourself">${escapeHTML(item.bio || '')}</textarea></label>
      <label>Avatar image URL <span class="form-optional">optional · HTTPS</span><input name="avatar_url" type="url" value="${attr(item.avatar_url || '')}" placeholder="https://your-site.com/avatar.jpg" /></label>
      <div class="form-row"><label>Accent color<input name="accent_color" type="color" value="${attr(item.accent_color || '#4267e9')}" /></label><div class="appearance-tip"><span>✳</span><p>Tip: a short headline and a handful of curated links usually work best.</p></div></div>
      <div class="form-bottom"><button class="btn btn-primary" type="submit">Save appearance</button></div></form></section>`;
}
function renderAdmin() {
  const content = state.tab === 'overview' ? overview() : state.tab === 'links' ? linksTab() : state.tab === 'sources' ? sourceTab() : appearanceTab();
  app.innerHTML = adminShell(content);
  wireAdmin();
}
function loginView(configured) {
  document.title = 'Sign in · LinkHub';
  app.innerHTML = `<main class="login-shell"><div class="login-glow"></div><div class="login-card"><a href="/" class="login-back">← Back to my page</a><div class="login-logo">↗</div><div class="eyebrow">PRIVATE WORKSPACE</div><h1>Welcome back<span class="heading-dot">.</span></h1><p>Sign in to manage your links and traffic analytics.</p><form id="login-form" class="login-form"><label>Password<div class="password-wrap"><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"/><button type="button" class="password-toggle" id="toggle-password" aria-label="Show password">Show</button></div></label><button type="submit" class="btn btn-primary btn-wide">Sign in <span>→</span></button></form>${configured ? '' : '<div class="login-warning">Admin secrets are missing. Follow README.md to set up ADMIN_PASSWORD and SESSION_SECRET.</div>'}<div class="login-footer">LINKHUB <span>·</span> SECURE ADMIN AREA</div></div></main>`;
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
  if (isSource) fields=`<label>Source name<input name="name" value="${attr(existing?.name || '')}" placeholder="Instagram" maxlength="60" required/></label>
    <label>Short URL slug<input name="slug" value="${attr(existing?.slug || '')}" placeholder="ig" maxlength="40" pattern="[a-zA-Z][a-zA-Z0-9_-]*" required/><small>Example: ${escapeHTML(location.origin)}/ig</small></label>
    <label class="check-row"><input type="checkbox" name="active" ${existing?.active === 0 ? '' : 'checked'}/> Active (accepts visits)</label>`;
  else fields=`<label>Button title<input name="title" value="${attr(existing?.title || '')}" placeholder="Patreon" maxlength="70" required/></label>
    <label>Description<input name="subtitle" value="${attr(existing?.subtitle || '')}" placeholder="Support my work" maxlength="120" /></label>
    <label>Destination URL<input name="url" type="url" required value="${attr(existing?.url || '')}" placeholder="https://patreon.com/your-profile" /></label>
    <label>Section / category<input name="category" value="${attr(existing?.category || 'Find me on')}" placeholder="Membership" maxlength="50"/></label>
    <div class="form-color-field"><span>Card color</span><div class="color-choices">${palette.map(([color, title])=> `<label title="${title}" class="color-choice"><input type="radio" name="accent" value="${color}" ${(!existing?.accent ? color===palette[0][0] : existing.accent===color) ? 'checked':''}/><span style="background:${color}"></span></label>`).join('')}</div></div>
    <label class="check-row"><input type="checkbox" name="active" ${existing?.active === 1 ? 'checked' : ''}/> Visible on public page</label>`;
  modal(isSource ? (editing ? 'Edit source' : 'Add a traffic source') : (editing ? 'Edit button' : 'Add a destination'),
    `<form id="edit-item-form" class="field-form modal-form">${fields}<div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" class="btn btn-primary">${editing ? 'Save changes' : 'Create'}</button></div></form>`);
  qs('#edit-item-form').onsubmit=async(event)=>{
    event.preventDefault();
    const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
    const data=isSource ? {name:values.name,slug:values.slug.toLowerCase(),active:form.querySelector('[name="active"]').checked}
      : {title:values.title,subtitle:values.subtitle,url:values.url,category:values.category,accent:values.accent,active:form.querySelector('[name="active"]').checked};
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;
    try {await api(`/api/admin/${type}${editing ? '/'+existing.id:''}`,{method:editing?'PUT':'POST',data});closeModal();await refreshAdmin();toast(editing?'Changes saved':'Item created');}
    catch(error){toast(error.message,'error');submit.disabled=false;}
  };
}
function modal(title, html) {
  closeModal();
  const overlay=document.createElement('div'); overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal-card" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-heading"><h2>${escapeHTML(title)}</h2><button class="modal-x" data-close aria-label="Close dialog">×</button></div>${html}</div>`;
  document.body.append(overlay);state.modal=overlay;
  overlay.onclick=(event)=>{if(event.target===overlay || event.target.closest('[data-close]'))closeModal();};
  overlay.onkeydown=(event)=>{if(event.key==='Escape')closeModal();};
  qsa('input:not([type="hidden"]),textarea',overlay)[0]?.focus();
}
function closeModal() { state.modal?.remove();state.modal=null; }
function askDelete(type,id) {
  const item=(type==='sources'?state.sources:state.buttons).find((obj)=>obj.id===id);
  if (!item) return;
  const heading = type==='sources'?'Delete traffic source?':'Delete destination button?';
  modal(heading,`<p class="confirm-description"><strong>${escapeHTML(item.name || item.title)}</strong> will be removed. Historic analytics events retain a snapshot of its name. This can't be undone.</p><div class="modal-actions"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger" id="confirm-delete">Delete permanently</button></div>`);
  qs('#confirm-delete').onclick=async()=>{try{await api(`/api/admin/${type}/${id}`,{method:'DELETE'});closeModal();await refreshAdmin();toast('Item deleted');}catch(error){toast(error.message,'error');}};
}
function wireAdmin() {
  qsa('[data-tab]').forEach((el)=>el.onclick=()=>{state.tab=el.dataset.tab;renderAdmin();window.scrollTo(0,0);});
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
    try{await api('/api/admin/profile',{method:'PUT',data:values});await refreshAdmin({analytics:false});toast('Public page updated');}catch(error){toast(error.message,'error');button.disabled=false;}
  });
}

if (adminMode) loadAdmin(); else renderPublic();
