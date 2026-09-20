"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ArrowRight,
  Leaf,
  ShieldCheck,
} from "lucide-react";
export default function Login({ backend }: { backend: string }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          action: register ? "register" : "login",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.message) setMessage(data.message);
      else window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "网络异常，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <a className="brand" href="/login">
          <span className="brand-icon">
            <BookOpen size={25} />
          </span>
          <span>
            知序<span className="brand-en">STUDY AT YOUR PACE</span>
          </span>
        </a>
        <div className="login-copy">
          <span className="eyebrow">YOUR PERSONAL STUDY SPACE</span>
          <h1>
            认真走的每一步，
            <br />
            都算数<span>。</span>
          </h1>
          <p>
            让资料有序，让学习有迹可循。
            <br />
            从今天开始，慢慢靠近 2028 的理想。
          </p>
          <div className="login-orbit">
            <div className="orbit-center">
              <Leaf size={48} />
              <span>日日有进，久久为功</span>
            </div>
            <span className="orbit-pill p1">数学二</span>
            <span className="orbit-pill p2">英语二</span>
            <span className="orbit-pill p3">信号与系统</span>
            <i />
            <i />
          </div>
        </div>
        <div className="login-foot">
          一个属于你的，安静的学习空间 <ArrowUpRight size={17} />
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form">
          <span className="small-label">2028 · 下一站，理想院校</span>
          <h2>{register ? "开启你的学习旅程" : "欢迎回到知序"}</h2>
          <p>
            {register
              ? "建立账号，让每一份努力都有记录。"
              : "收一收心，开始今天的积累。"}
          </p>
          <div className="auth-tabs">
            <button
              className={!register ? "active" : ""}
              onClick={() => {
                setRegister(false);
                setMessage("");
              }}
            >
              登录
            </button>
            <button
              className={register ? "active" : ""}
              onClick={() => {
                setRegister(true);
                setMessage("");
              }}
            >
              注册
            </button>
          </div>
          <form onSubmit={submit}>
            <label>
              邮箱
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label>
              密码
              <input
                name="password"
                type="password"
                placeholder="至少 8 位密码"
                required
                minLength={8}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </label>
            <button className="btn primary wide" disabled={busy}>
              {busy ? "正在处理…" : register ? "创建学习账号" : "进入学习空间"}
              <ArrowRight size={17} />
            </button>
            <p role="status" className="form-message">
              {message}
            </p>
          </form>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <span>
              {backend === "local"
                ? "本机存储模式 · 数据保存在这台电脑，可持续使用。云端同步需在部署时配置 Supabase。"
                : "云端存储模式 · 每个账号的资料独立且私密。"}
            </span>
          </div>
        </div>
        <small>不必一开始就很厉害，但要开始，才会变厉害。</small>
      </section>
    </main>
  );
}
