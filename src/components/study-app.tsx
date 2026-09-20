"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import {
  BookOpen,
  LayoutDashboard,
  FolderOpen,
  NotebookPen,
  Bookmark,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Clock,
  Check,
  CheckCheck,
  Flame,
  Target,
  FileText,
  Upload,
  Sun,
  Moon,
  LogOut,
  Leaf,
  X,
  Download,
  Trash2,
  BookMarked,
  Layers,
  GraduationCap,
  PanelLeftClose,
  Menu,
  Timer,
  TriangleAlert,
  CloudUpload,
} from "lucide-react";
import type { Snapshot, StudyFile, Task } from "@/lib/types";
import { today, dayOffset, streak, chinaDay } from "@/lib/dates";
import { Modal } from "./modal";
import { api } from "@/lib/client-api";
import {
  UploadDialog,
  TaskDialog,
  CatalogDialog,
  FilePreview,
} from "./study-dialogs";
const displayFileName = (name: string) => name.replace(/^(数学|英语|信号)__[^_]+__/, "");
type Icon = typeof BookOpen;
const nav: { href: string; label: string; icon: Icon; future?: boolean }[] = [
  { href: "/", label: "学习概览", icon: LayoutDashboard },
  { href: "/library", label: "我的资料库", icon: FolderOpen },
  { href: "/notes", label: "学习笔记", icon: NotebookPen },
  { href: "/mistakes", label: "独立错题库", icon: Bookmark },
  { href: "/plan", label: "学习计划", icon: CalendarDays },
  { href: "/roadmap", label: "成长路线", icon: ChartNoAxesCombined },
];
const bytes = (size: number) =>
  size > 1048576
    ? (size / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(size / 1024)) + " KB";
