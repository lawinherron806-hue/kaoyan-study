import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "知序 · 2028 考研学习空间",
  description: "把每一天的努力，整理成看得见的进步。个人考研资料与学习管理。",
  icons: { icon: "/favicon.svg" },
  appleWebApp: { capable: true, title: "知序" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('study-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
