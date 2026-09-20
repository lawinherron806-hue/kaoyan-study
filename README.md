# 知序 · 2028 个人考研学习空间

可运行的 V1 项目。Next.js 16 App Router + TypeScript + Tailwind CSS 4；正式云端方案为 Supabase Auth / PostgreSQL / Storage + Vercel。

## 现在开始使用

需要 Node.js 22.13+（推荐 Node.js 24 LTS）。在项目目录打开终端：

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

打开 http://127.0.0.1:3000 ，点击注册，使用自己的邮箱和至少 8 位密码创建账号。本机模式不发送验证邮件。未配置环境变量时默认使用本机持久化模式，页面会清楚标示。无须 AI Key 或云服务即可试用完整 V1。

本机模式的数据在 `.local/study.sqlite`，文件在 `.local/uploads/`。密码使用带随机盐的 scrypt，登录令牌仅保存 SHA-256 摘要，浏览器通过 HttpOnly Cookie 保持 30 天会话。退出立即撤销本机会话。本机模式只用于本机 / 自托管单实例，不用于 Vercel；默认监听 127.0.0.1，不自动向局域网公开。

**本机数据和云端数据是两个独立空间，不会自动迁移。** 正式大量录入之前建议先配置 Supabase。备份本机数据时先停止服务，然后复制整个 `.local` 目录（包含数据库及原始上传文件）；恢复时将备份放回同一位置。该目录属于个人私有数据，不要提交到 Git 或上传为部署产物。

## 已实现的 V1

- 注册、登录、退出、登录保持；每个账号的数据独立。
- 学习首页：今日 / 周 / 月学习分钟数、连续学习、任务完成率、最近上传资料；没有记录时显示真实空状态。
- 个人目标日期及倒计时，不伪造尚未正式公布的 2028 考研初试日期。
- 初始科目：数学二、英语二、信号与系统、其他资料；章节与资料类型可扩展。
- 笔记、错题独立类型 / 独立入口。V1 管理原始文件，结构化笔记与错题编辑属于 V2。
- 单文件上传最大 25 MB：PDF / DOC / DOCX / Markdown / TXT / JPG / PNG / WEBP；科目 → 章节 → 类型 → 标签归档。
- 资料名称 / 标签搜索、科目 / 类型筛选、PDF / 图片预览、文本打开、原文件下载及删除。
- Word 原文件可下载至 Word / WPS 等应用查看，不将其误称为在线 Word 阅读器。
- 额外提供基础每日计划：新建 / 修改 / 延期 / 未开始 / 进行中 / 完成；完成时以填写分钟数生成学习记录，反复提交不重复计时，撤销完成移除相应记录。
- 响应式电脑 / 平板布局及手机底部导航、浅色 / 深色模式。

资料导入第一阶段走文件上传：将 ChatGPT 整理的内容导出为支持的文件格式后归档。当前没有读取 ChatGPT 对话的能力，没有假连接器。

## 配置 Supabase 云端

1. 创建 Supabase 项目，在 SQL Editor 执行 `supabase/migrations/001_initial.sql`。该迁移用于全新项目，仅执行一次。脚本创建 20 张业务表、索引、RLS、原子任务记录函数及私有 `study-files` 存储桶。
2. 在项目 API 设置复制项目 URL 和可公开的 Anon / Publishable Key，写入 `.env.local`：

```dotenv
DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
APP_URL=http://127.0.0.1:3000
```

