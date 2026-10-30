import test from 'node:test';
import assert from 'node:assert/strict';

test('public landing renders visible sample buttons and all five interface languages', async () => {
  const app = { innerHTML: '' };
  const attrs = {};
  const languagePicker = { handler: null, addEventListener(type, fn) { if(type==='click') this.handler=fn; }, setAttribute() {} };
  const languageOptions = { hidden:true, addEventListener() {} };
  const languageButtons = [['en','English'],['ja','日本語'],['de','Deutsch'],['es','Español'],['fr','Français']].map(([code])=>({dataset:{publicLanguage:code},addEventListener(type,fn){if(type==='click')this.handler=fn;}}));
  const memory = {};
  globalThis.localStorage = { getItem: (name) => memory[name] || null, setItem: (name,val) => { memory[name]=val; } };
  globalThis.location = { pathname:'/' };
  globalThis.document = {
    documentElement: { lang:'en' },
    getElementById(id) { return id==='app' ? app : null; },
    querySelector(selector) {
      if(selector==='link[rel="icon"]') return { setAttribute(name,val){ attrs[name]=val; } };
      if(selector==='#language-toggle') return languagePicker;
      if(selector==='#language-options') return languageOptions;
      return null;
    },
    querySelectorAll(selector) { if(selector==='[data-public-language]') return languageButtons; return []; }
  };
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok:true, json:async() => ({ profile: {
      display_name:'Demo Profile',headline:'Everything in one place.',bio:'Follow, explore, and stay connected.',
      avatar_url:'',avatar_text:'DP',avatar_background:'#1a2b3c',avatar_shape:'square',
      show_top_brand:0,show_top_tagline:0,updated_at:1000
    }, links:[{id:1,title:'Example Resource One',subtitle:'Open a sample destination',category:'Resources',accent:'#f9e8e7',url:'https://example.com/resource-one',icon_mode:'auto',icon_url:''}] }) };
  };
  await import(`../public/app.js?smoke=${Date.now()}`);
  await new Promise(resolve => setTimeout(resolve,30));
  assert.match(app.innerHTML,/Example Resource One/);
  assert.match(app.innerHTML,/language-toggle/);
  assert.doesNotMatch(app.innerHTML,/divider-spark/);
  assert.doesNotMatch(app.innerHTML,/Links<\/title>/);
  assert.match(app.innerHTML,/href="\/out\/1"/);
  assert.doesNotMatch(app.innerHTML,/top-brand-name/);
  assert.doesNotMatch(app.innerHTML,/top-tagline/);
  assert.equal(attrs.href,'/site-icon?v=1000');
  assert.equal(document.documentElement.lang,'en');
  for (const [code,word] of [['ja','リンク一覧'],['de','MEINE LINKS'],['es','MIS ENLACES'],['fr','MES LIENS'],['en','EXPLORE MY LINKS']]) {
    languageButtons.find(button=>button.dataset.publicLanguage===code).handler();
    await new Promise(resolve => setTimeout(resolve,10));
    assert.equal(document.documentElement.lang,code);
    assert.ok(app.innerHTML.includes(word),`${code} missing text: ${word}`);
  }
  assert.equal(calls.every(path=>path==='/api/public'),true);
});
