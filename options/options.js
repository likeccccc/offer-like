// ============================================================
// OFFER Like - 个人信息库管理页（options）
// 功能：上传简历 → AI 解析 → 结构化字段库（固定字段 + 多条经历）
// ============================================================

console.log("[OFFER Like] options.js v5 (含侧栏+updateBox) 已加载");

// ---------- 固定字段（单值） ----------
const FIXED_SCHEMA = [
  // ===== 个人信息 =====
  { key: "name", label: "姓名", category: "个人信息" },
  { key: "pinyin", label: "姓名拼音", category: "个人信息" },
  { key: "englishName", label: "英文姓名", category: "个人信息" },
  { key: "gender", label: "性别", category: "个人信息" },
  { key: "email", label: "邮箱", category: "个人信息" },
  { key: "phone", label: "手机号", category: "个人信息" },
  { key: "wechat", label: "微信号", category: "个人信息" },
  { key: "qq", label: "QQ号", category: "个人信息" },
  { key: "website", label: "个人主页/作品链接", category: "个人信息" },
  { key: "birthday", label: "出生日期", category: "个人信息" },
  { key: "age", label: "年龄", category: "个人信息" },
  { key: "nationality", label: "国籍", category: "个人信息" },
  { key: "ethnicity", label: "民族", category: "个人信息" },
  { key: "marital", label: "婚姻状况", category: "个人信息" },
  { key: "politics", label: "政治面貌", category: "个人信息" },
  { key: "idType", label: "证件类型", category: "个人信息" },
  { key: "idCard", label: "身份证号", category: "个人信息" },
  { key: "address", label: "居住地址", category: "个人信息" },
  { key: "hometown", label: "籍贯", category: "个人信息" },
  { key: "origin", label: "生源地", category: "个人信息" },
  { key: "highestEducation", label: "最高学历", category: "个人信息" },
  { key: "degree", label: "学位", category: "个人信息" },
  { key: "graduateSchool", label: "毕业院校", category: "个人信息" },
  { key: "graduateMajor", label: "毕业专业", category: "个人信息" },
  { key: "studyForm", label: "学习形式", category: "个人信息" },
  { key: "graduateTime", label: "毕业时间", category: "个人信息" },
  { key: "englishLevel", label: "英语等级", category: "个人信息" },
  { key: "gaokaoTime", label: "高考时间", category: "个人信息" },
  { key: "gaokaoScore", label: "高考分数", category: "个人信息" },
  { key: "gaokaoSubjects", label: "高考科目", category: "个人信息" },
  { key: "workYears", label: "工作年限", category: "个人信息" },
  { key: "professionalTitle", label: "专业技术职级", category: "个人信息" },
  { key: "workStatus", label: "工作状态", category: "个人信息" },
  { key: "lastCompany", label: "上一家公司", category: "个人信息" },
  { key: "emergencyName", label: "紧急联系人姓名", category: "个人信息" },
  { key: "emergencyRelation", label: "紧急联系人关系", category: "个人信息" },
  { key: "emergencyPhone", label: "紧急联系电话", category: "个人信息" },
  { key: "postcode", label: "邮政编码", category: "个人信息" },
  { key: "health", label: "健康状况", category: "个人信息" },
  { key: "bloodType", label: "血型", category: "个人信息" },
  { key: "joinPartyTime", label: "入党时间", category: "个人信息" },
  { key: "isFresh", label: "是否应届生", category: "个人信息" },
  { key: "isRecommended", label: "是否保研", category: "个人信息" },
  { key: "hasOverseasStudy", label: "是否有留学经历", category: "个人信息" },
  { key: "isColorWeak", label: "是否色弱", category: "个人信息" },
  { key: "hukouType", label: "户口性质", category: "个人信息" },
  { key: "hukouLocation", label: "户口所在地", category: "个人信息" },
  { key: "archiveLocation", label: "档案所在地", category: "个人信息" },
  { key: "height", label: "身高(cm)", category: "个人信息" },
  { key: "weight", label: "体重(kg)", category: "个人信息" },
  { key: "selfIntro", label: "自我介绍", category: "个人信息", long: true },
  { key: "strengths", label: "个人优势", category: "个人信息", long: true },
  { key: "hobbies", label: "兴趣爱好", category: "个人信息" },

  // ===== 求职意向 =====
  { key: "targetPosition", label: "目标岗位", category: "求职意向" },
  { key: "availableDate", label: "预计入职时间", category: "求职意向" },
  { key: "expectCity", label: "期望城市", category: "求职意向" },
  { key: "interviewCity", label: "面试城市", category: "求职意向" },
  { key: "expectSalary", label: "期望月薪(元)", category: "求职意向" },
  { key: "expectAnnualSalary", label: "期望年薪(元)", category: "求职意向" },
  { key: "currentSalary", label: "当前月薪(元)", category: "求职意向" },
  { key: "hasRelativeInCompany", label: "是否有亲人在应聘公司", category: "求职意向" },
  { key: "recruitSource", label: "招聘信息来源", category: "求职意向" },
  { key: "acceptTransfer", label: "是否接受调剂", category: "求职意向" },
  { key: "jobNote", label: "求职备注", category: "求职意向", long: true },

  // ===== 技能专长 =====
  { key: "technicalSkills", label: "技术技能", category: "技能专长", long: true },
  { key: "languageSkills", label: "语言能力", category: "技能专长", long: true },
  { key: "softwareSkills", label: "软件技能", category: "技能专长", long: true },
  { key: "softSkills", label: "软技能", category: "技能专长", long: true },
  { key: "selfEvaluation", label: "自我评价", category: "技能专长", long: true }
];