3. Supabase Authentication → URL Configuration：本地 Site URL 配置为 `http://127.0.0.1:3000`；Redirect URLs 添加 `http://127.0.0.1:3000/auth/confirm`。正式使用时改为自己的 HTTPS 域名，并添加对应 `/auth/confirm` 地址。
4. 推荐开启邮箱确认。Confirm signup 邮件模板使用：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">确认邮箱并打开知序</a>
```

同时支持 PKCE `code` 回调。模板使用上述 token_hash 方式可让邮件链接在另一台设备上完成确认。配置邮件发送服务及额度后，再验证真实邮件送达。
5. 重启服务，注册新云端账号并确认邮箱。首次进入系统自动创建该用户自己的默认科目和类型，不生成虚构学习记录。

浏览器文件直传 Supabase，避免大文件经过 Vercel 的函数请求体限制。上传成功后服务端校验远端大小，才将文件标记为 `ready`。用户仅能访问自己的 Storage 路径，查看 / 下载使用 60 秒有效签名链接。分享该链接的人在有效期内可读取相应文件，因此不要将它作为长期公开链接。任何 Service Role Key 都不需要放在浏览器或此项目中。

中断或关闭上传页面可能留下 `pending` 元数据或孤立对象；它们不会进入资料库。V1 的失败请求会尽力清理，后续可增加按日期清理任务。在已有笔记等引用时删除文件，原始引用会置空，结构化内容不会跟着消失。

## 部署到 Vercel

1. 将代码提交到自己的 Git 仓库，注意 `.env.local`、`.local`、`.next` 均不能提交。
2. 在 Vercel 导入项目，选择 Next.js，Node.js 24.x。默认构建命令 `npm run build`。
3. 填写 `DATA_BACKEND=supabase`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`APP_URL=https://你的域名`。
4. 配置 Supabase 正式 Site URL / 回调地址，然后部署。
5. 从电脑和手机分别注册 / 登录，测试上传、下载、退出与邮箱确认。两台设备使用同一账号可共享云端数据。

`DATA_BACKEND=local` 在 Vercel 上会明确拒绝运行，避免临时磁盘造成数据丢失。本次交付没有代建 Supabase / Vercel 账号，也没有在线公开部署；云端真实认证、邮件和文件直传需要以上配置后完成最终联调。

## 项目结构

```text
src/app/                       页面、认证回调和 API Route Handlers
src/components/                响应式学习界面、登录、弹窗与上传交互
src/lib/auth.ts                 会话验证与本机认证
src/lib/supabase.ts             基于 Cookie 的 Supabase 服务端客户端
src/lib/store.ts                按用户隔离的数据访问层
src/lib/tasks.ts                学习任务 + 记录的原子保存
src/lib/local-db.ts             本机 SQLite 适配器
src/lib/bootstrap.ts            每个用户的默认目录初始化
src/lib/ai/contracts.ts         后续 AI 服务契约
src/proxy.ts                   Supabase 会话刷新
supabase/migrations/           PostgreSQL 全阶段数据基础
tests/                         文件校验、日期、API、SQL 与隔离测试
docs/architecture.md            数据模型与后续演进
```

## 验证命令

```powershell
npm run typecheck
npm run build
npm test
# 另开终端启动本机服务后，运行真实 HTTP 集成测试：
$env:TEST_BASE_URL='http://127.0.0.1:3000'
npm test
```

没有 `TEST_BASE_URL` 时只跳过 HTTP 集成用例，其余用例正常执行。HTTP 测试会在本机环境创建 `qa-*@study.invalid` 测试账号，请勿指向正式云端。PostgreSQL 测试使用 PGlite 执行真实迁移（仅替代 Supabase 所属的 auth/storage schemas，不请求真实 Supabase），验证 RLS、跨用户外键、匿名读取限制和任务记录幂等性。

生产运行：`npm run build` 后 `npm start`。SQLite API 在某些 Node 版本可能提示 experimental 警告，不影响本机运行。

## 阶段边界

V2：知识点、结构化笔记、AI 解析、结构化错题、全局跨类型搜索。
V3：AI 针对性出题、答题 / 判题、错题归档、掌握度更新。
V4：间隔复习、趋势分析、AI 计划、PWA 安装与离线策略。

当前 `/api/ai` 返回已认证的 501 未实现状态；不会伪造 AI 结果或消耗 API 配额。环境模板预留服务端 `OPENAI_API_KEY` 和模型配置。PWA Service Worker 尚未启用，避免缓存私人资料与登录页面引发隐私和离线一致性问题。

参考：[Next.js 安装文档](https://nextjs.org/docs/app/getting-started/installation)、[Supabase SSR](https://supabase.com/docs/guides/auth/server-side)、[Supabase Next.js 会话管理](https://supabase.com/docs/guides/auth/server-side/creating-a-client)。
