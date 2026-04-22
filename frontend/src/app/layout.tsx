import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "小红书日常发帖工作台",
  description: "围绕主题生成、人工挑选、OpenClaw 代发和数据复盘组织的小红书日常工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
