const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
let clicks = 0, fallbackClicks = 0;
const ctx = { isVisible: n => !n.hidden, console: { log() {} },
  hasStructuredEducationControls: () => false,
  waitForChange: async check => !!check(),
  callMain: async () => { fallbackClicks++; }, realClickCdp: async () => { fallbackClicks++; },
  getLabel: () => '性别' };
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  const STRUCTURED_PROFILE_SELECT'), source.indexOf('  function isVisible')), ctx);
vm.runInContext(source.slice(source.indexOf('  function radioOptions'), source.indexOf('  async function fillElement')), ctx);
vm.runInContext(source.slice(source.indexOf('  function readBack'), source.indexOf('  // 值是否')), ctx);
const inputs = ['M', 'F'].map(value => ({value, type: 'radio', tagName:'INPUT', hidden:true, checked:false,
  contains: () => false, closest: () => group, click() { clicks++; inputs.forEach(i => { i.checked = i === this; }); }}));
const options = ['男', '女'].map((textContent, i) => ({textContent, className:'phoenix-radio__wrapper',
  getAttribute: () => null, contains: n => n === inputs[i], matches: () => false, closest: () => group,
  querySelector: s => s.includes(':checked') ? (inputs[i].checked ? inputs[i] : null) : inputs[i] }));
const group = {tagName:'DIV', className:'phoenix-radio-group',
  matches: s => s.includes('.phoenix-radio-group'), closest: () => null,
  querySelectorAll: () => [...options, ...inputs], querySelector: () => inputs[0] };
ctx.document = { querySelectorAll(selector) {
  if (selector.startsWith('input:not')) return inputs;
  if (selector.startsWith('.ant-select')) return [group];
  return [...options, ...inputs];
} };
ctx.detectKind = () => 'radio';
vm.runInContext(source.slice(source.indexOf('  function scanFields'), source.indexOf('  function getLabel')), ctx);
(async () => {
  const fields = ctx.scanFields();
  assert.equal(fields.length, 1, 'Hidden native radios are represented by one visible group');
  assert.equal(fields[0].label, '性别');
  assert.equal(fields[0].kind, 'radio');
  let result = await ctx.fillRadio(group, '男');
  assert.equal(result.success, true);
  assert.equal(ctx.readBack(group, 'radio'), '男');
  assert.equal(inputs[0].value, 'M', 'Do not overwrite radio values');
  assert.equal(clicks, 1);
  result = await ctx.fillRadio(group, '男');
  assert.equal(result.success, true);
  assert.equal(clicks, 1, 'Do not toggle an already selected option');
  result = await ctx.fillRadio(group, '女');
  assert.equal(result.success, true);
  assert.equal(inputs[0].checked, false);
  assert.equal(inputs[1].checked, true);
  assert.equal(fallbackClicks, 0);
  assert.equal((await ctx.fillRadio(group, '未知')).success, false);
  console.log('PASS: hidden radio scan, gender mapping, actual checked-state verification, no value rewriting');
})().catch(error => { console.error(error); process.exitCode = 1; });
