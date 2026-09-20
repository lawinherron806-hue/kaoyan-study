# 架构与演进

## V1 运行路径

页面 → 同源 API → 验证真实用户 → 验证输入 / 所属关系 → 数据访问层 → SQLite 本机适配器或 Supabase RLS 客户端。

UI 不内置模拟学习记录，读取服务端 Snapshot。默认科目是每个新用户实际持久化的初始目录。服务端用户由会话获得，不接受请求体中伪造的 user_id。每个入口再次验证登录，不能仅依赖前端跳转。

本机适配器用于立即开发及单机使用；SQLite 是事务性持久化数据库，非 localStorage 或内存演示。它使用 records(entity,id,user_id,data) 保存 V1 业务对象。云端模型采用规范化 PostgreSQL 表。由于认证身份不同，未来迁移必须显式映射 user_id、实体 ID、文件路径；目前没有自动迁移器。

## 数据链

files → ai_analysis → notes / knowledge_points → questions → practice_sessions / practice_answers → mistakes → review_records → study_tasks / study_records。

notes、mistakes 完全独立，分别经 note_knowledge_points、mistake_knowledge_points 关联知识点。题目经 question_knowledge_points 多对多关联知识点。AI 输出保留来源文件、模型、提示词版本、审核状态，后续必须允许人工修订，不能直接把生成答案当作真值。

默认章节可通过“管理分类”继续添加。chapters、knowledge_points 保留父节点支持深层目录。V1 资料类型附 kind=note/mistake/material 区分归档，实际结构化内容分别保存在独立业务表。

## 权限

- 每张业务表包含 user_id、created_at、updated_at、主键和 (id,user_id) 唯一约束。
- 外键带 user_id，防止“我拥有的记录关联他人的文件 / 科目”的越权漏洞。
- authenticated 的读、写、改、删策略都限制 auth.uid()=user_id；anon 无业务表权限。
- 私有 Storage 的首级目录必须为用户 UUID，读写均以 RLS 验证。全局禁止公共桶。
- 用户表只保存档案，邮箱和密码由 Supabase Auth 管理。应用不使用 Service Role 绕过 RLS。
- 存储的每个业务记录都由服务端设置所有者。浏览器只保存主题偏好；本机身份 Cookie 为 HttpOnly。
- 任务完成与学习记录原子提交，记录 ID 和任务 ID 相同，支持幂等更新以及撤销。

## API 契约

| 路径 | 行为 |
| --- | --- |
| POST /api/auth | register / login / logout |
| GET /api/state | 当前用户的 V1 学习快照 |
| POST /api/profile | 称呼及目标日期 |
| POST /api/catalog | 添加科目、章节、资料类型 |
| POST /api/tasks | 保存任务及相应学习记录 |
| POST /api/files | 校验元数据并获取上传凭据 |
| PUT /api/files/:id | 本机文件上传；云端直接上传 Storage |
| POST /api/files/:id | 校验已上传文件并完成归档 |
| GET /api/files/:id | 验证所有权后查看 / 下载 |
| DELETE /api/files/:id | 删除原文件与元数据 |
| POST /api/ai | 登录后返回 501；预留 V2 provider 接口 |

V1 文件标签暂以 text[] 提供立即筛选；file_tags/tags 为 V2 的标签管理基础，V2 需迁移现有 text[] 为关联记录。跨内容全局搜索计划使用统一 search API 返回 typed hit + entity ID；中文检索初期采用受 RLS 限制的子串 / trigram，不能将 simple FTS 误认为完整中文分词。

## 后续执行次序

1. V2 增加提取任务队列、文档解析、OCR、人工编辑与来源追溯，AI 请求只在服务端执行；对用户文件中的提示文本按不可信内容处理。
2. V3 按 mastery、due time、历史错误频率计算知识点权重，再选题 / 出题。主观题保留人工判定，不误用字符串全等作为数学答案判题。
3. V4 引入可配置复习间隔、通知偏好、趋势统计与时区设置。默认统计使用 Asia/Shanghai。
4. PWA 仅缓存公开静态资产。账户数据、上传文件、签名 URL 和认证路由不得使用共享缓存。离线写入需单独实现重试与冲突处理。

## 运行边界

V1 快照适用于个人数据量；后续资料增长需按页面改为数据库分页聚合，而非一次拉取全部实体。没有实现邮件找回密码、复杂重复任务、移动端扫描矫正、全文 OCR 或后台 AI 工作流。