// ---------- 动态列表字段（每条可加多段经历） ----------
const LIST_SCHEMA = [
  {
    key: "education", label: "教育背景", icon: "🎓",
    fields: [
      { key: "school", label: "学校" },
      { key: "studentId", label: "学号" },
      { key: "department", label: "院系" },
      { key: "major", label: "专业" },
      { key: "schoolCity", label: "学校城市" },
      { key: "advisor", label: "导师姓名" },
      { key: "labName", label: "实验室名称" },
      { key: "isKeyLab", label: "是否国家重点实验室" },
      { key: "isJointTraining", label: "是否联合培养" },
      { key: "education", label: "学历" },
      { key: "eduStatus", label: "学历状态" },
      { key: "studyYears", label: "学制(年)" },
      { key: "enrollTime", label: "入学时间" },
      { key: "graduateTime", label: "毕业时间" },
      { key: "degree", label: "学位" },
      { key: "degreeType", label: "学位类型" },
      { key: "gpa", label: "成绩绩点" },
      { key: "schoolType", label: "学校类型" },
      { key: "eduMethod", label: "教育方式" },
      { key: "admissionType", label: "招生类别" },
      { key: "failCount", label: "挂科数" },
      { key: "classRank", label: "班级排名" },
      { key: "majorRank", label: "专业排名" },
      { key: "diplomaNo", label: "学历证书编号" },
      { key: "degreeNo", label: "学位证书编号" },
      { key: "counselorName", label: "辅导员姓名" },
      { key: "counselorPhone", label: "辅导员联系方式" },
      { key: "isOverseasSchool", label: "是否海外学校" },
      { key: "courses", label: "专业课程", long: true },
      { key: "researchDirection", label: "研究方向", long: true },
      { key: "thesis", label: "毕业论文", long: true }
    ]
  },
  {
    key: "work", label: "工作经历", icon: "💼",
    fields: [
      { key: "company", label: "公司名称" },
      { key: "industry", label: "所属行业" },
      { key: "department", label: "部门" },
      { key: "position", label: "职位" },
      { key: "startTime", label: "开始时间" },
      { key: "endTime", label: "结束时间" },
      { key: "description", label: "工作内容", long: true },
      { key: "reason", label: "离职原因" },
      { key: "refName", label: "证明人" },
      { key: "refPhone", label: "证明人电话" }
    ]
  },
  {
    key: "internship", label: "实习经历", icon: "📝",
    fields: [
      { key: "company", label: "实习公司" },
      { key: "department", label: "部门" },
      { key: "position", label: "实习职位" },
      { key: "startTime", label: "开始时间" },
      { key: "endTime", label: "结束时间" },
      { key: "address", label: "实习地址" },
      { key: "industry", label: "所属行业" },
      { key: "employmentType", label: "用工性质" },
      { key: "refName", label: "证明人姓名" },
      { key: "refPhone", label: "证明人联系方式" },
      { key: "refPosition", label: "证明人职位" },
      { key: "description", label: "实习工作内容", long: true }
    ]
  },
  {
    key: "project", label: "项目经历", icon: "🚀",
    fields: [
      { key: "name", label: "项目名称" },
      { key: "position", label: "项目职务" },
      { key: "practiceType", label: "实践方式" },
      { key: "startTime", label: "开始时间" },
      { key: "endTime", label: "结束时间" },
      { key: "address", label: "项目地址" },
      { key: "link", label: "项目链接" },
      { key: "refName", label: "证明人姓名" },
      { key: "refPhone", label: "证明人联系方式" },
      { key: "refPosition", label: "证明人职位" },
      { key: "description", label: "项目描述", long: true },
      { key: "responsibility", label: "项目职责", long: true },
      { key: "achievement", label: "项目成果", long: true }
    ]
  },
  {
    key: "certificate", label: "证书", icon: "📜",
    fields: [
      { key: "name", label: "资质证书名称" },
      { key: "type", label: "资质证书类型" },
      { key: "getTime", label: "证书获取时间" }
    ]
  },
  {
    key: "language", label: "外语能力", icon: "🌐",
    fields: [
      { key: "language", label: "语言种类" },
      { key: "getTime", label: "获得时间" },
      { key: "certName", label: "证书名称" },
      { key: "score", label: "成绩" },
      { key: "proficiency", label: "掌握程度" },
      { key: "listening", label: "听说能力" },
      { key: "reading", label: "读写能力" }
    ]
  },
  {
    key: "family", label: "家庭情况", icon: "👨‍👩‍👧",
    fields: [
      { key: "name", label: "成员姓名" },
      { key: "relation", label: "关系" },
      { key: "gender", label: "性别" },
      { key: "education", label: "教育程度" },
      { key: "ethnicity", label: "民族" },
      { key: "birthday", label: "出生日期" },
      { key: "age", label: "年龄" },
      { key: "phone", label: "联系电话" },
      { key: "company", label: "工作单位" },
      { key: "position", label: "职位" },
      { key: "politics", label: "政治面貌" },
      { key: "address", label: "联系地址" }
    ]
  },
  {
    key: "campus", label: "校园经历", icon: "📚",
    fields: [
      { key: "org", label: "组织名称" },
      { key: "position", label: "职位" },
      { key: "startTime", label: "开始时间" },
      { key: "endTime", label: "结束时间" },
      { key: "description", label: "工作内容", long: true },
      { key: "responsibility", label: "本人职责", long: true }
    ]
  },
  {
    key: "award", label: "获奖经历", icon: "🏆",
    fields: [
      { key: "name", label: "奖项名称" },
      { key: "institution", label: "颁发机构" },
      { key: "time", label: "获奖时间" },
      { key: "level", label: "奖项级别" },
      { key: "type", label: "奖励类型" },
      { key: "grade", label: "奖励等级" },
      { key: "description", label: "获奖描述", long: true }
    ]
  },
  {
    key: "patent", label: "专利信息", icon: "💡",
    fields: [
      { key: "name", label: "专利名称" },
      { key: "number", label: "专利号" },
      { key: "applyDate", label: "申请日期" },
      { key: "status", label: "专利状态" },
      { key: "inventor", label: "发明人" },
      { key: "description", label: "专利描述", long: true }
    ]
  },
  {
    key: "paper", label: "论文发表", icon: "📄",
    fields: [
      { key: "title", label: "论文标题" },
      { key: "journal", label: "发表期刊" },
      { key: "author", label: "作者" },
      { key: "volume", label: "期刊卷期" },
      { key: "impactFactor", label: "影响因子" },
      { key: "journalLevel", label: "刊物等级" },
      { key: "authorOrder", label: "作者顺序" },
      { key: "publishTime", label: "发表时间" },
      { key: "doi", label: "DOI号" },
      { key: "link", label: "论文链接" },
      { key: "abstract", label: "论文摘要", long: true }
    ]
  }
];

