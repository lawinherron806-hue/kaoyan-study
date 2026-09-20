"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Upload, FileText } from "lucide-react";
import type { Snapshot, Task, StudyFile } from "@/lib/types";
import { validateFile } from "@/lib/config";
import { api } from "@/lib/client-api";
import { Modal } from "./modal";
const bytes = (size: number) =>
  size > 1048576
    ? (size / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(size / 1024)) + " KB";
export function UploadDialog({
  data,
  defaultSubject,
  defaultKind,
  onClose,
  onSaved,
}: {
  data: Snapshot;
  defaultSubject: string;
  defaultKind: "note" | "mistake";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [subject, setSubject] = useState(
      defaultSubject === "all" ? data.subjects[0]?.id : defaultSubject,
    ),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function select(file: File | undefined) {
    if (!file) return;
    try {
      validateFile(file.name, file.size);
      setFile(file);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setMessage("请先选择文件");
      return;
    }
    setBusy(true);
    setMessage("正在上传，请保持页面打开…");
    let pendingId: string | undefined;
    try {
      const form = new FormData(e.currentTarget);
      const prepared = await api("/api/files", {
        title: String(form.get("title") || file.name),
        original_name: file.name,
        size: file.size,
        subject_id: subject,
        chapter_id: form.get("chapter") || null,
        category_id: form.get("category"),
        tags: String(form.get("tags") || "")
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .filter((t, i, a) => a.indexOf(t) === i),
      });
      pendingId = prepared.id;
      if (prepared.backend === "supabase") {
        const client = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { error } = await client.storage
          .from("study-files")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type || "application/octet-stream",
          });
        if (error) throw error;
      } else {
        const payload = new FormData();
        payload.set("file", file);
        const response = await fetch(`/api/files/${prepared.id}`, {
          method: "PUT",
          body: payload,
        });
        if (!response.ok) throw new Error((await response.json()).error);
      }
      await api(`/api/files/${prepared.id}`);
      pendingId = undefined;
      await onSaved();
    } catch (e) {
      if (pendingId)
        await api(`/api/files/${pendingId}`, undefined, "DELETE").catch(
          () => {},
        );
      setMessage(e instanceof Error ? e.message : "上传失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="收好一份新知识"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <label
          className={`dropzone ${file ? "has-file" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            select(e.dataTransfer.files[0]);
          }}
        >
          <Upload size={30} />
          <strong>{file ? file.name : "点击选择，或把文件拖到这里"}</strong>
          <span>
            {file
              ? bytes(file.size)
              : "PDF / Word / Markdown / TXT / 图片 · 最大 25 MB"}
          </span>
          <input
            type="file"
            aria-label="选择上传文件"
            accept=".pdf,.doc,.docx,.md,.txt,.jpg,.jpeg,.png,.webp"
            onChange={(e) => select(e.target.files?.[0])}
          />
        </label>
        <label>
          资料名称
          <input
            name="title"
            key={file?.name || "empty"}
            defaultValue={file?.name || ""}
            placeholder="例如：高等数学 · 极限课程笔记"
            maxLength={180}
          />
        </label>
        <div className="form-grid">
          <label>
            科目
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            >
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            章节
            <select name="chapter" key={subject}>
              <option value="">未指定章节</option>
              {data.chapters
                .filter((c) => c.subject_id === subject)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          资料类型
          <select
            name="category"
            required
            defaultValue={
              data.categories.find((c) => c.kind === defaultKind)?.id
            }
          >
            {["note", "mistake", "material"].map((kind) => (
              <optgroup
                label={
                  kind === "note"
                    ? "笔记（独立管理）"
                    : kind === "mistake"
                      ? "错题（独立管理）"
                      : "其他学习资料"
                }
                key={kind}
              >
                {data.categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          标签
          <input name="tags" placeholder="极限，基础课，第一章（用逗号分隔）" />
          <small>
            最多 10 个标签，每个不超过 30 字。自动分类将在 V2 开放。
          </small>
        </label>
        <p role="status" className="form-message">
          {message}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button className="btn primary" disabled={busy || !file}>
            <Upload size={16} />
            {busy ? "正在保存…" : "上传并归档"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TaskDialog({
  data,
  task,
  date,
  onClose,
  onSaved,
}: {
  data: Snapshot;
  task: Task | "new";
  date: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const existing = task === "new" ? null : task;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={existing ? "调整学习计划" : "给今天一个小目标"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const f = new FormData(e.currentTarget);
            await api("/api/tasks", {
              id: existing?.id,
              title: f.get("title"),
              subject_id: f.get("subject") || null,
              date: f.get("date"),
              minutes: Number(f.get("minutes")),
              status: f.get("status"),
            });
            await onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          学习内容
          <input
            name="title"
            defaultValue={existing?.title}
            placeholder="例如：武忠祥基础课 · 函数的有界性"
            required
            maxLength={180}
          />
        </label>
        <label>
          科目
          <select
            name="subject"
            defaultValue={existing?.subject_id || data.subjects[0]?.id}
          >
            <option value="">个人计划</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            计划日期
            <input
              type="date"
              name="date"
              required
              defaultValue={existing?.date || date}
            />
          </label>
          <label>
            学习时长（分钟）
            <input
              type="number"
              name="minutes"
              defaultValue={existing?.minutes || 30}
              min={1}
              max={1440}
              required
            />
          </label>
        </div>
        <label>
          状态
          <select name="status" defaultValue={existing?.status || "todo"}>
            <option value="todo">未开始</option>
            <option value="doing">进行中</option>
            <option value="done">已完成</option>
          </select>
          <small>完成时以这里填写的时长生成学习记录，可按实际用时修改。</small>
        </label>
        <p role="status" className="form-message">
          {error}
        </p>
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "保存中…" : "保存计划"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function CatalogDialog({
  data,
  onClose,
  onSaved,
}: {
  data: Snapshot;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState("subject"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="扩展你的资料分类" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const f = new FormData(e.currentTarget);
            await api("/api/catalog", {
              type,
              name: f.get("name"),
              subject_id: f.get("subject_id") || undefined,
              kind: f.get("kind") || undefined,
            });
            await onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          新建类型
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="subject">科目</option>
            <option value="chapter">章节</option>
            <option value="category">资料类型</option>
          </select>
        </label>
        {type === "chapter" && (
          <label>
            所属科目
            <select name="subject_id">
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === "category" && (
          <label>
            独立归档到
            <select name="kind">
              <option value="material">普通资料</option>
              <option value="note">学习笔记</option>
              <option value="mistake">错题库</option>
            </select>
          </label>
        )}
        <label>
          名称
          <input
            name="name"
            required
            maxLength={60}
            placeholder="输入新的分类名称"
          />
        </label>
        <p role="status" className="form-message">
          {error}
        </p>
        <div className="modal-actions">
          <button className="btn primary" disabled={busy}>
            创建分类
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function FilePreview({ file }: { file: StudyFile }) {
  if (file.mime_type.startsWith("text/"))
    return <TextPreview key={file.id} file={file} />;
  if (file.mime_type.startsWith("image/"))
    return (
      <div className="preview-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/${file.id}`} alt={file.title} />
      </div>
    );
  if (file.mime_type === "application/pdf")
    return (
      <div className="preview-pdf">
        <object data={`/api/files/${file.id}`} type="application/pdf">
          <p>此浏览器不支持内嵌 PDF。请点击下方“打开文件”查看。</p>
        </object>
      </div>
    );
  return (
    <div className="preview-other">
      <FileText size={38} />
      <p>
        {file.mime_type.startsWith("text/")
          ? "点击“打开文件”阅读文本，或下载原文件。"
          : "Word 文件请下载后使用 Word、WPS 或手机文档应用查看。"}
      </p>
    </div>
  );
}
function TextPreview({ file }: { file: StudyFile }) {
  const [text, setText] = useState("正在读取文件…");
  useEffect(() => {
    if (file.size > 1024 * 1024) {
      setText("文本超过 1 MB，请下载原文件查看完整内容。");
      return;
    }
    const controller = new AbortController();
    fetch(`/api/files/${file.id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("文件读取失败");
        return response.text();
      })
      .then(setText)
      .catch((error) => {
        if (error.name !== "AbortError")
          setText("暂时无法预览，请尝试下载原文件。");
      });
    return () => controller.abort();
  }, [file.id, file.size]);
  return <pre className="text-preview">{text}</pre>;
}
