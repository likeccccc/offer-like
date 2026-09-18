# OFFER Like

> 智能识别招聘网页表单，用 AI 一键填充你的简历。

当前为试用版本，不同招聘网站兼容程度有所不同，请在提交前核对填写结果。

## 快速上手

1. 打开 `edge://extensions` → 开「开发者模式」→「加载已解压的扩展程序」→ 选本目录
2. 点扩展图标 → 「打开档案盒」→ 上传简历（docx/pdf/txt）或粘贴，AI 自动解析成结构化字段
3. 打开招聘网站 → 点右下角文件夹按钮 → 「一键填充本页」
4. 使用「辅助填充」时，先点网页输入框，再点对应资料按钮；匹配按钮以浅红色标记，多段经历按条目展示。

从 GitHub 下载 ZIP 后请先解压，再加载包含 `manifest.json` 的目录。更新代码后需重新加载扩展并刷新招聘页面。

## 数据与权限

个人资料与 API Key 保存在浏览器扩展本地存储中。AI 解析和字段映射会向你配置的服务商发送相应请求，需要自行提供 API Key。

扩展使用网页访问权限识别表单、storage 权限保存资料，并在普通点击无效时通过 debugger 权限尝试浏览器点击。证件照限制在 300 KB 内，部分网站需要手动裁剪或确认上传。

## 目录

```
ai-resume-filler/
├── manifest.json          # 扩展清单
├── background.js          # 后台：AI 代理 + 打开资料库
├── content/               # 悬浮窗 + 表单填充（核心）
│   ├── content.js         #   扫描表单 + AI 填充
│   ├── content.css        #   悬浮按钮/面板样式
│   └── inject.js          #   注入页面主世界的操作库
├── options/               # 个人资料库（3D 档案盒）
├── popup/                 # 工具栏弹窗
├── assets/                # 品牌 logo
├── icons/                 # 扩展图标
├── vendor/                # JSZip / pdf.js
└── tests/                 # Node.js 模拟回归测试
```

## 技术要点

- Manifest V3，纯原生 JS，无后端，无 npm 依赖
- AI：DeepSeek / 千问 / Kimi / 豆包 / 自定义兼容接口
- 数据：`chrome.storage.local` 本地存储
- 运行 `node tests/assist-match.cjs` 等测试文件检查对应功能；模拟测试不代表所有网站实测通过。