const STORAGE_KEY_PROFILE = "profile";
const STORAGE_KEY_RESUME = "resume";
const STORAGE_KEY_AI = "aiConfig";

let currentProfile = {};

// ---------- 卡片图标 ----------
const CAT_ICON = { "个人信息": "\u{1F464}", "求职意向": "\u{1F3AF}", "技能专长": "\u{1F6E0}" };
const CAT_DESC = {
  "个人信息": "姓名、证件、联系方式、教育概况",
  "求职意向": "目标岗位、期望薪资、到岗时间",
  "技能专长": "技术、语言、软件、软技能"
};

// ---------- 标签短名（档案盒索引） ----------
const SHORT = {
  "个人信息": "个人", "求职意向": "求职", "技能专长": "技能",
  "教育背景": "教育", "工作经历": "工作", "实习经历": "实习",
  "项目经历": "项目", "证书": "证书", "外语能力": "外语",
  "家庭情况": "家庭", "校园经历": "校园", "获奖经历": "获奖",
  "专利信息": "专利", "论文发表": "论文"
};

// ---------- 索引标签配色（瑞士档案风） ----------
const TAB_PALETTE = [
  { bg: "#001410", fg: "#eae9e7" },  // Black Bean
  { bg: "#57000b", fg: "#eae9e7" },  // Sensational Maroon
  { bg: "#808183", fg: "#001410" },  // Neutral Grey（深字保证对比度）
  { bg: "#b2b3b6", fg: "#001410" },  // Antique Steel
  { bg: "#d13d1f", fg: "#ffffff" },  // Cinnabar（略压深，白字达标）
  { bg: "#eae9e7", fg: "#001410" }   // White Echo
];


// ---------- 卡片列表 ----------
function getCards() {
  const cards = [];
  const cats = [];
  for (const f of FIXED_SCHEMA) {
    if (!cats.includes(f.category)) cats.push(f.category);
  }
  for (const cat of cats) {
    const fields = FIXED_SCHEMA.filter(f => f.category === cat);
    const filled = fields.filter(f => (currentProfile[f.key] || "").trim()).length;
    cards.push({
      type: "fixed", key: cat, label: cat,
      icon: CAT_ICON[cat] || "\u{1F4C4}", desc: CAT_DESC[cat] || "",
      filled, total: fields.length
    });
  }
  for (const list of LIST_SCHEMA) {
    const arr = Array.isArray(currentProfile[list.key]) ? currentProfile[list.key] : [];
    cards.push({
      type: "list", key: list.key, label: list.label, icon: list.icon,
      desc: "可添加多条", filled: arr.length, total: null
    });
  }
  return cards;
}

