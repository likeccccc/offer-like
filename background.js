// ============================================================
// OFFER Like - 后台脚本
// 职责：接收内容脚本的请求，调用 AI API（DeepSeek 等）
// 为什么放后台？因为浏览器页面有 CORS 限制，后台脚本没有
// ============================================================

// AI 服务商预设（和求职方舟一样，默认 DeepSeek）
importScripts("shared/ai-config.js");

// 通过 CDP（chrome.debugger）派发"真实可信"的鼠标点击
function cdpSleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function realClickCdp(tabId, x, y) {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    console.log("[OFFER Like] CDP attach 成功");
    await cdpSleep(200);
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mousePressed", x: x, y: y, button: "left", buttons: 1, clickCount: 1
    });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mouseReleased", x: x, y: y, button: "left", buttons: 0, clickCount: 1
    });
    await cdpSleep(200);
    await chrome.debugger.detach({ tabId });
    return { ok: true };
  } catch (e) {
    console.log("[OFFER Like] CDP 失败:", e && e.message ? e.message : String(e));
    try { await chrome.debugger.detach({ tabId }); } catch (e2) {}
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

// 带超时的 fetch（防止请求 hang 导致消息端口超时关闭）
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("请求超时（30秒无响应），请检查网络或稍后重试");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AI_FILL") {
    aiFill(msg.data)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true; // 表示异步响应
  }
  if (msg.type === "AI_TEST") {
    aiTest(msg.data)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "REAL_CLICK") {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) { sendResponse({ ok: false, error: "无 tab" }); return true; }
    realClickCdp(tabId, msg.data.x, msg.data.y)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "OPEN_OPTIONS") {
    try { chrome.runtime.openOptionsPage(); } catch (e) {}
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "AI_PARSE_RESUME") {
    aiParseResume(msg.data)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});

// ---------- 核心：让 AI 把简历填到表单字段 ----------
async function aiFill({ resume, fields, config }) {
  const { endpoint, model, params: requestParams } = OFFERLIKE_AI.resolve(config);

  if (!config.apiKey) throw new Error("请先在扩展里配置 API Key");

  // 把表单字段整理成 AI 能看懂的文字
  const fieldList = fields
    .map((f, i) => {
      const label = f.label || f.placeholder || f.name || f.id || "未知字段";
      return `[${i}] 类型=${f.tag}${f.type ? "/" + f.type : ""} 标签="${label}"`;
    })
    .join("\n");

  const systemPrompt =
    "你是专业的简历填写助手。请根据用户提供的简历内容，判断网页表单中每个字段应该填什么值。\n" +
    "只返回 JSON，不要任何其他文字。格式：{\"fills\":[{\"elementIndex\":0,\"value\":\"填的值\"}]}\n" +
    "规则：\n" +
    "1) value 必须严格来自简历内容，简历里没有的信息填空字符串 \"\"；\n" +
    "2) 对于下拉选择框（select），value 填应该选择的选项文字（从简历中提取最接近的）；\n" +
    "3) 日期、时间保持简历里的原格式；\n" +
    "4) 只返回你确定能填的字段，不确定的不要返回。";

  const userMessage =
    `简历内容：\n${resume}\n\n` +
    `网页表单字段：\n${fieldList}\n\n` +
    `请告诉我每个字段应该填什么值。`;

  const resp = await fetchWithTimeout(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...requestParams,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0,
      // DeepSeek 和 Kimi 支持 JSON 模式
      response_format: { type: "json_object" }
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    if (resp.status === 401) throw new Error("API Key 无效，请检查设置");
    if (resp.status === 402) throw new Error("API 账户余额不足");
    if (resp.status === 429) throw new Error("调用太频繁，请稍后再试");
    throw new Error(`AI 请求失败 (HTTP ${resp.status})：${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");

  // 解析 AI 返回的 JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // 有些模型会包一层 ```json ... ```
    const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error("AI 返回格式无法解析");
  }

  const fills = Array.isArray(parsed.fills) ? parsed.fills : [];
  return { fills };
}

// ---------- 测试连接 ----------
async function aiTest({ config }) {
  const { endpoint, model, params: requestParams } = OFFERLIKE_AI.resolve(config);

  if (!config.apiKey) return { ok: false, error: "请先填写 API Key" };

  const resp = await fetchWithTimeout(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...requestParams,
      messages: [{ role: "user", content: "回复 OK 两个字" }],
      max_tokens: 32,
      temperature: 0
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

// ---------- 核心：AI 解析简历 → 结构化字段 ----------
async function aiParseResume({ text, config }) {
  const { endpoint, model, params: requestParams } = OFFERLIKE_AI.resolve(config);

  if (!config.apiKey) throw new Error("请先设置 API Key");
  if (!text || !text.trim()) throw new Error("简历内容为空");

  const fieldSchema = {
    name: "姓名", gender: "性别", birthday: "出生年月", age: "年龄",
    ethnicity: "民族", hometown: "籍贯", politics: "政治面貌", marital: "婚姻状况",
    height: "身高(cm)", weight: "体重(kg)", phone: "手机号", email: "邮箱",
    city: "现居城市", website: "个人主页/GitHub",
    intention: "求职意向(岗位)", expectCity: "期望城市", expectSalary: "期望薪资", availableDate: "到岗时间",
    school: "学校", degree: "学历", major: "专业", eduTime: "就读时间", gpa: "GPA/成绩",
    courses: "主修课程", honors: "荣誉奖项",
    internship: "实习经历", project: "项目经历", campus: "校园/社团经历",
    skills: "专业技能", certificates: "证书", languages: "语言能力", hobbies: "兴趣爱好",
    selfEvaluation: "自我评价"
  };

  const systemPrompt =
    "你是专业的简历解析专家。请从用户的简历文本中提取信息，返回结构化 JSON。\n" +
    "只返回 JSON，不要任何其他文字。\n" +
    "字段清单（提取不到的填空字符串 \"\"）：\n" +
    JSON.stringify(fieldSchema) + "\n" +
    "规则：1) 经历类字段(实习/项目/校园/课程/荣誉/自我评价)保留完整描述；2) 数值和日期保持原格式；3) 简历里没有的信息填空字符串。";

  const userMessage = `请解析以下简历：\n\n${text}`;

  const resp = await fetchWithTimeout(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...requestParams,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    if (resp.status === 401) throw new Error("API Key 无效");
    if (resp.status === 402) throw new Error("API 账户余额不足");
    throw new Error(`AI 请求失败 (HTTP ${resp.status})：${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error("AI 返回格式无法解析");
  }

  return { profile: parsed };
}
