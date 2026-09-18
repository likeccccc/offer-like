const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
const input = {value:'', click() {}};
let yearMode = false;
let monthMode = false;
const trigger = {click(){yearMode = true;}};
const years = ['2022','2023'].map(textContent => ({textContent, click(){monthMode = true;}}));
const months = ['1月','9月'].map(textContent => ({textContent, click(){input.value = '2023-09';}}));
const panel = {
  querySelector(selector) {
    if (selector === '.mtd-month-calendar-content.active') return null;
    if (selector === '.mtd-month-calendar-year-btn') return trigger;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.mtd-year-panel-list-data') return yearMode && !monthMode ? years : [];
    if (selector === '.mtd-month-panel-list-data') return monthMode ? months : [];
    return [];
  }
};
const ctx = {
  document:{querySelectorAll:()=>[panel]}, isVisible:()=>true,
  realClick:async node=>node.click(), waitForChange:async check=>!!check(),
  readBack:el=>el.value || '',
  looksFilled:(el,_kind,value)=>el.value.replace(/\D/g,'').slice(0,6) === value.replace(/\D/g,'').slice(0,6)
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function structuredMonth'), source.indexOf('  async function fillStructuredMonth')), ctx);
vm.runInContext(source.slice(source.indexOf('  function normalizeDate'), source.indexOf('  // 把日期面板翻到目标年月')), ctx);

(async () => {
  const result = await ctx.fillMonthPanel(input, '2023年09月');
  assert.equal(result.success, true);
  assert.equal(input.value, '2023-09');
  console.log('PASS: custom month panel opens, selects year and month, and verifies the value');
})().catch(error => { console.error(error); process.exitCode = 1; });