// ---------- 渲染文件柜 ----------
function renderArchive(animate) {
  const tabs = document.getElementById("tabs3d");
  if (!tabs) return;
  tabs.innerHTML = "";
  const cs = getComputedStyle(document.documentElement);
  const bw = parseFloat(cs.getPropertyValue("--bw")) || 640;
  const bh = parseFloat(cs.getPropertyValue("--bh")) || 380;
  const bd = parseFloat(cs.getPropertyValue("--bd")) || 320;
  const cards = getCards();
  const n = cards.length;
  const dw = Math.round(bw - 92);                 // 卡片宽（左右留边）
  const tw = Math.round(bw * 0.125);               // 索引标签宽
  const th = Math.max(20, Math.round(bh * 0.06));  // 索引标签高
  const zBack = -bd / 2 + 48;                      // 最后一张
  const zFront = bd / 2 - 58;                      // 最前一张
  cards.forEach((card, idx) => {
    const pal = TAB_PALETTE[idx % TAB_PALETTE.length];
    const t = n > 1 ? idx / (n - 1) : 0;
    const dh = Math.round(bh * (0.99 - t * 0.42)); // 从后往前逐渐变矮
    const ty = bh / 2 - dh / 2;
    const tz = zBack + t * (zFront - zBack);
    const div = document.createElement("div");
    div.className = "divider";
    div.dataset.key = card.key;
    div.style.setProperty("--dw", dw + "px");
    div.style.setProperty("--dh", dh + "px");
    div.style.setProperty("--tw", tw + "px");
    div.style.setProperty("--th", th + "px");
    div.style.setProperty("--c", pal.bg);
    div.style.setProperty("--f", pal.fg);
    div.style.setProperty("--tx", "0px");
    div.style.setProperty("--ty", ty.toFixed(1) + "px");
    div.style.setProperty("--tz", tz.toFixed(1) + "px");
    const countText = card.type === "list" ? card.filled + " 条" : card.filled + "/" + card.total;
    div.innerHTML =
      '<div class="dv-body"><span class="dv-cnt">' + countText + '</span></div>' +
      '<div class="dv-tab">' + (SHORT[card.label] || card.label.slice(0, 2)) + '</div>';
    div.title = card.label;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      pullTab(div, card);
    });
    tabs.appendChild(div);
  });
  updateBox();
}

// 更新盒子正面 + 左侧栏
function updateBox() {
  const name = (currentProfile.name || "").trim() || "你的名字";
  const bn = document.getElementById("boxName");
  if (bn) bn.textContent = name;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("sideName", name);
  set("sideAvatar", name.slice(0, 1));

  let filled = 0, total = 0, listCount = 0;
  for (const f of FIXED_SCHEMA) {
    total++;
    if ((currentProfile[f.key] || "").trim()) filled++;
  }
  for (const list of LIST_SCHEMA) {
    const arr = Array.isArray(currentProfile[list.key]) ? currentProfile[list.key] : [];
    listCount += arr.length;
  }
  const pct = total ? Math.round((filled / total) * 100) : 0;

  set("sidePct", pct + "%");
  set("sideSub", filled + " / " + total + " 项已填");
  set("sideTypes", String(FIXED_SCHEMA.length + LIST_SCHEMA.length));
  set("sideRecords", String(listCount));
  const bar = document.getElementById("sideBar");
  if (bar) bar.style.width = pct + "%";

  const metaEl = document.getElementById("boxMeta");
  if (metaEl) {
    metaEl.innerHTML =
      '<b>' + filled + '</b>/' + total + ' 项已填' +
      ' \u00B7 <b>' + listCount + '</b> 条经历';
  }

  // 供弹窗（popup）与悬浮窗读取
  chrome.storage.local.set({
    arfStats: { name: name, filled: filled, total: total, records: listCount }
  });
}

// 标签"拉出"动画后打开详情
let pulledEl = null;
// 点卡片：先抽出，再把卡片"形变"成详情页（连贯）
function pullTab(btn, card) {
  if (pulledEl && pulledEl !== btn) {
    pulledEl.classList.remove("pulling");
    pulledEl.style.opacity = "";
  }
  pulledEl = btn;
  btn.classList.add("pulling");
  setTimeout(() => {
    const rect = btn.getBoundingClientRect();
    morphIntoDetail(card, btn, rect);
  }, 420);
}

// FLIP 形变：详情页从卡片的屏幕位置/尺寸原地放大
function morphIntoDetail(card, cardEl, cardRect) {
  allCards = getCards();
  const i = allCards.findIndex((c) => c.key === card.key);
  currentCardIndex = i >= 0 ? i : 0;
  showDetailAt(currentCardIndex);

  const detail = document.getElementById("detail");
  const inner = detail.querySelector(".detail-inner");
  if (!inner) return;

  // 先渲染到最终位置，量出最终框
  inner.style.transition = "none";
  inner.style.transformOrigin = "top left";
  inner.style.transform = "none";
  inner.style.opacity = "1";
  detail.classList.add("open");
  const finalRect = inner.getBoundingClientRect();

  // 反推初始形变（对齐到卡片）
  const sx = Math.max(0.05, cardRect.width / finalRect.width);
  const sy = Math.max(0.05, cardRect.height / finalRect.height);
  const tx = cardRect.left - finalRect.left;
  const ty = cardRect.top - finalRect.top;
  inner.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";

  // 关键：不淡入，直接从卡片当前位置连续放大
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inner.style.transition = "transform .5s cubic-bezier(.2,.85,.2,1)";
      inner.style.transform = "none";
    });
  });

  // 卡片瞬间交接（与详情页起始位置完全重合，所以看不出来）
  cardEl.style.transition = "none";
  cardEl.style.opacity = "0";

  // 动画结束清理内联样式
  setTimeout(() => {
    inner.style.transition = "";
    inner.style.transformOrigin = "";
    inner.style.transform = "";
    inner.style.opacity = "";
  }, 560);
}

