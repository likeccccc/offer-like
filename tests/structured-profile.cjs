const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
const ctx = {
  location: {hostname:'jobs.example.com', pathname:'/profile'},
  document: {querySelector: selector => selector.includes('high_education') || selector.includes('education_begin_time')},
  Node: {DOCUMENT_POSITION_FOLLOWING: 4}, dbg: () => {},
  isVisible: () => true, sleep: async () => {},
  waitForChange: async check => !!check(),
  readBack: el => el.value || '',
  looksFilled: (el, kind, value) => kind === 'date'
    ? String(el.value).replace(/\D/g, '').slice(0, 6) === String(value).replace(/\D/g, '').slice(0, 6)
    : el.value === value,
  realClick: async node => node.click()
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  const STRUCTURED_PROFILE_SELECT'), source.indexOf('  function isVisible')), ctx);
vm.runInContext(source.slice(source.indexOf('  function hasStructuredEducationControls()'), source.indexOf('  // 简历里"多段经历"')), ctx);
vm.runInContext(source.slice(source.indexOf('  const LIST_LABELS'), source.indexOf('  // 找出页面上所有"添加/新增"按钮')), ctx);
vm.runInContext(source.slice(source.indexOf('  async function fillStructuredSelect'), source.indexOf('  async function fillCustomSelect')), ctx);
const cell = classes => ({classList:classes, querySelector:()=>null});
const field = classes => ({closest: selector => selector === '.applyform-cell' ? cell(classes) : null});
assert.equal(ctx.structuredFieldLabel(field(['applyform-cell','gender'])), '性别');
assert.equal(ctx.structuredFieldLabel(field(['applyform-cell','high_education'])), '学历');
assert.equal(ctx.structuredFieldLabel(field(['applyform-cell','education_begin_time'])), '开始时间');
assert.equal(ctx.structuredFieldLabel(field(['applyform-cell','education_end_time'])), '结束时间');

const section = {contains: () => true};
const rows = [0, 1].map(() => ({parentElement: section, contains(node) { return node.parentElement === this; }}));
let fieldOrder = 0;
const recordField = (row, label, highEducation = false) => {
  const el = {parentElement: rows[row], order: fieldOrder++, compareDocumentPosition(other) { return this.order < other.order ? 4 : 0; },
    closest: selector => highEducation && selector.includes('high_education') ? {} : null};
  return {_el: el, label, placeholder: ''};
};
const grouped = ctx.groupRecordFields('education', section, [
  recordField(0, '学历', true), recordField(0, ''), recordField(0, '开始时间'), recordField(0, '结束时间'),
  recordField(1, '学历', true), recordField(1, ''), recordField(1, '开始时间'), recordField(1, '结束时间')
]);
assert.deepEqual(Array.from(grouped, item => item.row), [0,0,0,0,1,1,1,1]);
const groupedWithoutVisibleDegree = ctx.groupRecordFields('education', section, [
  recordField(0, ''), recordField(0, '开始时间'), recordField(0, '结束时间'),
  recordField(1, ''), recordField(1, '开始时间'), recordField(1, '结束时间')
]);
assert.deepEqual(Array.from(groupedWithoutVisibleDegree, item => item.row), [0,0,0,1,1,1]);
const languageGroups = ctx.groupRecordFields('language', section, [
  recordField(0, '外语语种'), recordField(0, '掌握程度'),
  recordField(1, '外语语种'), recordField(1, '掌握程度')
]);
assert.deepEqual(Array.from(languageGroups, item => item.row), [0,0,1,1]);
const unknownGroups = ctx.groupRecordFields('certificate', section, [
  recordField(0, ''), recordField(0, '')
]);
assert.deepEqual(Array.from(unknownGroups, item => item.row), [0,0]);

const select = {value:'', panelOpen:false, matches: s => s === '.lxselect',
  querySelector(selector) {
    if (selector === '.lxselect-box') return {click:()=>{select.panelOpen=true;}};
    if (selector === '.lxselect-panel') return select.panelOpen ? panel : null;
    return null;
  }};
const options = ['男','女'].map(textContent => ({textContent, click(){select.value=textContent;}}));
const panel = {querySelectorAll: () => options};

const month = {value:'', stage:'closed', matches:s => s === '.date-picker-pc',
  querySelector(selector) {
    if (selector === '.value-container') return {click:()=>{month.stage='years';}};
    return null;
  },
  querySelectorAll(selector) {
    if (selector !== '.panel-container .options') return [];
    if (month.stage === 'years') return ['2022','2023'].map(textContent => ({textContent, querySelector:()=>null,
      click(){month.stage='months';}}));
    if (month.stage === 'months') return ['1月','9月'].map(textContent => ({textContent, querySelector:()=>null,
      click(){month.value='2023-09';}}));
    return [];
  }};

(async () => {
  let result = await ctx.fillStructuredSelect(select, '男');
  assert.equal(result.success, true);
  assert.equal(select.value, '男');
  result = await ctx.fillStructuredMonth(month, '2023年09月');
  assert.equal(result.success, true);
  assert.equal(month.value, '2023-09');
  assert.ok(source.includes('.applyform-cell.gender .lxselect'));
  assert.ok(source.includes('.applyform-cell.education_begin_time .date-picker-pc'));
  console.log('PASS: structured field labels, gender/education select, education month picker');
})().catch(error => {console.error(error); process.exitCode=1;});
