// ============================================================
// 本地测试脚本：模拟浏览器环境，测试 background.js 核心逻辑
// 运行：node test.js
// ============================================================

// ---------- 模拟 chrome API ----------
global.chrome = {
  runtime: {
    onMessage: {
      _listeners: [],
      addListener(fn) { this._listeners.push(fn); }
    },
    getManifest() { return { version: "0.1.0" }; }
  },
  storage: {
    local: {
      async get() { return {}; },
      async set() {},
      async remove() {}
    }
  }
};

// ---------- 模拟 fetch（返回假的 AI 响应） ----------
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  const body = JSON.parse(options.body);
  const userContent = body.messages[body.messages.length - 1].content;
  // 判断是哪个请求
  if (url.includes("/chat/completions")) {
    // 根据请求内容返回不同响应
    if (userContent.includes("回复 OK")) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: "OK" } }] }) };
    }
    if (userContent.includes("请解析以下简历")) {
      // AI 解析简历的响应
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                name: "张三", phone: "13800138000", email: "zs@test.com",
                school: "清华大学", degree: "本科", major: "计算机"
              })
            }
          }]
        })
      };
    }
    // AI 填充的响应
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              fills: [{ elementIndex: 0, value: "张三" }, { elementIndex: 1, value: "13800138000" }]
            })
          }
        }]
      })
    };
  }
  return { ok: false, text: async () => "not found" };
};

// ---------- 加载 background.js ----------
const fs = require("fs");
const vm = require("vm");
const code = fs.readFileSync("background.js", "utf-8");

const context = {
  chrome: global.chrome,
  fetch: global.fetch,
  AbortController: global.AbortController,
  setTimeout, clearTimeout,
  console, JSON, URL, Headers, FormData, Blob, Uint8Array, ArrayBuffer
};
vm.createContext(context);
vm.runInContext(code, context);

const listeners = chrome.runtime.onMessage._listeners;
if (listeners.length === 0) {
  console.log("❌ 失败：onMessage listener 未注册");
  process.exit(1);
}
console.log("✅ onMessage listener 已注册");

// ---------- 测试工具 ----------
function sendMessage(msg) {
  return new Promise((resolve) => {
    let responded = false;
    const sendResponse = (resp) => { responded = true; resolve(resp); };
    const returned = listeners[0](msg, { tab: { id: 1 } }, sendResponse);
    // 如果同步返回 true，等待异步响应；否则立即 resolve
    if (returned !== true) {
      resolve(undefined);
    }
  });
}

(async () => {
  let pass = 0, fail = 0;
  const check = (name, cond) => {
    if (cond) { pass++; console.log(`✅ ${name}`); }
    else { fail++; console.log(`❌ ${name}`); }
  };

  // 测试1：AI_TEST
  console.log("\n--- 测试 AI_TEST ---");
  const t1 = await sendMessage({ type: "AI_TEST", data: { config: { provider: "deepseek", apiKey: "sk-test" } } });
  check("AI_TEST 返回 ok", t1 && t1.ok === true);

  // 测试2：AI_PARSE_RESUME
  console.log("\n--- 测试 AI_PARSE_RESUME ---");
  const t2 = await sendMessage({ type: "AI_PARSE_RESUME", data: { text: "张三 13800138000 清华大学", config: { provider: "deepseek", apiKey: "sk-test" } } });
  check("AI_PARSE_RESUME 返回 profile", t2 && t2.profile && t2.profile.name === "张三");
  check("profile.name 正确", t2 && t2.profile.name === "张三");
  check("profile.school 正确", t2 && t2.profile.school === "清华大学");

  // 测试3：AI_FILL
  console.log("\n--- 测试 AI_FILL ---");
  const t3 = await sendMessage({
    type: "AI_FILL",
    data: {
      resume: "姓名：张三\n手机：13800138000",
      config: { provider: "deepseek", apiKey: "sk-test" },
      fields: [
        { tag: "input", type: "text", label: "姓名", placeholder: "", name: "", id: "" },
        { tag: "input", type: "text", label: "手机号", placeholder: "", name: "", id: "" }
      ]
    }
  });
  check("AI_FILL 返回 fills", t3 && Array.isArray(t3.fills) && t3.fills.length === 2);

  // 测试4：未配置 API Key 时的错误处理
  console.log("\n--- 测试错误处理 ---");
  const t4 = await sendMessage({ type: "AI_PARSE_RESUME", data: { text: "测试", config: { provider: "deepseek", apiKey: "" } } });
  check("未配 Key 时返回 error", t4 && typeof t4.error === "string");
  console.log("  错误信息：", t4 && t4.error);

  console.log(`\n========== 结果：${pass} 通过，${fail} 失败 ==========`);
  process.exit(fail > 0 ? 1 : 0);
})();