// ---------- 详情面板 ----------
let allCards = [];
let currentCardIndex = 0;

function openDetail(card) {
  allCards = getCards();
  const i = allCards.findIndex((c) => c.key === card.key);
  currentCardIndex = i >= 0 ? i : 0;
  showDetailAt(currentCardIndex);
  document.getElementById("detail").classList.add("open");
}

function showDetailAt(i) {
  const card = allCards[i];
  if (!card) return;
  // 详情页头部用卡片标签的同一配色，保证颜色一致
  const pal = TAB_PALETTE[i % TAB_PALETTE.length];
  const head = document.querySelector(".detail-head");
  if (head) {
    head.style.background = pal.bg;
    head.style.color = pal.fg;
  }
  document.getElementById("detailTitle").textContent = card.icon + "  " + card.label;
  document.getElementById("portraitSection").hidden = !(card.type === "fixed" && card.key === "个人信息");
  const meta = document.getElementById("detailMeta");
  const body = document.getElementById("detailBody");
  body.innerHTML = "";
  const pos = (i + 1) + " / " + allCards.length;
  if (card.type === "fixed") {
    meta.textContent = pos + "  ·  " + card.filled + "/" + card.total;
    renderFixedDetail(body, card.key);
  } else {
    meta.textContent = pos + "  ·  " + card.filled + " 条";
    renderListDetail(body, card.key);
  }
  document.getElementById("detail").scrollTop = 0;
}

function goDetail(delta) {
  if (!allCards.length) return;
  currentCardIndex = (currentCardIndex + delta + allCards.length) % allCards.length;
  showDetailAt(currentCardIndex);
}

function closeDetail() {
  const detail = document.getElementById("detail");
  detail.classList.remove("open");
  const inner = detail.querySelector(".detail-inner");
  if (inner) {
    inner.style.transition = "";
    inner.style.transformOrigin = "";
    inner.style.transform = "";
    inner.style.opacity = "";
  }
  pulledEl = null;
  renderArchive(false);
  updateCharCount();
}

function renderFixedDetail(body, category) {
  const fields = FIXED_SCHEMA.filter(f => f.category === category);
  const grid = document.createElement("div");
  grid.className = "field-grid";
  for (const f of fields) {
    const item = document.createElement("div");
    item.className = "field-item" + (f.long ? " full" : "");
    const value = (currentProfile[f.key] || "").replace(/"/g, "&quot;");
    if (f.long) {
      item.innerHTML = '<label>' + f.label + '</label><textarea data-fixed="' + f.key + '">' + value + '</textarea>';
    } else {
      item.innerHTML = '<label>' + f.label + '</label><input type="text" data-fixed="' + f.key + '" value="' + value + '">';
    }
    grid.appendChild(item);
  }
  body.appendChild(grid);
  bindInputs(body);
}

function renderListDetail(body, listKey) {
  const list = LIST_SCHEMA.find(l => l.key === listKey);
  const title = document.createElement("div");
  title.className = "category-title";
  title.innerHTML = "<span>" + list.label + "（可多条）</span>";
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-sm btn-accent";
  addBtn.textContent = "\uFF0B 添加一条";
  addBtn.addEventListener("click", () => addListItem(listKey));
  title.appendChild(addBtn);
  body.appendChild(title);

  const arr = Array.isArray(currentProfile[listKey]) ? currentProfile[listKey] : [];
  if (arr.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#6b6960;font-size:13px;padding:24px 0;text-align:center;";
    empty.textContent = "还没有内容，点右上角「\uFF0B 添加一条」开始填写";
    body.appendChild(empty);
    return;
  }
  arr.forEach((item, idx) => body.appendChild(buildListItem(list, item, idx)));
  bindInputs(body);
}

function buildListItem(list, item, idx) {
  const card = document.createElement("div");
  card.className = "list-item";
  card.innerHTML =
    '<div class="list-item-head"><span>第 ' + (idx + 1) + ' 条 ' + list.label + '</span>' +
    '<button class="del-btn">删除</button></div><div class="field-grid"></div>';
  const grid = card.querySelector(".field-grid");
  for (const f of list.fields) {
    const fieldItem = document.createElement("div");
    fieldItem.className = "field-item" + (f.long ? " full" : "");
    const value = ((item && item[f.key]) || "").replace(/"/g, "&quot;");
    if (f.long) {
      fieldItem.innerHTML = '<label>' + f.label + '</label><textarea data-list="' + list.key + '" data-field="' + f.key + '" data-idx="' + idx + '">' + value + '</textarea>';
    } else {
      fieldItem.innerHTML = '<label>' + f.label + '</label><input type="text" data-list="' + list.key + '" data-field="' + f.key + '" data-idx="' + idx + '" value="' + value + '">';
    }
    grid.appendChild(fieldItem);
  }
  card.querySelector(".del-btn").addEventListener("click", () => delListItem(list.key, idx));
  return card;
}

function addListItem(listKey) {
  if (!Array.isArray(currentProfile[listKey])) currentProfile[listKey] = [];
  currentProfile[listKey].push({});
  saveProfile();
  const body = document.getElementById("detailBody");
  body.innerHTML = "";
  renderListDetail(body, listKey);
  document.getElementById("detailMeta").textContent = currentProfile[listKey].length + " 条记录";
}

function delListItem(listKey, idx) {
  if (!Array.isArray(currentProfile[listKey])) return;
  currentProfile[listKey].splice(idx, 1);
  saveProfile();
  const body = document.getElementById("detailBody");
  body.innerHTML = "";
  renderListDetail(body, listKey);
  document.getElementById("detailMeta").textContent = currentProfile[listKey].length + " 条记录";
}

function bindInputs(scope) {
  scope.querySelectorAll("input[data-fixed], textarea[data-fixed]").forEach(el => {
    el.addEventListener("input", () => {
      currentProfile[el.dataset.fixed] = el.value;
      saveProfile();
    });
  });
  scope.querySelectorAll("input[data-list], textarea[data-list]").forEach(el => {
    el.addEventListener("input", () => {
      const listKey = el.dataset.list, fieldKey = el.dataset.field;
      const i = parseInt(el.dataset.idx, 10);
      if (!Array.isArray(currentProfile[listKey])) currentProfile[listKey] = [];
      if (!currentProfile[listKey][i]) currentProfile[listKey][i] = {};
      currentProfile[listKey][i][fieldKey] = el.value;
      saveProfile();
    });
  });
}

// ---------- 序列化 ----------
function profileToText(profile) {
  const lines = [];
  for (const f of FIXED_SCHEMA) {
    const v = (profile[f.key] || "").trim();
    if (v) lines.push(f.label + "\uFF1A" + v);
  }
  for (const list of LIST_SCHEMA) {
    const arr = Array.isArray(profile[list.key]) ? profile[list.key] : [];
    arr.forEach((item, i) => {
      const parts = [];
      for (const f of list.fields) {
        const v = ((item && item[f.key]) || "").trim();
        if (v) parts.push(f.label + "\uFF1A" + v);
      }
      if (parts.length) {
        const prefix = arr.length > 1 ? list.label + (i + 1) : list.label;
        lines.push(prefix + "\uFF1A" + parts.join("\uFF1B"));
      }
    });
  }
  return lines.join("\n");
}

// ---------- 保存 ----------
let saveTimer = null;
function saveProfile() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    for (const list of LIST_SCHEMA) {
      if (Array.isArray(currentProfile[list.key])) {
        currentProfile[list.key] = currentProfile[list.key].filter(item =>
          list.fields.some(f => (item[f.key] || "").trim()));
      }
    }
    const text = profileToText(currentProfile);
    chrome.storage.local.set({ [STORAGE_KEY_PROFILE]: currentProfile, [STORAGE_KEY_RESUME]: text }, () => {
      updateBox();
      if (Date.now() > suppressSaveToast) showToast("\u2713 \u5df2\u4fdd\u5b58 \u00b7 \u5171 " + text.length + " \u5b57");
    });
  }, 500);
}

