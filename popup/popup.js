// ============================================================
// OFFER Like - 扩展弹窗（popup）
// ============================================================

const providerEl = document.getElementById("provider");
const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const endpointEl = document.getElementById("endpoint");
const modelField = document.getElementById("modelField");
const endpointField = document.getElementById("endpointField");
const statusEl = document.getElementById("status");

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.classList.toggle("err", !!isError);
}

// ---------- 身份卡 + 完整度（读 options 页写入的 arfStats） ----------
chrome.storage.local.get(["arfStats"], (data) => {
  const st = data.arfStats || {};
  const name = (st.name || "").trim() || "你的名字";
  const filled = st.filled || 0;
  const total = st.total || 0;
  const pct = total ? Math.round((filled / total) * 100) : 0;

  document.getElementById("ppName").textContent = name;
  document.getElementById("ppAvatar").textContent = name.slice(0, 1) || "你";
  document.getElementById("ppPct").textContent = pct + "%";
  document.getElementById("ppBar").style.width = pct + "%";
  document.getElementById("ppSub").textContent = total
    ? filled + " / " + total + " 项已填 · " + (st.records || 0) + " 条经历"
    : "还没开始填写，打开档案盒试试";
});

// ---------- AI 配置 ----------
providerEl.addEventListener("change", () => OFFERLIKE_AI.switchProvider());
chrome.storage.local.get(["aiConfig"], (data) => OFFERLIKE_AI.loadForm(data.aiConfig || {}));
function getConfig() { return OFFERLIKE_AI.readForm(); }

document.getElementById("saveBtn").addEventListener("click", async () => {
  try {
    const { params, ...config } = OFFERLIKE_AI.resolve(getConfig());
    if (!config.apiKey) throw new Error("请填写 API Key");
    await chrome.storage.local.set({ aiConfig: config });
    OFFERLIKE_AI.loadForm(config);
    setStatus("✓ 已保存");
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById("testBtn").addEventListener("click", async () => {
  const config = getConfig();
  if (!config.apiKey) { setStatus("请先填写 API Key", true); return; }
  setStatus("测试中...");
  try {
    const { endpoint, params: requestParams } = OFFERLIKE_AI.resolve(config);
    const resp = await fetch(endpoint + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestParams, messages: [{ role: "user", content: "回复 OK" }], max_tokens: 32, temperature: 0 })
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      setStatus("✗ HTTP " + resp.status + ": " + t.slice(0, 120), true);
      return;
    }
    setStatus("✓ 连接成功！");
  } catch (e) {
    setStatus("✗ " + (e && e.message ? e.message : e), true);
  }
});

// ---------- 打开档案盒 ----------
document.getElementById("resumeBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
