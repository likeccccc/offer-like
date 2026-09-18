const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const requests = [];
const handlers = {};
const fields = {};
const doc = { getElementById(id) { return fields[id] ||= { value: '', addEventListener(_event, fn) { handlers[id] = fn; } }; } };
const ctx = { URL, AbortController, setTimeout, clearTimeout, document: doc,
  FIXED_SCHEMA: [{key:'name', label:'姓名'}], LIST_SCHEMA: [], setAiStatus() {}, setStatus() {},
  chrome: { runtime: { onMessage: {addListener() {}} } }, importScripts() {},
  fetch: async (url, init) => {
    requests.push({url, body: JSON.parse(init.body)});
    return { ok: true, json: async () => ({ choices: [{message:{content:'{"fills":[],"name":"测试"}'}}] }) };
  }
};
vm.createContext(ctx);
vm.runInContext(read('shared/ai-config.js'), ctx);
const ai = ctx.OFFERLIKE_AI;
const legacy = { provider:'custom', endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey:'test-key' };
assert.equal(ai.resolve(legacy).model, 'qwen3.7-flash');
assert.equal(ai.resolve({...legacy, endpoint:legacy.endpoint+'/chat/completions/'}).endpoint, legacy.endpoint);
assert.equal(ai.resolve({provider:'qwen'}).params.enable_thinking, false);
assert.throws(() => ai.resolve({provider:'custom', endpoint:'https://example.com/v1'}), /模型名称/);
assert.throws(() => ai.resolve({...legacy, model:'deepseek-chat'}), /千问接口不能/);
assert.equal(ai.resolve({provider:'deepseek'}).model, 'deepseek-chat');
assert.equal('enable_thinking' in ai.resolve({provider:'deepseek'}).params, false);
assert.equal(ai.resolve({...legacy, model:'qwen3.7-flash-2026-07-15'}).model, 'qwen3.7-flash-2026-07-15');
ai.loadForm(legacy, doc);
assert.equal(fields.model.value, 'qwen3.7-flash');
fields.provider.value = 'kimi'; ai.switchProvider(doc);
assert.equal(fields.endpoint.value, ai.providers.kimi.endpoint);
assert.equal(fields.model.value, ai.providers.kimi.model);
assert.equal(fields.apiKey.value, 'test-key');
ai.loadForm(legacy, doc);
ctx.getAiConfig = ctx.getConfig = () => ai.readForm(doc);
const options = read('options/options.js');
const content = read('content/content.js');
vm.runInContext(options.slice(options.indexOf('async function callAIForParse'), options.indexOf('// ---------- 初始化')), ctx);
vm.runInContext(content.slice(content.indexOf('  async function aiFillDirect'), content.indexOf('  const LOCAL_KEYS')), ctx);
vm.runInContext(read('background.js'), ctx);
function installTestButton(source, indent) {
  const start = source.indexOf('document.getElementById("testBtn").addEventListener');
  const end = source.indexOf('\n' + indent + '});', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end + indent.length + 4), ctx);
}
(async () => {
  await ctx.callAIForParse('测试简历', legacy);
  await ctx.aiFillDirect({resume:'测试简历', fields:[], config:legacy, mappingKeys:['name']});
  await ctx.aiFill({resume:'测试简历', fields:[], config:legacy});
  await ctx.aiTest({config:legacy});
  await ctx.aiParseResume({text:'测试简历', config:legacy});
  installTestButton(options, '  ');
  await handlers.testBtn();
  installTestButton(read('popup/popup.js'), '');
  await handlers.testBtn();
  assert.equal(requests.length, 7, 'Exercise every API entry point');
  for (const request of requests) {
    assert.equal(request.url, legacy.endpoint + '/chat/completions');
    assert.equal(request.body.model, 'qwen3.7-flash');
    assert.equal(request.body.enable_thinking, false);
    assert.ok(Array.isArray(request.body.messages));
  }
  const manifest = JSON.parse(read('manifest.json'));
  const scripts = manifest.content_scripts.find(s => s.js.includes('content/content.js')).js;
  assert.ok(scripts.indexOf('shared/ai-config.js') < scripts.indexOf('content/content.js'));
  for (const file of ['options/options.html','popup/popup.html']) assert.ok(read(file).includes('../shared/ai-config.js'));
  console.log('PASS: seven API paths use Qwen model and non-thinking parameters; legacy config, custom validation, provider switch, script wiring');
})().catch(error => {console.error(error); process.exitCode = 1;});