// 底部提示：出现一下，随后淡出
let toastTimer = null;
let suppressSaveToast = 0;
function showToast(text, opts) {
  opts = opts || {};
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.toggle("err", !!opts.err);
  t.classList.toggle("loading", !!opts.loading);
  t.classList.add("show");
  clearTimeout(toastTimer);
  if (!opts.sticky) {
    toastTimer = setTimeout(() => t.classList.remove("show"), opts.duration || 1500);
  }
}

function updateCharCount() { /* 字数已并入保存提示 toast */ }

// ---------- 应用 AI 解析结果 ----------
function applyProfile(data) {
  for (const f of FIXED_SCHEMA) {
    if (data[f.key] !== undefined && data[f.key] !== null) {
      currentProfile[f.key] = String(data[f.key]).trim();
    }
  }
  for (const list of LIST_SCHEMA) {
    if (Array.isArray(data[list.key])) {
      currentProfile[list.key] = data[list.key]
        .filter(item => item && typeof item === "object")
        .map(item => {
          const obj = {};
          for (const f of list.fields) {
            obj[f.key] = item[f.key] !== undefined && item[f.key] !== null ? String(item[f.key]).trim() : "";
          }
          return obj;
        });
    }
  }
  saveProfile();
  renderArchive();
}

// ---------- AI 配置 ----------
function getAiConfig() { return OFFERLIKE_AI.readForm(); }
function setAiStatus(text, isError) {
  const el = document.getElementById("aiStatus");
  el.textContent = text;
  el.style.color = isError ? "#c0392b" : "#2f7d32";
}

// ---------- 文件解析 ----------
async function fileToText(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const buf = await file.arrayBuffer();
  if (ext === "txt" || ext === "md") {
    let text = new TextDecoder("utf-8").decode(buf);
    if (!/[\u4e00-\u9fff]/.test(text)) {
      try { text = new TextDecoder("gbk").decode(buf); } catch (e) {}
    }
    return text;
  }
  if (ext === "docx" || ext === "doc") return parseDocx(buf);
  if (ext === "pdf") return parsePdf(buf);
  throw new Error("不支持的文件格式：" + ext + "，请用 docx / pdf / txt");
}

