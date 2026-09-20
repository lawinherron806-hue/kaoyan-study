"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <h1>暂时没能打开学习空间</h1>
      <p>请检查服务配置或网络连接，再试一次。已保存的资料不会因此丢失。</p>
      <button className="btn primary" onClick={reset}>
        重新加载
      </button>
      <a href="/login">返回登录</a>
    </main>
  );
}
