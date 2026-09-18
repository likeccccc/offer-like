// ============================================================
// OFFER Like - 内容脚本（核心）
// 职责：悬浮按钮（可拖动）+ 一键填充
// 简历和 AI Key 都在「工具栏图标 → 管理简历」里配置
// ============================================================
(function () {
  "use strict";

  if (window.__aiResumeFillerLoaded) return;
  window.__aiResumeFillerLoaded = true;

  let panel = null;
  let isOpen = false;
  let assistTarget = null;
  let assistBusy = false;
  document.addEventListener("focusin", rememberAssistTarget, true);
  document.addEventListener("pointerdown", rememberAssistTarget, true);

  function rememberAssistTarget(event) {
    if (assistBusy) return;
    const node = event.target;
    if (!node?.closest || node.closest("#arf-panel,#arf-float-btn")) return;
    const target = node.closest(SEL_CUSTOM) || node.closest("input,textarea,select,[contenteditable='true']");
    if (!target || target.disabled || /^(file|password|hidden|submit|button|reset)$/.test(target.type || "")) return;
    assistTarget = target;
    const hint = panel?.querySelector("#arf-assist-target");
    if (hint) hint.textContent = "填写位置：" + (getLabel(target) || target.placeholder || "已选输入框");
    highlightAssistTarget();
  }

  function assistMatchScore(label, fieldLabel, key, category) {
    const clean = text => String(text || "").replace(/[\s*＊:：]/g, "").replace(/^(请输入|请选择|请填写)/, "");
    const a = clean(label), b = clean(fieldLabel);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if ((LOCAL_KEYS[category] || {})[a] === key) return 95;
    const aliases = { name: ['姓名'], gender:['性别'], email:['邮箱','电子邮箱'], phone:['手机号','手机号码','联系电话'],
      company:['公司','公司名称','单位名称','实习单位','工作单位'], department:['部门','部门名称','所在部门'],
      school:['学校','学校名称','毕业院校'], language:['语种','语言类型','语言种类'], proficiency:['语言水平','掌握程度'] };
    if (aliases[key]?.includes(a)) return 90;
    return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)) ? 60 : 0;
  }

  function highlightAssistTarget() {
    const list = panel?.querySelector("#arf-assist-list");
    if (!list || panel.querySelector("#arf-assist").hidden) return;
    const buttons = Array.from(list.querySelectorAll(".arf-assist-value"));
    buttons.forEach(button => { button.classList.remove("arf-assist-match"); button.removeAttribute("aria-current"); });
    if (!assistTarget?.isConnected) return;
    const label = getLabel(assistTarget) || assistTarget.placeholder || "";
    let category = "", row = null;
    // 优先使用包含当前字段的最小经历区域；结构不明确时保留多个候选供用户选择。
    const sections = Object.keys(LIST_LABELS).map(key => ({key, node:sectionFor(key)}))
      .filter(item => item.node?.contains(assistTarget));
    const section = sections.find(item => !sections.some(other => other.node !== item.node && item.node.contains(other.node)));
    if (section) {
      category = section.key;
      const peers = Array.from(section.node.querySelectorAll("input,textarea,select," + SEL_CUSTOM))
        .filter(node => isVisible(node) && !(node.parentElement?.closest(SEL_CUSTOM)) &&
          (getLabel(node) || node.placeholder || "") === label);
      const index = peers.indexOf(assistTarget);
      if (index >= 0) row = index;
    }
    const scored = buttons.map(button => {
      let score = assistMatchScore(label, button.textContent, button.dataset.key, button.dataset.category);
      if (score && category && button.dataset.category !== category) score = 0;
      if (score && row !== null && Number(button.dataset.row) !== row) score = 0;
      return {button, score};
    });
    const best = Math.max(0, ...scored.map(item => item.score));
    if (!best) return;
    const matches = scored.filter(item => item.score === best);
    matches.forEach(({button}) => {
      button.closest("details").open = true;
      button.classList.add("arf-assist-match");
      button.setAttribute("aria-current", "true");
    });
    // 仅滚动资料列表，避免招聘页面跟着跳动或抢走输入框焦点。
    const box = matches[0].button.getBoundingClientRect();
    const viewport = list.getBoundingClientRect();
    const scale = Number(panel.style.zoom) || 1;
    list.scrollTop += (box.top - viewport.top) / scale - list.clientHeight / 3;
  }

  async function showAssist() {
    const area = panel.querySelector("#arf-assist");
    area.hidden = !area.hidden;
    panel.querySelector("#arf-assist-btn").setAttribute("aria-expanded", String(!area.hidden));
    if (area.hidden) return;
    const list = area.querySelector("#arf-assist-list");
    list.replaceChildren();
    const { profile = {} } = await chrome.storage.local.get("profile");
    const schema = globalThis.OFFERLIKE_PROFILE_SCHEMA;
    const addGroup = (title, fields, item, category = "general", row = -1) => {
      const available = fields.filter(f => ["string", "number"].includes(typeof item?.[f.key]) && String(item[f.key]).trim());
      if (!available.length) return;
      const group = document.createElement("details");
      group.open = title === "个人信息";
      const summary = document.createElement("summary");
      summary.textContent = title;
      group.append(summary);
      const buttons = document.createElement("div");
      buttons.className = "arf-assist-grid";
      available.forEach(field => {
        const value = String(item[field.key]);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "arf-assist-value";
        button.textContent = field.label;
        button.title = "填入" + field.label;
        button.dataset.key = field.key;
        button.dataset.category = category;
        button.dataset.row = String(row);
        button.addEventListener("mousedown", e => e.preventDefault());
        button.addEventListener("click", () => assistFill(value));
        buttons.append(button);
      });
      group.append(buttons);
      list.append(group);
    };
    for (const category of new Set(schema.fixed.map(f => f.category)))
      addGroup(category, schema.fixed.filter(f => f.category === category), profile);
    for (const category of schema.lists) {
      (Array.isArray(profile[category.key]) ? profile[category.key] : []).forEach((item, index) =>
        addGroup(category.label + " · 第 " + (index + 1) + " 条", category.fields, item, category.key, index));
    }
    if (!list.children.length) list.textContent = "暂无已保存资料，请先到管理简历填写。";
    highlightAssistTarget();
  }

  async function assistFill(value) {
    if (assistBusy || panel.querySelector("#arf-fill-btn").disabled) return;
    const target = assistTarget;
    if (!target?.isConnected) { setStatus("请先点击网页中要填写的输入框，再点资料按钮。", true); return; }
    if (target.disabled) { setStatus("这个字段尚未启用，请先完成它前面的选项。", true); return; }
    assistBusy = true;
    const visibility = panel.style.visibility;
    panel.querySelector("#arf-fill-btn").disabled = true;
    try {
      panel.style.visibility = "hidden";
      target.scrollIntoView({block:"center"});
      const kind = detectKind(target);
      const result = await fillElement(target, value, kind);
      const success = result?.success && looksFilled(target, kind, value);
      setStatus(success ? "已填入，请检查页面。" : "未确认填入：" + (result?.error || "页面没有保留该值"), !success);
    } catch (error) { setStatus("辅助填充失败：" + error.message, true); }
    finally { panel.style.visibility = visibility; assistBusy = false; panel.querySelector("#arf-fill-btn").disabled = false; }
  }
  const successfulAddMethods = new Map();
  const aiBatchCache = new Map();
  let aiCacheConfig = "";

  async function mapConcurrent(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  async function waitForChange(check, timeout = 1300) {
    const deadline = Date.now() + timeout;
    do {
      if (check()) return true;
      await sleep(80);
    } while (Date.now() < deadline);
    return !!check();
  }

  // ============================================================
  // 拖拽工具（让元素可以拖动，并区分"拖动"和"点击"）
  // ============================================================
  const initialPixelRatio = window.devicePixelRatio || 1;
  function fitFloatingUI() {
    const scale = initialPixelRatio / (window.devicePixelRatio || 1);
    for (const el of [document.getElementById("arf-float-btn"), panel]) {
      if (!el || el.style.display === "none") continue;
      el.style.zoom = String(scale);
      if (el === panel) {
        el.style.width = Math.min(344, (window.innerWidth - 24) / scale) + "px";
        el.style.maxHeight = Math.max(80, (window.innerHeight - 24) / scale) + "px";
      }
      const rect = el.getBoundingClientRect();
      const position = el.__relativePosition || (el === panel ? {x:1,y:0.12} : {x:1,y:1});
      const maxX = Math.max(12, window.innerWidth - rect.width - 12);
      const maxY = Math.max(12, window.innerHeight - rect.height - 12);
      el.style.left = (12 + position.x * (maxX - 12)) / scale + "px";
      el.style.top = (12 + position.y * (maxY - 12)) / scale + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
  }
  window.addEventListener("resize", fitFloatingUI);

  function makeDraggable(el, handle) {
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // 只响应鼠标左键
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;
      let moved = false;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) moved = true;
        // 拖动超过 3px 才算拖拽，避免误判
        if (moved) {
          const scale = Number(el.style.zoom) || 1;
          el.style.left = Math.max(0, Math.min(window.innerWidth - rect.width, startLeft + dx)) / scale + "px";
          el.style.top = Math.max(0, Math.min(window.innerHeight - rect.height, startTop + dy)) / scale + "px";
          el.style.right = "auto";
          el.style.bottom = "auto";
        }
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        el.__dragged = moved;
        if (moved) {
          const box = el.getBoundingClientRect();
          el.__relativePosition = {
            x: Math.max(0, Math.min(1, (box.left - 12) / Math.max(1, window.innerWidth - box.width - 24))),
            y: Math.max(0, Math.min(1, (box.top - 12) / Math.max(1, window.innerHeight - box.height - 24)))
          };
          fitFloatingUI();
        }
        // 稍后清除拖拽标记
        setTimeout(() => { el.__dragged = false; }, 50);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // ============================================================
  // 悬浮按钮
  // ============================================================
  function init() {
    if (document.getElementById("arf-float-btn") || !document.body) return;
    createButton();
    console.log("[OFFER Like] ✅ 悬浮按钮已注入，位置在页面右下角");
  }

  function createButton() {
    const btn = document.createElement("div");
    btn.id = "arf-float-btn";
    btn.title = "OFFER Like · 点开往网页里填（可拖动）";
    btn.innerHTML =
      '<span class="fab-tab"></span>' +
      '<span class="fab-body"></span>' +
      '<span class="fab-logo"></span>';
    btn.addEventListener("click", () => {
      if (btn.__dragged) return; // 刚拖动完，不触发点击
      togglePanel();
    });
    document.body.appendChild(btn);
    makeDraggable(btn, btn);
    fitFloatingUI();
  }

  // ============================================================
  // 悬浮面板（只有按钮，没有简历输入框）
  // ============================================================
  function togglePanel() {
    if (isOpen) closePanel();
    else openPanel();
  }

  function openPanel() {
    if (!panel) buildPanel();
    panel.style.display = "block"; // 关键：创建后要设为可见
    isOpen = true;
    refreshResumeState();
    fitFloatingUI();
  }

  function closePanel() {
    if (panel) panel.style.display = "none";
    isOpen = false;
  }

  // 打开「个人资料库」——直接开新标签页，不依赖 service worker
  function openManagePage() {
    const url = chrome.runtime.getURL("options/options.html");
    let w = null;
    try { w = window.open(url, "_blank"); } catch (e) {}
    if (!w) {
      // 兜底：造一个 <a> 点一下
      try {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {}
    }
  }

  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "arf-panel";
    panel.innerHTML = `
      <div class="arf-header" id="arf-header">
        <span class="arf-logo"></span>
        <button class="arf-close" id="arf-close">×</button>
      </div>
      <div class="arf-body">
        <div class="arf-state" id="arf-state">
          <span class="dot"></span>
          <div>
            <div class="txt" id="arf-state-txt">读取中…</div>
            <div class="sub" id="arf-state-sub"></div>
          </div>
        </div>
        <button class="arf-fill-btn" id="arf-fill-btn">一键填充本页</button>
        <button class="arf-manage-btn" id="arf-assist-btn" aria-expanded="false">辅助填充</button>
        <section id="arf-assist" hidden>
          <p id="arf-assist-target">先点网页输入框，再点下面的资料。</p>
          <div id="arf-assist-list"></div>
        </section>
        <button class="arf-manage-btn" id="arf-manage-btn">管理简历</button>
        <div class="arf-status" id="arf-status"></div>
        <details class="arf-debug">
          <summary>调试详情 <span class="arf-ver">v3.25</span></summary>
          <pre id="arf-debug-log">（点一键填充后，这里会显示过程日志）</pre>
        </details>
        <div class="arf-tip">简历在「管理简历」里维护好，这里只负责往当前网页的表单里填。</div>
      </div>
    `;
    document.body.appendChild(panel);
    new ResizeObserver(() => fitFloatingUI()).observe(panel);

    // 默认位置：右上角往下一点
    panel.style.left = Math.max(10, window.innerWidth - 344) + "px";
    panel.style.top = "80px";

    panel.querySelector("#arf-close").addEventListener("click", closePanel);
    panel.querySelector("#arf-assist-btn").addEventListener("click", () => showAssist().catch(e => setStatus("读取资料失败：" + e.message, true)));
    panel.querySelector("#arf-fill-btn").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      try { await fillAll(); }
      catch (e) { setStatus("填充失败：" + e.message, true); }
      finally { button.disabled = false; }
    });
    panel.querySelector("#arf-manage-btn").addEventListener("click", openManagePage);

    // 拖拽面板头部
    makeDraggable(panel, panel.querySelector("#arf-header"));
  }

  // 显示简历是否已配置
  function refreshResumeState() {
    chrome.storage.local.get(["resume", "arfStats"], (data) => {
      const el = panel && panel.querySelector("#arf-state");
      const txt = panel && panel.querySelector("#arf-state-txt");
      const sub = panel && panel.querySelector("#arf-state-sub");
      if (!el || !txt) return;
      const hasResume = data.resume && data.resume.trim();
      if (hasResume) {
        const st = data.arfStats || {};
        el.className = "arf-state ok";
        txt.textContent = "简历已就绪";
        sub.textContent =
          (st.name ? st.name + " · " : "") +
          (st.filled || 0) + "/" + (st.total || 0) + " 项已填";
      } else {
        el.className = "arf-state warn";
        txt.textContent = "还没有简历";
        sub.textContent = "请到侧栏「管理简历」里上传或粘贴";
      }
    });
  }

  function setStatus(text, isError) {
    const el = panel && panel.querySelector("#arf-status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("err", !!isError);
  }

  // ============================================================
  // 扫描表单
  // ============================================================
  // ---------- 自定义控件识别 ----------
  const STRUCTURED_PROFILE_SELECT = ".applyform-cell.gender .lxselect,.applyform-cell.high_education .lxselect";
  const STRUCTURED_EDUCATION_DATE = ".applyform-cell.education_begin_time .date-picker-pc,.applyform-cell.education_end_time .date-picker-pc";
  const SEL_SELECT = ".ant-select,.el-select,.ivu-select,.arco-select,.n-select,.semi-select,.t-select,.mtd-select,.phoenix-select,.phoenix-select__input,[role='combobox']," + STRUCTURED_PROFILE_SELECT;
  const SEL_DATE = ".ant-picker,.el-date-editor,.ivu-date-picker,.arco-picker,.n-date-picker,[class*='date-picker'],[class*='mtd-date-picker'],[class*='mtd-picker']," + STRUCTURED_EDUCATION_DATE;
  const SEL_CASCADER = ".ant-cascader,.el-cascader,.ivu-cascader,.arco-cascader,[class*='cascader']";
  const SEL_RADIO = ".phoenix-radio-group,.ant-radio-group,.el-radio-group,.ivu-radio-group,.arco-radio-group,[role='radiogroup']";
  const RADIO_OPTION = "input[type='radio'],[role='radio'],.phoenix-radio-wrapper,.phoenix-radio__wrapper,[class*='phoenix-radio-group__radio'],.ant-radio-wrapper,.el-radio";
  const SEL_CUSTOM = SEL_SELECT + "," + SEL_DATE + "," + SEL_CASCADER + "," + SEL_RADIO;

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return false;
    let node = el;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0" || node.classList.contains("common-unmodeled-layer-hidden")) return false;
      node = node.parentElement;
    }
    return true;
  }

  function detectKind(el) {
    if (el.matches) {
      if (el.matches(SEL_RADIO)) return "radio";
      if (el.matches(SEL_CASCADER)) return "cascader";
      if (el.matches(SEL_DATE)) return "date";
      if (el.matches(SEL_SELECT)) return "select";
    }
    if (el.tagName === "SELECT") return "select";
    if (el.tagName === "TEXTAREA") return "textarea";
    const t = (el.type || "").toLowerCase();
    if (t === "date" || t === "month") return "date";
    if (el.tagName === "INPUT" && /出生日期|出生年月|开始时间|结束时间|毕业时间|入学时间|获奖时间|YYYY|yyyy|年.*月/.test(
      (el.placeholder || "") + " " + getLabel(el))) return "date";
    if (t === "checkbox" || t === "radio") return "choice";
    return "text";
  }

  function hasStructuredEducationControls() {
    return !!document.querySelector(".applyform-cell.high_education .lxselect") &&
      !!document.querySelector(STRUCTURED_EDUCATION_DATE);
  }

  function structuredFieldLabel(el) {
    const cell = el.closest(".applyform-cell");
    if (!cell) return "";
    const classes = Array.from(cell.classList);
    const mapping = {
      gender: "性别", high_education: "学历", education_school: "学校",
      school: "学校", education_begin_time: "开始时间", education_end_time: "结束时间",
      name: "姓名", phone: "联系电话", mobile: "联系电话", email: "邮箱"
    };
    for (const name of classes) if (mapping[name]) return mapping[name];
    const title = cell.querySelector(".label,.title,.applyform-label,[class*='label']");
    return title ? (title.textContent || "").replace(/[＊*：:]/g, "").trim().slice(0, 40) : "";
  }

  // 简历里"多段经历"的分类 → 中文标签（用于找"添加"按钮）
  const LIST_LABELS = {
    education: "教育", work: "工作", internship: "实习",
    project: "项目", award: "竞赛", honor: "荣誉", campus: "校园",
    campusDuty: "在校职务", campusPractice: "在校实践",
    certificate: "证书", language: "外语", family: "家庭",
    patent: "专利", paper: "论文"
  };
  const LIST_WORDS = {
    education: /教育|学历|教育背景/, work: /工作/, internship: /实习/,
    project: /项目/, award: /竞赛|比赛|大赛/, honor: /荣誉|奖项|获奖/, campus: /校园|社团/,
    campusDuty: /在校职务/, campusPractice: /在校实践/,
    certificate: /证书/, language: /外语|语言/, family: /家庭/,
    patent: /专利/, paper: /论文/
  };
  function addButtonFor(key) {
    return findAllAddButtons().find((b) => LIST_WORDS[key].test(b.textContent || ""));
  }
  function sectionFor(key, fields) {
    const btn = addButtonFor(key);
    // 某些结构化档案页的个人信息和教育经历位于同一个大表单内，且只有一个
    // “添加学历”按钮。取同时包含学历和日期的最小祖先，避免混入个人字段。
    if (hasStructuredEducationControls() && key === "education") {
      for (let node = btn && btn.parentElement; node && node !== document.body; node = node.parentElement) {
        const hasDegree = !!node.querySelector(".applyform-cell.high_education");
        const hasDate = !!node.querySelector(STRUCTURED_EDUCATION_DATE);
        if (hasDegree && hasDate) return node;
      }
    }
    // 通用区域定位：从“添加”按钮向上找，返回首个包含至少两个本分类
    // 语义字段的祖先。这样即使整页只有一个添加按钮，也不会扩大到整个表单。
    const sectionWords = {
      education: /学校|院校|学历|专业|入学|毕业|在校/,
      work: /公司|单位|职位|岗位|工作|任职/,
      internship: /公司|单位|实习|岗位|职位/,
      project: /项目|职责|角色/, award: /竞赛|比赛|大赛/, honor: /荣誉|奖项|获奖/,
      campus: /校园|社团|组织|活动/, campusDuty: /职务|任职/,
      campusPractice: /实践|活动/, certificate: /证书|认证/,
      language: /语种|语言|外语/, family: /关系|亲属|家庭/,
      patent: /专利/, paper: /论文|期刊/
    };
    if (btn && fields && sectionWords[key]) {
      for (let node = btn.parentElement; node && node !== document.body; node = node.parentElement) {
        const local = fields.filter((field) => node.contains(field._el));
        const semanticCount = local.filter((field) => sectionWords[key].test(
          (field.label || field.placeholder || "").replace(/[\s*＊:：]/g, "")
        )).length;
        if (local.length >= 2 && semanticCount >= 2) return node;
      }
    }
    let section = null;
    for (let node = btn && btn.parentElement; node && node !== document.body; node = node.parentElement) {
      if (!node.querySelector("input,textarea,select,[contenteditable='true']") && !node.querySelector(SEL_CUSTOM)) continue;
      const other = findAllAddButtons().some((b) => node.contains(b) && !LIST_WORDS[key].test(b.textContent || ""));
      if (other) break;
      section = node;
    }
    return section;
  }
  function recordFields(key, fields, expectedCount) {
    const section = sectionFor(key, fields);
    if (!section) return [];
    return groupRecordFields(key, section, fields, expectedCount);
  }
  function groupRecordFields(key, section, fields, expectedCount) {
    const local = fields.filter((f) => section.contains(f._el)).sort((a, b) =>
      a._el === b._el ? 0 : (a._el.compareDocumentPosition(b._el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (!local.length) return [];
    // 每条经历的名称字段作为锚点；起止时间等重复标签不参与计数。
    const names = {
      education: /^(毕业)?(学校|院校)(名称|全称)?$/, work: /^(公司|单位|企业)(名称)?$/,
      internship: /^(实习)?(公司|单位|企业)(名称)?$/, award: /^(竞赛[／/]?奖项|竞赛|比赛|大赛)(名称)?$/,
      honor: /^(荣誉|奖项|获奖)(名称)?$/,
      project: /^项目名称$/, campus: /^(社团|组织|活动)(名称)?$/,
      campusDuty: /^开始时间$/, campusPractice: /^(实践|实践项目)(名称)?$/,
      certificate: /^(证书|认证)(名称)?$/, language: /^(外语)?(语种|语言)(名称)?$|^外语$/, family: /^姓名$/,
      patent: /^专利名称$/, paper: /^论文(名称|标题)$/
    };
    let anchors = local.filter((f) => {
      const labelMatched = names[key] && names[key].test((f.label || f.placeholder || "").replace(/[\s*＊:：]/g, ""));
      if (labelMatched) return true;
      // 该站的学校 input 没有可靠的 label/placeholder。已确认每一条学历都有
      // `.high_education .lxselect`，因此用“学历”控件作为分条锚点最稳定。
      return hasStructuredEducationControls() && key === "education" &&
        (!!f._el.closest(".applyform-cell.high_education") ||
          !!f._el.closest(".applyform-cell.education_school,.applyform-cell.school"));
    });

    // 名称字段的措辞因招聘系统而异。若标准名称没有命中，就从重复出现的
    // 非描述类标签中选一个作为每条记录的起点，例如“外语语种”“公司全称”。
    if (!anchors.length) {
      const repeated = new Map();
      local.forEach((field) => {
        const label = (field.label || field.placeholder || "").replace(/[\s*＊:：]/g, "");
        if (!label || /^(开始|结束|毕业|入学|获奖)?时间$|描述|内容|职责|备注|附件/.test(label)) return;
        if (!repeated.has(label)) repeated.set(label, []);
        repeated.get(label).push(field);
      });
      const candidate = Array.from(repeated.values())
        .filter((items) => items.length >= 2)
        .sort((a, b) => local.indexOf(a[0]) - local.indexOf(b[0]))[0];
      if (candidate) {
        anchors = candidate;
        dbg("分条「" + LIST_LABELS[key] + "」：使用重复字段“" +
          (candidate[0].label || candidate[0].placeholder) + "”作为条目边界");
      }
    }

    if (!anchors.length) {
      // 没有起始锚点时，尝试用每条记录末尾的稳定字段顺序切分。
      const endings = {
        education: /^(学历|在校)?结束时间$|^毕业时间$/,
        work: /^(工作)?结束时间$/, internship: /^(实习)?结束时间$/,
        project: /^结束时间$|^项目结束时间$/,
        award: /获奖描述|情况描述|奖项描述/, honor: /获奖描述|情况描述|荣誉描述|奖项描述/,
        campus: /^结束时间$|实践描述|职务描述/,
        campusDuty: /^结束时间$|职务描述/,
        campusPractice: /^结束时间$|实践描述/,
        certificate: /有效期|取得时间|获得时间|颁发时间/,
        language: /掌握程度|熟练程度|等级|成绩/,
        family: /关系|联系电话|手机号码/,
        patent: /授权时间|申请时间/,
        paper: /发表时间|发布日期/
      };
      const ending = endings[key];
      let row = 0;
      const entries = local.map((field) => {
        const entry = { field, row };
        const label = (field.label || field.placeholder || "").replace(/[\s*＊:：]/g, "");
        if (ending && ending.test(label)) row++;
        return entry;
      });
      if (row >= 2) {
        dbg("分条「" + LIST_LABELS[key] + "」：按条目末尾字段切分为 " + row + " 条");
        return entries;
      }
      if (expectedCount > 1 && local.length >= expectedCount && local.length % expectedCount === 0) {
        const size = local.length / expectedCount;
        dbg("分条「" + LIST_LABELS[key] + "」：" + local.length + " 个无标签字段按 " + expectedCount + " 条等分");
        return local.map((field, index) => ({ field, row: Math.floor(index / size) }));
      }
      // 最后的容错只把当前区域视为一条，不再中止整页。新增多条后通常会出现
      // 重复标签并在下一次扫描中自动分开；即使仍无法分开，也只使用第一条资料。
      dbg("分条「" + LIST_LABELS[key] + "」：未找到可靠边界，暂按单条处理");
      return local.map((field) => ({ field, row: 0 }));
    }
    const roots = anchors.map((anchor) => {
      let node = anchor._el;
      while (node.parentElement && section.contains(node.parentElement)) {
        const parent = node.parentElement;
        if (anchors.some((other) => other !== anchor && parent.contains(other._el))) break;
        node = parent;
      }
      return node;
    });
    const entries = local.map((field) => {
      const row = roots.findIndex((root) => root.contains(field._el));
      if (row >= 0) return { field, row };
      // DOM 层级不规则时，按文档顺序归入最近的前置锚点，避免整页中止。
      const fieldIndex = local.indexOf(field);
      let sequentialRow = 0;
      anchors.forEach((anchor, index) => { if (local.indexOf(anchor) <= fieldIndex) sequentialRow = index; });
      return { field, row: sequentialRow };
    });
    dbg("分条「" + LIST_LABELS[key] + "」：" + roots.length + " 条，各条字段数=" + roots.map((_, row) => entries.filter((x) => x.row === row).length).join(","));
    return entries;
  }

  // 找出页面上所有"添加/新增"按钮
  function findAllAddButtons() {
    return [].slice.call(document.querySelectorAll("button,a,[role='button'],span,div")).filter((el) => {
      if (!isVisible(el) || el.closest("#arf-panel,#arf-float-btn") || el.disabled || el.getAttribute("aria-disabled") === "true") return false;
      const t = (el.textContent || "").trim().replace(/\s/g, "");
      if (!t || t.length > 16) return false;
      return /^(添加|增加|新增|继续添加|加一)/.test(t) || /^[+＋](?!\d)/.test(t);
    }).filter((el, _, all) => !all.some((child) => child !== el && el.contains(child)))
      .map((el) => el.closest("button,a,[role='button']") || el)
      .filter((el, i, all) => all.indexOf(el) === i);
  }

  // 预展开：按简历里各分类的条数，先点够"添加"，让所有空白行都出现
  async function preExpandRows(profileOverride) {
    const data = profileOverride ? null : await chrome.storage.local.get(["profile"]);
    const profile = profileOverride || data.profile;
    if (!profile) { throw new Error("读不到结构化资料 profile，无法保证经历逐条填写，请先保存个人资料库"); }
    const addBtns = findAllAddButtons();
    dbg("预展开：页面上的添加按钮 =", JSON.stringify(addBtns.map((b) => (b.tagName + ":" + (b.textContent || "").trim().slice(0, 12)))));
    dbg("预展开：资料条数 =", JSON.stringify(Object.fromEntries(Object.keys(LIST_LABELS)
      .filter((key) => Array.isArray(profile[key]) && profile[key].length)
      .map((key) => [key, profile[key].length]))));
    const emptyCategories = Object.keys(LIST_LABELS).filter((key) => addButtonFor(key) &&
      (!Array.isArray(profile[key]) || !profile[key].length) &&
      !(key === "internship" && addButtonFor("internship") === addButtonFor("work") &&
        Array.isArray(profile.work) && profile.work.length));
    if (emptyCategories.length) dbg("预展开：页面有入口但资料为 0 =", emptyCategories.map((key) => LIST_LABELS[key]).join("、"));
    if (!addBtns.length) { dbg("本页无添加经历按钮，跳过预展开"); return; }

    for (const key in LIST_LABELS) {
      const items = profile[key];
      if (!Array.isArray(items) || !items.length) continue;
      const label = LIST_LABELS[key];
      const firstBtn = addButtonFor(key);
      if (!firstBtn) { dbg("预展开：找不到「" + label + "」的按钮"); continue; }
      const existing = recordFields(key, scanFields());
      const rowCount = existing.length ? Math.max(...existing.map((x) => x.row)) + 1 : 0;
      const need = Math.max(0, items.length - rowCount);
      dbg("预展开「" + label + "」：点 " + need + " 次添加（简历有 " + items.length + " 条）");
      for (let i = 0; i < need; i++) {
        // 新增一行后 React 可能重建整段 DOM；每轮重新找按钮，避免继续点已脱离文档的旧节点。
        const btn = addButtonFor(key);
        if (!btn) {
          dbg("  第 " + (i + 1) + " 次添加前按钮已不存在，停止该分类");
          break;
        }
        const count = () => document.querySelectorAll(
          "input,textarea,select,[contenteditable='true']," + SEL_CUSTOM
        ).length;
        const beforeCount = count();
        const preferred = successfulAddMethods.get(key) || successfulAddMethods.get("__page");
        const methods = [preferred, "click", "reactClick", "cdp"].filter((m, i, all) => m && all.indexOf(m) === i);
        let added = false;
        for (const method of methods) {
          if (count() > beforeCount) { added = true; break; }
          const current = addButtonFor(key);
          if (!current) break;
          if (method === "cdp") await realClickCdp(current);
          else await callMain(method, [current]);
          added = await waitForChange(() => count() > beforeCount);
          dbg("  添加方式=" + method + " 字段数 " + beforeCount + " → " + count());
          if (added) {
            successfulAddMethods.set(key, method);
            successfulAddMethods.set("__page", method);
            // 首个输入框出现后，再等字段数量短暂稳定，避免扫描半渲染的新行。
            let previous = count(), stable = 0;
            await waitForChange(() => {
              const currentCount = count();
              stable = currentCount === previous ? stable + 1 : 0;
              previous = currentCount;
              return stable >= 3;
            }, 1300);
            break;
          }
          successfulAddMethods.delete(key);
        }
        if (!added) { dbg("「" + label + "」新增未成功，跳过剩余新增并继续填写"); break; }
      }
    }
  }

  function scanFields() {
    const results = [];
    const seenEls = new Set();   // 按"元素本身"去重（同标签的两个框都要保留！）

    const push = (el, kind) => {
      if (!isVisible(el)) return;
      if (seenEls.has(el)) return;
      seenEls.add(el);
      const label = kind === "radio" && radioOptions(el).some((n) => radioText(n) === "男") && radioOptions(el).some((n) => radioText(n) === "女")
        ? "性别" : getLabel(el);
      const inner = el.tagName === "INPUT" ? el : el.querySelector("input,textarea");
      results.push({
        _el: el,
        index: results.length,
        kind: kind,
        tag: el.tagName.toLowerCase(),
        type: el.type || "",
        label: label,
        placeholder: (el.placeholder || (inner && inner.placeholder) || ""),
        name: el.name || "",
        id: el.id || ""
      });
    };

    // 1) 原生输入（跳过自定义控件内部的 input）
    document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]), textarea, select, [contenteditable="true"]'
    ).forEach((el) => {
      const ph = (el.placeholder || "").toLowerCase();
      if (el.type === "radio") return; // 单选按整组扫描，包括视觉上隐藏的原生 input。
      if (/搜索|查找|search/.test(ph)) return;
      if (el.closest && el.closest(SEL_CUSTOM)) return;
      push(el, detectKind(el));
    });

    // 2) 自定义控件（下拉 / 日期 / 级联）
    document.querySelectorAll(SEL_CUSTOM).forEach((el) => {
      if (!isVisible(el)) return;
      if (el.parentElement && el.parentElement.closest(SEL_CUSTOM)) return; // 只取最外层
      push(el, detectKind(el));
    });

    document.querySelectorAll(RADIO_OPTION).forEach((option) => {
      if (option.closest(SEL_RADIO)) return;
      let group = option.parentElement;
      for (let depth = 0; group && depth < 4; depth++, group = group.parentElement) {
        if (group.querySelectorAll(RADIO_OPTION).length >= 2 && radioOptions(group).length >= 2) {
          push(group, "radio");
          break;
        }
      }
    });

    try {
      const summary = {};
      results.forEach((r) => { summary[r.kind] = (summary[r.kind] || 0) + 1; });
      console.log("[OFFER Like] 扫描到字段:", results.length, summary);
      results.filter((r) => r.kind !== "text" && r.kind !== "textarea")
        .forEach((r) => console.log("   [" + r.index + "] " + r.kind + " · " + (r.label || r.placeholder || "无标签")));
    } catch (e) {}
    return results;
  }

  function getLabel(el) {
    const structured = structuredFieldLabel(el);
    if (structured) return structured;
    const described = el.closest("[fielddes],[_fielddes]");
    if (described) {
      const text = described.getAttribute("fielddes") || described.getAttribute("_fielddes");
      if (text && text.length < 60) return text;
    }
    if (el.matches(".phoenix-select,.phoenix-select__input") || el.querySelector(".phoenix-select__input")) {
      let parent = el.parentElement;
      for (let depth = 0; parent && depth < 7; depth++, parent = parent.parentElement) {
        const labels = Array.from(parent.querySelectorAll("label,[class*='form-item-label'],[class*='formItem-label'],[class*='field-label']"))
          .map((node) => (node.textContent || "").trim()).filter((text) => text && text.length < 40);
        if (labels.length === 1) return labels[0];
        if (labels.length > 1) break;
      }
    }
    if (el.id) {
      const lb = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lb) {
        const t = lb.textContent.trim().replace(/\s+/g, " ");
        if (t) return t.slice(0, 40);
      }
    }
    const wrap = el.closest("label");
    if (wrap) {
      const t = wrap.textContent.trim().replace(/\s+/g, " ");
      if (t && t.length < 60) return t.slice(0, 40);
    }
    if (el.getAttribute("aria-label")) {
      return el.getAttribute("aria-label").slice(0, 40);
    }
    let node = el.parentElement;
    for (let i = 0; i < 3 && node; i++) {
      const prev = node.querySelector("label, .label, .form-label");
      if (prev) {
        const t = prev.textContent.trim().replace(/\s+/g, " ");
        if (t && t.length < 40) return t.slice(0, 40);
      }
      node = node.parentElement;
    }
    const mtdRow = el.closest(".mtd-form-item");
    if (mtdRow) {
      const lb = mtdRow.querySelector(":scope > .mtd-form-item-label,:scope > label,.mtd-form-item-label");
      const text = (lb?.textContent || "").trim().replace(/\s+/g, " ");
      if (text && text.length < 60) return text.slice(0, 40);
    }
    // 自定义控件：往上找表单行的 label
    const row = el.closest(".ant-form-item,.el-form-item,.ivu-form-item,.arco-form-item,.mtd-form-item,.form-item,.field,.form-group,li");
    if (row) {
      const lb = row.querySelector(
        "label,.ant-form-item-label,.el-form-item__label,.ivu-form-item-label,.arco-form-item-label,.item-name,.form-label,.label"
      );
      if (lb) {
        const t = lb.textContent.trim().replace(/\s+/g, " ");
        if (t && t.length < 40) return t.slice(0, 40);
      }
    }
    return "";
  }

  // ============================================================
  // 直接调用 AI 填充（content script 直连 DeepSeek，不经过后台）
  // ============================================================
  async function aiFillDirect({ resume, fields, config, mappingKeys }) {
    const { endpoint, model, params: requestParams } = OFFERLIKE_AI.resolve(config);

    const fieldList = fields
      .map((f, i) => {
        const label = f.label || f.placeholder || f.name || f.id || "未知字段";
        const k = f.kind || "text";
        return `[${i}] 控件=${k} 标签="${label}"` + (f.placeholder ? ` 提示="${f.placeholder}"` : "");
      })
      .join("\n");

    let systemPrompt =
      "你是专业的简历填写助手。请根据用户提供的简历内容，判断网页表单中每个字段应该填什么值。\n" +
      "只返回 JSON。格式：{\"fills\":[{\"elementIndex\":0,\"value\":\"填的值\"}]}\n" +
      "各控件 value 的写法：\n" +
      "· text / textarea：直接是文本内容；\n" +
      "· select（下拉）：填【选项文字】，不要填编号；\n" +
      "· date（日期/月份）：填 YYYY-MM-DD，只有年月时填 YYYY-MM；\n" +
      "· cascader（省市区等级联）：用 / 分隔，如 「福建省/漳州市/芗城区」，有几级写几级；\n" +
      "· choice（单选/复选）：填选项文字。\n" +
      "规则：\n" +
      "1) 【重要】一个字段只填一个值，绝不要把两个字段的内容合并填进同一个框；\n" +
      "2) 用「提示」（placeholder）区分长得像的字段；\n" +
      "3) value 必须严格来自简历内容，简历里没有的信息填空字符串 \"\"；\n" +
      "4) 只返回你确定能填的字段。";
    if (mappingKeys) systemPrompt =
      '你只做表单字段到单条资料属性的映射，不生成填写内容。返回 JSON {"fills":[{"elementIndex":0,"value":"属性名"}]}。' +
      'value 只能是允许的一个属性名或空字符串；不能组合属性、返回实际值或数组下标。' +
      '同一条经历的开始/结束日期分别映射 startTime/endTime，教育对应 enrollTime/graduateTime。' +
      '优先使用标签和提示区分，不明确就省略。允许属性：' + JSON.stringify(mappingKeys);

    const userMessage =
      `简历内容：\n${resume}\n\n` +
      `网页表单字段：\n${fieldList}\n\n` +
      `请告诉我每个字段应该填什么值。`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const resp = await fetch(`${endpoint}/chat/completions`, {
        signal: controller.signal,
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
        const text = await resp.text().catch(() => "");
        if (resp.status === 401) return { error: "API Key 无效，请检查设置" };
        if (resp.status === 402) return { error: "API 账户余额不足" };
        return { error: `AI 请求失败 (HTTP ${resp.status})：${text.slice(0, 200)}` };
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return { error: "AI 返回内容为空" };

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (m) parsed = JSON.parse(m[1]);
        else return { error: "AI 返回格式无法解析" };
      }

      return {
        fills: Array.isArray(parsed.fills) ? parsed.fills : [],
        multiRows: Array.isArray(parsed.multiRows) ? parsed.multiRows : []
      };
    } catch (e) {
      return { error: "AI 调用失败：" + (e && e.message ? e.message : e) };
    } finally { clearTimeout(timer); }
  }

  // ============================================================
  // 主流程：一键填充
  // ============================================================

  // 模板只保存属性名；实际值始终从当前条目取，不把整段经历发给 AI。
  const LOCAL_KEYS = {
    general: { "姓名":"name", "手机号":"phone", "手机号码":"phone", "联系电话":"phone",
      "邮箱":"email", "电子邮箱":"email", "出生日期":"birthday", "出生年月":"birthday",
      "籍贯":"hometown", "生源地":"origin", "最高学历":"highestEducation",
      "毕业时间":"graduateTime", "性别":"gender", "民族":"ethnicity", "政治面貌":"politics" },
    education: { "学校":"school", "学校名称":"school", "毕业院校":"school", "专业":"major",
      "专业名称":"major", "学历":"education", "学位":"degree", "入学时间":"enrollTime",
      "开始时间":"enrollTime", "在校时间":"enrollTime", "毕业时间":"graduateTime", "结束时间":"graduateTime" },
    award: { "竞赛/奖项名称":"name", "奖项名称":"name", "获奖时间":"time",
      "获奖名次":"grade", "获奖情况描述":"description", "获奖描述":"description", "获奖大赛":"name" },
    honor: { "荣誉名称":"name", "奖项名称":"name", "获奖时间":"time",
      "奖励等级":"grade", "荣誉描述":"description", "获奖描述":"description" },
    internship: { "实习公司":"company", "公司名称":"company", "实习内容":"description",
      "单位名称":"company", "职位名称":"position",
      "实习职位":"position", "开始时间":"startTime", "结束时间":"endTime" },
    work: { "公司名称":"company", "工作内容":"description", "职位":"position",
      "开始时间":"startTime", "在职时间":"startTime", "结束时间":"endTime" },
    campus: { "组织名称":"org", "实践描述":"description", "职务描述":"description",
      "开始时间":"startTime", "结束时间":"endTime" },
    campusDuty: { "职务名称":"position", "职位名称":"position", "职务描述":"responsibility",
      "开始时间":"startTime", "结束时间":"endTime" },
    campusPractice: { "实践名称":"org", "活动名称":"org", "实践描述":"description",
      "开始时间":"startTime", "结束时间":"endTime" }
  };
  function awardLooksCompetitive(item) {
    const text = Object.values(item || {}).filter((value) => typeof value === "string").join(" ");
    return /竞赛|比赛|大赛|挑战杯|互联网\+|数学建模|建模|case competition/i.test(text);
  }
  function buildEffectiveProfile(profile) {
    const effective = { ...profile };
    const workButton = addButtonFor("work");
    const internshipButton = addButtonFor("internship");
    if (workButton && workButton === internshipButton) {
      effective.work = (Array.isArray(profile.work) ? profile.work : [])
        .concat(Array.isArray(profile.internship) ? profile.internship : []);
      effective.internship = [];
      if (effective.work.length) dbg("资料合并：页面共用工作/实习入口，共 " + effective.work.length + " 条");
    }
    if ((!Array.isArray(effective.internship) || !effective.internship.length) &&
        Array.isArray(effective.work) && effective.work.length && addButtonFor("internship") && !addButtonFor("work")) {
      effective.internship = effective.work.map((item) => ({ ...item }));
      effective.work = [];
      dbg("资料回退：本页只有实习模块，使用工作经历的 " + effective.internship.length + " 条资料");
    }
    const awards = Array.isArray(profile.award) ? profile.award : [];
    const competitionButton = addButtonFor("award");
    const honorButton = addButtonFor("honor");
    if (competitionButton && honorButton && competitionButton !== honorButton) {
      effective.award = awards.filter(awardLooksCompetitive);
      effective.honor = awards.filter((item) => !awardLooksCompetitive(item));
      dbg("资料拆分：竞赛 " + effective.award.length + " 条，荣誉 " + effective.honor.length + " 条");
    } else if (honorButton && !competitionButton) {
      effective.honor = awards;
      effective.award = [];
    } else {
      effective.honor = [];
    }
    const campus = Array.isArray(effective.campus) ? effective.campus : [];
    effective.campusDuty = campus.filter((item) => item && (item.position || item.responsibility || item.description));
    effective.campusPractice = campus.filter((item) => item && (item.org || item.description));
    if (!campus.length && (addButtonFor("campusDuty") || addButtonFor("campusPractice"))) {
      dbg("资料缺失：页面有在校职务/实践模块，但资料库 campus 为 0 条，本轮不会猜填");
    }
    return effective;
  }
  function templateMetadata(fields) {
    return fields.map((f) => ({ label: f.label || "", placeholder: f.placeholder || "",
      kind: f.kind, tag: f.tag, type: f.type || "" }));
  }
  function scalarKeys(items) {
    return [...new Set(items.flatMap((item) => Object.keys(item || {}).filter((key) =>
      typeof item[key] === "string" || typeof item[key] === "number")))].sort();
  }
  function buildFillTemplates(profile, fields, useExpectedCounts) {
    const rows = [];
    const excluded = new Set();
    for (const key of Object.keys(LIST_LABELS)) {
      const section = sectionFor(key, fields);
      const items = profile[key];
      if (!Array.isArray(items) || !items.length || !section) continue;
      const entries = recordFields(key, fields, useExpectedCounts ? items.length : undefined);
      if (!entries.length) { dbg("跳过「" + LIST_LABELS[key] + "」逐条模式，继续处理页面其他字段"); continue; }
      fields.filter((f) => section.contains(f._el)).forEach((f) => excluded.add(f));
      items.forEach((item, row) => {
        const rowFields = entries.filter((entry) => entry.row === row).map((entry) => entry.field);
        if (rowFields.length) rows.push({ category: key, item, fields: rowFields, keys: scalarKeys(items) });
      });
    }
    const general = fields.filter((f) => !excluded.has(f));
    const fixed = { ...profile };
    const ranks = { "博士": 5, "硕士": 4, "本科": 3, "大专": 2, "专科": 2, "高中": 1 };
    const education = (Array.isArray(profile.education) ? profile.education : [])
      .filter((item) => ranks[item.education]).slice().sort((a, b) => ranks[b.education] - ranks[a.education])[0];
    if (education) {
      for (const [key, source] of Object.entries({ highestEducation: "education", graduateTime: "graduateTime", graduateSchool: "school" })) {
        if (!fixed[key]) fixed[key] = education[source];
      }
    }
    if (general.length) rows.push({ category: "general", item: fixed, fields: general,
      keys: scalarKeys([fixed]).filter((key) => !/honors|award|work|internship|education|project|campus/i.test(key) || key === "highestEducation") });
    for (const row of rows) {
      row.metadata = templateMetadata(row.fields);
      row.signature = JSON.stringify([row.category, row.keys, row.metadata]);
    }
    return rows;
  }
  async function resolveTemplate(row, config) {
    const cached = aiBatchCache.get(row.signature);
    if (cached) return cached;
    const mapping = {};
    const unknown = [];
    row.metadata.forEach((field, index) => {
      const label = (field.label || field.placeholder).replace(/[\s*＊:：]/g, "");
      const key = (LOCAL_KEYS[row.category] || {})[label];
      if (key && row.keys.includes(key)) mapping[index] = key;
      else unknown.push({ field, index });
    });
    if (unknown.length && row.keys.length) {
      const requestStarted = performance.now();
      dbg("AI 模板请求：", row.category, unknown.length, "个待映射字段");
      const result = await aiFillDirect({ resume: "分类：" + row.category + "。仅返回属性映射。",
        fields: unknown.map((x) => x.field), config, mappingKeys: row.keys });
      dbg("AI 模板耗时：", row.category, ((performance.now() - requestStarted) / 1000).toFixed(1), "秒");
      if (result.error) return { error: result.error };
      for (const fill of result.fills) {
        if (!Number.isInteger(fill.elementIndex) || !unknown[fill.elementIndex]) continue;
        if (typeof fill.value !== "string" || !row.keys.includes(fill.value)) continue;
        mapping[unknown[fill.elementIndex].index] = fill.value;
      }
    }
    if (aiBatchCache.size >= 40) aiBatchCache.delete(aiBatchCache.keys().next().value);
    aiBatchCache.set(row.signature, mapping);
    return mapping;
  }
  function materializeTemplate(row, mapping, fields) {
    const fills = [];
    for (const [index, key] of Object.entries(mapping)) {
      const field = row.fields[Number(index)];
      if (!field || !Object.prototype.hasOwnProperty.call(row.item, key)) continue;
      const value = row.item[key];
      if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) continue;
      const elementIndex = fields.indexOf(field);
      if (elementIndex >= 0) fills.push({ elementIndex, value: String(value).trim() });
    }
    return fills;
  }
  function portraitInputLabel(input) {
    const labels = Array.from(input.labels || []).map((label) => label.textContent || "");
    const direct = [input.getAttribute("aria-label"), input.getAttribute("title"), input.name, input.id, ...labels].filter(Boolean).join(" ");
    const photo = /证件照|个人照片|上传照片|本人照片|头像|portrait|headshot|avatar|photo/i;
    const other = /身份证|证件正面|证件反面|护照|简历|证书|idcard|passport|resume|certificate/i;
    if (other.test(direct)) return "";
    if (photo.test(direct)) return direct;
    let parent = input.parentElement;
    for (let i = 0; parent && i < 3; i++, parent = parent.parentElement) {
      if (parent.querySelectorAll('input[type="file"]').length !== 1) break;
      const text = (parent.textContent || "").trim();
      if (text.length > 180) break;
      if (other.test(text)) return "";
      if (photo.test(text)) return text;
    }
    return "";
  }

  function acceptsPortrait(input, photo) {
    const rules = (input.accept || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const extension = photo.type === "image/jpeg" ? [".jpg", ".jpeg"] : [".png"];
    return !rules.length || rules.some((rule) => rule === "image/*" || rule === "*/*" || rule === photo.type || extension.includes(rule));
  }

  function handoffPortraitLocally(input, photo) {
    // 页面桥接未更新或页面改写了 File 构造器时，使用扩展隔离环境的原生文件接口。
    if (!input.isConnected || input.disabled || input.files?.length) return { ok: false, error: "上传框不可用或已有文件" };
    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(photo.dataUrl || "");
    if (!match || match[1] !== photo.type || match[2].length > 400 * 1024) return { ok: false, error: "照片格式无效或超过 300 KB" };
    try {
      const binary = atob(match[2]);
      if (!binary.length || binary.length > 300 * 1024) return { ok: false, error: "照片为空或超过 300 KB" };
      const file = new File([Uint8Array.from(binary, (c) => c.charCodeAt(0))], photo.name, { type: photo.type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files").set.call(input, transfer.files);
      if (!input.files?.length) return { ok: false, error: "浏览器未接收照片" };
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, stage: "dispatched" };
    } catch (error) { return { ok: false, error: error.message }; }
  }

  async function uploadSavedPortrait() {
    try {
      const { portraitPhoto } = await chrome.storage.local.get("portraitPhoto");
      if (!portraitPhoto) return "";
      if (!portraitPhoto.size || portraitPhoto.size > 300 * 1024) return "证件照：文件超过 300 KB 或大小无效，请在资料库重新选择。";
      const candidates = Array.from(document.querySelectorAll('input[type="file"]'))
        .filter((input) => !input.disabled && input.isConnected && portraitInputLabel(input));
      if (!candidates.length) return "证件照：未找到明确的照片上传框，请手动上传。";
      if (candidates.length !== 1) return "证件照：发现多个照片入口，请手动选择上传位置。";
      const input = candidates[0];
      if (input.files?.length) return "证件照：该上传框已有文件，本次保留。";
      if (!acceptsPortrait(input, portraitPhoto)) return "证件照：保存的照片格式不符合网站要求，请手动处理。";
      const scope = input.closest('[class*="upload"],[class*="Upload"],[class*="photo"],[class*="Photo"]') || input.parentElement;
      const messages = () => Array.from(document.querySelectorAll('[role="alert"],.ant-message-error,.phoenix-message--error'))
        .filter(isVisible).map((n) => n.textContent.trim()).concat(scope && isVisible(scope) ? [scope.textContent.trim()] : [])
        .filter((text) => text && text.length < 300 && /上传失败|上传出错|文件过大|大小超|格式不支持|格式错误|超过.*[kKmM][bB]?|upload failed/i.test(text));
      const before = new Set(messages());
      const bridge = await callMain("bridgeInfo", []);
      dbg("证件照桥接版本:", bridge?.version || "旧版或未响应");
      let result = bridge?.photo ? await callMain("setPhotoFile", [input, portraitPhoto]) : handoffPortraitLocally(input, portraitPhoto);
      // 主世界若超时，先看文件是否已设置；没有才回退，避免重复触发 change。
      if (!result && input.files?.length) result = { ok: true, stage: "assigned-without-response" };
      if ((!result || result.code === "FILE_ASSIGNMENT") && !input.files?.length) {
        dbg("证件照：主世界未完成，启用隔离环境回退");
        result = handoffPortraitLocally(input, portraitPhoto);
      }
      if (!result?.ok) {
        const reason = result?.error || "照片交付未返回结果，避免重复上传，请检查页面并刷新重试";
        dbg("证件照交付失败:", result?.code || "NO_RESPONSE", reason);
        return "证件照：" + reason;
      }
      let siteError = "";
      await waitForChange(() => { siteError = messages().find((text) => !before.has(text)) || ""; return !!siteError; }, 1200);
      if (siteError) return "证件照：页面提示“" + siteError + "”";
      return "证件照：文件已交付，尚未确认服务器上传成功；请检查照片预览或完成裁剪。";
    } catch (error) {
      dbg("证件照处理失败:", error.message);
      return "证件照：处理失败，请手动上传。";
    }
  }

  async function fillAll() {
    const started = performance.now();
    clearDebugLog();
    dbg("开始填充，版本 v3.25（下拉弹层识别与候选提交）");
    // 从后台读取简历和 AI 配置（不再从悬浮窗输入）
    const { resume, aiConfig, profile } = await chrome.storage.local.get(["resume", "aiConfig", "profile"]);

    if (!aiConfig || !aiConfig.apiKey) {
      setStatus("请先点工具栏图标，配置 AI Key", true);
      return;
    }
    if (!resume || !resume.trim()) {
      setStatus("请先点工具栏图标 → 管理简历，填写简历", true);
      return;
    }


    if (!profile) { setStatus("请先保存结构化个人资料库", true); return; }
    const effectiveProfile = buildEffectiveProfile(profile);
    const configKey = JSON.stringify(aiConfig);
    if (configKey !== aiCacheConfig) { aiBatchCache.clear(); aiCacheConfig = configKey; }
    let initialRows;
    try { initialRows = buildFillTemplates(effectiveProfile, scanFields(), false); }
    catch (e) { setStatus(e.message, true); return; }
    const unique = (rows) => [...new Map(rows.map((row) => [row.signature, row])).values()];
    const initialTemplates = unique(initialRows);
    const aiStarted = performance.now();
    // 先开始映射请求，再展开经历；这里没有并行操作网页控件。
    const analysis = mapConcurrent(initialTemplates, 2, (row) => resolveTemplate(row, aiConfig))
      .catch((e) => [{ error: e.message }]);
    setStatus("正在分析字段并补足经历...");
    try { await preExpandRows(effectiveProfile); }
    catch (e) { await analysis; dbg("展开失败:", e.message); setStatus(e.message, true); return; }
    dbg("耗时：扫描与展开 " + ((performance.now() - started) / 1000).toFixed(1) + " 秒");
    const fields = scanFields();
    if (!fields.length) { await analysis; setStatus("没有找到可填字段", true); return; }
    try {
      const initialResults = await analysis;
      const failure = initialResults.find((result) => result.error);
      if (failure) throw new Error(failure.error);
      // 新行 DOM 重新绑定；结构相同直接复用，结构不同才补充分析。
      const rows = buildFillTemplates(effectiveProfile, fields, true);
      const templates = unique(rows);
      const results = await mapConcurrent(templates, 2, (row) => resolveTemplate(row, aiConfig));
      const mappings = new Map();
      results.forEach((result, i) => {
        if (result.error) throw new Error(result.error);
        mappings.set(templates[i].signature, result);
      });
      const resp = { fills: rows.flatMap((row) => materializeTemplate(row, mappings.get(row.signature), fields)) };
      dbg("模板复用：", rows.length, "组字段 /", templates.length, "种模板");
      dbg("耗时：分析与展开重叠阶段 " + ((performance.now() - aiStarted) / 1000).toFixed(1) + " 秒");

      const fills = resp.fills || [];
      if (fills.length === 0) {
        setStatus("AI 没识别出可填的内容，请检查简历是否完整", true);
        return;
      }

      // 执行填充（逐个来，自定义控件需要"点开→选"，所以要 await）
      let okCount = 0;
      const notFilled = [];
      const returned = new Set(fills.map((f) => f.elementIndex));
      for (let i = 0; i < fields.length; i++) {
        if (!returned.has(i)) {
          const row = rows.find((r) => r.fields.includes(fields[i]));
          const index = row && row.fields.indexOf(fields[i]);
          const key = row && mappings.get(row.signature)[index];
          const knownKey = row && (LOCAL_KEYS[row.category] || {})[(fields[i].label || fields[i].placeholder || "").replace(/[\s*＊:：]/g, "")];
          dbg(!row ? "该模块无资料:" : key || knownKey ? "资料库字段为空: " + (key || knownKey) : "字段映射未识别:",
            fields[i].label || fields[i].placeholder || "无标签");
        }
      }
      const okEls = [];
      for (const f of fills) {
        const field = fields[f.elementIndex];
        if (!field) continue;
        const name = field.label || field.placeholder || field.kind || "字段";
        try {
          if (!String(f.value || "").trim()) continue;
          if (!field._el.isConnected) { notFilled.push({ name, value: f.value, kind: field.kind }); dbg("字段已重绘，跳过旧节点:", name); continue; }
          const currentValue = readBack(field._el, field.kind);
          if (currentValue && currentValue.trim() === f.value.trim()) { okCount++; okEls.push(field._el); continue; }
          const r = await fillElement(field._el, f.value, field.kind);
          await sleep(60);
          const really = r && r.success && looksFilled(field._el, field.kind, f.value);
          if (really) { okCount++; okEls.push(field._el); }
          else {
            notFilled.push({ name: name, value: f.value, kind: field.kind, reason: r?.error || "读回不匹配" });
            dbg("未填上:", name, "原因=" + (r?.error || "读回不匹配"), "目标=" + f.value, "读回=" + JSON.stringify(readBack(field._el, field.kind)));
          }
        } catch (e) { notFilled.push({ name: name, value: "", kind: "" }); }
      }

      // 只高亮成功填上的
      okEls.forEach((el) => {
        try { el.style.outline = "2px solid #1c7a52"; } catch (e) {}
      });

      // 手动清单：自动填不了的，列出「字段 → 该填的值」
      const manualList = notFilled
        .filter((x) => x.value && x.name)
        .map((x) => x.name + " → " + x.value + (x.reason ? "（" + x.reason + "）" : ""))
        .join("；");
      const omitted = fields.filter((_, i) => !returned.has(i)).map((field) => field.label || field.placeholder || "无标签字段");
      // 最后交付照片，避免裁剪弹窗遮挡尚未填完的字段。
      const photoStatus = await uploadSavedPortrait();
      if (photoStatus) dbg(photoStatus);
      dbg("耗时：本轮总计 " + ((performance.now() - started) / 1000).toFixed(1) + " 秒");

      setStatus(
        "✅ 自动填了 " + okCount + " / " + fills.length + " 个字段。\n" +
        (manualList ? "📋 手动补一下：\n" + manualList : "已处理 AI 返回的字段。") +
        (omitted.length ? "\n未生成填写值（" + omitted.length + " 项）：" + omitted.join("、") : "") +
        (photoStatus ? "\n" + photoStatus : "")
      );
    } catch (e) {
      dbg("填充中止:", e.message);
      setStatus("出错：" + e.message, true);
    }
  }

  // ============================================================
  // 填充单个元素（兼容 React/Vue 受控组件）
  // ============================================================
  // ---------- 填充 ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 调试日志（F12 控制台 + 悬浮窗面板都能看）
  let debugLines = [];
  function dbg() {
    const msg = [].slice.call(arguments).map(function (a) {
      try { return typeof a === "string" ? a : JSON.stringify(a); } catch (e) { return String(a); }
    }).join(" ");
    debugLines.push(msg);
    if (debugLines.length > 80) debugLines.shift();
    try { console.log.apply(console, ["[OFFER Like]"].concat([].slice.call(arguments))); } catch (e) {}
    updateDebugLog();
  }

  function updateDebugLog() {
    const el = panel && panel.querySelector("#arf-debug-log");
    if (el) el.textContent = debugLines.slice(-30).join("\n");
  }

  function clearDebugLog() { debugLines = []; updateDebugLog(); }

  // 读回控件当前真实值（用于校验到底填上没有）
  function readBack(el, kind) {
    try {
      if (el.matches(".mtd-select")) {
        const label = el.querySelector(".mtd-select-filter-label");
        if (!label || /hint|placeholder/.test(label.className || "")) return "";
        return (label.textContent || "").trim();
      }
      if (el.matches(".lxselect")) {
        const value = (el.querySelector(".lxselect-box-span")?.textContent || "").trim();
        return /^请选择/.test(value) ? "" : value;
      }
      if (el.matches(".date-picker-pc")) {
        const value = (el.querySelector(".value-container > .value")?.textContent || "").trim();
        return /^选择时间$/.test(value) ? "" : value;
      }
      if (kind === "radio") return radioOptions(el).filter(radioChecked).map(radioText).join(",");
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return (el.value || "").trim();
      if (el.tagName === "SELECT") return (el.options[el.selectedIndex] || {}).text || "";
      if (el.isContentEditable) return (el.textContent || "").trim();
      // 自定义下拉：读选中项文字
      const sel = el.querySelector(
        ".ant-select-selection-item,.el-select__selected-item,.ivu-select-selected-value," +
        ".arco-select-view-value,.n-base-selection-label,.semi-select-selection-text"
      );
      if (sel && sel.textContent.trim()) return sel.textContent.trim();
      // 自定义日期：读内部 input
      const inp = el.querySelector("input,textarea");
      if (inp && inp.value) return inp.value.trim();
      // 兜底：控件里最长的可见文本
      return (el.innerText || el.textContent || "").trim().slice(0, 40);
    } catch (e) { return ""; }
  }

  // 值是否"看起来填上了"
  function looksFilled(el, kind, value) {
    const got = readBack(el, kind);
    if (!got) return false;
    const v = String(value).trim();
    if (!v) return false;
    const a = got.replace(/\s/g, "");
    const b = v.replace(/\s/g, "");
    if (a === b) return true;
    // Phoenix 日期也由 select 路径进入；按年月日精确比较，不能只匹配年份或前两字。
    if (kind === "date" || /^\d{4}\D+\d{1,2}/.test(b)) {
      const expected = normalizeDate(b, "date");
      const actual = normalizeDate(a, "date");
      if (!expected || !actual) return false;
      const withDay = /\d{4}\D+\d{1,2}\D+\d{1,2}/.test(b);
      return actual.slice(0, withDay ? 10 : 7) === expected.slice(0, withDay ? 10 : 7);
    }
    if (/[省市区县]/.test(b) && !/\d/.test(b)) {
      const area = (text) => text.replace(/[\s/>,，、]+/g, "").replace(/特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|自治州|省|市|区|县/g, "");
      if (area(a) && area(a) === area(b)) return true;
    }
    return a === b || a.includes(b);

  }

  // 跨世界调用：在页面【主世界】里派发事件（页面自己的构造函数，绕开 instanceof 问题）
  let callSeq = 0;
  function callMain(fn, args) {
    return new Promise((resolve) => {
      const id = "ol" + (++callSeq);
      const evt = "offerlike-result-" + id;
      let done = false;
      const listener = (e) => { done = true; window.removeEventListener(evt, listener); resolve(e.detail); };
      window.addEventListener(evt, listener);
      try {
        window.dispatchEvent(new CustomEvent("offerlike-call", { detail: { id: id, fn: fn, args: args || [] } }));
      } catch (e) {}
      setTimeout(() => {
        if (!done) { window.removeEventListener(evt, listener); resolve(null); }
      }, fn === "setPhotoFile" ? 2500 : 700);
    });
  }

  // CDP 真实点击（chrome.debugger，产生 isTrusted=true 的事件）
  async function realClickCdp(el) {
    if (!el) return false;
    const panelVisibility = panel && panel.style.visibility;
    try {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      if (panel) panel.style.visibility = "hidden";
      await sleep(200);
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + Math.min(r.width / 2, 200));
      const y = Math.round(r.top + r.height / 2);
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(el.contains(hit) || hit.contains(el))) {
        dbg("  CDP 未点击：按钮中心被遮挡或不在可视范围", hit ? hit.tagName + "." + hit.className : "无命中元素");
        return false;
      }
      const resp = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ ok: false, error: "后台点击响应超时（5秒）" }), 5000);
        chrome.runtime.sendMessage({ type: "REAL_CLICK", data: { x: x, y: y } }, (r) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: "lastError: " + chrome.runtime.lastError.message });
          } else {
            resolve(r);
          }
        });
      });
      dbg("  CDP 后台响应:", JSON.stringify(resp));
      return !!(resp && resp.ok);
    } catch (e) { dbg("CDP 点击异常:", e.message); return false; }
    finally { if (panel) panel.style.visibility = panelVisibility || ""; }
  }

  // 真实点击（走主世界）
  async function realClick(el) {
    if (!el) return;
    const ok = await callMain("click", [el]);
    if (!ok) {
      try { el.click(); } catch (e) {}
    }
  }

  // 原生 setter 赋值（走主世界）
  async function setNativeValue(input, value) {
    const bridge = callMain("setValue", [input, value]);
    try {
      const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value") && Object.getOwnPropertyDescriptor(proto, "value").set;
      if (setter) setter.call(input, value); else input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {}
    // 主世界正常时通常同步返回；异常页面最多等待很短时间，本地赋值不被其拖慢。
    await Promise.race([bridge, sleep(120)]);
  }

  // 各类框架的下拉面板
  const DROPDOWN_SEL = [
    ".phoenix-date-picker",
    ".common-unmodeled-layer:not(.common-unmodeled-layer-hidden)",
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
    ".ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden)",
    ".ant-picker-dropdown:not(.ant-picker-dropdown-hidden)",
    ".el-select-dropdown", ".el-cascader__dropdown", ".el-picker-panel",
    ".ivu-select-dropdown", ".ivu-picker-panel",
    ".arco-select-popup", ".arco-cascader-popup", ".arco-picker-container",
    ".n-select-menu", ".n-date-panel",
    "[class*='select-dropdown']", "[class*='picker-panel']",
    "[class*='picker-dropdown']", "[class*='cascader-menu']",
    // 自研/其它组件库的弹层
    "[class*='mtd-picker']", "[class*='mtd-calendar']", "[class*='mtd-dropdown']",
    ".mtd-datepicker-pop-wrapper .mtd-datepicker-pop", "[class*='mtd-datepicker']",
    "[class*='mtd-popup']", "[class*='mtd-popover']", "[class*='mtd-select']",
    "[class*='picker-dropdown-container']", "[class*='dropdown-panel']"
  ].join(",");

  const OPTION_SEL = [
    ".list-item-container", ".phoenix-selectList__listItem",
    ".ant-select-item-option", ".ant-cascader-menu-item", ".ant-picker-cell",
    ".el-select-dropdown__item", ".el-cascader-node", ".el-date-table td",
    ".ivu-select-item", ".arco-select-option", ".arco-cascader-node",
    "[role='option']", "li",
    "[class*='picker-cell']", "[class*='calendar-date']", "[class*='calendar-day']",
    "[class*='date-cell']", "[class*='day-cell']", "[class*='mtd-picker-cell']",
    ".mtd-year-panel-list-data", ".mtd-month-panel-list-data"
  ].join(",");

  function findDropdown() {
    const raw = [].slice.call(document.querySelectorAll(DROPDOWN_SEL)).filter(isVisible);
    const good = raw.filter((el) => {
      const cls = el.className || "";
      // 图标 / 清除按钮 / 遮罩 一律排除
      if (/icon|clear|close|arrow|caret|suffix|prefix|mask|backdrop|loading|spin/i.test(cls)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 90 || r.height < 50) return false;
      if (el.querySelector(OPTION_SEL)) return true;
      if (el.children.length >= 2 && /dropdown|panel|popup|picker|calendar|menu/i.test(cls)) return true;
      return false;
    });
    if (raw.length && !good.length) {
      dbg("  [候选都被过滤了]", JSON.stringify(raw.slice(0, 8).map((e) => {
        const r = e.getBoundingClientRect();
        return (e.className || e.tagName).toString().slice(0, 60) + " " + Math.round(r.width) + "x" + Math.round(r.height);
      })));
    }
    return good.length ? good[good.length - 1] : null;
  }

  function matchOption(dd, value) {
    const v = String(value).trim();
    if (!v) return null;
    const opts = [].slice.call(dd.querySelectorAll(OPTION_SEL)).filter(isVisible);
    let hit = opts.filter((o) => o.textContent.trim() === v)[0];
    if (!hit) {
      hit = opts.filter((o) => {
        const t = o.textContent.trim();
        return t && (t.indexOf(v) >= 0 || v.indexOf(t) >= 0);
      })[0];
    }
    return hit || null;
  }

  async function fillStructuredSelect(el, value) {
    if (looksFilled(el, "select", value)) return { success: true, filled: readBack(el, "select") };
    const trigger = el.querySelector(".lxselect-box");
    if (!trigger) return { success: false, error: "下拉缺少触发区域" };
    await realClick(trigger);
    const opened = await waitForChange(() => {
      const panel = el.querySelector(".lxselect-panel");
      return !!panel && isVisible(panel) && panel.querySelectorAll("li").length > 0;
    }, 1000);
    const panel = el.querySelector(".lxselect-panel");
    if (!opened || !panel) return { success: false, error: "下拉未展开" };
    const wanted = String(value).trim();
    const options = Array.from(panel.querySelectorAll("li")).filter(isVisible);
    const option = options.find((node) => node.textContent.trim() === wanted) ||
      options.find((node) => node.textContent.trim().includes(wanted) || wanted.includes(node.textContent.trim()));
    if (!option) return { success: false, error: "下拉无匹配项" };
    await realClick(option);
    const success = await waitForChange(() => looksFilled(el, "select", value), 1200);
    return { success, filled: readBack(el, "select"), error: success ? undefined : "下拉点击后未落值" };
  }

  function structuredMonth(value) {
    const match = String(value).match(/(\d{4})\D+(\d{1,2})/);
    const month = match && Number(match[2]);
    return match && month >= 1 && month <= 12 ? { year: match[1], month } : null;
  }

  async function fillStructuredMonth(el, value) {
    if (looksFilled(el, "date", value)) return { success: true, filled: readBack(el, "date") };
    const target = structuredMonth(value);
    const trigger = el.querySelector(".value-container");
    if (!target || !trigger) return { success: false, error: "教育日期无法识别" };
    const options = () => Array.from(el.querySelectorAll(".panel-container .options")).filter(isVisible);
    await realClick(trigger);
    if (!await waitForChange(() => options().length > 0, 1000)) return { success: false, error: "日期面板未展开" };
    let yearSelected = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const current = options();
      const yearNode = current.find((node) => node.textContent.trim() === target.year);
      if (yearNode) {
        await realClick(yearNode.querySelector(".text") || yearNode);
        yearSelected = true;
        break;
      }
      const years = current.map((node) => Number(node.textContent.trim())).filter((year) => year >= 1900 && year <= 2100);
      if (!years.length) break;
      // 该站按钮命名与视觉方向相反，保持其组件实际行为。
      const button = Number(target.year) < Math.min(...years)
        ? el.querySelector(".panel-container .next-btn.show,.panel-container .next-btn")
        : Number(target.year) > Math.max(...years)
          ? el.querySelector(".panel-container .prev-btn.show,.panel-container .prev-btn") : null;
      if (!button || !isVisible(button)) break;
      const before = years.join(",");
      await realClick(button);
      if (!await waitForChange(() => options().map((node) => Number(node.textContent.trim())).filter(Number.isFinite).join(",") !== before, 600)) break;
    }
    if (!yearSelected) return { success: false, error: "年份未匹配" };
    if (!await waitForChange(() => options().some((node) => Number((node.textContent.match(/\d{1,2}/) || [])[0]) === target.month), 700)) {
      return { success: false, error: "月份列表未出现" };
    }
    const monthNode = options().find((node) => Number((node.textContent.match(/\d{1,2}/) || [])[0]) === target.month);
    await realClick(monthNode.querySelector(".text") || monthNode);
    const success = await waitForChange(() => looksFilled(el, "date", value), 1200);
    return { success, filled: readBack(el, "date"), error: success ? undefined : "教育日期未落值" };
  }

  async function fillMtdSelect(el, value) {
    if (el.matches(".mtd-select-disabled") || el.getAttribute("aria-disabled") === "true")
      return { success: false, error: "下拉已禁用" };
    const wanted = String(value).trim();
    const popup = () => {
      const box = el.getBoundingClientRect();
      return Array.from(document.querySelectorAll(".mtd-select-popup-wrapper .mtd-select-popup"))
        .filter(node => isVisible(node) && !/leave-active|leave-to/.test(node.className || ""))
        .sort((a, b) => {
          const distance = node => { const r = node.getBoundingClientRect(); return Math.hypot(r.left-box.left, r.top-box.bottom); };
          return distance(a)-distance(b);
        })[0] || null;
    };
    const candidates = () => Array.from(popup()?.querySelectorAll(".mtd-select-item") || [])
      .filter(node => isVisible(node) && !/disabled/.test(node.className || ""));
    const trigger = el.querySelector(".mtd-select-filter") || el;
    await realClick(trigger);
    if (!await waitForChange(() => !!popup(), 500)) {
      await realClickCdp(trigger);
    }
    const input = el.querySelector("input");
    const searchable = /学校|学院|专业|公司|工作单位|实习单位|企业/.test(getLabel(el)) && !/排名/.test(getLabel(el));
    if (searchable && input && !input.readOnly && !input.disabled) {
      await setNativeValue(input, wanted);
      await sleep(250);
    }
    const exact = () => candidates().find(node => node.textContent.trim() === wanted);
    if (!await waitForChange(() => !!exact(), searchable ? 2600 : 1000)) {
      dbg("下拉未匹配，候选项:", candidates().slice(0, 20).map(node => node.textContent.trim()));
      await callMain("pressKey", [input || trigger, "Escape"]);
      return { success: false, error: "没有精确匹配的下拉选项" };
    }
    const option = exact();
    await realClick(option);
    if (!await waitForChange(() => readBack(el, "select") === wanted, 450) && option.isConnected && isVisible(option))
      await realClickCdp(option);
    const success = await waitForChange(() => readBack(el, "select") === wanted, 700);
    if (success) await sleep(180);
    return { success, error: success ? undefined : "候选已点击，但未确认选中" };
  }

  async function fillCustomSelect(el, value) {
    if (el.matches(".mtd-select")) return fillMtdSelect(el, value);
    if (el.matches(".lxselect")) return fillStructuredSelect(el, value);
    const phoenix = el.matches(".phoenix-select,.phoenix-select__input") || !!el.querySelector(".phoenix-select__input");
    if (phoenix) closePhoenixPanel(el);
    const dropdown = () => {
      if (!phoenix) return findDropdown();
      const dateValue = /^\d{4}\D+\d{1,2}/.test(String(value));
      const candidates = Array.from(document.querySelectorAll(dateValue ? ".phoenix-date-picker" : ".common-unmodeled-layer"))
        .filter(isVisible).filter((node) => dateValue || !!node.querySelector(".area-selector-container,.area-data-container,.constant-main-selector-container,.list-data-container,.phoenix-selectList"));
      const box = el.getBoundingClientRect();
      const distance = (node) => {
        const r = node.getBoundingClientRect();
        return Math.abs(r.left - box.left) + Math.min(Math.abs(r.top - box.bottom), Math.abs(r.bottom - box.top));
      };
      return candidates.sort((a, b) => distance(a) - distance(b))[0] || null;
    };
    dbg("下拉填充:", value, el.className || el.tagName);
    // 触发点优先级：Ant 的 .ant-select-selector（onMouseDown 在这上面）> 内部 input > 外层
    const targets = [];
    const selector = el.querySelector(".ant-select-selector, .ant-cascader-input, .el-select__wrapper, .ivu-select-selection");
    if (selector) targets.push(selector);
    const inner = el.tagName === "INPUT" ? el : el.querySelector("input");
    if (inner) targets.push(inner);
    targets.push(el);
    // 去重
    const uniq = [];
    targets.forEach((t) => { if (t && uniq.indexOf(t) < 0) uniq.push(t); });

    let dd = null;
    for (let i = 0; i < uniq.length; i++) {
      const t = uniq[i];
      await realClick(t);
      await waitForChange(() => !!dropdown(), 450);
      dd = dropdown();
      dbg("  点#" + (i + 1) + "(" + (t.className || t.tagName).toString().slice(0, 45) + "):", dd ? dd.className : "无");
      if (dd) break;
    }
    // 点击都打不开 → 用键盘（focus 后按 ↓ 打开下拉）
    if (!dd) {
      const inp = el.querySelector("input") || inner;
      if (inp) {
        dbg("  点击无效，试键盘打开…");
        await callMain("focus", [inp]);
        await sleep(150);
        await callMain("pressKey", [inp, "ArrowDown"]);
        await waitForChange(() => !!dropdown(), 450);
        dd = dropdown();
        dbg("  键盘后:", dd ? dd.className : "无");
      }
    }
    // 终极手段：直接调用 React 的 onMouseDown/onClick
    if (!dd) {
      dbg("  再试 React 处理器…");
      await callMain("reactClick", [el]);
      await waitForChange(() => !!dropdown(), 450);
      dd = dropdown();
      dbg("  React 处理器后:", dd ? dd.className : "无");
    }
    if (!dd) {
      dbg("  试 CDP 真实点击…");
      const cd = await realClickCdp(uniq[0] || el);
      await waitForChange(() => !!dropdown(), 600);
      dd = dropdown();
      dbg("  CDP 后(" + (cd ? "已点" : "失败") + "):", dd ? dd.className : "无");
    }
    if (!dd) {
      dbg("React 内部:", await callMain("diagnose", [el]));
      dbg("❌ 下拉没展开（全部方式都失败）");
      return { success: false, error: "下拉没展开" };
    }

    if (el.matches(".phoenix-select,.phoenix-select__input") || el.querySelector(".phoenix-select__input")) {
      return fillPhoenixPanel(el, dd, value);
    }
    const opt = matchOption(dd, value);
    if (!opt) {
      const texts = [].slice.call(dd.querySelectorAll(OPTION_SEL)).filter(isVisible).slice(0, 20).map((o) => o.textContent.trim());
      dbg("❌ 没匹配到「" + value + "」，面板里的选项:", texts);
      await realClick(document.body);
      return { success: false, error: "没有匹配选项" };
    }
    dbg("点击选项:", opt.textContent.trim());
    await realClick(opt);
    await sleep(180);
    if (!looksFilled(el, "select", value) && opt.matches(".list-item-container,.phoenix-selectList__listItem")) {
      await callMain("phoenixChoose", [opt]);
      await sleep(200);
    }

    // 校验；没生效就试试点选项内部的文字节点
    if (!looksFilled(el, "select", value)) {
      const inner = opt.firstElementChild || opt;
      dbg("第一次点击没生效，试内部节点…");
      await realClick(inner);
      await sleep(220);
    }

    const got = readBack(el, "select");
    if (looksFilled(el, "select", value)) {
      dbg("✅ 已选中:", got);
      return { success: true, filled: got || value };
    }
    dbg("❌ 点了但控件没接收，读回值:", JSON.stringify(got));
    return { success: false, error: "点了但没生效（控件没提交）" };
  }

  function closePhoenixPanel(el) {
    const input = el.matches("input") ? el : el.querySelector("input");
    if (input) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
      input.blur();
    }
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.body.click();
  }

  async function fillPhoenixPanel(el, overlay, value) {
    // 所有查询限定在本次打开的面板，禁止从整个页面借用残留日历或确认按钮。
    let root = overlay;
    const host = overlay.parentElement;
    const visible = (selector, scope = root) => Array.from(scope.querySelectorAll(selector)).filter(isVisible);
    const refresh = () => {
      if (!root.isConnected && host && host.isConnected) {
        const candidates = Array.from(host.querySelectorAll(".phoenix-date-picker,.common-unmodeled-layer")).filter(isVisible);
        if (candidates.length === 1) root = candidates[0];
      }
      return root;
    };
    // 日历单元格直接原生 click，避免 mousedown 引起重绘后继续点击旧节点。
    const press = async (node) => {
      if (!node || !node.isConnected) return false;
      node.click();
      await sleep(40);
      refresh();
      return true;
    };
    const calendar = root.matches(".phoenix-date-picker") || !!root.querySelector(".phoenix-date-picker");
    const fail = (error) => ({ success: false, error });
    try {
      if (calendar) {
        dbg("Phoenix：日期面板");
        const date = normalizeDate(value, "date");
        if (!date) return fail("日期无法识别");
        const [year, month, day] = date.split("-").map(Number);
        const hasDay = /\d{4}\D+\d{1,2}\D+\d{1,2}/.test(String(value));
        const yearSel = '[class^="phoenix-calendar-year-panel-year"]';
        const monthSel = '[class^="phoenix-calendar-month-panel-month"]';
        const yearNodes = () => visible(yearSel).filter((n) =>
          /^\d{4}$/.test(n.textContent.trim()) &&
          !/disabled|last-decade|next-decade/.test(n.className + " " + (n.parentElement?.className || "")));
        const monthNames = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
        const months = () => visible(monthSel).filter((n) => /^(\d{1,2}|\d{1,2}月|[一二三四五六七八九十]+月)$/.test(n.textContent.trim()));
        await press(visible('[class^="phoenix-calendar-month-panel-year-select"],.phoenix-calendar-year-select')[0]);
        let selected = false;
        for (let step = 0; step < 12; step++) {
          refresh();
          const years = yearNodes();
          const target = years.find((n) => Number(n.textContent.trim()) === year);
          if (target) {
            await press(target);
            // 某些 Phoenix 版本保留年份 DOM；用月份面板出现判断，不能等待年份节点消失。
            selected = await waitForChange(() => { refresh(); return months().length > 0; }, 450);
            if (!selected) {
              await press(visible(".phoenix-calendar-month-select")[0]);
              selected = await waitForChange(() => { refresh(); return months().length > 0; }, 450);
            }
            break; // 已找到目标年时绝不能继续翻十年、来回循环。
          }
          const numbers = years.map((n) => Number(n.textContent.trim()));
          if (!numbers.length) break;
          const direction = year < Math.min(...numbers) ? "prev" : year > Math.max(...numbers) ? "next" : null;
          if (!direction) break;
          const before = numbers.join(",");
          if (!await press(visible('[class*="phoenix-calendar-year-panel-' + direction + '-decade-btn"]')[0])) break;
          if (!await waitForChange(() => {
            refresh();
            const after = yearNodes().map((n) => Number(n.textContent.trim())).join(",");
            return !!after && after !== before;
          }, 450)) break;
        }
        if (!selected) return fail("年份选择未进入月份面板，已停止重试");
        const aliases = [String(month), String(month).padStart(2, "0"), month + "月", String(month).padStart(2, "0") + "月", monthNames[month - 1]];
        if (!await press(months().find((n) => aliases.includes(n.textContent.trim())))) return fail("月份未匹配");
        if (hasDay && !looksFilled(el, "date", value)) {
          const days = visible('[class*="phoenix-calendar-date"]').filter((n) =>
            n.textContent.trim() === String(day) &&
            !/disabled|last-month|next-month|prev-month/.test(n.className + " " + (n.parentElement?.className || "")));
          const exact = days.find((n) => (n.getAttribute("title") || n.parentElement?.getAttribute("title")) === date);
          if (!await press(exact || (days.length === 1 ? days[0] : null))) return fail("日期候选不唯一或未匹配");
        }
      } else if (root.querySelector(".area-selector-container,.area-data-container")) {
        dbg("Phoenix：地区面板");
        let remaining = String(value).replace(/[\/>,，、\s]+/g, "");
        const suffix = /(?:特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|自治州|省|市|区|县)$/;
        const normalizeArea = (text) => text.replace(/\s/g, "").replace(suffix, "");
        for (let level = 0; remaining && level < 4; level++) {
          refresh();
          const nodes = visible(".area-item-container");
          const matches = nodes.map((node) => {
            const label = (node.querySelector(".area-text-label") || node.querySelector(".area-item-name") || node).textContent.replace(/\s/g, "");
            const short = normalizeArea(label);
            let length = remaining.startsWith(label) ? label.length : short && remaining.startsWith(short) ? short.length : 0;
            if (length && length === short.length) {
              const extra = remaining.slice(length).match(/^(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|自治州|省|市|区|县)/);
              if (extra) length += extra[0].length;
            }
            return { node, length };
          }).filter((x) => x.length).sort((a, b) => b.length - a.length);
          if (!matches.length || (matches[1] && matches[0].length === matches[1].length)) {
            dbg("地区匹配失败：剩余=", remaining, "可选项=", nodes.slice(0, 15).map((n) => (n.querySelector(".area-text-label") || n).textContent.trim()));
            return fail("地区未唯一匹配");
          }
          const { node, length } = matches[0];
          remaining = remaining.slice(length);
          const snapshot = () => visible(".area-item-container,.phoenix-breadcrumb-text").map((n) => n.textContent).join("|");
          const before = snapshot();
          if (!await callMain("phoenixChoose", [node, !remaining])) await press(node);
          if (remaining && !await waitForChange(() => {
            refresh(); return snapshot() !== before;
          }, 600)) return fail("地区下一级未展开");
        }
        if (remaining) return fail("地区层级未完整匹配");
      } else {
        dbg("Phoenix：列表面板");
        const option = matchOption(root, value);
        if (!option) return fail("Phoenix 无匹配选项");
        if (!await callMain("phoenixChoose", [option, true])) await press(option);
      }
      refresh();
      // 确认区可能是日历的兄弟节点，但必须仍属于同一个弹层。
      const outer = root.closest?.(".common-unmodeled-layer");
      const confirmRoot = outer && isVisible(outer) ? outer : root;
      const confirms = visible(".phoenix-button__wraper--primary", confirmRoot);
      const confirm = confirms.find((n) => /确定|确认|完成|OK/i.test(n.textContent)) || (confirms.length === 1 ? confirms[0] : null);
      if (confirm) await press(confirm);
      const success = await waitForChange(() => looksFilled(el, calendar ? "date" : "select", value), 600);
      const got = readBack(el, "select");
      dbg("Phoenix 提交后:", success ? "成功" : "未确认", got);
      if (calendar && !success && !/\d{4}\D+\d{1,2}\D+\d{1,2}/.test(String(value))) {
        const days = visible('[class*="phoenix-calendar-date"]').filter((n) => /^\d{1,2}$/.test(n.textContent.trim()));
        if (days.length) return fail("该控件要求具体日期，资料仅有年月；请补充毕业日后重试");
      }
      return { success, filled: got, error: success ? undefined : "提交后读回不匹配" };
    } finally {
      closePhoenixPanel(el);
    }
  }

  function normalizeDate(value, type) {
    const s = String(value).trim();
    let y, m, d;
    let mm = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (mm) { y = mm[1]; m = mm[2]; d = mm[3]; }
    else {
      mm = s.match(/(\d{4})\D+(\d{1,2})/);
      if (mm) { y = mm[1]; m = mm[2]; d = "01"; }
      else { mm = s.match(/(\d{4})/); if (mm) { y = mm[1]; m = "01"; d = "01"; } }
    }
    if (!y) return null;
    m = String(m).padStart(2, "0");
    d = String(d).padStart(2, "0");
    if (type === "month") return y + "-" + m;
    return y + "-" + m + "-" + d;
  }

  async function fillMonthPanel(input, value) {
    const target = structuredMonth(value);
    if (!target) return { success: false, error: "年月无法识别" };
    await realClick(input);
    let panel = null;
    const panelSelector = ".mtd-datepicker-pop-wrapper .mtd-datepicker-pop";
    if (!await waitForChange(() => {
      const panels = Array.from(document.querySelectorAll(panelSelector)).filter(isVisible);
      panel = panels[panels.length - 1] || null;
      return !!panel;
    }, 1400)) return { success: false, error: "年月面板未展开" };

    const root = () => panel.querySelector(".mtd-month-calendar-content.active") || panel;
    const visible = (selector) => Array.from(root().querySelectorAll(selector)).filter(isVisible);
    let years = visible(".mtd-year-panel-list-data");
    if (!years.length) {
      const trigger = root().querySelector(".mtd-month-calendar-year-btn");
      if (trigger) await realClick(trigger);
      await waitForChange(() => visible(".mtd-year-panel-list-data").length > 0, 700);
      years = visible(".mtd-year-panel-list-data");
    }
    let yearSelected = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      years = visible(".mtd-year-panel-list-data");
      const hit = years.find((node) => (node.textContent.match(/\d{4}/) || [])[0] === target.year);
      if (hit) { await realClick(hit); yearSelected = true; break; }
      const nums = years.map((node) => Number((node.textContent.match(/\d{4}/) || [])[0])).filter(Number.isFinite);
      const rangeText = (root().querySelector(".mtd-month-calendar-year-header-range")?.textContent || "");
      const range = (rangeText.match(/\d{4}/g) || []).map(Number);
      const low = nums.length ? Math.min(...nums) : range[0];
      const high = nums.length ? Math.max(...nums) : range[range.length - 1];
      const switcher = Number(target.year) < low ? root().querySelector(".left-switcher")
        : Number(target.year) > high ? root().querySelector(".right-switcher") : null;
      if (!switcher) break;
      const before = years.map((node) => node.textContent.trim()).join("|") + rangeText;
      await realClick(switcher);
      if (!await waitForChange(() => {
        const now = visible(".mtd-year-panel-list-data").map((node) => node.textContent.trim()).join("|") +
          (root().querySelector(".mtd-month-calendar-year-header-range")?.textContent || "");
        return now !== before;
      }, 700)) break;
    }
    if (!yearSelected) return { success: false, error: "年份未匹配" };

    if (!await waitForChange(() => visible(".mtd-month-panel-list-data").length > 0, 700))
      return { success: false, error: "月份列表未出现" };
    const cnMonths = { "一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,"十一":11,"十二":12 };
    const monthValue = (node) => {
      const text = node.textContent.trim().replace(/月份?|月/g, "");
      const number = Number((text.match(/\d{1,2}/) || [])[0]);
      return number || cnMonths[text] || 0;
    };
    const month = visible(".mtd-month-panel-list-data").find((node) => monthValue(node) === target.month);
    if (!month) return { success: false, error: "月份未匹配" };
    await realClick(month);
    const success = await waitForChange(() => looksFilled(input, "date", value), 1100);
    return { success, filled: readBack(input, "date"), error: success ? undefined : "年月点击后未落值" };
  }

  // 把日期面板翻到目标年月（Ant / Element / iView / Arco 通用）
  async function navDatePanel(dd, target) {
    const mm = target.match(/^(\d{4})-(\d{2})/);
    if (!mm) return;
    const ty = Number(mm[1]), tm = Number(mm[2]);
    const HEAD = ".ant-picker-header-view,.el-date-picker__header-label,.ivu-picker-panel-content-header-label,.arco-picker-header-value";
    const P_Y = ".ant-picker-header-super-prev-btn,.el-picker-panel__icon-btn.d-arrow-left,.ivu-picker-panel-icon-btn-previous-year,.arco-picker-header-super-prev-btn";
    const N_Y = ".ant-picker-header-super-next-btn,.el-picker-panel__icon-btn.d-arrow-right,.ivu-picker-panel-icon-btn-next-year,.arco-picker-header-super-next-btn";
    const P_M = ".ant-picker-header-prev-btn,.el-picker-panel__icon-btn.arrow-left,.ivu-picker-panel-icon-btn-previous-month,.arco-picker-header-prev-btn";
    const N_M = ".ant-picker-header-next-btn,.el-picker-panel__icon-btn.arrow-right,.ivu-picker-panel-icon-btn-next-month,.arco-picker-header-next-btn";
    const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

    const readYM = () => {
      const h = dd.querySelector(HEAD);
      if (!h) return null;
      const t = h.textContent || "";
      const y = Number((t.match(/(\d{4})/) || [])[1]);
      let m = Number((t.match(/(\d{1,2})\s*月/) || [])[1]);
      if (!m) {
        const en = t.toLowerCase().match(/[a-z]{3}/);
        if (en && MON[en[0]]) m = MON[en[0]];
      }
      return y ? { y: y, m: m || null } : null;
    };

    // 先翻年
    for (let i = 0; i < 60; i++) {
      const cur = readYM();
      if (!cur || cur.y === ty) break;
      const btn = dd.querySelector(cur.y > ty ? P_Y : N_Y);
      if (!btn) break;
      await realClick(btn);
      await sleep(150);
    }
    // 再翻月
    for (let i = 0; i < 24; i++) {
      const cur = readYM();
      if (!cur || cur.m === null || cur.m === tm) break;
      const btn = dd.querySelector(cur.m > tm ? P_M : N_M);
      if (!btn) break;
      await realClick(btn);
      await sleep(150);
    }
    dbg("日期面板翻到:", JSON.stringify(readYM()), "目标:", ty + "-" + tm);
  }

  async function fillDate(el, value) {
    const input = el.tagName === "INPUT" ? el : el.querySelector("input");
    if (!input) { dbg("❌ 日期控件里找不到 input"); return { success: false, error: "找不到输入框" }; }
    const type = (input.type || "").toLowerCase();
    const v = normalizeDate(value, type);
    if (!v) { dbg("❌ 日期无法识别:", value); return { success: false, error: "日期无法识别" }; }
    if (el.matches?.(".mtd-date-picker") || el.closest?.(".mtd-date-picker"))
      return await fillMonthPanel(input, value);

    // ---- 诊断信息 ----
    dbg("日期填充:", value, "→", v, "type=" + type,
        "| readOnly=" + input.readOnly,
        "| input.class=" + (input.className || "-"),
        "| 外壳.class=" + (el.className || el.tagName));
    dbg("  父级链:", (function () {
      let n = input.parentElement, arr = [];
      for (let i = 0; i < 4 && n; i++) { arr.push(n.className || n.tagName); n = n.parentElement; }
      return arr.join(" < ");
    })());

    if (type === "date" || type === "month") { await setNativeValue(input, v); return { success: true, filled: v }; }

    // ① 先 focus（Ant / Element 都靠 focus 展开面板）
    try { input.focus(); } catch (e) {}
    await sleep(260);
    let dd = findDropdown();
    dbg("  focus 后：面板=" + (dd ? dd.className : "无") + " | 已聚焦=" + (document.activeElement === input));

    // ② 多个候选目标逐个点（有些控件触发点在右侧小图标上）
    if (!dd) {
      const icon = el.querySelector("svg,[class*='suffix-icon'],[class*='arrow'],[class*='caret'],[class*='calendar']");
      const targets = [];
      [input, el, icon].forEach((t) => { if (t && targets.indexOf(t) < 0) targets.push(t); });
      // 往上 3 层祖先也试一遍
      let up = el.parentElement;
      for (let i = 0; i < 3 && up && up !== document.body; i++) {
        if (targets.indexOf(up) < 0) targets.push(up);
        up = up.parentElement;
      }
      // 也试试"该点位置最顶层的元素"（可能有透明遮罩挡着）
      try {
        const box = (el.getBoundingClientRect ? el : input).getBoundingClientRect();
        const top = document.elementFromPoint(box.left + Math.min(box.width / 2, 120), box.top + box.height / 2);
        if (top && targets.indexOf(top) < 0) targets.push(top);
      } catch (e) {}
      for (let i = 0; i < targets.length && !dd; i++) {
        await realClick(targets[i]);
        await sleep(300);
        dd = findDropdown();
        dbg("  点目标#" + (i + 1) + "(" + (targets[i].className || targets[i].tagName) + "):", dd ? dd.className : "无面板");
      }
    }

    // ③ 还没面板 → 列出页面浮层 + 新增元素，方便定位
    if (!dd) {
      const cands = [].slice.call(document.querySelectorAll("body *")).filter((x) => {
        if (!isVisible(x)) return false;
        const st = getComputedStyle(x);
        if (st.position !== "absolute" && st.position !== "fixed") return false;
        const r = x.getBoundingClientRect();
        return r.width > 80 && r.height > 40;
      }).slice(0, 10).map((x) => {
        const r = x.getBoundingClientRect();
        return (x.className || x.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height);
      });
      dbg("  页面浮层候选:", JSON.stringify(cands));
      dbg("  新增元素:", JSON.stringify(
        [].slice.call(document.querySelectorAll("body *")).slice(-40)
          .filter((x) => isVisible(x) && x.getBoundingClientRect().width > 60 && x.getBoundingClientRect().height > 30)
          .map((x) => x.className || x.tagName).slice(-10)
      ));
    }

    // ④ 输入尝试
    input.focus();
    await setNativeValue(input, v);
    await sleep(60);
    dbg("  设值后立即读:", JSON.stringify(input.value));
    await sleep(200);
    dbg("  200ms 后读:", JSON.stringify(input.value));

    await callMain("pressEnter", [input]);
    await sleep(260);

    // ⑤ 面板若在，翻到目标年月并点"日"
    dd = findDropdown();
    if (dd) {
      await navDatePanel(dd, v);
      dd = findDropdown() || dd;
      const day = v.slice(8).replace(/^0/, "") || "1";
      const cells = [].slice.call(dd.querySelectorAll("td,[class*='cell'],[class*='day']")).filter(isVisible);
      const cell = cells.filter((c) => c.textContent.trim() === day && !/disabled|prev|next|other|outside/i.test(c.className))[0];
      if (cell) { await realClick(cell); await sleep(200); dbg("✅ 点中日期:", day); }
      else dbg("⚠️ 面板里没找到「" + day + "」号，样例:", cells.slice(0, 12).map((c) => c.textContent.trim()));
    }

    try { input.dispatchEvent(new Event("change", { bubbles: true })); input.blur(); } catch (e) {}
    await sleep(180);

    const got = readBack(input, "date");
    if (looksFilled(input, "date", v)) { dbg("✅ 日期已写入:", got); return { success: true, filled: got || v }; }
    dbg("❌ 日期没写进去，读回值:", JSON.stringify(got));
    return { success: false, error: "日期控件没接收输入" };
  }

  async function fillCascader(el, value) {
    const parts = String(value).split(/\s*[/>·,，、]\s*/).map((s) => s.trim()).filter(Boolean);
    dbg("级联填充:", parts);
    await realClick(el);
    await sleep(380);
    for (let i = 0; i < parts.length; i++) {
      const dd = findDropdown();
      if (!dd) { dbg("❌ 第 " + (i + 1) + " 级面板没展开"); break; }
      const opt = matchOption(dd, parts[i]);
      if (!opt) {
        const texts = [].slice.call(dd.querySelectorAll(OPTION_SEL)).filter(isVisible).slice(0, 20).map((o) => o.textContent.trim());
        dbg("❌ 第 " + (i + 1) + " 级没匹配「" + parts[i] + "」，选项:", texts);
        break;
      }
      dbg("✅ 第 " + (i + 1) + " 级:", opt.textContent.trim());
      await realClick(opt);
      await sleep(320);
    }
    await sleep(180);
    const dd = findDropdown();
    if (dd) {
      const ok = [].slice.call(dd.querySelectorAll("button,.ant-btn,.el-button,.ivu-btn"))
        .filter((b) => /确定|确认|OK/i.test(b.textContent))[0];
      if (ok) { await realClick(ok); await sleep(140); }
    }
    return { success: true, filled: value };
  }

  // 判断字段是否为空（用于找新增行里的空字段）
  function isEmptyField(el) {
    try {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return !(el.value || "").trim();
      if (el.tagName === "SELECT") return el.selectedIndex <= 0 || !el.value;
      const inp = el.querySelector("input,textarea");
      if (inp) return !(inp.value || "").trim();
      const sel = el.querySelector("[class*='selection-item'],[class*='selected-item'],[class*='selected-value']");
      return !(sel && sel.textContent.trim());
    } catch (e) { return false; }
  }

  // 找对应分类的「添加」按钮
  function findAddButton(category) {
    const cat = category || "";
    const kw = cat.replace(/经历|信息|情况|能力/g, "");
    const cands = [].slice.call(document.querySelectorAll("button,a,[role='button'],span,div")).filter((el) => {
      if (!isVisible(el)) return false;
      const t = (el.textContent || "").trim().replace(/\s/g, "");
      if (!t || t.length > 16) return false;
      return /^(添加|新增|继续添加|加一|\+)/.test(t) || (/添加|新增/.test(t) && t.length <= 10);
    });
    dbg("  候选添加按钮:", JSON.stringify(cands.map((b) => (b.textContent || "").trim().slice(0, 14))));
    // 只返回文字里含分类关键词的按钮，找不到就 null（绝不乱 fallback）
    const hit = cands.filter((el) => (el.textContent || "").indexOf(kw) >= 0)[0];
    return hit || null;
  }

  // 多段经历：点"添加"→ 逐条填新增的空白行
  async function fillMultiRows(multiRows) {
    for (const grp of multiRows || []) {
      const items = grp.items || [];
      if (!items.length) continue;
      const btn = findAddButton(grp.category);
      if (!btn) { dbg("多行：找不到「" + grp.category + "」的添加按钮"); continue; }
      dbg("多行填充:", grp.category, "共", items.length, "条，按钮=", (btn.textContent || "").trim());
      dbg("  该分类 items:", JSON.stringify(items).slice(0, 300));
      for (let i = 0; i < items.length; i++) {
        // 记录点击前的字段集合
        const before = new Set([].slice.call(document.querySelectorAll(
          "input,textarea,select,[contenteditable='true'],[class*='picker'],[class*='select'],[class*='cascader']"
        )));
        await callMain("click", [btn]);
        await sleep(1500);
        // 重新扫描，取"新出现的"字段
        const all = scanFields();
        const newFields = all.filter((f) => !before.has(f._el));
        dbg("  第 " + (i + 1) + " 条，新增字段:", newFields.length, newFields.map((f) => f.label || f.placeholder).slice(0, 8));
        // 用 item 的 {标签:值} 填新字段（也兜底：新字段里为空的）
        for (const key of Object.keys(items[i])) {
          const value = items[i][key];
          if (!value) continue;
          const field = newFields.find((f) => {
            const lab = (f.label || f.placeholder || "").trim();
            if (!lab) return false;
            return isEmptyField(f._el) && (lab.indexOf(key) >= 0 || key.indexOf(lab) >= 0);
          });
          if (field) {
            const r = await fillElement(field._el, value, field.kind);
            if (r && r.success) dbg("    填上:", key, "→", value);
          }
        }
      }
    }
  }

  function radioOptions(group) {
    const nodes = Array.from(group.querySelectorAll(RADIO_OPTION));
    return nodes.filter((node) => !nodes.some((other) => other !== node && other.contains(node)))
      .filter((node) => isVisible(node) || (node.closest("label") && isVisible(node.closest("label"))));
  }

  function radioText(node) {
    return (node.getAttribute("aria-label") || node.textContent?.trim() ||
      (node.labels && Array.from(node.labels).map((n) => n.textContent).join(" ")) || node.value || "").trim();
  }

  function radioChecked(node) {
    return node.checked === true || node.getAttribute("aria-checked") === "true" ||
      !!node.querySelector('input[type="radio"]:checked,[aria-checked="true"],svg[class*="RadioChecked"]') ||
      /(?:^|\s)[\w-]*(?:--checked|__checked|-checked)(?:\s|$)/.test(String(node.className));
  }

  async function fillRadio(group, value) {
    const matches = radioOptions(group).filter((node) => radioText(node) === value);
    if (matches.length !== 1) return { success: false, error: "单选项未唯一匹配" };
    const option = matches[0];
    if (option.disabled || option.getAttribute("aria-disabled") === "true") return { success: false, error: "单选项已禁用" };
    const selected = () => readBack(group, "radio") === value;
    if (selected()) return { success: true };
    const target = option.matches('input[type="radio"]') ? option : option.querySelector('input[type="radio"]') || option;
    if (target.disabled) return { success: false, error: "单选项已禁用" };
    target.click();
    if (!await waitForChange(selected, 250)) {
      await callMain("reactClick", [option]);
      if (!await waitForChange(selected, 250)) {
        await realClickCdp(isVisible(option) ? option : option.closest("label"));
        await waitForChange(selected, 350);
      }
    }
    return { success: selected(), error: selected() ? undefined : "单选点击后未选中" };
  }

  async function fillElement(el, value, kind) {
    if (value === undefined || value === null) value = "";
    const v = String(value).trim();
    if (!v) return { success: false, error: "空值" };
    const k = kind || detectKind(el);

    if (k === "radio") return await fillRadio(el, v);
    if (k === "choice") return { success: false, error: "未识别的勾选控件，未改写其值" };

    if (k === "select") return el.tagName === "SELECT" ? fillSelect(el, v) : await fillCustomSelect(el, v);
    if (k === "date") return el.matches(".date-picker-pc")
      ? await fillStructuredMonth(el, v) : await fillDate(el, v);
    if (k === "cascader") return await fillCascader(el, v);
    if (k === "textarea") return fillText(el, v);

    // 文本类（可能是自定义控件包着的 input）
    const input = el.tagName === "INPUT" || el.tagName === "TEXTAREA" ? el : el.querySelector("input,textarea");
    if (input && input.tagName === "TEXTAREA") return await fillText(input, v);
    if (input && input.tagName === "INPUT") return await fillInput(input, v);
    if (el.isContentEditable) return fillContentEditable(el, v);
    return { success: false, error: "不支持的控件" };
  }

  async function fillInput(el, value) {
    el.focus();
    await setNativeValue(el, value);
    return { success: true, filled: value };
  }

  async function fillText(el, value) {
    el.focus();
    await setNativeValue(el, value);
    return { success: true, filled: value };
  }

  function fillSelect(el, value) {
    el.focus();
    const search = value.toLowerCase().trim();
    let bestIdx = -1;
    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (!opt || opt.disabled) continue;
      const text = (opt.text || opt.label || "").toLowerCase().trim();
      const val = (opt.value || "").toLowerCase().trim();
      if (text === search || val === search) { bestIdx = i; break; }
      if (bestIdx === -1 && (text.includes(search) || search.includes(text))) bestIdx = i;
    }
    if (bestIdx >= 0) {
      el.selectedIndex = bestIdx;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return { success: true, filled: el.options[bestIdx].text };
    }
    return { success: false, error: "没有匹配选项" };
  }

  function fillContentEditable(el, value) {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true, filled: value };
  }

  // ============================================================
  // 启动
  // ============================================================
  console.log("[OFFER Like] 脚本已加载 v3.25，当前页面：" + location.hostname);
  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
  // 兜底：页面 body 加载慢时轮询等待
  let waitCount = 0;
  const waitTimer = setInterval(() => {
    waitCount++;
    if (document.body) {
      init();
      clearInterval(waitTimer);
    } else if (waitCount > 20) {
      clearInterval(waitTimer);
    }
  }, 500);
})();