async function parseDocx(arrayBuffer) {
  if (typeof JSZip === "undefined") throw new Error("JSZip 未加载");
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("无法解析 docx：未找到 document.xml");
  const xml = await docXml.async("string");
  const paragraphs = [];
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = pRegex.exec(xml)) !== null) {
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    const runs = [];
    let tm;
    while ((tm = tRegex.exec(m[0])) !== null) {
      runs.push(tm[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
    }
    const line = runs.join("").trim();
    if (line) paragraphs.push(line);
  }
  const text = paragraphs.join("\n");
  if (text.length < 5) throw new Error("docx 内容为空，请换一种格式");
  return text;
}

async function parsePdf(arrayBuffer) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF 解析库未加载，请刷新页面重试");
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.min.js");
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false, useSystemFonts: true }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let line = "", lastY = null;
      for (const item of content.items || []) {
        if (!item.str) continue;
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          text += line.trim() + "\n";
          line = item.str;
        } else {
          line += (line ? " " : "") + item.str;
        }
        lastY = y;
      }
      if (line.trim()) text += line.trim() + "\n";
    }
    if (text.trim().length < 5) throw new Error("未提取到文字");
    return text;
  } catch (e) {
    throw new Error("PDF 解析失败：" + (e && e.message ? e.message : e) + "。如果是扫描版（图片型）PDF，请改用 docx 或「粘贴文本解析」");
  }
}

// ---------- AI 解析简历（直连） ----------
async function parseWithAI(text) {
  const config = getAiConfig();
  if (!config.apiKey) throw new Error("请先在「AI 配置」里填写 API Key");
  return await callAIForParse(text, config);
}

async function callAIForParse(text, config) {
  const { endpoint, model, params: requestParams } = OFFERLIKE_AI.resolve(config);

  const fixedDesc = {};
  for (const f of FIXED_SCHEMA) fixedDesc[f.key] = f.label;
  const listDesc = {};
  for (const list of LIST_SCHEMA) {
    const sub = {};
    for (const f of list.fields) sub[f.key] = f.label;
    listDesc[list.key] = sub;
  }

  const systemPrompt =
    "你是专业的简历解析专家。请从用户的简历文本中提取信息，返回结构化 JSON。\n" +
    "只返回 JSON，不要任何其他文字。\n\n" +
    "返回格式说明：\n" +
    '1) 固定字段（每个是单个字符串）：' + JSON.stringify(fixedDesc) + "\n" +
    '2) 经历类字段（每个是【数组】，可以有0条或多条）：' + JSON.stringify(listDesc) + "\n\n" +
    "规则：\n" +
    "1) 【最重要】经历/奖项必须逐条拆开：\n" +
    "   - 2 段教育经历 → education 数组 2 个对象，各自填学校/学历/专业/时间；\n" +
    "   - 每个奖项 → award 数组里单独一个对象，分别填 name(奖项名)、institution(颁发机构)、time(获奖时间)、grade(奖励等级)、level(奖项级别)、description(获奖描述)；\n" +
    "   - 即使简历把多个奖项挤在同一段文字里，也要逐个拆成多个对象，绝不塞进同一个对象的 description；\n" +
    "2) 每个对象只填该条经历/奖项自己的信息，不要把别的条目内容混进来；\n" +
    "3) 提取不到的字段填空字符串；\n" +
    "4) 日期保持简历原格式；\n" +
    "5) 完全没有的信息填空字符串或空数组 []。";

  const userMessage = "请解析以下简历：\n\n" + text;

  const resp = await fetch(endpoint + "/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...requestParams,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    if (resp.status === 401) throw new Error("API Key 无效，请检查");
    if (resp.status === 402) throw new Error("API 账户余额不足");
    throw new Error("AI 请求失败 (HTTP " + resp.status + ")：" + errText.slice(0, 200));
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");
  let parsed;
  try { parsed = JSON.parse(content); }
  catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error("AI 返回格式无法解析");
  }
  return parsed;
}

// ---------- 初始化 ----------
async function init() {
  const { portraitPhoto } = await chrome.storage.local.get("portraitPhoto");
  renderPortrait(portraitPhoto);
  const data = await chrome.storage.local.get([STORAGE_KEY_PROFILE]);
  currentProfile = data[STORAGE_KEY_PROFILE] || {};
  renderArchive();
  updateCharCount();
  window.addEventListener("resize", () => renderArchive(false));
  const ai = await chrome.storage.local.get([STORAGE_KEY_AI]);
  OFFERLIKE_AI.loadForm(ai[STORAGE_KEY_AI] || {});
}

