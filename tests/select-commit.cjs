const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../content/content.js'), 'utf8');
let opened = false;
const label = {className:'mtd-select-filter-label mtd-select-filter-hint', textContent:'请选择'};
const input = {value:'', readOnly:false};
const trigger = {click(){opened = true;}};
const option = {textContent:'某公司', className:'mtd-select-item', isConnected:true,
  click(){ label.className = 'mtd-select-filter-label'; label.textContent = this.textContent; opened = false; }};
const box = () => ({left:0,top:40,bottom:40});
const popup = {className:'mtd-select-popup',getBoundingClientRect:box,
  querySelectorAll:s=>s === '.mtd-select-item' ? [option] : []};
const el = {getBoundingClientRect:box, matches:s=>s === '.mtd-select', getAttribute:()=>null,
  querySelector:s=>s === 'input' ? input : s === '.mtd-select-filter-label' ? label : trigger};
let fieldLabel = '公司名称';
let writes = 0;
const ctx = {getLabel:()=>fieldLabel, document:{querySelectorAll:s=>opened && s === '.mtd-select-popup-wrapper .mtd-select-popup' ? [popup] : []}, isVisible:()=>true,
  sleep:async()=>{}, waitForChange:async check=>!!check(), dbg:()=>{}, callMain:async()=>{},
  realClick:async node=>node.click(), realClickCdp:async node=>node.click(),
  setNativeValue:async(node,value)=>{writes++;node.value=value;}};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function readBack'), source.indexOf('  // 值是否')),ctx);
vm.runInContext(source.slice(source.indexOf('  async function fillMtdSelect'), source.indexOf('  async function fillCustomSelect')),ctx);
(async()=>{
  input.value='某公司';
  assert.equal(ctx.readBack(el,'select'),'','Search text must not count as selection');
  assert.equal((await ctx.fillMtdSelect(el,'某公司')).success,true);
  assert.equal(ctx.readBack(el,'select'),'某公司');
  label.className='mtd-select-filter-hint';
  assert.equal((await ctx.fillMtdSelect(el,'另一公司')).success,false);
  opened=false;
  fieldLabel='语言水平';
  option.textContent='流利';
  const before=writes;
  assert.equal((await ctx.fillMtdSelect(el,'流利')).success,true);
  assert.equal(writes,before,'Fixed choices must not be searched by typing');
  console.log('PASS: search text is not selection; exact candidate must be committed');
})().catch(e=>{console.error(e);process.exitCode=1;});
