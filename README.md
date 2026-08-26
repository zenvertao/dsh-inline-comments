# dsh-inline-comments

DSH Web 的 GPT 式行内批注插件：在对话里选中助手回复的任意文本，就地加批注；发送时批注随正文一并交给模型，模型下一轮逐条回应。

## 功能

- 选中助手文本 → 浮出「＋ 添加注释」按钮 → 点开编辑器写批注。
- 编辑器内：**回车 = 保存**（默认），**Shift+回车 = 换行**。
- 保存后：被批注文本高亮 + 右上角编号气泡；输入框上方出现「N 条注」胶囊。
- 胶囊悬停查看详情、可删除单条；点「×」清空全部（并收回占位字符）。
- 发送时：批注以 `[i] 原文：… / 批注：…` 形式追加进正文，模型下一轮逐条回答。
- 发送后即清理（批注是「一次性」的，随发送消费）。
- 支持中文 / 英文（跟随 DSH 语言设置），自动适配亮色 / 暗色主题。
- 跨刷新持久化：批注镜像到宿主侧单一 JSON 文件（默认 `~/.dsh/dsh-inline-comments.json`，可用 `storagePath` 配置覆盖），刷新后自动恢复；发送后自动清理，不留残留。浏览器 localStorage 仅作同页快速镜像。

## 使用

1. 在助手回复里用鼠标选中一段文字。
2. 点浮出的「＋ 添加注释」。
3. 输入批注，回车保存。
4. （可选）再选别的文字继续加；胶囊里可管理 / 删除。
5. 直接回车（或点发送）——正文会带上批注，模型逐条回应。

## 架构

- `lib/client.js`（浏览器）：全部功能——高亮 / 气泡 / 胶囊 / 编辑器、批注状态（localStorage）、发送前把摘要拼进草稿。
- `lib/index.js`（宿主进程）：注册 `/_dsh/inline-comments/storage` 路由，把批注持久化到单一 JSON 文件（load / save / clear，仅 loopback、原子写、发送后清理）。
- `cordis.patch.yml`：把插件行插入 web profile 的 roster。

## 安装

```bash
dsh plugin --profile web add <package 路径或名称>
```

## 开发

- 客户端热更：编辑 `lib/client.js` 后 dsh-client-hmr 自动重载（必要时刷新页面）。
- 宿主改动需重启 `dsh web`。
- 自测（位于 `/tmp/dsh-inline-test/`）：`test.mjs`（客户端 jsdom）、`refresh-test.mjs`（刷新重挂载）、`host-test.mjs`（宿主路由）、`host-storage-test.mjs`（宿主文件往返）、`client-host-test.mjs`（客户端 fetch 集成）。

## 目录

```
lib/client.js      客户端半部（全部功能）
lib/index.js       宿主半部（存储路由 + JSON 文件持久化）
cordis.patch.yml   web profile 的 bundle patch
package.json       包元信息
```

## 许可

MIT
