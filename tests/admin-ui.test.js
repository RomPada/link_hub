import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const styles = readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
function loadFunction(name, next, injected) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\nfunction ${next}(`,start);
  assert.ok(start >= 0 && end > start,`${name} must exist in public/app.js`);
  return Function(...Object.keys(injected), `return (${source.slice(start,end).trim()});`)(...Object.values(injected));
}
const escapeHTML = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const grouped = (items,key) => items.reduce((all,item)=>{(all[item[key] || 'Links'] ||= []).push(item);return all;},Object.create(null));

test('My links shows a single ordered list including hidden links and actions',()=>{
  const state={buttons:[
    {id:1,category:'Resources',title:'Resource A',url:'https://example.com/a',accent:'#e9eefc',active:1},
    {id:2,category:'Channels',title:'Channel A',url:'https://example.com/b',accent:'#e9eefc',active:1},
    {id:3,category:'Resources',title:'Resource B',url:'https://example.com/c',accent:'#e9eefc',active:0}
  ]};
  const func=loadFunction('linksTab','sourceTab',{state,escapeHTML,attr:escapeHTML,iconTile:()=>'<span class="public-link-icon">↗</span>',copyButton:()=>'<button data-copy="/out/1">Copy link</button>',location:{origin:'https://linkhub.example'}});
  const markup=func();
  assert.match(markup,/class="manage-grid ungrouped-links"/);
  assert.ok(markup.indexOf('Resource A')<markup.indexOf('Channel A'));
  assert.ok(markup.indexOf('Channel A')<markup.indexOf('Resource B'));
  assert.doesNotMatch(markup,/class="manage-category"/);
  assert.match(markup,/Hidden/);
  assert.match(markup,/data-move="1" data-direction="up" disabled/);
  assert.match(markup,/data-move="3" data-direction="down" disabled/);
  assert.match(markup,/data-edit="buttons"/);
  assert.match(markup,/data-delete="buttons"/);
  assert.match(markup,/data-copy=/);
});

test('styled icon mode menu preserves all four choices and native form submission',()=>{
  const func=loadFunction('iconModePicker','wireIconModePicker',{attr:escapeHTML,escapeHTML,chevronSvg:'<svg></svg>'});
  const markup=func('upload');
  assert.match(markup,/name="icon_mode" value="upload"/);
  assert.match(markup,/aria-haspopup="listbox"/);
  for(const key of ['auto','url','upload','default']) assert.match(markup,new RegExp(`data-icon-mode-option="${key}"`));
  assert.match(markup,/aria-selected="true" class="icon-mode-option selected" data-icon-mode-option="upload"/);
  assert.doesNotMatch(markup,/<select\b/);
});

test('Appearance has no duplicate public-page button and full-width panel CSS',()=>{
  const func=loadFunction('appearanceTab','deviceChoice',{state:{profile:{}},attr:escapeHTML,escapeHTML,monogram:()=> 'LH'});
  const markup=func();
  assert.match(markup,/class="dash-panel appearance-panel"/);
  assert.doesNotMatch(markup,/<a class="btn btn-outline" href="\/"/);
  assert.match(styles,/\.appearance-panel\s*\{\s*width:100%;max-width:none/);
});
