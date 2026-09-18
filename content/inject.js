// ============================================================
// OFFER Like - 注入页面主世界（MAIN world）的低层操作
// 为什么：内容脚本在"隔离世界"，它构造的 MouseEvent 用页面的
//         instanceof 检查会失败。这里用页面自己的构造函数派发事件。
// ============================================================
(function () {
  "use strict";
  const bridgeAlreadyInstalled = !!window.__OFFERLIKE__;

  function fire(el, type, extra) {
    try {
      const o = Object.assign(
        { bubbles: true, cancelable: true, view: window, clientX: 0, clientY: 0 },
        extra || {}
      );
      if (type.indexOf("pointer") === 0) {
        el.dispatchEvent(new PointerEvent(type, o));
      } else {
        el.dispatchEvent(new MouseEvent(type, o));
      }
    } catch (e) {}
  }

  // 真实点击（完整照抄求职方舟 clickDom 的三步曲）
  function click(el) {
    if (!el) return false;
    let t = el;
    try {
      if (typeof el.scrollIntoViewIfNeeded === "function") el.scrollIntoViewIfNeeded();
      else el.scrollIntoView({ block: "center" });
    } catch (e) {}

    // ① 找该坐标真正命中的顶层元素（可能被透明层/伪元素挡住）
    try {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const doc = el.ownerDocument || document;
        if (doc && typeof doc.elementFromPoint === "function") {
          const hit = doc.elementFromPoint(cx, cy);
          if (hit && (el.contains(hit) || hit.contains(el) || el.parentNode === hit.parentNode)) {
            t = hit;
          }
        }
      }
    } catch (e) {}

    // ② 向上找有 .click() 方法的元素
    while (t && typeof t.click !== "function") t = t.parentElement;
    if (!t) t = el;

    // ③ 派发 mousedown → focus → mouseup → click
    const win = (t.ownerDocument && t.ownerDocument.defaultView) || window;
    const o = { bubbles: true, cancelable: true, view: win };
    try { t.dispatchEvent(new win.MouseEvent("mousedown", o)); } catch (e) {}
    try { t.dispatchEvent(new win.FocusEvent("focus", o)); } catch (e) {}
    try { t.dispatchEvent(new win.MouseEvent("mouseup", o)); } catch (e) {}
    try { t.dispatchEvent(new win.MouseEvent("click", o)); } catch (e) {}
    return true;
  }

  // 用原生 setter + input/change 事件设置值（React 受控组件通用技巧）
  function setValue(input, value) {
    if (!input) return false;
    try {
      const proto =
        input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      if (setter) setter.call(input, value);
      else input.value = value;
    } catch (e) {
      input.value = value;
    }
    try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    try { input.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
    return true;
  }

  function focus(el) {
    try { el.focus(); } catch (e) {}
    return true;
  }

  // 读回控件当前值
  function readValue(el) {
    try {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el.value || "";
      const inp = el.querySelector("input,textarea");
      if (inp) return inp.value || "";
      const sel = el.querySelector(
        "[class*='selection-item'],[class*='selected-item'],[class*='selected-value'],[class*='selection-text']"
      );
      if (sel && sel.textContent.trim()) return sel.textContent.trim();
      return (el.innerText || "").trim().slice(0, 40);
    } catch (e) { return ""; }
  }

  // 按任意键（用键盘打开下拉 / 提交）
  function pressKey(input, key) {
    if (!input) return false;
    try {
      const map = { Enter: 13, ArrowDown: 40, ArrowUp: 38, Escape: 27, " ": 32 };
      const kd = { key: key, code: key, keyCode: map[key] || 0, which: map[key] || 0, bubbles: true, cancelable: true };
      input.dispatchEvent(new KeyboardEvent("keydown", kd));
      input.dispatchEvent(new KeyboardEvent("keypress", kd));
      input.dispatchEvent(new KeyboardEvent("keyup", kd));
    } catch (e) {}
    return true;
  }

  // 诊断：看元素及其祖先上挂了哪些 React 内部属性
  function diagnose(el) {
    const out = [];
    let node = el;
    for (let i = 0; i < 5 && node; i++) {
      try {
        const ks = Object.keys(node).filter((k) => k.indexOf("__react") === 0);
        if (ks.length) out.push((node.tagName || "?") + "[" + ks.join(",") + "]");
      } catch (e) {}
      node = node.parentElement;
    }
    return out.join(" > ");
  }

  // 直接调用 React 的事件处理器（绕开事件系统，最后手段）
  function reactCall(el, name) {
    let node = el;
    for (let i = 0; i < 8 && node; i++) {
      try {
        const ks = Object.keys(node);
        for (let a = 0; a < ks.length; a++) {
          const k = ks[a];
          if (k.indexOf("__reactProps$") === 0) {
            const props = node[k];
            const fn = props[name];
            if (typeof fn === "function") {
              const t = name.replace(/^on/, "").toLowerCase();
              let ne = {};
              try { ne = new MouseEvent(t, { bubbles: true }); } catch (e) {}
              const ev = {
                type: t, target: el, currentTarget: node, button: 0,
                preventDefault: function () {}, stopPropagation: function () {},
                nativeEvent: ne
              };
              try { fn(ev); } catch (e) {}
              return true;
            }
          }
        }
      } catch (e) {}
      node = node.parentElement;
    }
    return false;
  }

  function reactClick(el) {
    if (reactCall(el, "onClick")) return true;
    if (reactCall(el, "onMouseDown")) return true;
    return false;
  }

  // 按回车（提交日期用）
  function pressEnter(input) {
    if (!input) return false;
    try {
      const kd = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
      input.dispatchEvent(new KeyboardEvent("keydown", kd));
      input.dispatchEvent(new KeyboardEvent("keypress", kd));
      input.dispatchEvent(new KeyboardEvent("keyup", kd));
    } catch (e) {}
    return true;
  }

  function phoenixChoose(el, terminal = false) {
    if (!el || !el.matches(".list-item-container,.phoenix-selectList__listItem,.area-item-container")) return false;
    for (const target of [el, el.querySelector(".area-item-name"), el.querySelector(".area-text-label"), el.querySelector(".icon-container")]) {
      if (!target) continue;
      const key = Object.keys(target).find((k) => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber"));
      let fiber = key && target[key];
      for (let i = 0; fiber && i < 10; i++, fiber = fiber.return) {
        const props = fiber.memoizedProps;
        if (!props || !props.data) continue;
        const handler = el.matches(".area-item-container")
          ? (terminal ? props.onChangeCheck || props.onClickLabel : props.onClickLabel || props.onChangeCheck) : props.onChangeCheck || props.onClickLabel;
        if (typeof handler === "function") { handler(props.data); return true; }
      }
    }
    return false;
  }
  function setPhotoFile(el, photo) {
    const fail = (code, error) => ({ ok: false, code, error });
    if (!el || el.type !== "file" || el.disabled || !el.isConnected) return fail("INVALID_INPUT", "上传框不存在、已禁用或已重绘");
    if (el.files?.length) return fail("EXISTING_FILE", "上传框已有文件");
    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(photo?.dataUrl || "");
    if (!match || match[2].length > 400 * 1024 || match[1] !== photo.type) return fail("INVALID_DATA", "照片格式无效或超过 300 KB");
    const win = el.ownerDocument.defaultView;
    const binary = win.atob(match[2]);
    if (!binary.length || binary.length > 300 * 1024) return fail("INVALID_SIZE", "照片为空或超过 300 KB");
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    try {
      const file = new win.File([bytes], photo.name || (photo.type === "image/png" ? "portrait.png" : "portrait.jpg"), { type: photo.type });
      const transfer = new win.DataTransfer();
      transfer.items.add(file);
      const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "files").set;
      setter.call(el, transfer.files);
      if (!el.files?.length) return fail("FILE_ASSIGNMENT", "浏览器未接收照片文件");
    } catch (error) { return fail("FILE_ASSIGNMENT", error.message || "照片文件交付失败"); }
    // 招聘站可能在 change 处理器里同步压缩图片，耗时超过桥接的 2.5 秒超时。
    // 先返回“文件已设置”，再通知页面，避免被误判为没有上传。
    win.queueMicrotask(() => {
      try { el.dispatchEvent(new win.Event("input", { bubbles: true })); } catch (error) {}
      try { el.dispatchEvent(new win.Event("change", { bubbles: true })); } catch (error) {}
    });
    // change 后页面可能清空 input 并打开裁剪框，不能据此宣称服务器已上传成功。
    return { ok: true, stage: "assigned" };
  }
  window.__OFFERLIKE__ = { click: click, setValue: setValue, focus: focus, readValue: readValue, pressEnter: pressEnter, pressKey: pressKey, reactClick: reactClick, diagnose: diagnose, phoenixChoose: phoenixChoose, setPhotoFile: setPhotoFile,
    bridgeInfo: () => ({ version: "3.15", photo: true }) };

  // 响应内容脚本的跨世界调用
  if (!bridgeAlreadyInstalled) window.addEventListener("offerlike-call", function (e) {
    const d = (e && e.detail) || {};
    let result;
    try {
      const fn = window.__OFFERLIKE__[d.fn];
      result = fn ? fn.apply(null, d.args || []) : null;
    } catch (err) { result = d.fn === "setPhotoFile" ? { ok: false, code: "BRIDGE_EXCEPTION", error: err.message } : null; }
    try {
      window.dispatchEvent(new CustomEvent("offerlike-result-" + d.id, { detail: result }));
    } catch (err) {}
  });
})();