const duration = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} 小时 ${min % 60} 分` : `${min} 分钟`;

export default function StudyApp({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState(initial),
    [query, setQuery] = useState(""),
    [subject, setSubject] = useState("all"),
    [category, setCategory] = useState("all"),
    [upload, setUpload] = useState(false),
    [taskModal, setTaskModal] = useState<Task | "new" | null>(null),
    [catalog, setCatalog] = useState(false),
    [viewFile, setViewFile] = useState<StudyFile | null>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [planDate, setPlanDate] = useState(today());
  const pathname = usePathname(),
    date = today(),
    isLibrary = ["/library", "/notes", "/mistakes"].includes(pathname),
    activeTitle = nav.find((n) => n.href === pathname)?.label || "我的设置";
  const subjects = useMemo(
      () => new Map(data.subjects.map((s) => [s.id, s])),
      [data.subjects],
    ),
    categories = useMemo(
      () => new Map(data.categories.map((s) => [s.id, s])),
      [data.categories],
    );
  async function refresh() {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("数据刷新失败，请重新登录");
    setData(await res.json());
  }
  async function act(fn: () => Promise<void>, message?: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (message) setToast(message);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  function theme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("study-theme", next);
  }
  const filtered = data.files.filter(
    (f) =>
      (subject === "all" || f.subject_id === subject) &&
      (category === "all" || f.category_id === category) &&
      (pathname !== "/notes" ||
        categories.get(f.category_id)?.kind === "note") &&
      (pathname !== "/mistakes" ||
        categories.get(f.category_id)?.kind === "mistake") &&
      (!query ||
        [f.title, f.original_name, ...f.tags]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const todayTasks = data.tasks.filter((t) => t.date === date),
    done = todayTasks.filter((t) => t.status === "done").length,
    todayRecords = data.records.filter((r) => r.date === date),
    minutes = todayRecords.reduce((s, r) => s + r.minutes, 0),
    todayAnswers = data.answers.filter((a) => chinaDay(a.created_at) === date);
  const weekStart = dayOffset(
      date,
      -((new Date(date + "T12:00Z").getUTCDay() + 6) % 7),
    ),
    weekMinutes = data.records
      .filter((r) => r.date >= weekStart && r.date <= date)
      .reduce((s, r) => s + r.minutes, 0),
    monthMinutes = data.records
      .filter((r) => r.date.slice(0, 7) === date.slice(0, 7) && r.date <= date)
      .reduce((s, r) => s + r.minutes, 0);
  const dueKnowledge = data.knowledge.filter(
      (k) => k.next_review_at && chinaDay(k.next_review_at) <= date,
    ),
    dueMistakes = data.mistakes.filter(
      (k) =>
        !k.mastered && k.next_review_at && chinaDay(k.next_review_at) <= date,
    );
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const countdown = data.profile.exam_date
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(data.profile.exam_date + "T00:00:00+08:00") -
            Date.parse(date + "T00:00:00+08:00")) /
            86400000,
        ),
      )
    : null;
  function fileRow(f: StudyFile) {
    const s = subjects.get(f.subject_id);
    return (
      <button className="file-row" key={f.id} onClick={() => setViewFile(f)}>
        <span className={`file-icon ${s?.color}`}>
          <FileText size={21} />
        </span>
        <span className="file-info">
          <strong>{displayFileName(f.title)}</strong>
          <small>
            {s?.name} <span> / </span>
            {categories.get(f.category_id)?.name} · {bytes(f.size)}
          </small>
        </span>
        <span className="file-date">
          {chinaDay(f.created_at).slice(5, 10).replace("-", "/")}
        </span>
        <ChevronRight size={16} />
      </button>
    );
  }
  function taskRow(t: Task) {
    const s = subjects.get(t.subject_id || "");
    return (
      <div
        className={`task-row ${t.status === "done" ? "completed" : ""}`}
        key={t.id}
      >
        <button
          className={`task-check ${t.status}`}
          disabled={busy}
          aria-label={`${t.status === "done" ? "撤销完成" : "完成"}：${t.title}`}
          onClick={() =>
            act(
              async () => {
                await api("/api/tasks", {
                  ...t,
                  status: t.status === "done" ? "todo" : "done",
                });
              },
              t.status === "done" ? "已撤销完成" : "已完成，并记录学习时长",
            )
          }
        >
          <Check size={15} />
        </button>
        <button className="task-content" onClick={() => setTaskModal(t)}>
          <strong>{t.title}</strong>
          <span>
            <i className={"dot " + (s?.color || "green")} />
            {s?.name || "个人计划"} <span className="divider">/</span>
            <Clock size={12} />
            {t.minutes} 分钟
          </span>
        </button>
        <span className={"status " + t.status}>
          {t.status === "done"
            ? "已完成"
            : t.status === "doing"
              ? "进行中"
              : "未开始"}
        </span>
      </div>
    );
  }
  return (
    <div className="app">
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span>
            知序<span className="brand-en">YOUR STUDY SPACE</span>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="dot green" />
          2028 考研 · 个人空间
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="关闭导航"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              className={pathname === n.href ? "active" : ""}
              href={n.href}
              onClick={() => {
                setQuery("");
                setCategory("all");
                setSubject("all");
                setMobileMenu(false);
              }}
            >
              <n.icon size={19} />
              {n.label}
              {n.href === "/" && <span className="nav-indicator" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-section-label">
          我的科目{" "}
          <button
            aria-label="添加科目"
            className="icon-button"
            onClick={() => setCatalog(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="subject-nav">
          {data.subjects.map((s) => (
            <Link
              key={s.id}
              href="/library"
              onClick={() => {
                setSubject(s.id);
                setMobileMenu(false);
              }}
            >
              <i className={`dot ${s.color}`} />
              {s.name}
              <span>
                {data.files.filter((f) => f.subject_id === s.id).length}
              </span>
            </Link>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="growth-card">
            <Leaf size={20} />
            <strong>保持自己的节奏</strong>
            <p>每天前进一点，答案会慢慢清晰。</p>
            <span>
              KEEP GROWING <ArrowUpRight size={13} />
            </span>
          </div>
          <Link
            className={
              pathname === "/settings"
                ? "settings-link active"
                : "settings-link"
            }
            href="/settings"
          >
            <Settings size={18} />
            设置与账号
          </Link>
          <div className="profile-mini">
            <span className="avatar">{data.profile.name.slice(0, 1)}</span>
            <span>
              <strong>{data.profile.name}</strong>
              <small>奔赴理想的第一个脚印</small>
            </span>
            <button
              className="icon-button"
              aria-label="退出登录"
              onClick={() =>
                act(async () => {
                  await api("/api/auth", { action: "logout" });
                  window.location.href = "/login";
                })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="打开导航"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>我的学习空间</span>
            <ChevronRight size={13} />
            <strong>{activeTitle}</strong>
          </div>
          <div className="top-actions">
            <span className="storage-badge">
              <i className="dot green" />
              {data.backend === "local" ? "本机持久化" : "云端同步"}
            </span>
            <button
              className="icon-button theme-toggle"
              aria-label="切换深色或浅色模式"
              onClick={theme}
            >
              <Moon className="moon" size={19} />
              <Sun className="sun" size={19} />
            </button>
            <Link className="avatar small" href="/settings">
              {data.profile.name.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {pathname === "/"
                  ? "MAKE EVERY DAY COUNT"
                  : "A LITTLE MORE ORGANIZED"}
              </div>
              <h1>
                {pathname === "/" ? `你好，${data.profile.name}` : activeTitle}
                {pathname === "/" && <span className="greeting-dot"> ✳</span>}
              </h1>
              <p>
                {pathname === "/"
                  ? `${dateLabel}。不慌不忙，今天也向前一点。`
                  : isLibrary
                    ? "把知识妥善安放，让每次积累都有迹可循。"
                    : pathname === "/plan"
                      ? "把远大的目标，拆成今天可以做到的小事。"
                      : pathname === "/settings"
                        ? "让这个空间，更贴合你的学习习惯。"
                        : "先把基础做扎实，再让 AI 理解你的学习。"}
              </p>
            </div>
            <button className="btn primary" onClick={() => setUpload(true)}>
              <Plus size={17} />
              上传资料
            </button>
          </div>
          {pathname === "/" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-chip">
                    <GraduationCap size={15} />
                    目标 · 2028 考研
                  </span>
                  <h2>把理想，写进每一天。</h2>
                  <p>
                    今天的专注，会成为明天的底气。
                    <br />
                    从一项小任务开始，进入你的学习节奏。
                  </p>
                  <button
                    className="btn cream"
                    onClick={() => setTaskModal("new")}
                  >
                    安排今日学习 <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="arch a1" />
                  <div className="arch a2" />
                  <div className="arch a3" />
                  <span className="art-star s1">✦</span>
                  <span className="art-star s2">✧</span>
                  <div className="art-book">
                    <i />
                    <i />
                    <i />
                    <span>
                      一步一步
                      <br />
                      终有所至
                    </span>
                  </div>
                </div>
                <div className="countdown">
                  <span>距离我的目标日期</span>
                  {countdown !== null ? (
                    <strong>
                      {countdown}
                      <small>天</small>
                    </strong>
                  ) : (
                    <strong className="unset-date">
                      2028<small>目标年</small>
                    </strong>
                  )}
                  <Link href="/settings">
                    {countdown === null ? "设置备考目标日期" : "调整目标日期"}
                    <ArrowUpRight size={13} />
                  </Link>
                  <small className="exam-note">
                    {countdown === null
                      ? "考试日期以官方公布为准"
                      : "个人目标日期，非官方考试日期"}
                  </small>
                </div>
              </section>
              <div className="stats-grid">
                <Stat
                  icon={Clock}
                  label="今日学习"
                  value={duration(minutes)}
                  detail={`本周 ${duration(weekMinutes)}`}
                  color="green"
                />
                <Stat
                  icon={CheckCheck}
                  label="今日任务"
                  value={`${done} / ${todayTasks.length}`}
                  detail={
                    todayTasks.length
                      ? `已完成 ${Math.round((done / todayTasks.length) * 100)}% 的今日计划`
                      : "从一个小目标开始"
                  }
                  color="orange"
                />
                <Stat
                  icon={Target}
                  label="今日做题"
                  value={`${todayAnswers.length} 题`}
                  detail={
                    todayAnswers.length
                      ? `正确率 ${Math.round((todayAnswers.filter((a) => a.is_correct).length / todayAnswers.length) * 100)}%`
                      : "在线练习将在 V3 开放"
                  }
                  color="blue"
                />
                <Stat
                  icon={Flame}
                  label="连续学习"
                  value={`${streak(
                    data.records.map((r) => r.date),
                    date,
                  )} 天`}
                  detail={`本月累计 ${duration(monthMinutes)}`}
                  color="purple"
                />
              </div>
              <div className="dashboard-columns">
                <div className="dashboard-primary">
                  <section className="card">
                    <div className="card-header">
                      <h2>
                        <CalendarDays size={19} />
                        今日学习计划
                        <span className="count-pill">{todayTasks.length}</span>
                      </h2>
                      <Link href="/plan">
                        全部计划
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                    <div className="plan-progress">
                      <span>今天的小目标</span>
                      <span>
                        {done}/{todayTasks.length} 已完成
                      </span>
                      <div className="progress-track">
                        <i
                          style={{
                            width: `${todayTasks.length ? (done / todayTasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    {todayTasks.length ? (
                      todayTasks
                        .sort((a, b) =>
                          a.created_at.localeCompare(b.created_at),
                        )
                        .map(taskRow)
                    ) : (
                      <Empty
                        icon={CalendarDays}
                        title="今天，还有很多可能"
                        text="记下课程、单词或一道题，从一项任务开始。"
                      />
                    )}
                    <button
                      className="add-task"
                      onClick={() => setTaskModal("new")}
                    >
                      <Plus size={16} />
                      添加今日任务
                    </button>
                  </section>
                  <section className="card recent">
                    <div className="card-header">
                      <h2>
                        <FolderOpen size={19} />
                        最近学习资料
                      </h2>
                      <Link href="/library">
                        进入资料库
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                    {data.files.length ? (
                      data.files.slice(0, 4).map(fileRow)
                    ) : (
                      <div className="first-upload">
                        <div className="file-stack">
                          <FileText size={30} />
                        </div>
                        <div>
                          <h3>给知识一个安放的地方</h3>
                          <p>上传第一份笔记、教材或学习截图。</p>
                          <button
                            className="text-button"
                            onClick={() => setUpload(true)}
                          >
                            上传第一份资料
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
                <div className="dashboard-secondary">
                  <section className="review-card">
                    <div className="card-header">
                      <h2>
                        <BookMarked size={19} />
                        温故，才能知新
                      </h2>
                      <span className="phase">V4</span>
                    </div>
                    <p>让复习成为习惯，让知识真正留下来。</p>
                    <div className="review-numbers">
                      <div>
                        <strong>
                          {dueKnowledge.length.toString().padStart(2, "0")}
                        </strong>
                        <span>待复习知识点</span>
                      </div>
                      <div>
                        <strong>
                          {dueMistakes.length.toString().padStart(2, "0")}
                        </strong>
                        <span>待重做错题</span>
                      </div>
                    </div>
                    <Link className="btn outlined wide" href="/roadmap">
                      了解自动复习计划
                      <ArrowRight size={15} />
                    </Link>
                    <small>自动复习将在知识点与练习系统完成后开启</small>
                  </section>
                  <section className="card weak">
                    <div className="card-header">
                      <h2>
                        <Layers size={18} />
                        值得再学一遍
                      </h2>
                    </div>
                    <p className="muted">关注薄弱点，每次进步一点点</p>
                    {data.knowledge.length ? (
                      data.knowledge
                        .toSorted((a, b) => a.mastery - b.mastery)
                        .slice(0, 4)
                        .map((k) => (
                          <div className="knowledge-row" key={k.id}>
                            <span>{k.name}</span>
                            <b>{k.mastery}%</b>
                            <div className="progress-track">
                              <i style={{ width: k.mastery + "%" }} />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="quiet-empty">
                        <span>从积累开始，慢慢看见进步</span>
                        <p>
                          V2 开启知识点管理后，
                          <br />
                          这里将呈现真实的掌握情况。
                        </p>
                        <div className="seed-bars" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                          <i />
                          <Leaf size={22} />
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
              <section className="subjects-section">
                <div className="section-title">
                  <h2>每一科，都在前进</h2>
                  <span>你的专属知识空间</span>
                </div>
                <div className="subject-cards">
                  {data.subjects.map((s) => (
                    <Link
                      key={s.id}
                      className={`subject-card ${s.color}`}
                      href="/library"
                      onClick={() => setSubject(s.id)}
                    >
                      <span className="subject-symbol">
                        {s.name === "数学二"
                          ? "ƒ"
                          : s.name === "英语二"
                            ? "Aa"
                            : s.name === "信号与系统"
                              ? "∿"
                              : "↗"}
                      </span>
                      <span>
                        <h3>{s.name}</h3>
                        <small>
                          {data.chapters
                            .filter((c) => c.subject_id === s.id)
                            .map((c) => c.name)
                            .slice(0, 2)
                            .join(" · ")}
                        </small>
                        <b>
                          {
                            data.files.filter((f) => f.subject_id === s.id)
                              .length
                          }{" "}
                          份资料
                        </b>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
          {isLibrary && (
            <>
              <div className="library-toolbar">
                <label className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="搜索资料"
                    placeholder="搜索资料名称或标签…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button aria-label="清空搜索" onClick={() => setQuery("")}>
                      <X size={15} />
                    </button>
                  )}
                </label>
                <select
                  aria-label="按资料类型筛选"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">全部资料类型</option>
                  {data.categories
                    .filter((c) =>
                      pathname === "/notes"
                        ? c.kind === "note"
                        : pathname === "/mistakes"
                          ? c.kind === "mistake"
                          : true,
                    )
                    .map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <button className="btn" onClick={() => setCatalog(true)}>
                  <Plus size={16} />
                  管理分类
                </button>
              </div>
              <div className="subject-tabs">
                <button
                  className={subject === "all" ? "selected" : ""}
                  onClick={() => setSubject("all")}
                >
                  全部科目
                  <span>
                    {
                      data.files.filter((f) =>
                        pathname === "/notes"
                          ? categories.get(f.category_id)?.kind === "note"
                          : pathname === "/mistakes"
                            ? categories.get(f.category_id)?.kind === "mistake"
                            : true,
                      ).length
                    }
                  </span>
                </button>
                {data.subjects.map((s) => (
                  <button
                    key={s.id}
                    className={subject === s.id ? "selected" : ""}
                    onClick={() => setSubject(s.id)}
                  >
                    <i className={"dot " + s.color} />
                    {s.name}
                  </button>
                ))}
              </div>
              {pathname === "/notes" || pathname === "/mistakes" ? (
                <div className="info-strip">
                  <BookOpen size={17} />
                  {pathname === "/notes"
                    ? "这里独立收纳笔记类文件。AI 整理与笔记编辑将在 V2 开放。"
                    : "这里独立收纳错题类文件。结构化错题与重做记录将在 V2 开放。"}
                </div>
              ) : null}
              <section className="card library-card">
                <div className="card-header">
                  <h2>
                    {query ? "搜索结果" : "我的资料"}
                    <span className="count-pill">{filtered.length}</span>
                  </h2>
                  <span className="muted">按最近上传排序</span>
                </div>
                {filtered.length ? (
                  filtered.map(fileRow)
                ) : (
                  <Empty
                    icon={FolderOpen}
                    title={
                      query ? "没有找到相关资料" : "让知识慢慢充盈这个空间"
                    }
                    text={
                      query
                        ? "试试其他关键词，或调整科目与类型筛选。"
                        : "支持 PDF、Word、Markdown、TXT 和图片；笔记与错题分开归档。"
                    }
                    action={
                      !query ? (
                        <button
                          className="btn primary"
                          onClick={() => setUpload(true)}
                        >
                          <Upload size={16} />
                          上传资料
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </section>
              <div className="import-card">
                <div className="import-mark">
                  <NotebookPen size={26} />
                </div>
                <div>
                  <h3>让 ChatGPT 整理的资料，也有归处</h3>
                  <p>
                    导出为 Markdown、TXT、PDF
                    或图片后，即可分类上传。不会自动读取你的对话。
                  </p>
                </div>
                <button className="btn" onClick={() => setUpload(true)}>
                  导入资料
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          )}
          {pathname === "/plan" && (
            <section className="card">
              <div className="card-header">
                <h2>每日计划</h2>
                <input
                  aria-label="计划日期"
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
                <button
                  className="btn primary"
                  onClick={() => setTaskModal("new")}
                >
                  <Plus size={15} />
                  新建任务
                </button>
              </div>
              <p className="plan-note">
                完成任务后，将按填写的学习分钟数记录时长。可点击任务编辑或延期。
              </p>
              {data.tasks.filter((t) => t.date === planDate).length ? (
                data.tasks.filter((t) => t.date === planDate).map(taskRow)
              ) : (
                <Empty
                  icon={CalendarDays}
                  title="为这一天，留一点期待"
                  text="添加要学习的内容，也为自己预留休息的时间。"
                />
              )}
            </section>
          )}
          {pathname === "/settings" && (
            <div className="settings-grid">
              <section className="card settings-card">
                <h2>学习档案</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    act(async () => {
                      await api("/api/profile", {
                        name: f.get("name"),
                        exam_date: f.get("exam_date") || null,
                      });
                    }, "学习档案已保存");
                  }}
                >
                  <label>
                    你的称呼
                    <input
                      name="name"
                      defaultValue={data.profile.name}
                      required
                      maxLength={40}
                    />
                  </label>
                  <label>
                    个人备考目标日期
                    <input
                      name="exam_date"
                      type="date"
                      defaultValue={data.profile.exam_date || ""}
                    />
                    <small>
                      2028
                      考研实际初试时间请以官方通知为准。此处用于设置个人目标，不预填未经公布的日期。
                    </small>
                  </label>
                  <label>
                    登录邮箱
                    <input value={data.user.email} disabled readOnly />
                  </label>
                  <button className="btn primary" disabled={busy}>
                    保存设置
                  </button>
                </form>
              </section>
              <section className="card settings-card">
                <h2>你的数据</h2>
                <div className="storage-detail">
                  <CloudUpload size={32} />
                  <strong>
                    {data.backend === "local"
                      ? "本机持久化模式"
                      : "Supabase 云端模式"}
                  </strong>
                  <p>
                    {data.backend === "local"
                      ? "账号、计划与资料保存在这台电脑的数据库和文件目录中，重启后仍会保留。部署到云端并配置 Supabase 后可跨设备访问。本机数据不会自动迁移到云端。"
                      : "资料由私有文件存储保存，通过登录验证和用户级访问规则隔离。"}
                  </p>
                  <span>
                    {data.files.length} 份资料 ·{" "}
                    {bytes(data.files.reduce((s, f) => s + f.size, 0))}
                  </span>
                </div>
                <button className="btn wide" onClick={theme}>
                  <Moon size={16} />
                  切换浅色 / 深色模式
                </button>
                <button
                  className="btn wide logout"
                  onClick={() =>
                    act(async () => {
                      await api("/api/auth", { action: "logout" });
                      window.location.href = "/login";
                    })
                  }
                >
                  <LogOut size={16} />
                  退出账号
                </button>
              </section>
            </div>
          )}
          {pathname === "/roadmap" && (
            <section className="roadmap">
              {[
                [
                  "01",
                  "V1 · 让学习资料有序",
                  "当前版本",
                  "注册登录、学习首页、独立分类、文件上传与查看、每日任务、手机适配与深色模式。",
                ],
                [
                  "02",
                  "V2 · 让知识产生关联",
                  "下一阶段",
                  "结构化知识点、AI 笔记整理、独立错题、图片识别与跨内容全局搜索。",
                ],
                [
                  "03",
                  "V3 · 用练习验证理解",
                  "规划中",
                  "按薄弱点出题、在线作答、自动批改、错题归档与掌握度更新。",
                ],
                [
                  "04",
                  "V4 · 找到自己的节奏",
                  "规划中",
                  "间隔复习、学习趋势、AI 计划与可安装的 PWA。",
                ],
              ].map(([n, title, status, desc]) => (
                <div className="card roadmap-row" key={n}>
                  <strong>{n}</strong>
                  <div>
                    <span className="phase">{status}</span>
                    <h2>{title}</h2>
                    <p>{desc}</p>
                  </div>
                  {n === "01" ? <CheckCheck size={24} /> : <Leaf size={24} />}
                </div>
              ))}
              <div className="info-strip">
                <TriangleAlert size={19} />
                当前不会自动调用
                AI。后续接入前会保留人工编辑、错误校正与原始资料追溯。
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>知序 · 日积月累，自有回响。</span>
            <span>
              2028，一起向前。
              <Leaf size={13} />
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {[
          { href: "/", label: "首页", icon: LayoutDashboard },
          { href: "/library", label: "资料", icon: FolderOpen },
          { href: "/roadmap", label: "练习", icon: Target },
          { href: "/mistakes", label: "错题", icon: Bookmark },
          { href: "/settings", label: "我的", icon: Settings },
        ].map((n) => (
          <Link
            key={n.href}
            className={pathname === n.href ? "active" : ""}
            href={n.href}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {upload && (
        <UploadDialog
          data={data}
          defaultSubject={subject}
          defaultKind={pathname === "/mistakes" ? "mistake" : "note"}
          onClose={() => setUpload(false)}
          onSaved={async () => {
            await refresh();
            setUpload(false);
            setToast("资料已上传并保存");
          }}
        />
      )}
      {taskModal && (
        <TaskDialog
          data={data}
          task={taskModal}
          date={pathname === "/plan" ? planDate : date}
          onClose={() => setTaskModal(null)}
          onSaved={async () => {
            await refresh();
            setTaskModal(null);
            setToast("学习计划已保存");
          }}
        />
      )}
      {catalog && (
        <CatalogDialog
          data={data}
          onClose={() => setCatalog(false)}
          onSaved={async () => {
            await refresh();
            setCatalog(false);
            setToast("分类已创建");
          }}
        />
      )}
      {viewFile && (
        <Modal title={displayFileName(viewFile.title)} onClose={() => setViewFile(null)}>
          <div className="file-details">
            <span className="tag">
              {categories.get(viewFile.category_id)?.name}
            </span>
            <span>
              {subjects.get(viewFile.subject_id)?.name} /{" "}
              {data.chapters.find((c) => c.id === viewFile.chapter_id)?.name ||
                "未指定章节"}
            </span>
            <span>
              {bytes(viewFile.size)} ·{" "}
              {new Date(viewFile.created_at).toLocaleString("zh-CN")}
            </span>
            <div className="tags">
              {viewFile.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          </div>
          <FilePreview file={viewFile} />
          <div className="modal-actions">
            <a className="btn" href={`/api/files/${viewFile.id}?download=1`}>
              <Download size={16} />
              下载原文件
            </a>
            <a
              className="btn"
              href={`/api/files/${viewFile.id}`}
              target="_blank"
              rel="noreferrer"
            >
              打开文件
              <ArrowUpRight size={15} />
            </a>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`确定永久删除“${displayFileName(viewFile.title)}”及原文件？`))
                  act(async () => {
                    await api(`/api/files/${viewFile.id}`, undefined, "DELETE");
                    setViewFile(null);
                  }, "资料已删除");
              }}
            >
              <Trash2 size={16} />
              删除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: Icon;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <section className="stat-card">
      <span className={`stat-icon ${color}`}>
        <Icon size={19} />
      </span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: Icon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