// ---------- 事件绑定 ----------
function renderPortrait(photo) {
  const image = document.getElementById("photoPreview");
  image.hidden = !photo;
  if (photo) image.src = photo.dataUrl;
  else image.removeAttribute("src");
  document.getElementById("photoRemove").hidden = !photo;
  document.getElementById("photoBtn").textContent = photo ? "更换证件照" : "保存证件照";
  document.getElementById("photoStatus").textContent = photo
    ? photo.name + " · 已保存在本机，一键填充时用于证件照上传"
    : "可保存 JPG / PNG，最大 300 KB。一键填充时用于证件照上传。";
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  const photoInput = document.getElementById("photoInput");
  document.getElementById("photoBtn").addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) return;
    try {
      if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("请选择 JPG 或 PNG 图片");
      if (!file.size || file.size > 300 * 1024) throw new Error("证件照不能超过 300 KB，请压缩后重新选择");
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("图片读取失败"));
        reader.readAsDataURL(file);
      });
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = () => reject(new Error("图片无法打开，请重新选择"));
        image.src = dataUrl;
      });
      const photo = { name: file.name, type: file.type, size: file.size, dataUrl };
      await chrome.storage.local.set({ portraitPhoto: photo });
      renderPortrait(photo);
      showToast("证件照已保存");
    } catch (error) { showToast(error.message || "证件照保存失败", { err: true }); }
    finally { photoInput.value = ""; }
  });
  document.getElementById("photoRemove").addEventListener("click", async () => {
    try {
      await chrome.storage.local.remove("portraitPhoto");
      renderPortrait(null);
    } catch (error) { showToast("移除失败，请重试", { err: true }); }
  });

  const pasteArea = document.getElementById("pasteArea");
  const parsePasteBtn = document.getElementById("parsePasteBtn");
  const settingsModal = document.getElementById("settingsModal");

  function setParseStatus(text, isError, sticky) {
    showToast(text, {
      err: !!isError,
      loading: !!sticky && !isError,
      sticky: !!sticky,
      duration: isError ? 3600 : 2000
    });
  }

  document.getElementById("uploadBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setParseStatus("正在读取文件...", false, true);
      const text = await fileToText(file);
      setParseStatus("文件读取成功（" + text.length + " 字），AI 正在解析...", false, true);
      const profile = await parseWithAI(text);
      suppressSaveToast = Date.now() + 2200;
      applyProfile(profile);
      setParseStatus("\u2713 解析完成，已填入资料库", false);
    } catch (err) {
      setParseStatus("\u2717 " + err.message, true);
    }
    e.target.value = "";
  });

  document.getElementById("pasteBtn").addEventListener("click", () => {
    const open = pasteArea.style.display === "block";
    pasteArea.style.display = open ? "none" : "block";
    parsePasteBtn.style.display = open ? "none" : "inline-block";
  });
  parsePasteBtn.addEventListener("click", async () => {
    const text = pasteArea.value.trim();
    if (!text) { setParseStatus("请先粘贴简历内容", true); return; }
    try {
      setParseStatus("AI 正在解析...", false, true);
      const profile = await parseWithAI(text);
      suppressSaveToast = Date.now() + 2200;
      applyProfile(profile);
      setParseStatus("\u2713 解析完成，已填入资料库", false);
    } catch (err) {
      setParseStatus("\u2717 " + err.message, true);
    }
  });

  document.getElementById("detailBack").addEventListener("click", closeDetail);
  document.getElementById("detailPrev").addEventListener("click", () => goDetail(-1));
  document.getElementById("detailNext").addEventListener("click", () => goDetail(1));
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("detail").classList.contains("open")) return;
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (settingsModal.classList.contains("open")) return;
    // 编辑控件内的方向键留给光标、文本选择、日期分段和下拉选项。
    const editing = (node) => node instanceof Element &&
      (node.isContentEditable || !!node.closest("input,textarea,select,[role='textbox'],[role='combobox']"));
    if (editing(e.target) || editing(document.activeElement)) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      goDetail(e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Escape") closeDetail();
  });
  // 编辑资料时，拖选文字可能在遮罩上释放，浏览器会将 click 派发给共同祖先。
  // 不用遮罩点击退出；通过“放回”按钮或非编辑状态下的 Escape 返回。

  document.getElementById("settingsBtn").addEventListener("click", () => settingsModal.classList.add("open"));
  document.getElementById("settingsClose").addEventListener("click", () => settingsModal.classList.remove("open"));
  settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) settingsModal.classList.remove("open"); });

  document.getElementById("provider").addEventListener("change", () => OFFERLIKE_AI.switchProvider());
  document.getElementById("saveKeyBtn").addEventListener("click", async () => {
    try {
      const { params, ...config } = OFFERLIKE_AI.resolve(getAiConfig());
      if (!config.apiKey) throw new Error("请填写 API Key");
      await chrome.storage.local.set({ [STORAGE_KEY_AI]: config });
      OFFERLIKE_AI.loadForm(config);
      setAiStatus("✓ 已保存");
    } catch (error) { setAiStatus(error.message, true); }
  });
  document.getElementById("testBtn").addEventListener("click", async () => {
    const config = getAiConfig();
    if (!config.apiKey) { setAiStatus("请先填写 API Key", true); return; }
    setAiStatus("测试中...");
    try {
      const { endpoint, params: requestParams } = OFFERLIKE_AI.resolve(config);
      const resp = await fetch(endpoint + "/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + config.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestParams, messages: [{ role: "user", content: "回复 OK" }], max_tokens: 32, temperature: 0 })
      });
      if (!resp.ok) { const t = await resp.text().catch(() => ""); setAiStatus("\u2717 HTTP " + resp.status + ": " + t.slice(0, 200), true); return; }
      setAiStatus("\u2713 连接成功！");
    } catch (e) { setAiStatus("\u2717 " + (e && e.message ? e.message : e), true); }
  });
});
