const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
let fieldCount = 0;
const clicked = [];
const buttons = {
  project: {tagName:'DIV', textContent:'添加项目经历'},
  certificate: {tagName:'DIV', textContent:'添加证书'}
};
const ctx = {
  LIST_LABELS: {project:'项目', certificate:'证书'},
  SEL_CUSTOM: '.custom-control',
  successfulAddMethods: new Map(),
  chrome: {storage:{local:{get:async()=>({})}}},
  document: {querySelectorAll: () => ({length:fieldCount})},
  findAllAddButtons: () => Object.values(buttons),
  addButtonFor: key => buttons[key] || null,
  recordFields: () => [], scanFields: () => [], dbg: () => {},
  realClickCdp: async () => false,
  callMain: async (_method, [button]) => { clicked.push(button.textContent); fieldCount += 2; },
  waitForChange: async check => !!check()
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  async function preExpandRows'), source.indexOf('  function scanFields')), ctx);

(async () => {
  await ctx.preExpandRows({project:[{name:'P'}], certificate:[{name:'C'}]});
  assert.deepEqual(clicked, ['添加项目经历', '添加证书']);
  console.log('PASS: collapsed categories with one record are expanded even when no fields exist yet');
})().catch(error => { console.error(error); process.exitCode = 1; });
