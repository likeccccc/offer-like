// 所有入口共用同一套服务商、模型和请求参数，避免测试成功却填写失败。
(function () {
  const providers = {
    deepseek: { endpoint: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.7-flash" },
    kimi: { endpoint: "https://api.moonshot.cn/v1", model: "moonshot-v1-32k" },
    doubao: { endpoint: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-pro-32k" },
    custom: { endpoint: "", model: "" }
  };
  function resolve(config = {}) {
    const provider = config.provider || "deepseek";
    const preset = providers[provider];
    if (!preset) throw new Error("请选择有效的 AI 服务商");
    const endpoint = String(config.endpoint || preset.endpoint).trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
    if (!endpoint) throw new Error("请填写接口地址");
    let url;
    try { url = new URL(endpoint); } catch { throw new Error("接口地址格式不正确"); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("请填写不含账号、查询参数的 HTTP(S) 接口地址");
    const qwenHost = /(?:^|\.)(?:dashscope(?:-intl|-us)?|maas)\.aliyuncs\.com$/.test(url.hostname);
    const model = String(config.model || (qwenHost ? providers.qwen.model : preset.model)).trim();
    if (!model) throw new Error("自定义接口必须填写模型名称");
    if (qwenHost && /^deepseek-(chat|reasoner)$/.test(model)) throw new Error("千问接口不能使用 " + model + "，请将模型名称改为 qwen3.7-flash");
    const params = { model };
    if (qwenHost && /^(qwen3[.-]|qwen-(flash|plus|turbo))/.test(model)) params.enable_thinking = false;
    return { provider, apiKey: String(config.apiKey || "").trim(), endpoint, model, params };
  }
  function readForm(doc = document) {
    return { provider: doc.getElementById("provider").value,
      apiKey: doc.getElementById("apiKey").value.trim(),
      model: doc.getElementById("model").value.trim(), endpoint: doc.getElementById("endpoint").value.trim() };
  }
  function loadForm(config = {}, doc = document) {
    const provider = providers[config.provider] ? config.provider : "deepseek";
    let normalized;
    try { normalized = resolve({ ...config, provider }); } catch { normalized = { ...providers[provider], ...config }; }
    doc.getElementById("provider").value = provider;
    doc.getElementById("apiKey").value = config.apiKey || "";
    doc.getElementById("model").value = normalized.model || "";
    doc.getElementById("endpoint").value = normalized.endpoint || "";
  }
  function switchProvider(doc = document) {
    const preset = providers[doc.getElementById("provider").value] || providers.custom;
    // 明确切换服务商时清理上一家的模型和地址；保留用户尚未提交的 Key。
    doc.getElementById("model").value = preset.model;
    doc.getElementById("endpoint").value = preset.endpoint;
  }
  globalThis.OFFERLIKE_AI = { providers, resolve, readForm, loadForm, switchProvider };
})();
