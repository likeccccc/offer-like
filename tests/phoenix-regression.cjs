const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
let closed = 0;
const ctx = {
  dbg() {}, sleep: async () => {}, isVisible: n => n.visible !== false,
  waitForChange: async check => !!check(),
  KeyboardEvent: class {}, MouseEvent: class {},
  document: { body: { dispatchEvent() {}, click() { closed++; } },
    querySelectorAll() { throw Error('Must not use a stale global calendar or confirm button'); } },
  readBack: el => el.value,
  matchOption: root => root.option,
  callMain: async (_fn, [option]) => { option.click(); return true; }
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function closePhoenixPanel('), source.indexOf('  // 把日期面板翻到')), ctx);
vm.runInContext(source.slice(source.indexOf('  function looksFilled('), source.indexOf('  // 跨世界调用')), ctx);
function field() { return { value: '', matches: () => false, querySelector: () => null }; }
function node(text, click = () => {}) {
  return { textContent: text, click, isConnected: true, className: '', getAttribute: () => null };
}
function calendar(el, stuck = false) {
  let stage = 'initial';
  let yearClicks = 0, decadeClicks = 0;
  const year = node(stuck ? '2030' : '2023', () => { yearClicks++; stage = 'months'; });
  const month = node('09月', () => { el.value = '2023-09'; });
  const trigger = node('year', () => { stage = 'years'; });
  const prev = node('prev', () => { decadeClicks++; });
  const root = {
    isConnected: true, matches: s => s === '.phoenix-date-picker', parentElement: null,
    querySelector: () => null,
    querySelectorAll(s) {
      if (s.includes('month-panel-year-select')) return [trigger];
      if (s.includes('year-panel-year')) return stage === 'initial' ? [] : [year]; // Year DOM deliberately persists.
      if (s.includes('month-panel-month')) return stage === 'months' ? [month] : [];
      if (s.includes('decade-btn')) return [prev];
      return [];
    }
  };
  return { root, counts: () => ({yearClicks, decadeClicks}) };
}
(async () => {
  const el = field(), fixture = calendar(el);
  let result = await ctx.fillPhoenixPanel(el, fixture.root, '2023年09月');
  assert.equal(result.success, true);
  assert.deepEqual(fixture.counts(), {yearClicks: 1, decadeClicks: 0});
  assert.equal(closed, 1);

  const stuckEl = field(), stuck = calendar(stuckEl, true);
  result = await ctx.fillPhoenixPanel(stuckEl, stuck.root, '2019年09月');
  assert.equal(result.success, false);
  assert.equal(stuck.counts().decadeClicks, 1, 'Stop when decade navigation makes no progress');
  assert.equal(closed, 2, 'Close failed calendar too');

  const degree = field();
  const list = { isConnected: true, matches: () => false, querySelector: () => null,
    querySelectorAll: () => [], option: node('硕士', () => { degree.value = '硕士'; }) };
  result = await ctx.fillPhoenixPanel(degree, list, '硕士');
  assert.equal(result.success, true, 'List stays a list even with a global stale calendar');
  assert.equal(closed, 3);
  assert.equal(ctx.looksFilled({value:'2026-09'}, 'select', '2023年09月'), false);
  assert.equal(ctx.looksFilled({value:'2023-10'}, 'date', '2023年01月'), false);
  assert.equal(ctx.looksFilled({value:'2023-09-02'}, 'date', '2023-09-01'), false);
  assert.equal(ctx.looksFilled({value:'硕士'}, 'select', '硕士研究生'), false);
  const region = field();
  let level = 0;
  const terminalFlags = [];
  const province = node('浙江省'), city = node('杭州市');
  province.querySelector = city.querySelector = () => null;
  const area = { isConnected: true, matches: () => false,
    querySelector: s => s.includes('area-selector') ? {} : null,
    querySelectorAll: s => s.startsWith('.area-item-container') ? [level ? city : province] : [] };
  ctx.callMain = async (_fn, [_option, terminal]) => {
    terminalFlags.push(terminal);
    if (terminal) region.value = '浙江省/杭州市';
    else level++;
    return true;
  };
  result = await ctx.fillPhoenixPanel(region, area, '浙江省/杭州市');
  assert.equal(result.success, true);
  assert.deepEqual(terminalFlags, [false, true], 'Navigate province; select final city');
  level = 0;
  terminalFlags.length = 0;
  region.value = '';
  province.textContent = '福建';
  city.textContent = '漳州';
  ctx.callMain = async (_fn, [_option, terminal]) => {
    terminalFlags.push(terminal);
    if (terminal) region.value = '福建 / 漳州';
    else level++;
    return true;
  };
  result = await ctx.fillPhoenixPanel(region, area, '福建省漳州市');
  assert.equal(result.success, true, 'Province/city suffix differences do not break navigation');
  assert.deepEqual(terminalFlags, [false, true]);

  const graduation = field();
  const gradFixture = calendar(graduation);
  const originalQuery = gradFixture.root.querySelectorAll;
  const commit = node('确定', () => { graduation.value = '2023-09'; });
  const footer = { querySelectorAll: s => s.includes('wraper--primary') ? [commit] : [] };
  gradFixture.root.closest = () => footer;
  gradFixture.root.querySelectorAll = s => {
    if (s.includes('month-panel-month')) return [node('09月')]; // No auto commit on month click.
    return originalQuery(s);
  };
  result = await ctx.fillPhoenixPanel(graduation, gradFixture.root, '2023年09月');
  assert.equal(result.success, true, 'Commit via footer in same popup, outside calendar root');
  gradFixture.root.closest = () => null;
  graduation.value = '';
  const q = gradFixture.root.querySelectorAll;
  gradFixture.root.querySelectorAll = s => s.includes('calendar-date') ? [node('1'), node('2')] : q(s);
  result = await ctx.fillPhoenixPanel(graduation, gradFixture.root, '2023年09月');
  assert.equal(result.success, false);
  assert.match(result.error, /具体日期/, 'Do not invent a graduation day when page requires it');
  gradFixture.root.querySelectorAll = s => s.includes('calendar-date')
    ? [node('1'), node('2', () => { graduation.value = '2023-09-02'; })] : q(s);
  result = await ctx.fillPhoenixPanel(graduation, gradFixture.root, '2023年09月02日');
  assert.equal(result.success, true, 'Full graduation date selects the supplied day');
  console.log('PASS: retained year DOM, bounded navigation, stale panel isolation, cleanup, exact date readback');
})().catch(error => { console.error(error); process.exitCode = 1; });
